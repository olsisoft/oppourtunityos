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
