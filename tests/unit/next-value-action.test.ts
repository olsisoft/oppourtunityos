import { describe, expect, it } from "vitest";
import { computeEvidenceScore } from "@/services/scoring/evidence-score";
import { assessClaim } from "@/services/value/epistemic";
import { computeProofFrontier } from "@/services/value/proof-frontier";
import { computeValueActions, type ValueActionInput } from "@/services/value/next-value-action";
import { computeValueStrength } from "@/services/value/value-strength";

const hypothesis = () =>
  assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [] });

function baseInput(): ValueActionInput {
  const frontier = computeProofFrontier(
    [
      { rung: "VARIABLE_IMPORTANCE", assessment: hypothesis() },
      { rung: "PAIN", assessment: hypothesis() },
      { rung: "ECONOMIC_PAIN", assessment: hypothesis() },
      { rung: "MECHANISM", assessment: hypothesis() },
      { rung: "CAPABILITY", assessment: hypothesis() },
    ],
    [
      {
        from: "MECHANISM",
        to: "CAPABILITY",
        statement: "Reminders reach risky bookings",
        criticality: "CRITICAL",
        assessment: hypothesis(),
      },
    ],
  );
  return {
    frontier,
    causal: null,
    valueStrength: computeValueStrength({
      importance: 9,
      magnitude: null,
      frequency: 8,
      population: null,
      attributability: null,
    }),
    evidence: computeEvidenceScore([]),
    assumptions: [],
    links: [
      {
        id: "l1",
        statement: "Reminders reach risky bookings",
        from: "MECHANISM",
        to: "CAPABILITY",
        criticality: "CRITICAL",
        assessment: hypothesis(),
      },
    ],
    nodes: [{ level: "MECHANISM", statement: "Adaptive reminders", assessment: hypothesis() }],
    icpName: "salon owners",
    variableName: "no-show rate",
    painDescription: "no-shows",
    mechanism: "adaptive reminders",
  };
}

describe("computeValueActions", () => {
  it("puts a collapse-level assumption first, with what/why/affects/ifFalse/evidence", () => {
    const input = baseInput();
    input.assumptions = [
      {
        id: "a1",
        statement: "If high-risk bookings receive adaptive reminders, the no-show rate decreases.",
        kind: "CAUSAL",
        status: "UNKNOWN",
        importance: 9,
        evidenceCount: 0,
        linkedTo: "Mechanism → Capability",
      },
    ];
    const [first] = computeValueActions(input);
    expect(first.type).toBe("COLLAPSE_ASSUMPTION");
    expect(first.what).toMatch(/adaptive reminders/);
    expect(first.ifFalse).toMatch(/collapses/);
    expect(first.evidenceToMove).toMatch(/controlled comparison/);
    expect(first.experiment).toMatch(/pilot/);
  });

  it("otherwise targets the causal link blocking the Proof Frontier", () => {
    const input = baseInput();
    input.frontier = computeProofFrontier(
      [
        {
          rung: "VARIABLE_IMPORTANCE",
          assessment: assessClaim({
            hasStatement: true,
            generatedBy: "USER",
            evidence: [
              {
                direction: "SUPPORTS",
                signal: {
                  type: "INTERVIEW",
                  strengthScore: 9,
                  relevanceScore: 9,
                  sentiment: "POSITIVE",
                  sourceDate: "2026-06-01",
                  isDirectCustomer: true,
                  hasExplicitPain: true,
                  hasEconomicImpact: true,
                  hasWorkaround: false,
                  hasPurchaseIntent: true,
                },
              },
            ],
          }),
        },
        {
          rung: "PAIN",
          assessment: assessClaim({
            hasStatement: true,
            generatedBy: "USER",
            evidence: [
              {
                direction: "SUPPORTS",
                signal: {
                  type: "INTERVIEW",
                  strengthScore: 9,
                  relevanceScore: 9,
                  sentiment: "POSITIVE",
                  sourceDate: "2026-06-01",
                  isDirectCustomer: true,
                  hasExplicitPain: true,
                  hasEconomicImpact: true,
                  hasWorkaround: false,
                  hasPurchaseIntent: true,
                },
              },
            ],
          }),
        },
        {
          rung: "ECONOMIC_PAIN",
          assessment: assessClaim({
            hasStatement: true,
            generatedBy: "USER",
            evidence: [
              {
                direction: "SUPPORTS",
                signal: {
                  type: "INTERVIEW",
                  strengthScore: 9,
                  relevanceScore: 9,
                  sentiment: "POSITIVE",
                  sourceDate: "2026-06-01",
                  isDirectCustomer: true,
                  hasExplicitPain: true,
                  hasEconomicImpact: true,
                  hasWorkaround: false,
                  hasPurchaseIntent: true,
                },
              },
            ],
          }),
        },
        {
          rung: "MECHANISM",
          assessment: assessClaim({
            hasStatement: true,
            generatedBy: "USER",
            evidence: [
              {
                direction: "SUPPORTS",
                signal: {
                  type: "INTERVIEW",
                  strengthScore: 9,
                  relevanceScore: 9,
                  sentiment: "POSITIVE",
                  sourceDate: "2026-06-01",
                  isDirectCustomer: true,
                  hasExplicitPain: true,
                  hasEconomicImpact: true,
                  hasWorkaround: false,
                  hasPurchaseIntent: true,
                },
              },
            ],
          }),
        },
        { rung: "CAPABILITY", assessment: hypothesis() },
      ],
      input.links.map((l) => ({
        from: l.from,
        to: l.to,
        statement: l.statement,
        criticality: l.criticality,
        assessment: l.assessment,
      })),
    );
    const [first] = computeValueActions(input);
    expect(first.type).toBe("CAUSAL_LINK");
    expect(first.what).toMatch(/Test the causal link/);
    expect(first.affects).toBe("Mechanism → Capability");
    expect(first.causalLinkId).toBe("l1");
  });

  it("asks for economic magnitude when the dimension is UNKNOWN and never estimates it", () => {
    const actions = computeValueActions(baseInput());
    const magnitude = actions.find((a) => a.type === "ECONOMIC_MAGNITUDE");
    expect(magnitude?.why).toMatch(/UNKNOWN/);
    expect(actions.some((a) => a.type === "SECONDARY" && /population/i.test(a.what))).toBe(true);
  });
});

describe("next best action — ordinal prioritization", () => {
  it("ranks actions by decision impact × information gain ÷ effort and explains why now", async () => {
    const { computeValueActions, ordinalFromEstimate } =
      await import("@/services/value/next-value-action");
    const { computeProofFrontier } = await import("@/services/value/proof-frontier");
    const { computeValueStrength } = await import("@/services/value/value-strength");
    const { assessClaim } = await import("@/services/value/epistemic");
    const none = assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [] });
    const frontier = computeProofFrontier(
      [
        { rung: "VARIABLE_IMPORTANCE", assessment: none },
        { rung: "PAIN", assessment: none },
        { rung: "ECONOMIC_PAIN", assessment: none },
      ],
      [],
    );
    const actions = computeValueActions({
      frontier,
      causal: null,
      valueStrength: computeValueStrength({
        importance: 7,
        magnitude: null,
        frequency: null,
        population: null,
        attributability: null,
      }),
      evidence: {
        components: [],
        gaps: ["No direct customer evidence."],
        counts: { total: 0, supporting: 0, contradicting: 0, neutral: 0, direct: 0 },
      },
      assumptions: [
        {
          id: "a1",
          statement: "Salons would pay €99/month.",
          kind: "WTP",
          status: "UNKNOWN",
          importance: 9,
          evidenceCount: 0,
          linkedTo: null,
        },
      ],
      links: [],
      nodes: [],
      experiments: [
        {
          id: "e1",
          status: "PLANNED",
          assumptionId: "a1",
          causalLinkId: null,
          valueChainNodeId: null,
          decisionImpact: 9,
          expectedInformationGain: 8,
          effort: 2,
          timeEstimate: "2 days",
          costEstimate: "€100",
        },
      ],
    });
    expect(actions[0].priority).toBe(1);
    expect(actions[0].priorityScore).toBeGreaterThan(actions[actions.length - 1].priorityScore);
    expect(actions[0].whyNow).toMatch(/cheapest|tractable|independent assumption/);
    // the planned experiment supplies effort / time / cost, so nothing is assumed for it
    const wtp = actions.find((a) => a.assumptionId === "a1");
    expect(wtp?.scoring.assumed).toEqual([]);
    expect(wtp?.scoring.effort).toBe(2);
    // an action without a planned experiment flags its assumed dimensions
    const other = actions.find((a) => a.type === "ECONOMIC_MAGNITUDE");
    expect(other?.scoring.assumed).toContain("effort");
    expect(ordinalFromEstimate("2 days")).toBe(2);
    expect(ordinalFromEstimate("3 weeks")).toBeGreaterThan(ordinalFromEstimate("2 days")!);
    expect(ordinalFromEstimate("€100")).toBe(1);
  });
});
