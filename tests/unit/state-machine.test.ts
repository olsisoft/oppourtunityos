import { describe, expect, it } from "vitest";
import {
  maxReachableStage,
  resolveNextStage,
  stageSatisfied,
} from "@/services/discovery/state-machine";
import type { ProgressCounts } from "@/services/scoring/discovery-progress";

const empty: ProgressCounts = {
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
};

describe("discovery state machine", () => {
  it("cannot jump from MARKET_SELECTION to OPPORTUNITY_FORMATION without the intermediate artifacts", () => {
    const r = resolveNextStage("MARKET_SELECTION", "OPPORTUNITY_FORMATION", {
      counts: { ...empty, markets: 1 },
      entryMode: "NO_IDEA",
      aiReady: true,
    });
    expect(r.stage).toBe("ICP_DISCOVERY");
    expect(r.reason).toMatch(/prerequisites stop at ICP_DISCOVERY/);
  });

  it("allows an intelligent exception when the data already exists", () => {
    const counts: ProgressCounts = {
      ...empty,
      markets: 1,
      icps: 1,
      variables: 5,
      pains: 1,
      triggers: 1,
      alternatives: 2,
    };
    const r = resolveNextStage("USER_CONTEXT", "EVIDENCE_DISCOVERY", {
      counts,
      entryMode: "HAS_IDEA",
      aiReady: true,
    });
    expect(r.stage).toBe("EVIDENCE_DISCOVERY");
    expect(r.changed).toBe(true);
  });

  it("honors a backward suggestion (revisit)", () => {
    const r = resolveNextStage("PAIN_DISCOVERY", "ICP_DISCOVERY", {
      counts: { ...empty, markets: 1, icps: 1, variables: 2, pains: 1 },
      entryMode: "NO_IDEA",
      aiReady: false,
    });
    expect(r.stage).toBe("ICP_DISCOVERY");
  });

  it("stays put when nothing new was captured", () => {
    const r = resolveNextStage("ICP_DISCOVERY", null, {
      counts: { ...empty, markets: 1 },
      entryMode: "NO_IDEA",
      aiReady: false,
    });
    expect(r.stage).toBe("ICP_DISCOVERY");
    expect(r.changed).toBe(false);
  });

  it("HAS_IDEA skips the user-context stage", () => {
    expect(
      stageSatisfied("USER_CONTEXT", { counts: empty, entryMode: "HAS_IDEA", aiReady: false }),
    ).toBe(true);
    expect(
      stageSatisfied("USER_CONTEXT", { counts: empty, entryMode: "NO_IDEA", aiReady: false }),
    ).toBe(false);
  });

  it("evidence can be skipped knowingly, but scoring needs a value chain and a scored opportunity", () => {
    const counts: ProgressCounts = {
      ...empty,
      markets: 1,
      icps: 1,
      variables: 3,
      pains: 1,
      triggers: 1,
      alternatives: 1,
      mechanisms: 3,
      opportunities: 1,
    };
    // An opportunity without a value causality ladder stops at VALUE_CAUSALITY.
    expect(maxReachableStage({ counts, entryMode: "NO_IDEA", aiReady: true })).toBe(
      "VALUE_CAUSALITY",
    );
    // With a ladder (mechanism → capability → transformation …) scoring becomes reachable.
    const withChain = { ...counts, valueChainNodes: 6 };
    expect(maxReachableStage({ counts: withChain, entryMode: "NO_IDEA", aiReady: true })).toBe(
      "SCORING",
    );
    // A scored opportunity unlocks experiment design; an experiment (or an
    // explicit AI ready flag) unlocks the recommendation.
    const scored = { ...withChain, evidence: 1, scoredOpportunities: 1 };
    expect(maxReachableStage({ counts: scored, entryMode: "NO_IDEA", aiReady: false })).toBe(
      "EXPERIMENT_DESIGN",
    );
    expect(
      maxReachableStage({
        counts: { ...scored, experiments: 1 },
        entryMode: "NO_IDEA",
        aiReady: false,
      }),
    ).toBe("RECOMMENDATION");
  });
});
