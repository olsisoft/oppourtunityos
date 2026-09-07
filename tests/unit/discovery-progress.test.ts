import { describe, expect, it } from "vitest";
import { computeDiscoveryProgress } from "@/services/scoring/discovery-progress";

describe("computeDiscoveryProgress", () => {
  it("starts empty and points at user context", () => {
    const p = computeDiscoveryProgress({
      userContextCaptured: false,
      markets: 0,
      icps: 0,
      variables: 0,
      pains: 0,
      triggers: 0,
      alternatives: 0,
      evidence: 0,
      mechanisms: 0,
      opportunities: 0,
      scoredOpportunities: 0,
    });
    expect(p.overallPercent).toBe(0);
    expect(p.nextIncompleteStage).toBe("USER_CONTEXT");
    expect(p.steps.every((s) => s.status === "pending")).toBe(true);
  });

  it("reports partial evidence progress and the next incomplete stage", () => {
    const p = computeDiscoveryProgress({
      userContextCaptured: true,
      markets: 1,
      icps: 1,
      variables: 5,
      pains: 3,
      triggers: 2,
      alternatives: 2,
      evidence: 2,
      mechanisms: 0,
      opportunities: 0,
      scoredOpportunities: 0,
    });
    const evidence = p.steps.find((s) => s.stage === "EVIDENCE_DISCOVERY");
    expect(evidence?.status).toBe("partial");
    expect(evidence?.percent).toBe(33);
    expect(p.nextIncompleteStage).toBe("EVIDENCE_DISCOVERY");
  });

  it("is complete when every artifact exists", () => {
    const p = computeDiscoveryProgress({
      userContextCaptured: true,
      markets: 1,
      icps: 1,
      variables: 5,
      pains: 3,
      triggers: 2,
      alternatives: 2,
      evidence: 8,
      mechanisms: 4,
      opportunities: 3,
      scoredOpportunities: 3,
    });
    expect(p.overallPercent).toBe(100);
    expect(p.nextIncompleteStage).toBe("RECOMMENDATION");
  });
});
