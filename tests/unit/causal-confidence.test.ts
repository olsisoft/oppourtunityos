import { describe, expect, it } from "vitest";
import { assessClaim } from "@/services/value/epistemic";
import { computeCausalConfidence, type CausalLinkInput } from "@/services/value/causal-confidence";
import type { EvidenceSignal } from "@/services/scoring/evidence-score";

const NOW = new Date("2026-09-01T00:00:00Z");
const base: EvidenceSignal = {
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
};

function link(
  from: CausalLinkInput["from"],
  to: CausalLinkInput["to"],
  n: number,
  criticality: CausalLinkInput["criticality"] = "CRITICAL",
  direction: "SUPPORTS" | "CONTRADICTS" = "SUPPORTS",
  designLevel: "ANECDOTAL" | "BEFORE_AFTER" | "CONTROLLED" = "CONTROLLED",
): CausalLinkInput {
  return {
    from,
    to,
    statement: `${from} → ${to}`,
    criticality,
    assessment: assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      // Controlled design by default so the chain arithmetic is visible; the
      // design ceiling is tested separately.
      evidence: Array.from({ length: n }, () => ({ signal: base, direction, designLevel })),
      now: NOW,
    }),
  };
}

describe("computeCausalConfidence", () => {
  it("is INCOMPLETE when a critical link has no evidence, and never fabricates a number", () => {
    const r = computeCausalConfidence([
      link("MECHANISM", "CAPABILITY", 3),
      link("CAPABILITY", "TRANSFORMATION", 0),
      link("TRANSFORMATION", "OPERATIONAL_VALUE", 3),
      link("OPERATIONAL_VALUE", "ECONOMIC_VALUE", 3),
    ]);
    expect(r.status).toBe("INCOMPLETE");
    expect(r.score).toBeNull();
    expect(r.missing[0].text).toMatch(/CAPABILITY → TRANSFORMATION/);
  });

  it("is INCOMPLETE when a chain link is not stated", () => {
    const r = computeCausalConfidence([link("MECHANISM", "CAPABILITY", 3)]);
    expect(r.status).toBe("INCOMPLETE");
    expect(r.missing.length).toBe(3);
  });

  it("equals the weakest critical link, not the average", () => {
    const strongLinks = [
      link("MECHANISM", "CAPABILITY", 4),
      link("CAPABILITY", "TRANSFORMATION", 4),
      link("TRANSFORMATION", "OPERATIONAL_VALUE", 1),
      link("OPERATIONAL_VALUE", "ECONOMIC_VALUE", 4),
    ];
    const r = computeCausalConfidence(strongLinks);
    expect(r.status).toBe("COMPLETE");
    const weakest = strongLinks[2].assessment.confidence;
    expect(r.score).toBe(weakest);
    expect(r.weakest?.from).toBe("TRANSFORMATION");
    const avg = strongLinks.reduce((s, l) => s + l.assessment.confidence, 0) / 4;
    expect(r.score as number).toBeLessThan(avg);
  });

  it("interview-only (anecdotal) evidence cannot push a causal link above the design ceiling", () => {
    const anecdotal = computeCausalConfidence([
      link("MECHANISM", "CAPABILITY", 4, "CRITICAL", "SUPPORTS", "ANECDOTAL"),
      link("CAPABILITY", "TRANSFORMATION", 4, "CRITICAL", "SUPPORTS", "ANECDOTAL"),
      link("TRANSFORMATION", "OPERATIONAL_VALUE", 4, "CRITICAL", "SUPPORTS", "ANECDOTAL"),
      link("OPERATIONAL_VALUE", "ECONOMIC_VALUE", 4, "CRITICAL", "SUPPORTS", "ANECDOTAL"),
    ]);
    expect(anecdotal.status).toBe("COMPLETE");
    expect(anecdotal.score as number).toBeLessThanOrEqual(30);
    expect(anecdotal.weakest?.cappedBy?.text).toMatch(/anecdotal/);
    const beforeAfter = computeCausalConfidence([
      link("MECHANISM", "CAPABILITY", 4, "CRITICAL", "SUPPORTS", "BEFORE_AFTER"),
      link("CAPABILITY", "TRANSFORMATION", 4, "CRITICAL", "SUPPORTS", "BEFORE_AFTER"),
      link("TRANSFORMATION", "OPERATIONAL_VALUE", 4, "CRITICAL", "SUPPORTS", "BEFORE_AFTER"),
      link("OPERATIONAL_VALUE", "ECONOMIC_VALUE", 4, "CRITICAL", "SUPPORTS", "BEFORE_AFTER"),
    ]);
    expect(beforeAfter.score as number).toBeGreaterThan(anecdotal.score as number);
    expect(beforeAfter.score as number).toBeLessThanOrEqual(60);
  });

  it("caps a contradicted critical link", () => {
    const r = computeCausalConfidence([
      link("MECHANISM", "CAPABILITY", 4),
      link("CAPABILITY", "TRANSFORMATION", 4),
      link("TRANSFORMATION", "OPERATIONAL_VALUE", 2, "CRITICAL", "CONTRADICTS"),
      link("OPERATIONAL_VALUE", "ECONOMIC_VALUE", 4),
    ]);
    expect(r.status).toBe("COMPLETE");
    expect(r.score as number).toBeLessThanOrEqual(25);
  });

  it("a non-critical weak link does not drag the score when critical links are strong", () => {
    const r = computeCausalConfidence([
      link("MECHANISM", "CAPABILITY", 4),
      link("CAPABILITY", "TRANSFORMATION", 4),
      link("TRANSFORMATION", "OPERATIONAL_VALUE", 4),
      link("OPERATIONAL_VALUE", "ECONOMIC_VALUE", 1, "MINOR"),
    ]);
    expect(r.status).toBe("COMPLETE");
    expect(r.weakest?.criticality).toBe("CRITICAL");
  });
});
