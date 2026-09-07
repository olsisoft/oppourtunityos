import { describe, expect, it } from "vitest";
import {
  checkVerbCategory,
  fieldStatus,
  suggestedVerbs,
} from "@/services/value/variable-semantics";

describe("variable semantics", () => {
  it("accepts coherent verb × category pairs", () => {
    expect(checkVerbCategory("DECREASE", "RISK").level).toBe("ok");
    expect(checkVerbCategory("INCREASE", "REVENUE").level).toBe("ok");
    expect(checkVerbCategory("IMPROVE", "RELIABILITY").level).toBe("ok");
    expect(checkVerbCategory("DECREASE", "COMPLEXITY").level).toBe("ok");
    expect(checkVerbCategory("ACCELERATE", "TIME").level).toBe("ok");
    expect(checkVerbCategory("PROTECT", "MARGIN").level).toBe("ok");
  });

  it("warns on semantically contradictory pairs but does not forbid them", () => {
    expect(checkVerbCategory("DECREASE", "RELIABILITY").level).toBe("warning");
    expect(checkVerbCategory("INCREASE", "RISK").level).toBe("warning");
    expect(checkVerbCategory("DECREASE", "COMPLIANCE").message).toMatch(/Did you mean/);
  });

  it("suggests compatible verbs per category", () => {
    expect(suggestedVerbs("COST")).toContain("DECREASE");
    expect(suggestedVerbs("REVENUE")).toContain("INCREASE");
    expect(suggestedVerbs("REVENUE")).not.toContain("DECREASE");
  });

  it("UNKNOWN fields stay UNKNOWN even when the record has a provenance", () => {
    const v = {
      provenance: "AI_HYPOTHESIS" as const,
      name: "No-show rate",
      currentState: null,
      desiredState: "",
      fieldProvenance: { currentState: "INTERVIEW" },
    };
    expect(fieldStatus(v, "currentState")).toBe("UNKNOWN");
    expect(fieldStatus(v, "desiredState")).toBe("UNKNOWN");
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
