import { describe, expect, it } from "vitest";
import { computeCommercialLadder } from "@/services/value/commercial-ladder";
import { assessClaim, migrateLegacyProven, type ClaimAssessment } from "@/services/value/epistemic";
import { diffKnowledge } from "@/services/value/knowledge-change";
import {
  computeProofFrontier,
  type FrontierLinkInput,
  type FrontierRungInput,
  type ProofRung,
} from "@/services/value/proof-frontier";
import type { ClaimType } from "@/generated/prisma/enums";
import { claimInputs, item, NOW } from "../support/fit-helpers";
import type { EvidenceFitInput } from "@/services/value/evidence-fit";

type Use = { item: EvidenceFitInput; direction?: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" };

function claim(
  claimType: ClaimType,
  uses: Use[],
  assumptions: Parameters<typeof assessClaim>[0]["assumptions"] = [],
): ClaimAssessment {
  return assessClaim({
    hasStatement: true,
    generatedBy: "AI_HYPOTHESIS",
    evidence: claimInputs(claimType, uses),
    assumptions,
    claimType,
    now: NOW,
  });
}

const interview = () =>
  item("INTERVIEW", { strengthScore: 9, relevanceScore: 9, sourceOriginId: undefined });
const records = () =>
  item("TRANSACTION_RECORDS", { organizationCount: 4, hasEconomicImpact: true });
const reddit = () =>
  item("REDDIT_POST", { strengthScore: 6, relevanceScore: 8, hasEconomicImpact: true });

function rungs(map: Partial<Record<ProofRung, ClaimAssessment>>): FrontierRungInput[] {
  return (Object.keys(map) as ProofRung[]).map((rung) => ({ rung, assessment: map[rung]! }));
}
function links(map: Record<string, ClaimAssessment>): FrontierLinkInput[] {
  return Object.entries(map).map(([key, assessment]) => {
    const [from, to] = key.split("->") as [ProofRung, ProofRung];
    return { from, to, statement: `${from} → ${to}`, criticality: "CRITICAL", assessment };
  });
}

describe("Proof Frontier requires fitting evidence, not evidence quantity", () => {
  const problem = {
    VARIABLE_IMPORTANCE: claim("VARIABLE_IMPORTANCE", [
      { item: interview() },
      { item: interview() },
    ]),
    PAIN: claim("PAIN_EXISTS", [
      { item: interview() },
      { item: interview() },
      { item: item("SURVEY") },
    ]),
  };

  it("ten low-fit reddit posts do not outrank three operational datasets, and do not advance the frontier", () => {
    const tenReddit = claim(
      "ECONOMIC_IMPACT",
      Array.from({ length: 10 }, () => ({ item: reddit() })),
    );
    const threeRecords = claim("ECONOMIC_IMPACT", [
      { item: records() },
      { item: records() },
      { item: records() },
    ]);
    expect(tenReddit.fitness.lowFitOnly).toBe(true);
    expect(tenReddit.confidence).toBeLessThanOrEqual(39);
    expect(threeRecords.confidence).toBeGreaterThan(tenReddit.confidence);
    expect(["OBSERVED", "STRONGLY_SUPPORTED", "SUPPORTED"]).toContain(threeRecords.status);

    const blocked = computeProofFrontier(rungs({ ...problem, ECONOMIC_PAIN: tenReddit }), []);
    expect(blocked.frontier).toBe("PAIN");
    expect(blocked.blockedAt?.rung).toBe("ECONOMIC_PAIN");
    expect(blocked.blockedAt?.blockers.map((b) => b.kind)).toContain("LOW_FIT");
    expect(blocked.whyStops.text).toMatch(/cannot establish|does not fit/);

    const advanced = computeProofFrontier(rungs({ ...problem, ECONOMIC_PAIN: threeRecords }), []);
    expect(advanced.frontier).toBe("ECONOMIC_PAIN");
  });

  it("strong-fit evidence advances the frontier and gives it a scope", () => {
    const economic = claim("ECONOMIC_IMPACT", [{ item: records() }, { item: records() }]);
    const study = item("DATA_FEASIBILITY_STUDY", {
      organizationCount: 5,
      scope: {
        population: "independent hair salons",
        systems: ["POS A", "POS B", "POS C"],
        environment: "founder-assisted",
        organizationCount: 5,
      },
      sourceOriginId: "experiment:concierge",
    });
    const mechanism = claim("MECHANISM_FEASIBLE", [{ item: study }]);
    const r = computeProofFrontier(
      rungs({ ...problem, ECONOMIC_PAIN: economic, MECHANISM: mechanism }),
      [],
    );
    expect(mechanism.status).toBe("OBSERVED");
    expect(r.frontier).toBe("MECHANISM");
    expect(r.frontierScope.observed).toBe(true);
    expect(r.frontierScope.text.text).toMatch(/5 organizations/);
    expect(r.frontierScope.generalization).toBe("CASE_ONLY");
    expect(r.explanation[0].text).toMatch(/scope: 5 organizations/);
  });

  it("a high-fit contradiction blocks advancement (MIXED), a low-fit one does not", () => {
    const study = () => item("DATA_FEASIBILITY_STUDY", { organizationCount: 5 });
    const mixed = claim("MECHANISM_FEASIBLE", [
      { item: study() },
      { item: study(), direction: "CONTRADICTS" },
    ]);
    expect(mixed.status).toBe("MIXED");
    const economic = claim("ECONOMIC_IMPACT", [{ item: records() }, { item: records() }]);
    const r = computeProofFrontier(
      rungs({ ...problem, ECONOMIC_PAIN: economic, MECHANISM: mixed }),
      [],
    );
    expect(r.frontier).toBe("ECONOMIC_PAIN");
    expect(r.blockedAt?.blockers.map((b) => b.kind)).toContain("CONTRADICTION");
    expect(r.whyStops.text).toMatch(/mixed evidence/);
    // A forum post contradicting feasibility is not admissible: it changes nothing.
    const withForum = claim("MECHANISM_FEASIBLE", [
      { item: study() },
      { item: item("FORUM_POST"), direction: "CONTRADICTS" },
    ]);
    expect(withForum.status).toBe("OBSERVED");
    expect(withForum.fitness.admissible).toBe(1);
  });

  it("interview-only evidence cannot carry a causal link; a before/after test can, up to the design it allows", () => {
    const economic = claim("ECONOMIC_IMPACT", [{ item: records() }, { item: records() }]);
    const mechanism = claim("MECHANISM_FEASIBLE", [
      { item: item("DATA_FEASIBILITY_STUDY", { organizationCount: 5 }) },
    ]);
    const capability = claim("CAPABILITY_EXISTS", [
      { item: item("PROTOTYPE_TEST", { organizationCount: 5 }) },
    ]);
    const transformation = claim("TRANSFORMATION_OCCURS", [
      { item: item("BOOKING_DATA", { organizationCount: 5 }) },
    ]);
    const base = {
      ...problem,
      ECONOMIC_PAIN: economic,
      MECHANISM: mechanism,
      CAPABILITY: capability,
      TRANSFORMATION: transformation,
    };

    const interviewsOnly = claim("MECHANISM_CAUSES_CAPABILITY", [
      { item: interview() },
      { item: interview() },
      { item: interview() },
    ]);
    const blocked = computeProofFrontier(
      rungs(base),
      links({ "MECHANISM->CAPABILITY": interviewsOnly }),
    );
    expect(blocked.frontier).toBe("MECHANISM");
    expect(blocked.blockedAt?.blockers.map((b) => b.kind)).toContain("LOW_FIT");

    const concierge = () =>
      item("CONCIERGE_TEST", {
        designLevel: "BEFORE_AFTER",
        internalValidity: "HIGH",
        organizationCount: 5,
        sourceOriginId: `run-${Math.random()}`,
      });
    const beforeAfter = claim("MECHANISM_CAUSES_CAPABILITY", [
      { item: concierge() },
      { item: concierge() },
    ]);
    const reachesCapability = computeProofFrontier(
      rungs(base),
      links({ "MECHANISM->CAPABILITY": beforeAfter }),
    );
    expect(reachesCapability.frontier).toBe("CAPABILITY");

    // Transformation attribution needs at least a before/after design on the link into it:
    // operational records are observational (association), not a test of the change.
    const observational = claim("CAPABILITY_CAUSES_TRANSFORMATION", [
      { item: item("BOOKING_DATA", { organizationCount: 6 }) },
    ]);
    const stops = computeProofFrontier(
      rungs(base),
      links({ "MECHANISM->CAPABILITY": beforeAfter, "CAPABILITY->TRANSFORMATION": observational }),
    );
    expect(stops.frontier).toBe("CAPABILITY");
    expect(stops.blockedAt?.rung).toBe("TRANSFORMATION");
    const matched = claim("CAPABILITY_CAUSES_TRANSFORMATION", [
      {
        item: item("MATCHED_COMPARISON", {
          designLevel: "MATCHED_COMPARISON",
          internalValidity: "HIGH",
          organizationCount: 8,
        }),
      },
    ]);
    const moves = computeProofFrontier(
      rungs(base),
      links({ "MECHANISM->CAPABILITY": beforeAfter, "CAPABILITY->TRANSFORMATION": matched }),
    );
    expect(moves.frontier).toBe("TRANSFORMATION");
  });

  it("evidence that is not admissible for a rung is named as such, not counted as evidence", () => {
    const economic = claim("ECONOMIC_IMPACT", [{ item: records() }, { item: records() }]);
    const forumOnly = claim("MECHANISM_FEASIBLE", [
      { item: item("FORUM_POST") },
      { item: item("REDDIT_POST") },
    ]);
    const r = computeProofFrontier(
      rungs({ ...problem, ECONOMIC_PAIN: economic, MECHANISM: forumOnly }),
      [],
    );
    expect(forumOnly.status).toBe("HYPOTHESIS");
    expect(r.blockedAt?.blockers[0]?.kind).toBe("NOT_ADMISSIBLE");
  });
});

describe("commercial ladder: existing spend is not willingness to pay", () => {
  it("supports each rung from its own evidence only and names the next question", () => {
    const spend = claim("EXISTING_SPEND", [{ item: interview() }, { item: item("INVOICE") }]);
    const wtpFromInterview = claim("WILLINGNESS_TO_PAY", [{ item: interview() }]);
    const purchaseFromInterview = claim("ACTUAL_PURCHASE", [{ item: interview() }]);
    const spendOnly = computeCommercialLadder({ EXISTING_SPEND: spend });
    expect(spendOnly.rungs[0].supported).toBe(true);
    expect(spendOnly.highestSupported).toBe("EXISTING_SPEND");
    expect(spendOnly.next?.claimType).toBe("PURCHASE_INTENT");
    expect(spendOnly.rungs.find((r) => r.claimType === "WILLINGNESS_TO_PAY")?.status).toBe(
      "HYPOTHESIS",
    );

    const ladder = computeCommercialLadder({
      EXISTING_SPEND: spend,
      WILLINGNESS_TO_PAY: wtpFromInterview,
      ACTUAL_PURCHASE: purchaseFromInterview,
    });
    expect(ladder.next?.claimType).toBe("PURCHASE_INTENT");
    expect(purchaseFromInterview.status).toBe("HYPOTHESIS");
    expect(purchaseFromInterview.fitness.admissible).toBe(0);
    // A stated amount in an interview is medium evidence of stated WTP: supported at most, never observed.
    expect(wtpFromInterview.status).toBe("SUPPORTED");
    expect(wtpFromInterview.observed).toBe(false);
    const purchase = claim("ACTUAL_PURCHASE", [
      { item: item("SUBSCRIPTION_PURCHASE", { organizationCount: 3 }) },
    ]);
    expect(purchase.status).toBe("OBSERVED");
  });
});

describe("PROVEN migration", () => {
  it("maps measurements to OBSERVED and broader support to STRONGLY_SUPPORTED, keeping the audit trail readable", () => {
    expect(migrateLegacyProven("PROVEN", [{ measurement: true }])).toBe("OBSERVED");
    expect(migrateLegacyProven("PROVEN", [{ measurement: false }])).toBe("STRONGLY_SUPPORTED");
    expect(migrateLegacyProven("SUPPORTED", [{ measurement: true }])).toBe("SUPPORTED");
    const diff = diffKnowledge(
      {
        frontier: "MECHANISM",
        evidenceConfidence: 80,
        valueStrength: null,
        valueCompleteness: "3/5",
        causalConfidence: null,
        causalCompleteness: "1/4",
        verdict: "TEST",
        claims: [
          { key: "node:MECHANISM", label: "Mechanism", status: "PROVEN" as never, confidence: 80 },
        ],
      },
      {
        frontier: "MECHANISM",
        evidenceConfidence: 80,
        valueStrength: null,
        valueCompleteness: "3/5",
        causalConfidence: null,
        causalCompleteness: "1/4",
        verdict: "TEST",
        claims: [
          {
            key: "node:MECHANISM",
            label: "Mechanism",
            status: "OBSERVED",
            confidence: 80,
            scope: "5 organizations",
            generalization: "SAMPLE_SUPPORTED",
          },
        ],
      },
    );
    expect(diff.changed).toBe(true);
    expect(diff.lines.map((l) => l.text).join(" ")).toMatch(
      /PROVEN 80 → OBSERVED 80 \(in tested scope: 5 organizations\)/,
    );
  });
});
