import { describe, expect, it } from "vitest";
import { computeValueStrength } from "@/services/value/value-strength";

describe("computeValueStrength", () => {
  it("is INCOMPLETE when any required dimension is UNKNOWN and names the missing ones", () => {
    const r = computeValueStrength({
      importance: 9,
      magnitude: null,
      frequency: 9,
      population: 7,
      attributability: undefined,
    });
    expect(r.status).toBe("INCOMPLETE");
    expect(r.score).toBeNull();
    expect(r.missing).toEqual(["magnitude", "attributability"]);
    expect(r.explanation.join(" ")).toMatch(/never guessed/);
  });

  it("is deterministic and uses a geometric mean (9,8,9,7,6 → 77)", () => {
    const dims = { importance: 9, magnitude: 8, frequency: 9, population: 7, attributability: 6 };
    const a = computeValueStrength(dims);
    const b = computeValueStrength(dims);
    expect(a).toEqual(b);
    expect(a.status).toBe("COMPLETE");
    // 100 × (0.9 × 0.8 × 0.9 × 0.7 × 0.6)^(1/5) = 77.08 → 77
    expect(a.score).toBe(77);
    expect(a.weakest).toBe("attributability");
  });

  it("lets one very weak dimension pull the score down hard", () => {
    const strong = computeValueStrength({
      importance: 9,
      magnitude: 9,
      frequency: 9,
      population: 9,
      attributability: 9,
    });
    const oneWeak = computeValueStrength({
      importance: 9,
      magnitude: 9,
      frequency: 9,
      population: 9,
      attributability: 1,
    });
    const zero = computeValueStrength({
      importance: 9,
      magnitude: 9,
      frequency: 9,
      population: 9,
      attributability: 0,
    });
    expect(strong.score).toBe(90);
    expect(oneWeak.score).toBeLessThan(60);
    expect(zero.score).toBe(0);
  });

  it("clamps out-of-range values", () => {
    const r = computeValueStrength({
      importance: 15,
      magnitude: 10,
      frequency: 10,
      population: 10,
      attributability: 10,
    });
    expect(r.score).toBe(100);
  });
});
