import { describe, expect, it } from "vitest";
import {
  classifyOutcome,
  experimentWarnings,
  outcomeToDirection,
  outcomeToSentiment,
} from "@/services/value/experiment-outcome";
import { diffKnowledge, type KnowledgeSnapshot } from "@/services/value/knowledge-change";
import { computeProofFrontier } from "@/services/value/proof-frontier";
import { assessClaim, type ClaimEvidenceInput } from "@/services/value/epistemic";

describe("experiment outcome — deterministic thresholds", () => {
  it("decides SUPPORTED / CONTRADICTED / INCONCLUSIVE from thresholds (higher is better)", () => {
    expect(
      classifyOutcome({ observedValue: 0.96, successThreshold: 0.95, failureThreshold: 0.8 })
        ?.outcome,
    ).toBe("SUPPORTED");
    expect(
      classifyOutcome({ observedValue: 0.7, successThreshold: 0.95, failureThreshold: 0.8 })
        ?.outcome,
    ).toBe("CONTRADICTED");
    expect(
      classifyOutcome({ observedValue: 0.9, successThreshold: 0.95, failureThreshold: 0.8 })
        ?.outcome,
    ).toBe("INCONCLUSIVE");
  });

  it("handles lower-is-better metrics (no-show rate target ≤ 10%)", () => {
    expect(
      classifyOutcome({ observedValue: 10.1, successThreshold: 10, failureThreshold: 13 })?.outcome,
    ).toBe("INCONCLUSIVE");
    expect(
      classifyOutcome({ observedValue: 9.5, successThreshold: 10, failureThreshold: 13 })?.outcome,
    ).toBe("SUPPORTED");
    expect(
      classifyOutcome({ observedValue: 14, successThreshold: 10, failureThreshold: 13 })?.outcome,
    ).toBe("CONTRADICTED");
  });

  it("cannot decide without an observation or with a single threshold", () => {
    expect(
      classifyOutcome({ observedValue: null, successThreshold: 1, failureThreshold: 0 }),
    ).toBeNull();
    expect(
      classifyOutcome({ observedValue: 5, successThreshold: 1, failureThreshold: null }),
    ).toBeNull();
    expect(
      classifyOutcome({ observedValue: 5, successThreshold: 1, failureThreshold: 1 }),
    ).toBeNull();
  });

  it("an inconclusive result is never treated as support; an invalid one produces no evidence", () => {
    expect(outcomeToDirection("INCONCLUSIVE")).toBe("NEUTRAL");
    expect(outcomeToSentiment("INCONCLUSIVE")).toBe("NEUTRAL");
    expect(outcomeToDirection("INVALID")).toBeNull();
    expect(outcomeToDirection("SUPPORTED")).toBe("SUPPORTS");
    expect(outcomeToDirection("CONTRADICTED")).toBe("CONTRADICTS");
  });
});

describe("experiment planning warnings", () => {
  it("an experiment without a decision question generates a warning", () => {
    const w = experimentWarnings({ decisionQuestion: "", causalLinkId: "l1" });
    expect(w.some((x) => x.level === "warning" && /decision question/i.test(x.message))).toBe(true);
  });

  it("an experiment that targets nothing generates a warning", () => {
    const w = experimentWarnings({ decisionQuestion: "Can we build it?" });
    expect(w.some((x) => /targets nothing/.test(x.message))).toBe(true);
  });

  it("a complete plan has no warnings, only optional info", () => {
    const w = experimentWarnings({
      decisionQuestion: "Can we build the reconciliation mechanism?",
      causalLinkId: "l1",
      successThreshold: 95,
      failureThreshold: 80,
      unit: "% matched",
    });
    expect(w.filter((x) => x.level === "warning")).toHaveLength(0);
  });
});

function ev(direction: ClaimEvidenceInput["direction"] = "SUPPORTS"): ClaimEvidenceInput {
  // A strong experiment result observed on real customers, with explicit
  // statements and quantified impact (the kind of evidence a pilot yields).
  return {
    direction,
    signal: {
      type: "EXPERIMENT",
      strengthScore: 9,
      relevanceScore: 9,
      sentiment: "POSITIVE",
      sourceDate: new Date(),
      isDirectCustomer: true,
      hasExplicitPain: true,
      hasEconomicImpact: true,
      hasWorkaround: true,
      hasPurchaseIntent: false,
    },
  };
}
const strong = () => assessClaim({ hasStatement: true, generatedBy: "USER", evidence: [ev()] });
const none = () => assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [] });

describe("frontier movement after new evidence", () => {
  const rungsWith = (capability = none(), transformation = none()) => [
    { rung: "VARIABLE_IMPORTANCE" as const, assessment: strong() },
    { rung: "PAIN" as const, assessment: strong() },
    { rung: "ECONOMIC_PAIN" as const, assessment: strong() },
    { rung: "MECHANISM" as const, assessment: strong() },
    { rung: "CAPABILITY" as const, assessment: capability },
    { rung: "TRANSFORMATION" as const, assessment: transformation },
  ];
  const linksWith = (mc = none(), ct = none()) => [
    {
      from: "MECHANISM" as const,
      to: "CAPABILITY" as const,
      statement: "M→C",
      criticality: "CRITICAL" as const,
      assessment: mc,
    },
    {
      from: "CAPABILITY" as const,
      to: "TRANSFORMATION" as const,
      statement: "C→T",
      criticality: "CRITICAL" as const,
      assessment: ct,
    },
  ];

  it("new supporting evidence moves the frontier forward", () => {
    const before = computeProofFrontier(rungsWith(), linksWith());
    const after = computeProofFrontier(rungsWith(strong()), linksWith(strong()));
    expect(before.frontier).toBe("MECHANISM");
    expect(after.frontier).toBe("CAPABILITY");
  });

  it("an unsupported intermediary link blocks advancement even if the node beyond is supported", () => {
    const r = computeProofFrontier(rungsWith(strong(), strong()), linksWith(strong(), none()));
    expect(r.frontier).toBe("CAPABILITY");
    expect(r.blockedAt?.rung).toBe("TRANSFORMATION");
    expect(r.blockedAt?.blockers[0].subject).toBe("LINK");
  });

  it("contradictory evidence caps or moves the frontier backward", () => {
    const supported = computeProofFrontier(rungsWith(strong()), linksWith(strong()));
    const contradictedLink = assessClaim({
      hasStatement: true,
      generatedBy: "USER",
      evidence: [ev("SUPPORTS"), ev("CONTRADICTS"), ev("CONTRADICTS")],
    });
    const contradicted = computeProofFrontier(rungsWith(strong()), linksWith(contradictedLink));
    expect(supported.frontier).toBe("CAPABILITY");
    expect(contradicted.frontier).toBe("MECHANISM");
    expect(contradicted.blockedAt?.blockers.some((b) => b.kind === "CONTRADICTION")).toBe(true);
  });
});

describe("knowledge change diff (history)", () => {
  const snap = (over: Partial<KnowledgeSnapshot>): KnowledgeSnapshot => ({
    frontier: "ECONOMIC_PAIN",
    evidenceConfidence: 73,
    valueStrength: null,
    valueCompleteness: "3/5",
    causalConfidence: null,
    causalCompleteness: "0/5",
    verdict: "INTERVIEW",
    claims: [
      { key: "node:MECHANISM", label: "Mechanism", status: "HYPOTHESIS", confidence: 0 },
      {
        key: "link:MECHANISM->CAPABILITY",
        label: "Mechanism → Capability",
        status: "HYPOTHESIS",
        confidence: 0,
      },
    ],
    ...over,
  });

  it("records frontier movement, score deltas and strengthened claims", () => {
    const d = diffKnowledge(
      snap({}),
      snap({
        frontier: "MECHANISM",
        causalCompleteness: "1/5",
        claims: [
          { key: "node:MECHANISM", label: "Mechanism", status: "SUPPORTED", confidence: 64 },
          {
            key: "link:MECHANISM->CAPABILITY",
            label: "Mechanism → Capability",
            status: "SUPPORTED",
            confidence: 61,
          },
        ],
      }),
    );
    expect(d.changed).toBe(true);
    expect(d.frontierMovement).toBe("FORWARD");
    expect(d.summary).toMatch(/Proof Frontier moved forward: Economic pain → Mechanism/);
    expect(d.strengthened.map((c) => c.key)).toEqual([
      "node:MECHANISM",
      "link:MECHANISM->CAPABILITY",
    ]);
    expect(
      d.lines.some((l) => /Causal Confidence INCOMPLETE · 0\/5 → INCOMPLETE · 1\/5/.test(l)),
    ).toBe(true);
  });

  it("records contradictions and backward movement", () => {
    const d = diffKnowledge(
      snap({
        frontier: "CAPABILITY",
        claims: [
          {
            key: "link:MECHANISM->CAPABILITY",
            label: "Mechanism → Capability",
            status: "SUPPORTED",
            confidence: 61,
          },
        ],
      }),
      snap({
        frontier: "MECHANISM",
        claims: [
          {
            key: "link:MECHANISM->CAPABILITY",
            label: "Mechanism → Capability",
            status: "CONTRADICTED",
            confidence: 20,
          },
        ],
      }),
    );
    expect(d.frontierMovement).toBe("BACKWARD");
    expect(d.contradicted).toHaveLength(1);
    expect(d.strengthened).toHaveLength(0);
  });

  it("nothing changed ⇒ no record", () => {
    const d = diffKnowledge(snap({}), snap({}));
    expect(d.changed).toBe(false);
    expect(d.lines).toHaveLength(0);
  });
});
