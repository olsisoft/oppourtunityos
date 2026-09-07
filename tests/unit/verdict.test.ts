import { describe, expect, it } from "vitest";
import { computeVerdict } from "@/services/scoring/verdict";

describe("computeVerdict", () => {
  it.each([
    [30, 30, "IGNORE"],
    [39, 39, "IGNORE"],
    [45, 65, "KILL"],
    [20, 90, "KILL"],
    [80, 30, "RESEARCH"],
    [70, 49, "RESEARCH"],
    [65, 55, "INVESTIGATE"],
    [60, 40, "INVESTIGATE"],
    [72, 65, "INTERVIEW"],
    [90, 60, "INTERVIEW"],
    [75, 75, "TEST"],
    [91, 87, "TEST"],
  ])("opportunity %i + evidence %i → %s", (o, e, expected) => {
    expect(computeVerdict(o, e).verdict).toBe(expected);
  });

  it("high potential with low evidence is RESEARCH, never a build-like verdict", () => {
    const r = computeVerdict(95, 10);
    expect(r.verdict).toBe("RESEARCH");
    expect(r.reasons.join(" ")).toMatch(/never BUILD/);
  });

  it("is total: every score pair produces a verdict", () => {
    for (let o = 0; o <= 100; o += 1) {
      for (let e = 0; e <= 100; e += 1) {
        const r = computeVerdict(o, e);
        expect(r.ruleId).not.toBe("UNMATCHED");
        expect(["IGNORE", "KILL", "RESEARCH", "INVESTIGATE", "INTERVIEW", "TEST"]).toContain(
          r.verdict,
        );
      }
    }
  });

  it("uses documented fallbacks for gaps in the primary grid", () => {
    expect(computeVerdict(85, 55)).toMatchObject({ verdict: "RESEARCH", isFallback: true });
    expect(computeVerdict(72, 55)).toMatchObject({ verdict: "INVESTIGATE", isFallback: false });
    expect(computeVerdict(55, 20)).toMatchObject({ verdict: "RESEARCH", isFallback: true });
    expect(computeVerdict(65, 80)).toMatchObject({ verdict: "INVESTIGATE", isFallback: true });
    expect(computeVerdict(55, 50)).toMatchObject({ verdict: "INVESTIGATE", isFallback: true });
    expect(computeVerdict(45, 30)).toMatchObject({ verdict: "IGNORE", isFallback: true });
  });

  it("derives confidence from evidence only", () => {
    expect(computeVerdict(90, 20).confidence).toBe("LOW");
    expect(computeVerdict(90, 55).confidence).toBe("MEDIUM");
    expect(computeVerdict(90, 80).confidence).toBe("HIGH");
  });

  it("explains why", () => {
    const r = computeVerdict(88, 61);
    expect(r.reasons).toContain("Opportunity Potential is 88/100.");
    expect(r.reasons).toContain("Evidence Confidence is 61/100.");
    expect(r.condition).toBe("Opportunity ≥ 70 and Evidence ≥ 60");
  });
});
