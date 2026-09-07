import { describe, expect, it } from "vitest";
import { computeOpportunityScore, OPPORTUNITY_WEIGHTS } from "@/services/scoring/opportunity-score";

describe("computeOpportunityScore", () => {
  it("weights sum to 1", () => {
    const sum = Object.values(OPPORTUNITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("returns 100 when every input is 10", () => {
    const r = computeOpportunityScore({
      importance: 10,
      painIntensity: 10,
      frequency: 10,
      gap: 10,
      willingnessToPay: 10,
      alternativeWeakness: 10,
    });
    expect(r.score).toBe(100);
  });

  it("returns 0 when every input is 0", () => {
    const r = computeOpportunityScore({
      importance: 0,
      painIntensity: 0,
      frequency: 0,
      gap: 0,
      willingnessToPay: 0,
      alternativeWeakness: 0,
    });
    expect(r.score).toBe(0);
  });

  it("applies the specified weights (importance 20%, pain 20%, frequency 15%, gap 15%, WTP 20%, alt 10%)", () => {
    const r = computeOpportunityScore({
      importance: 8,
      painIntensity: 7,
      frequency: 6,
      gap: 5,
      willingnessToPay: 4,
      alternativeWeakness: 3,
    });
    // 8*2 + 7*2 + 6*1.5 + 5*1.5 + 4*2 + 3*1 = 16+14+9+7.5+8+3 = 57.5 → 58
    expect(r.score).toBe(58);
    expect(r.components.find((c) => c.key === "importance")?.points).toBe(16);
    expect(r.components.find((c) => c.key === "alternativeWeakness")?.points).toBe(3);
  });

  it("clamps out-of-range and invalid inputs", () => {
    const r = computeOpportunityScore({
      importance: 15,
      painIntensity: -3,
      frequency: Number.NaN,
      gap: 10,
      willingnessToPay: 10,
      alternativeWeakness: 10,
    });
    expect(r.components.find((c) => c.key === "importance")?.value).toBe(10);
    expect(r.components.find((c) => c.key === "painIntensity")?.value).toBe(0);
    expect(r.components.find((c) => c.key === "frequency")?.value).toBe(0);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("is deterministic and explains itself", () => {
    const inputs = {
      importance: 9,
      painIntensity: 8,
      frequency: 8,
      gap: 7,
      willingnessToPay: 8,
      alternativeWeakness: 7,
    };
    const a = computeOpportunityScore(inputs);
    const b = computeOpportunityScore(inputs);
    expect(a).toEqual(b);
    expect(a.explanation.at(-1)).toBe(`Total: ${a.score}/100`);
    expect(a.weakestInputs).toEqual(["gap", "alternativeWeakness"]);
  });
});
