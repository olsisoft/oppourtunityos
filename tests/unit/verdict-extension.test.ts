import { describe, expect, it } from "vitest";
import { computeVerdict } from "@/services/scoring/verdict";
import { extendVerdict } from "@/services/value/verdict-extension";

const ctx = {
  evidenceScore: 80,
  valueStrength: null,
  causalConfidence: null,
  criticalContradiction: false,
  frontier: "ECONOMIC_PAIN" as const,
  openCriticalCustomerQuestion: false,
};

describe("extendVerdict", () => {
  it("keeps the base verdict when value dimensions are INCOMPLETE (backward compatible)", () => {
    for (const [o, e] of [
      [89, 91],
      [87, 73],
      [79, 57],
      [64, 8],
      [38, 66],
      [29, 0],
    ] as Array<[number, number]>) {
      const base = computeVerdict(o, e);
      const r = extendVerdict(base, { ...ctx, evidenceScore: e });
      expect(r.verdict).toBe(base.verdict);
      expect(r.extension.changed).toBe(false);
    }
  });

  it("low value with strong evidence → KILL", () => {
    const r = extendVerdict(computeVerdict(80, 80), {
      ...ctx,
      evidenceScore: 80,
      valueStrength: 30,
    });
    expect(r.verdict).toBe("KILL");
    expect(r.extension.ruleId).toBe("LOW_VALUE_KILL");
    expect(r.baseVerdict).toBe("TEST");
  });

  it("problem validated + mechanism unvalidated → TEST focused on the mechanism", () => {
    const r = extendVerdict(computeVerdict(85, 70), {
      ...ctx,
      evidenceScore: 70,
      causalConfidence: 20,
      valueStrength: 75,
    });
    expect(r.verdict).toBe("TEST");
    expect(r.extension.focus).toBe("TEST_MECHANISM");
  });

  it("critical contradiction downgrades TEST/INTERVIEW to INVESTIGATE", () => {
    const r = extendVerdict(computeVerdict(90, 90), {
      ...ctx,
      evidenceScore: 90,
      criticalContradiction: true,
    });
    expect(r.verdict).toBe("INVESTIGATE");
    expect(r.extension.ruleId).toBe("CRITICAL_CONTRADICTION");
  });

  it("only the deterministic inputs matter: an LLM cannot pass a verdict in", () => {
    const base = computeVerdict(85, 30);
    // The extension context has no field for a proposed verdict; extra keys are ignored by TypeScript and at runtime.
    const r = extendVerdict(base, {
      ...ctx,
      evidenceScore: 30,
      ...({ llmVerdict: "TEST" } as object),
    });
    expect(r.verdict).toBe("RESEARCH");
  });
});
