import { describe, expect, it } from "vitest";
import { assessClaim, type ClaimEvidenceInput } from "@/services/value/epistemic";
import type { EvidenceSignal } from "@/services/scoring/evidence-score";

const NOW = new Date("2026-09-01T00:00:00Z");

function ev(
  direction: ClaimEvidenceInput["direction"],
  overrides: Partial<EvidenceSignal> = {},
): ClaimEvidenceInput {
  return {
    direction,
    signal: {
      type: "INTERVIEW",
      strengthScore: 8,
      relevanceScore: 8,
      sentiment: "POSITIVE",
      sourceDate: "2026-06-01",
      isDirectCustomer: true,
      hasExplicitPain: true,
      hasEconomicImpact: true,
      hasWorkaround: false,
      hasPurchaseIntent: false,
      ...overrides,
    },
  };
}

describe("assessClaim", () => {
  it("is UNKNOWN without a statement and HYPOTHESIS for an AI statement without evidence", () => {
    expect(
      assessClaim({ hasStatement: false, generatedBy: "AI_HYPOTHESIS", evidence: [] }).status,
    ).toBe("UNKNOWN");
    expect(
      assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [] }).status,
    ).toBe("HYPOTHESIS");
    expect(assessClaim({ hasStatement: true, generatedBy: "USER", evidence: [] }).status).toBe(
      "UNPROVEN",
    );
  });

  it("never becomes PROVEN or SUPPORTED without linked evidence, whatever the provenance", () => {
    for (const generatedBy of [
      "USER",
      "AI_HYPOTHESIS",
      "INTERVIEW",
      "COMPUTED",
      "EXTERNAL_EVIDENCE",
    ] as const) {
      const r = assessClaim({ hasStatement: true, generatedBy, evidence: [] });
      expect(["PROVEN", "SUPPORTED"]).not.toContain(r.status);
    }
  });

  it("becomes SUPPORTED then STRONGLY_SUPPORTED as evidence accumulates, using the evidence engine", () => {
    const weak = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [
        ev("SUPPORTS", {
          type: "REVIEW",
          strengthScore: 6,
          isDirectCustomer: false,
          hasEconomicImpact: false,
        }),
      ],
      now: NOW,
    });
    expect(weak.status).toBe("UNPROVEN"); // one weak indirect review is not enough
    const one = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [ev("SUPPORTS")],
      now: NOW,
    });
    expect(one.status).toBe("SUPPORTED"); // one strong direct statement with explicit pain and economic impact
    const many = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [
        ev("SUPPORTS"),
        ev("SUPPORTS", { hasPurchaseIntent: true }),
        ev("SUPPORTS", { type: "SURVEY", hasWorkaround: true }),
      ],
      now: NOW,
    });
    expect(many.status).toBe("STRONGLY_SUPPORTED");
    expect(many.confidence).toBeGreaterThanOrEqual(75);
  });

  it("uses the link direction, not the item's own sentiment", () => {
    const r = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [ev("CONTRADICTS", { sentiment: "POSITIVE" })],
      now: NOW,
    });
    expect(r.status).toBe("CONTRADICTED");
    expect(r.contradictingWeight).toBeGreaterThan(0);
    expect(r.supportingWeight).toBe(0);
  });

  it("is CONTRADICTED when contradiction outweighs support, and flags unresolved contradictions", () => {
    const r = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [ev("SUPPORTS", { strengthScore: 5 }), ev("CONTRADICTS", { strengthScore: 9 })],
      now: NOW,
    });
    expect(r.status).toBe("CONTRADICTED");
    expect(r.unresolvedContradiction).toBe(true);
  });

  it("a contradicted critical assumption makes the claim CONTRADICTED", () => {
    const r = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: [ev("SUPPORTS")],
      assumptions: [
        { statement: "Buyers control the budget", status: "CONTRADICTED", importance: 9 },
      ],
      now: NOW,
    });
    expect(r.status).toBe("CONTRADICTED");
    expect(r.contradictedAssumptions).toHaveLength(1);
  });

  it("lists completely untested critical assumptions", () => {
    const r = assessClaim({
      hasStatement: true,
      generatedBy: "USER",
      evidence: [ev("SUPPORTS")],
      assumptions: [
        { statement: "Critical and untested", status: "UNKNOWN", importance: 9 },
        { statement: "Minor and untested", status: "UNKNOWN", importance: 4 },
      ],
      now: NOW,
    });
    expect(r.untestedCriticalAssumptions).toEqual(["Critical and untested"]);
  });
});
