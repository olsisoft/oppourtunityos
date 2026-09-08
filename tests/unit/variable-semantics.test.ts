import { describe, expect, it } from "vitest";
import {
  checkVerbType,
  compactLabel,
  fieldStatus,
  knownVariableType,
  polarityOf,
  suggestedVerbsFor,
  verbSentence,
} from "@/services/value/variable-semantics";

describe("variable semantics — verb × variable type", () => {
  it("Reduce × Leakage is coherent even though leakage lives under Revenue", () => {
    expect(checkVerbType("DECREASE", "Leakage").level).toBe("ok");
    // the parent economic category (Revenue) never enters the check
    expect(checkVerbType("DECREASE", "Leakage", null).polarity).toBe("NEGATIVE");
  });

  it("Reduce × Revenue does warn", () => {
    const c = checkVerbType("DECREASE", "Revenue");
    expect(c.level).toBe("warning");
    expect(c.message).toMatch(/desirable thing smaller/);
    expect(c.message).toMatch(/You may keep it/); // advisory, never blocking
  });

  it("accepts the documented GOOD pairs", () => {
    const good: Array<[Parameters<typeof checkVerbType>[0], string]> = [
      ["DECREASE", "Cost"],
      ["DECREASE", "Risk"],
      ["DECREASE", "Churn"],
      ["DECREASE", "Downtime"],
      ["INCREASE", "Revenue"],
      ["INCREASE", "Retention"],
      ["IMPROVE", "Reliability"],
      ["PROTECT", "Margin"],
      ["RECOVER", "Revenue"],
      ["ACCELERATE", "Time-to-value"],
      ["DECREASE", "Processing time"],
      ["SIMPLIFY", "Complexity"],
      ["AUTOMATE", "Manual effort"],
    ];
    for (const [verb, type] of good)
      expect(checkVerbType(verb, type).level, `${verb} × ${type}`).toBe("ok");
  });

  it("flags the documented contradictory pairs", () => {
    const bad: Array<[Parameters<typeof checkVerbType>[0], string]> = [
      ["DECREASE", "Revenue"],
      ["INCREASE", "Churn"],
      ["INCREASE", "Risk"],
      ["DECREASE", "Reliability"],
      ["DECREASE", "Security"],
    ];
    for (const [verb, type] of bad)
      expect(checkVerbType(verb, type).level, `${verb} × ${type}`).toBe("warning");
  });

  it("custom variables remain supported: unknown type → no warning; explicit polarity → checked", () => {
    const custom = checkVerbType("DECREASE", "Chair-hours wasted on colour corrections");
    expect(custom.level).toBe("unknown");
    expect(custom.polarity).toBeNull();
    expect(knownVariableType("Chair-hours wasted on colour corrections")).toBeNull();
    expect(checkVerbType("INCREASE", "Chair-hours wasted", "NEGATIVE").level).toBe("warning");
    expect(checkVerbType("DECREASE", "Chair-hours wasted", "NEGATIVE").level).toBe("ok");
    expect(polarityOf("anything", "POSITIVE")).toBe("POSITIVE");
  });

  it("matches taxonomy names and aliases case-insensitively", () => {
    expect(polarityOf("revenue leakage")).toBe("NEGATIVE");
    expect(polarityOf("OCCUPANCY")).toBe("POSITIVE");
    expect(polarityOf("cycle time")).toBe("NEUTRAL");
    expect(polarityOf(null)).toBeNull();
  });

  it("suggests verbs per polarity", () => {
    expect(suggestedVerbsFor("NEGATIVE")).toContain("DECREASE");
    expect(suggestedVerbsFor("POSITIVE")).toContain("INCREASE");
    expect(suggestedVerbsFor("POSITIVE")).not.toContain("DECREASE");
  });

  it("renders compact labels without the whole algebra", () => {
    expect(compactLabel("DECREASE", "No-show rate")).toBe("↓ No-show rate");
    expect(compactLabel("PROTECT", "Net revenue")).toBe("⇄ Net revenue");
    expect(verbSentence("DECREASE", "No-show rate")).toBe("Reduce no-show rate");
  });
});

describe("variable semantics — per-field provenance", () => {
  it("UNKNOWN fields stay UNKNOWN even when the record has a provenance", () => {
    const v = {
      provenance: "AI_HYPOTHESIS" as const,
      name: "No-show rate",
      currentState: null,
      desiredState: "",
      variableType: null,
      fieldProvenance: { currentState: "INTERVIEW" },
    };
    expect(fieldStatus(v, "currentState")).toBe("UNKNOWN");
    expect(fieldStatus(v, "desiredState")).toBe("UNKNOWN");
    expect(fieldStatus(v, "variableType")).toBe("UNKNOWN");
    expect(fieldStatus(v, "name")).toBe("AI_HYPOTHESIS");
  });

  it("a filled field reports its own provenance, not the record's", () => {
    const v = {
      provenance: "AI_HYPOTHESIS" as const,
      currentState: "12–20%",
      fieldProvenance: { currentState: "INTERVIEW" },
    };
    expect(fieldStatus(v, "currentState")).toBe("INTERVIEW");
  });
});
