import { describe, expect, it } from "vitest";
import { computeValueStrength } from "@/services/value/value-strength";
import { computeCausalConfidence } from "@/services/value/causal-confidence";
import {
  computeProofFrontier,
  FRONTIER_THRESHOLDS,
  frontierMovement,
} from "@/services/value/proof-frontier";
import { assessClaim, type ClaimEvidenceInput } from "@/services/value/epistemic";
import { textOf } from "@/i18n/messages";

function evidence(
  strength: number,
  opts: Partial<ClaimEvidenceInput["signal"]> = {},
  direction: ClaimEvidenceInput["direction"] = "SUPPORTS",
): ClaimEvidenceInput {
  return {
    direction,
    signal: {
      type: "INTERVIEW",
      strengthScore: strength,
      relevanceScore: 9,
      sentiment: "POSITIVE",
      sourceDate: new Date(),
      isDirectCustomer: true,
      hasExplicitPain: true,
      hasEconomicImpact: true,
      hasWorkaround: false,
      hasPurchaseIntent: false,
      ...opts,
    },
  };
}

const strong = () =>
  assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [evidence(9)] });
const weak = () =>
  assessClaim({
    hasStatement: true,
    generatedBy: "AI_HYPOTHESIS",
    evidence: [
      evidence(3, {
        type: "FORUM_POST",
        isDirectCustomer: false,
        hasExplicitPain: false,
        hasEconomicImpact: false,
      }),
    ],
  });
const none = () => assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [] });

describe("Value Strength completeness", () => {
  it("one missing dimension ⇒ INCOMPLETE · 4/5, names it and asks the next value question", () => {
    const r = computeValueStrength(
      { importance: 9, magnitude: 7, frequency: 8, population: null, attributability: 6 },
      {
        variableName: "no-show rate",
        icpName: "the salon owner",
        provenance: {
          importance: "INTERVIEW",
          magnitude: "INTERVIEW",
          frequency: "EXTERNAL_EVIDENCE",
        },
      },
    );
    expect(r.status).toBe("INCOMPLETE");
    expect(r.score).toBeNull();
    expect(r.completeness).toBe("4/5");
    expect(r.missing).toEqual(["population"]);
    expect(r.nextQuestion?.text).toMatch(/affected by no-show rate/);
    expect(r.dimensions.find((d) => d.key === "frequency")?.provenance).toBe("EVIDENCE");
    expect(r.dimensions.find((d) => d.key === "population")?.provenance).toBe("UNKNOWN");
    expect(r.dimensions.find((d) => d.key === "attributability")?.provenance).toBe("HYPOTHESIS");
  });

  it("UNKNOWN never becomes zero: a missing dimension is not a 0/10", () => {
    const incomplete = computeValueStrength({
      importance: 9,
      magnitude: 9,
      frequency: 9,
      population: null,
      attributability: 9,
    });
    const zero = computeValueStrength({
      importance: 9,
      magnitude: 9,
      frequency: 9,
      population: 0,
      attributability: 9,
    });
    expect(incomplete.score).toBeNull();
    expect(zero.status).toBe("COMPLETE");
    expect(zero.score).toBe(0);
    expect(incomplete.explanation.map((x) => x.text).join(" ")).toMatch(/UNKNOWN ≠ 0/);
  });

  it("complete dimensions give 5/5 and a score", () => {
    const r = computeValueStrength({
      importance: 9,
      magnitude: 7,
      frequency: 8,
      population: 7,
      attributability: 6,
    });
    expect(r.completeness).toBe("5/5");
    expect(r.score).toBeGreaterThan(0);
    expect(r.nextQuestion).toBeNull();
  });
});

describe("Causal Confidence completeness", () => {
  it("reports missing links, coverage and the blocking link", () => {
    const r = computeCausalConfidence([
      {
        from: "MECHANISM",
        to: "CAPABILITY",
        statement: "Matching reveals leakage.",
        criticality: "CRITICAL",
        assessment: strong(),
      },
      {
        from: "CAPABILITY",
        to: "TRANSFORMATION",
        statement: "Owners act on surfaced gaps.",
        criticality: "CRITICAL",
        assessment: strong(),
      },
      // TRANSFORMATION → OPERATIONAL_VALUE not stated at all
      {
        from: "OPERATIONAL_VALUE",
        to: "ECONOMIC_VALUE",
        statement: "Caught leakage is recovered.",
        criticality: "CRITICAL",
        assessment: none(),
      },
    ]);
    expect(r.status).toBe("INCOMPLETE");
    expect(r.score).toBeNull();
    expect(r.validated).toBe(2);
    expect(r.total).toBe(4); // 3 stated + 1 missing scoring link; strategic link absent
    expect(r.completeness).toBe("2/4");
    expect(
      r.missing.some((m) =>
        /TRANSFORMATION → OPERATIONAL_VALUE: causal link not stated/.test(m.text),
      ),
    ).toBe(true);
    expect(r.blocking?.label.text).toBe("Transformation → Operational value");
    expect(r.nextQuestion?.text).toMatch(/connects Transformation to Operational value/);
    expect(r.links.find((l) => l.from === "OPERATIONAL_VALUE")?.status).toBe("HYPOTHESIS");
  });

  it("a link without evidence is UNKNOWN/HYPOTHESIS, never a zero that enters a score", () => {
    const r = computeCausalConfidence([
      {
        from: "MECHANISM",
        to: "CAPABILITY",
        statement: "a",
        criticality: "CRITICAL",
        assessment: strong(),
      },
      {
        from: "CAPABILITY",
        to: "TRANSFORMATION",
        statement: "b",
        criticality: "CRITICAL",
        assessment: strong(),
      },
      {
        from: "TRANSFORMATION",
        to: "OPERATIONAL_VALUE",
        statement: "c",
        criticality: "CRITICAL",
        assessment: none(),
      },
      {
        from: "OPERATIONAL_VALUE",
        to: "ECONOMIC_VALUE",
        statement: "d",
        criticality: "CRITICAL",
        assessment: strong(),
      },
    ]);
    expect(r.score).toBeNull();
    expect(r.explanation[0].text).toMatch(/UNKNOWN, not zero/);
  });
});

describe("Proof Frontier explanation", () => {
  const rungs = (mechanism = strong(), capability = strong(), transformation = weak()) => [
    { rung: "VARIABLE_IMPORTANCE" as const, assessment: strong() },
    { rung: "PAIN" as const, assessment: strong() },
    { rung: "ECONOMIC_PAIN" as const, assessment: strong() },
    { rung: "MECHANISM" as const, assessment: mechanism },
    { rung: "CAPABILITY" as const, assessment: capability },
    { rung: "TRANSFORMATION" as const, assessment: transformation },
  ];
  const links = (mc = strong(), ct = strong()) => [
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

  it("identifies the actual blocker with confidence and required threshold", () => {
    const r = computeProofFrontier(rungs(), links());
    expect(r.frontier).toBe("CAPABILITY");
    expect(r.blockedAt?.rung).toBe("TRANSFORMATION");
    const blocker = r.blockedAt?.blockers[0];
    expect(blocker?.kind).toBe("BELOW_THRESHOLD");
    expect(blocker?.required).toBe(FRONTIER_THRESHOLDS.TRANSFORMATION);
    expect(textOf(r.whyStops)).toMatch(/Transformation: confidence \d+, required threshold 50/);
  });

  it("an untested critical assumption on a link is named as the blocker", () => {
    const gated = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [evidence(9)],
      assumptions: [
        {
          statement: "POS exposes the data",
          status: "UNKNOWN",
          importance: 9,
          kind: "FEASIBILITY",
        },
      ],
    });
    const r = computeProofFrontier(rungs(), links(gated, strong()));
    expect(r.frontier).toBe("MECHANISM");
    expect(
      r.blockedAt?.blockers.some(
        (b) => b.kind === "UNTESTED_ASSUMPTION" && b.assumption === "POS exposes the data",
      ),
    ).toBe(true);
    expect(textOf(r.whyStops)).toMatch(/critical causal assumption remains untested/);
  });

  it("contradictory evidence is named as the blocker", () => {
    const contradicted = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [evidence(9), evidence(9, {}, "CONTRADICTS")],
    });
    const r = computeProofFrontier(rungs(strong(), contradicted), links());
    expect(r.frontier).toBe("MECHANISM");
    expect(r.blockedAt?.blockers.some((b) => b.kind === "CONTRADICTION")).toBe(true);
  });

  it("downstream economic claims require stronger proof than direct product claims", () => {
    expect(FRONTIER_THRESHOLDS.ECONOMIC_VALUE).toBeGreaterThan(FRONTIER_THRESHOLDS.MECHANISM);
    expect(FRONTIER_THRESHOLDS.STRATEGIC_OUTCOME).toBeGreaterThanOrEqual(
      FRONTIER_THRESHOLDS.ECONOMIC_VALUE,
    );
  });

  it("frontier movement is derived from rung order", () => {
    expect(frontierMovement("ECONOMIC_PAIN", "MECHANISM")).toBe("FORWARD");
    expect(frontierMovement("CAPABILITY", "MECHANISM")).toBe("BACKWARD");
    expect(frontierMovement("NONE", "NONE")).toBe("NONE");
  });
});
