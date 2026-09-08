import { describe, expect, it } from "vitest";
import { renderMessage } from "@/i18n/messages";
import { assessClaim, type ClaimAssessment } from "@/services/value/epistemic";
import {
  computeProofFrontier,
  type FrontierLinkInput,
  type FrontierRungInput,
  type ProofRung,
} from "@/services/value/proof-frontier";
import type { EvidenceSignal } from "@/services/scoring/evidence-score";

const NOW = new Date("2026-09-01T00:00:00Z");
const strong: EvidenceSignal = {
  type: "INTERVIEW",
  strengthScore: 9,
  relevanceScore: 9,
  sentiment: "POSITIVE",
  sourceDate: "2026-06-01",
  isDirectCustomer: true,
  hasExplicitPain: true,
  hasEconomicImpact: true,
  hasWorkaround: true,
  hasPurchaseIntent: true,
};

function proven(): ClaimAssessment {
  return assessClaim({
    hasStatement: true,
    generatedBy: "USER",
    evidence: [
      { signal: strong, direction: "SUPPORTS" },
      { signal: strong, direction: "SUPPORTS" },
      { signal: { ...strong, type: "SURVEY" }, direction: "SUPPORTS" },
    ],
    now: NOW,
  });
}
function supported(): ClaimAssessment {
  // One strong, direct customer statement with explicit pain and economic impact
  // reaches the supported threshold (≥ 40) but not the proven one (≥ 75).
  return assessClaim({
    hasStatement: true,
    generatedBy: "USER",
    evidence: [
      {
        signal: {
          ...strong,
          strengthScore: 8,
          relevanceScore: 8,
          hasWorkaround: false,
          hasPurchaseIntent: false,
        },
        direction: "SUPPORTS",
      },
    ],
    now: NOW,
  });
}
function hypothesis(): ClaimAssessment {
  return assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [], now: NOW });
}
function contradicted(): ClaimAssessment {
  return assessClaim({
    hasStatement: true,
    generatedBy: "USER",
    evidence: [
      { signal: strong, direction: "SUPPORTS" },
      { signal: { ...strong, strengthScore: 10 }, direction: "CONTRADICTS" },
    ],
    now: NOW,
  });
}
function withUntestedCritical(): ClaimAssessment {
  return assessClaim({
    hasStatement: true,
    generatedBy: "USER",
    evidence: [
      { signal: strong, direction: "SUPPORTS" },
      { signal: strong, direction: "SUPPORTS" },
    ],
    assumptions: [{ statement: "Buyers control the budget", status: "UNKNOWN", importance: 9 }],
    now: NOW,
  });
}

const LADDER: ProofRung[] = [
  "MECHANISM",
  "CAPABILITY",
  "TRANSFORMATION",
  "OPERATIONAL_VALUE",
  "ECONOMIC_VALUE",
  "STRATEGIC_OUTCOME",
];

function rungs(map: Partial<Record<ProofRung, ClaimAssessment | null>>): FrontierRungInput[] {
  return (["VARIABLE_IMPORTANCE", "PAIN", "ECONOMIC_PAIN", ...LADDER] as ProofRung[]).map(
    (rung) => ({ rung, assessment: map[rung] ?? null }),
  );
}
function links(map: Partial<Record<string, ClaimAssessment>>): FrontierLinkInput[] {
  const out: FrontierLinkInput[] = [];
  for (let i = 0; i < LADDER.length - 1; i++) {
    const key = `${LADDER[i]}->${LADDER[i + 1]}`;
    out.push({
      from: LADDER[i],
      to: LADDER[i + 1],
      statement: key,
      criticality: "CRITICAL",
      assessment: map[key] ?? hypothesis(),
    });
  }
  return out;
}

describe("computeProofFrontier", () => {
  it("is NONE when nothing is supported", () => {
    const r = computeProofFrontier(
      rungs({ VARIABLE_IMPORTANCE: hypothesis(), PAIN: hypothesis(), ECONOMIC_PAIN: hypothesis() }),
      links({}),
    );
    expect(r.frontier).toBe("NONE");
    expect(r.blockedAt?.rung).toBe("VARIABLE_IMPORTANCE");
  });

  it("stops at Economic pain when the ladder is only hypotheses", () => {
    const r = computeProofFrontier(
      rungs({
        VARIABLE_IMPORTANCE: supported(),
        PAIN: proven(),
        ECONOMIC_PAIN: supported(),
        MECHANISM: hypothesis(),
        CAPABILITY: hypothesis(),
        TRANSFORMATION: hypothesis(),
        OPERATIONAL_VALUE: hypothesis(),
        ECONOMIC_VALUE: hypothesis(),
        STRATEGIC_OUTCOME: hypothesis(),
      }),
      links({}),
    );
    expect(r.frontier).toBe("ECONOMIC_PAIN");
    expect(r.blockedAt?.rung).toBe("MECHANISM");
    expect(r.explanation[0].text).toMatch(/Current Proof Frontier: Economic pain/);
  });

  it("cannot jump over an unsupported causal link even if a later node has evidence", () => {
    const r = computeProofFrontier(
      rungs({
        VARIABLE_IMPORTANCE: supported(),
        PAIN: proven(),
        ECONOMIC_PAIN: proven(),
        MECHANISM: supported(),
        CAPABILITY: supported(),
        TRANSFORMATION: hypothesis(),
        OPERATIONAL_VALUE: proven(),
        ECONOMIC_VALUE: proven(),
        STRATEGIC_OUTCOME: hypothesis(),
      }),
      links({
        "MECHANISM->CAPABILITY": supported(),
        "CAPABILITY->TRANSFORMATION": hypothesis(),
        "TRANSFORMATION->OPERATIONAL_VALUE": proven(),
        "OPERATIONAL_VALUE->ECONOMIC_VALUE": proven(),
      }),
    );
    expect(r.frontier).toBe("CAPABILITY");
    expect(r.blockedAt?.rung).toBe("TRANSFORMATION");
    const op = r.rungs.find((x) => x.rung === "OPERATIONAL_VALUE");
    expect(op?.eligible).toBe(false);
    expect(op?.status).toBe("STRONGLY_SUPPORTED");
  });

  it("requires the link itself, not only the nodes, to be supported", () => {
    const r = computeProofFrontier(
      rungs({
        VARIABLE_IMPORTANCE: supported(),
        PAIN: proven(),
        ECONOMIC_PAIN: proven(),
        MECHANISM: proven(),
        CAPABILITY: proven(),
      }),
      links({ "MECHANISM->CAPABILITY": hypothesis() }),
    );
    expect(r.frontier).toBe("MECHANISM");
    expect(r.blockedAt?.reasons.map((m) => m.text).join(" ")).toMatch(/no linked evidence/);
  });

  it("an unresolved contradiction caps the frontier", () => {
    const r = computeProofFrontier(
      rungs({ VARIABLE_IMPORTANCE: supported(), PAIN: contradicted(), ECONOMIC_PAIN: proven() }),
      links({}),
    );
    expect(r.frontier).toBe("VARIABLE_IMPORTANCE");
    expect(r.blockedAt?.rung).toBe("PAIN");
    expect(r.blockedAt?.reasons.map((m) => m.text).join(" ")).toMatch(/CONTRADICTED|contradictory/);
  });

  it("a completely untested critical assumption blocks the rung it sits on", () => {
    const r = computeProofFrontier(
      rungs({
        VARIABLE_IMPORTANCE: supported(),
        PAIN: proven(),
        ECONOMIC_PAIN: withUntestedCritical(),
      }),
      links({}),
    );
    expect(r.frontier).toBe("PAIN");
    expect(r.blockedAt?.reasons.map((m) => m.text).join(" ")).toMatch(/completely untested/);
  });

  it("non-critical links do not gate the frontier", () => {
    const l = links({ "MECHANISM->CAPABILITY": hypothesis() }).map((x) =>
      x.from === "MECHANISM" ? { ...x, criticality: "MINOR" as const } : x,
    );
    const r = computeProofFrontier(
      rungs({
        VARIABLE_IMPORTANCE: supported(),
        PAIN: proven(),
        ECONOMIC_PAIN: proven(),
        MECHANISM: proven(),
        CAPABILITY: proven(),
      }),
      l,
    );
    expect(r.frontier).toBe("CAPABILITY");
  });

  it("explains itself with system messages that render in both languages", () => {
    const r = computeProofFrontier(
      rungs({
        VARIABLE_IMPORTANCE: supported(),
        PAIN: proven(),
        ECONOMIC_PAIN: proven(),
        MECHANISM: proven(),
        CAPABILITY: proven(),
      }),
      links({ "MECHANISM->CAPABILITY": hypothesis() }),
    );
    const blocker = r.blockedAt!.blockers[0];
    expect(blocker.kind).toBe("NO_EVIDENCE");
    expect(blocker.message.key).toBe("frontier.blocker.noEvidence.link");
    expect(blocker.message.text).toBe(
      'Mechanism → Capability: causal link "MECHANISM->CAPABILITY" has no linked evidence (HYPOTHESIS).',
    );
    expect(renderMessage(blocker.message, "fr")).toMatch(
      /^.+ → .+ : le lien causal « MECHANISM->CAPABILITY » n’a aucune preuve liée \(HYPOTHESIS\)\.$/,
    );
    expect(renderMessage(r.explanation[0], "fr")).toMatch(/^Frontière de preuve actuelle : /);
    expect(r.whyStops).toEqual(blocker.message);
  });
});
