import { describe, expect, it } from "vitest";
import { computeEvidenceScore, type EvidenceSignal } from "@/services/scoring/evidence-score";

const NOW = new Date("2026-09-01T00:00:00Z");

function item(overrides: Partial<EvidenceSignal> = {}): EvidenceSignal {
  return {
    type: "REDDIT",
    strengthScore: 3,
    relevanceScore: 5,
    sentiment: "POSITIVE",
    sourceDate: "2026-06-01",
    isDirectCustomer: false,
    hasExplicitPain: false,
    hasEconomicImpact: false,
    hasWorkaround: false,
    hasPurchaseIntent: false,
    ...overrides,
  };
}

describe("computeEvidenceScore", () => {
  it("returns 0 with an explicit explanation when there is no evidence", () => {
    const r = computeEvidenceScore([], NOW);
    expect(r.score).toBe(0);
    expect(r.explanation[0].text).toMatch(/No evidence captured/);
    expect(r.gaps.length).toBeGreaterThan(0);
  });

  it("values one strong direct interview above fifty vague reddit comments", () => {
    const interview = computeEvidenceScore(
      [
        item({
          type: "INTERVIEW",
          strengthScore: 9,
          relevanceScore: 9,
          isDirectCustomer: true,
          hasExplicitPain: true,
          hasEconomicImpact: true,
          hasPurchaseIntent: true,
        }),
      ],
      NOW,
    );
    const reddit = computeEvidenceScore(
      Array.from({ length: 50 }, () => item()),
      NOW,
    );
    expect(interview.score).toBeGreaterThan(reddit.score);
    expect(reddit.score).toBeLessThan(25);
  });

  it("does not simply count mentions: flagged components are gated", () => {
    const r = computeEvidenceScore(
      Array.from({ length: 20 }, () => item()),
      NOW,
    );
    const pain = r.components.find((c) => c.key === "explicitPain");
    const economic = r.components.find((c) => c.key === "economicImpact");
    expect(pain?.points).toBe(0);
    expect(economic?.points).toBe(0);
  });

  it("saturates: adding more of the same evidence has diminishing returns", () => {
    const one = computeEvidenceScore(
      [
        item({
          type: "CUSTOMER_QUOTE",
          strengthScore: 8,
          relevanceScore: 8,
          hasExplicitPain: true,
        }),
      ],
      NOW,
    );
    const three = computeEvidenceScore(
      Array.from({ length: 3 }, () =>
        item({
          type: "CUSTOMER_QUOTE",
          strengthScore: 8,
          relevanceScore: 8,
          hasExplicitPain: true,
        }),
      ),
      NOW,
    );
    const ten = computeEvidenceScore(
      Array.from({ length: 10 }, () =>
        item({
          type: "CUSTOMER_QUOTE",
          strengthScore: 8,
          relevanceScore: 8,
          hasExplicitPain: true,
        }),
      ),
      NOW,
    );
    expect(three.score).toBeGreaterThan(one.score);
    expect(ten.score - three.score).toBeLessThan(three.score - one.score);
  });

  it("contradictory evidence reduces confidence", () => {
    const base = [
      item({
        type: "INTERVIEW",
        strengthScore: 8,
        relevanceScore: 8,
        hasExplicitPain: true,
        hasEconomicImpact: true,
      }),
      item({ type: "REVIEW", strengthScore: 6, relevanceScore: 7, hasWorkaround: true }),
    ];
    const without = computeEvidenceScore(base, NOW);
    const withContradiction = computeEvidenceScore(
      [
        ...base,
        item({ type: "INTERVIEW", strengthScore: 9, relevanceScore: 9, sentiment: "NEGATIVE" }),
      ],
      NOW,
    );
    expect(withContradiction.score).toBeLessThan(without.score);
    expect(withContradiction.penalty.contradictingCount).toBe(1);
    expect(withContradiction.penalty.points).toBeGreaterThan(0);
  });

  it("rewards source diversity and recency", () => {
    const sameType = computeEvidenceScore(
      [item({ type: "REVIEW", strengthScore: 6 }), item({ type: "REVIEW", strengthScore: 6 })],
      NOW,
    );
    const diverse = computeEvidenceScore(
      [item({ type: "REVIEW", strengthScore: 6 }), item({ type: "JOB_POSTING", strengthScore: 6 })],
      NOW,
    );
    expect(diverse.score).toBeGreaterThanOrEqual(sameType.score);

    const recent = computeEvidenceScore([item({ sourceDate: "2026-08-01" })], NOW);
    const stale = computeEvidenceScore([item({ sourceDate: "2019-01-01" })], NOW);
    expect(recent.score).toBeGreaterThan(stale.score);
  });

  it("stays within 0..100 and lists gaps", () => {
    const r = computeEvidenceScore(
      Array.from({ length: 30 }, () =>
        item({
          type: "INTERVIEW",
          strengthScore: 10,
          relevanceScore: 10,
          isDirectCustomer: true,
          hasExplicitPain: true,
          hasEconomicImpact: true,
          hasWorkaround: true,
          hasPurchaseIntent: true,
        }),
      ),
      NOW,
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThan(85);
    expect(r.gaps).toEqual([]);
  });
});
