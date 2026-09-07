import { describe, expect, it } from "vitest";
import { countCritical, evaluateKillCriteria } from "@/services/scoring/kill-criteria";

const healthy = {
  inputs: {
    importance: 9,
    painIntensity: 8,
    frequency: 8,
    gap: 7,
    willingnessToPay: 8,
    alternativeWeakness: 7,
  },
  hasTrigger: true,
  hasMetric: true,
  economicBuyerKnown: true,
  icpReachability: "Owner answers the salon phone; 12 local salons already contacted",
  evidenceScore: 65,
  hasEconomicImpactEvidence: true,
  alternativeCount: 2,
};

describe("evaluateKillCriteria", () => {
  it("returns no warnings for a healthy opportunity", () => {
    expect(evaluateKillCriteria(healthy)).toEqual([]);
  });

  it("flags low pain and low willingness to pay as critical", () => {
    const w = evaluateKillCriteria({
      ...healthy,
      inputs: { ...healthy.inputs, painIntensity: 3, willingnessToPay: 2 },
    });
    expect(w.map((x) => x.code)).toEqual(expect.arrayContaining(["LOW_PAIN", "LOW_WTP"]));
    expect(countCritical(w)).toBe(2);
  });

  it("flags missing trigger, rare problems, missing metric and unknown buyer", () => {
    const w = evaluateKillCriteria({
      ...healthy,
      hasTrigger: false,
      hasMetric: false,
      economicBuyerKnown: false,
      inputs: { ...healthy.inputs, frequency: 2 },
    });
    expect(w.map((x) => x.code)).toEqual(
      expect.arrayContaining(["NO_TRIGGER", "RARE", "NO_METRIC", "BUYER_UNKNOWN"]),
    );
  });

  it("flags adequate alternatives and non-economic variables as critical", () => {
    const w = evaluateKillCriteria({
      ...healthy,
      inputs: { ...healthy.inputs, alternativeWeakness: 2, importance: 3 },
    });
    expect(w.map((x) => x.code)).toEqual(
      expect.arrayContaining(["ALTERNATIVE_ADEQUATE", "NOT_ECONOMIC"]),
    );
  });

  it("flags unreachable ICP, personal curiosity and oversized solutions", () => {
    const w = evaluateKillCriteria({
      ...healthy,
      icpReachability: "Hard to reach, no access to buyers",
      isPersonalCuriosity: true,
      solutionComplexity: 10,
      inputs: { ...healthy.inputs, importance: 5 },
    });
    expect(w.map((x) => x.code)).toEqual(
      expect.arrayContaining(["ICP_UNREACHABLE", "PERSONAL_CURIOSITY", "SOLUTION_TOO_BIG"]),
    );
  });

  it("flags evidence without economic quantification", () => {
    const w = evaluateKillCriteria({ ...healthy, hasEconomicImpactEvidence: false });
    expect(w.map((x) => x.code)).toContain("NO_ECONOMIC_EVIDENCE");
  });
});
