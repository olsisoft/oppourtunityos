import { describe, expect, it } from "vitest";
import { computeEvidenceScore } from "@/services/scoring/evidence-score";
import { computeNextActions, primaryNextAction } from "@/services/scoring/next-action";

const emptyEvidence = computeEvidenceScore([]);

const base = {
  opportunityScore: 80,
  evidenceScore: 20,
  evidence: emptyEvidence,
  assumptions: [],
  killWarnings: [],
  hasTrigger: true,
  alternativeCount: 1,
  mechanismCount: 3,
  icpName: "salon owners",
  painDescription: "no-shows",
  frequency: 8,
};

describe("computeNextActions", () => {
  it("KILL recommends archiving, nothing else", () => {
    const a = computeNextActions({ ...base, verdict: "KILL" });
    expect(a).toHaveLength(1);
    expect(a[0].type).toBe("KILL");
  });

  it("IGNORE recommends parking", () => {
    expect(primaryNextAction({ ...base, verdict: "IGNORE" }).type).toBe("IGNORE");
  });

  it("RESEARCH with no evidence recommends research/economic impact, never building", () => {
    const a = computeNextActions({ ...base, verdict: "RESEARCH" });
    expect(a[0].title.text).toMatch(/economic impact of no-shows/);
    expect(
      a.some((x) => /before writing software|before thinking about solutions/.test(x.title.text)),
    ).toBe(true);
    expect(a.every((x) => !/build the product/i.test(x.title.text))).toBe(true);
  });

  it("prioritizes critical kill warnings and the riskiest assumption", () => {
    const a = computeNextActions({
      ...base,
      verdict: "INVESTIGATE",
      killWarnings: [
        {
          code: "LOW_WTP",
          severity: "critical",
          message: { key: "test.warning", text: "WTP is low" },
          suggestion: { key: "test.suggestion", text: "Look for existing spend" },
        },
      ],
      assumptions: [
        {
          statement: "The owner controls software purchases.",
          status: "UNKNOWN",
          importance: 9,
          evidenceCount: 0,
        },
        { statement: "Salons use WhatsApp.", status: "SUPPORTED", importance: 9, evidenceCount: 3 },
      ],
    });
    expect(a[0].type).toBe("RESOLVE_WARNING");
    expect(a[1].type).toBe("VALIDATE_ASSUMPTION");
    expect(a[1].title.text).toMatch(/owner controls software purchases/);
  });

  it("INTERVIEW recommends interviewing five ICPs and exploring mechanisms when few exist", () => {
    const a = computeNextActions({ ...base, verdict: "INTERVIEW", mechanismCount: 1 });
    expect(a.some((x) => x.type === "EXPLORE_MECHANISMS")).toBe(true);
    expect(a.some((x) => /Interview 5 salon owners/.test(x.title.text))).toBe(true);
  });

  it("TEST recommends a concierge test before software", () => {
    const a = computeNextActions({ ...base, verdict: "TEST" });
    expect(a.some((x) => x.type === "TEST" && /concierge/.test(x.title.text))).toBe(true);
  });

  it("recommends mapping alternatives and defining a trigger when missing", () => {
    const a = computeNextActions({
      ...base,
      verdict: "INVESTIGATE",
      alternativeCount: 0,
      hasTrigger: false,
    });
    expect(a.some((x) => x.type === "COMPARE_ALTERNATIVES")).toBe(true);
    expect(a.some((x) => x.type === "DEFINE")).toBe(true);
  });
});
