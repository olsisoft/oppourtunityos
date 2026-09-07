import { describe, expect, it } from "vitest";
import { DiscoveryExtractionSchema } from "@/services/ai/schemas";
import { buildMockTurn, decomposeIdea, MOCK_LABEL } from "@/services/ai/providers/mock";
import type { TurnHints } from "@/services/ai/types";

function hints(overrides: Partial<TurnHints> = {}): TurnHints {
  return {
    workspaceName: "Test",
    stage: "START",
    entryMode: "HAS_IDEA",
    ideaStatement: "AI receptionist for dental clinics",
    userMessage: "AI receptionist for dental clinics",
    turnIndex: 0,
    counts: {
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
    },
    userContext: null,
    existing: { markets: [], icps: [], variables: [], pains: [], mechanisms: [] },
    ...overrides,
  };
}

describe("mock provider", () => {
  it("decomposes 'X for Y' ideas into mechanism and ICP", () => {
    expect(decomposeIdea("AI receptionist for dental clinics")).toEqual({
      mechanism: "AI receptionist",
      icp: "dental clinics",
    });
    expect(decomposeIdea("Something vague")).toEqual({
      mechanism: "Something vague",
      icp: "UNKNOWN",
    });
  });

  it("labels every reply as mock and never fabricates evidence", () => {
    const turn = buildMockTurn(hints());
    expect(turn.reply).toContain(MOCK_LABEL);
    expect(DiscoveryExtractionSchema.safeParse(turn.extraction).success).toBe(true);
    expect(JSON.stringify(turn.extraction)).not.toMatch(/"evidence"/);
  });

  it("reverse-engineers an idea into market, ICP, variables and assumptions before evaluating it", () => {
    const { extraction, reply } = buildMockTurn(hints());
    expect(extraction.markets[0]?.name).toBe("Dental clinics");
    expect(extraction.icps[0]?.name).toBe("Dental clinic");
    expect(extraction.variables.map((v) => v.name)).toContain("Missed calls");
    expect(extraction.assumptions.length).toBeGreaterThanOrEqual(3);
    expect(extraction.stage.suggestedStage).toBe("VARIABLE_DISCOVERY");
    expect(reply).toMatch(/I will not evaluate/);
    expect(extraction.icps[0]?.economicBuyer).toMatch(/UNKNOWN/);
  });

  it("does not mutate the user context passed in hints", () => {
    const ctx = {
      industries: ["Salons"],
      audiences: [],
      businessModel: "UNKNOWN" as const,
      productPreferences: [],
      avoidIndustries: [],
      technicalStrengths: [],
    };
    buildMockTurn(
      hints({
        entryMode: "NO_IDEA",
        stage: "USER_CONTEXT",
        userMessage: "Small business owners",
        userContext: ctx,
      }),
    );
    expect(ctx.audiences).toEqual([]);
  });

  it("proposes scoring inputs but never a final score or verdict", () => {
    const { extraction, reply } = buildMockTurn(
      hints({
        stage: "MECHANISM_DISCOVERY",
        userMessage: "Risk prediction",
        existing: {
          markets: ["Dental clinics"],
          icps: ["Dental clinic"],
          variables: ["Missed calls"],
          pains: ["Missed calls are worse than they should be"],
          mechanisms: ["Risk prediction"],
        },
      }),
    );
    expect(extraction.opportunities).toHaveLength(1);
    expect(extraction.opportunities[0].inputs.importance).toBeGreaterThanOrEqual(0);
    expect(reply).toMatch(
      /computes Opportunity Potential, Evidence Confidence and the verdict deterministically/,
    );
    expect(reply).not.toMatch(/\b\d{2}\/100\b/);
  });
});
