import { describe, expect, it } from "vitest";
import {
  assessInternalValidity,
  defaultDesignLevel,
  designAtLeast,
  designProofPreview,
  resolveDesignLevel,
} from "@/services/value/experimental-validity";
import {
  causalLanguage,
  experimentInterpretation,
  languageViolations,
} from "@/services/value/language-gate";
import { outcomeToDirection } from "@/services/value/experiment-outcome";
import { assessClaim } from "@/services/value/epistemic";
import { claimInputs, item, NOW } from "../support/fit-helpers";

describe("experimental design and internal validity", () => {
  it("orders designs by causal strength and defaults them from the experiment type", () => {
    expect(designAtLeast("CONTROLLED", "BEFORE_AFTER")).toBe(true);
    expect(designAtLeast("OBSERVATIONAL", "BEFORE_AFTER")).toBe(false);
    expect(defaultDesignLevel("AB_TEST")).toBe("RANDOMIZED");
    expect(defaultDesignLevel("CUSTOMER_INTERVIEW")).toBe("ANECDOTAL");
    expect(defaultDesignLevel("DATA_FEASIBILITY_TEST")).toBe("OBSERVATIONAL");
    expect(defaultDesignLevel("CONCIERGE_TEST")).toBe("BEFORE_AFTER");
  });

  it("the recorded facts cap the declared design: no randomization, no comparison, no baseline", () => {
    expect(
      resolveDesignLevel("RANDOMIZED", { assignmentMethod: "CONVENIENCE", comparisonGroup: true })
        .effective,
    ).toBe("CONTROLLED");
    expect(resolveDesignLevel("CONTROLLED", { comparisonGroup: false }).effective).toBe(
      "BEFORE_AFTER",
    );
    expect(resolveDesignLevel("BEFORE_AFTER", { baselineMeasured: false }).effective).toBe(
      "OBSERVATIONAL",
    );
    expect(
      resolveDesignLevel("RANDOMIZED", { assignmentMethod: "RANDOM", comparisonGroup: true })
        .effective,
    ).toBe("RANDOMIZED");
    expect(resolveDesignLevel("CONTROLLED", { comparisonGroup: false }).downgrades[0]).toMatch(
      /no comparison group/,
    );
  });

  it("assesses internal validity from threats: clean → HIGH, changed instrument → LOW, unknowns → INDETERMINATE", () => {
    const clean = assessInternalValidity("CONTROLLED", {
      baselineMeasured: true,
      comparisonGroup: true,
      assignmentMethod: "MATCHED",
      sameMeasurement: true,
      interventionIsolated: true,
      confoundersControlled: true,
      attritionPercent: 5,
      instrumentationChanged: false,
      organizationCount: 8,
      durationDays: 30,
      dataCompletenessPercent: 95,
      contaminationRisk: false,
      seasonalityRisk: false,
      concurrentChanges: false,
    });
    expect(clean.internalValidity).toBe("HIGH");
    expect(clean.checks.every((c) => c.ok !== false)).toBe(true);

    const changed = assessInternalValidity("CONTROLLED", {
      baselineMeasured: true,
      comparisonGroup: true,
      sameMeasurement: true,
      interventionIsolated: true,
      confoundersControlled: true,
      instrumentationChanged: true,
    });
    expect(changed.internalValidity).toBe("LOW");
    expect(changed.threats.join(" ")).toMatch(/Instrumentation changed/);

    const unknown = assessInternalValidity("CONTROLLED", {});
    expect(unknown.internalValidity).toBe("INDETERMINATE");
    expect(unknown.unknowns.length).toBeGreaterThan(3);
  });

  it("uncontrolled confounders are critical for comparative designs and moderate for before/after", () => {
    const matched = assessInternalValidity("MATCHED_COMPARISON", {
      baselineMeasured: true,
      comparisonGroup: true,
      assignmentMethod: "MATCHED",
      sameMeasurement: true,
      interventionIsolated: true,
      confoundersControlled: false,
      instrumentationChanged: false,
    });
    expect(matched.internalValidity).toBe("LOW");
    const beforeAfter = assessInternalValidity("BEFORE_AFTER", {
      baselineMeasured: true,
      sameMeasurement: true,
      interventionIsolated: true,
      confoundersControlled: false,
      instrumentationChanged: false,
      organizationCount: 5,
      durationDays: 30,
      dataCompletenessPercent: 90,
    });
    expect(beforeAfter.internalValidity).toBe("MEDIUM");
    expect(beforeAfter.explanation.join(" ")).not.toMatch(/cannot establish/);
    const anecdotal = assessInternalValidity("ANECDOTAL", {});
    expect(anecdotal.explanation.join(" ")).toMatch(/measure; they do not test/);
  });

  it("an invalid run produces no evidence and an explicit interpretation", () => {
    expect(outcomeToDirection("INVALID")).toBeNull();
    const r = experimentInterpretation({
      targetIsCausal: true,
      designLevel: "RANDOMIZED",
      internalValidity: "HIGH",
      mechanism: "the reconciliation mechanism",
      outcome: "leakage fell by 40%",
      scope: "5 salons",
      direction: "NEUTRAL",
      outcomeLabel: "INVALID",
    });
    expect(r.sentence).toMatch(/invalid/i);
    expect(r.sentence).not.toMatch(/caused/);
  });

  it("interview-only evidence cannot lift a causal claim past the low-fit cap", () => {
    const inputs = claimInputs(
      "MECHANISM_CAUSES_CAPABILITY",
      Array.from({ length: 6 }, () => ({
        item: item("INTERVIEW", { strengthScore: 9, relevanceScore: 9 }),
      })),
    );
    const a = assessClaim({
      hasStatement: true,
      generatedBy: "USER",
      evidence: inputs,
      claimType: "MECHANISM_CAUSES_CAPABILITY",
      now: NOW,
    });
    expect(a.confidence).toBeLessThanOrEqual(39);
    expect(a.status).toBe("UNPROVEN");
    expect(a.fitness.lowFitOnly).toBe(true);
    expect(a.designLevel).toBe("ANECDOTAL");
    expect(a.inference).toMatch(/low fit|does not fit|not sufficient/);
  });
});

describe("epistemic language gate", () => {
  const base = {
    mechanism: "weekly reconciliation",
    outcome: "unrecorded services fell",
    scope: "5 salons, 3 POS configurations, one month",
  };

  it("uses the wording the design level allows, never more", () => {
    expect(causalLanguage({ ...base, designLevel: "ANECDOTAL" }).sentence).toMatch(
      /^Customers report/,
    );
    expect(causalLanguage({ ...base, designLevel: "OBSERVATIONAL" }).sentence).toMatch(
      /is associated with/,
    );
    const ba = causalLanguage({ ...base, designLevel: "BEFORE_AFTER" }).sentence;
    expect(ba).toMatch(/changed after/);
    expect(ba).toMatch(/consistent with/);
    const matched = causalLanguage({ ...base, designLevel: "MATCHED_COMPARISON" }).sentence;
    expect(matched).toMatch(/improved more than/);
    expect(matched).toMatch(/supports a causal effect/);
    expect(causalLanguage({ ...base, designLevel: "CONTROLLED" }).sentence).toMatch(
      /supports the conclusion that/,
    );
    const rct = causalLanguage({
      ...base,
      designLevel: "RANDOMIZED",
      internalValidity: "HIGH",
    }).sentence;
    expect(rct).toMatch(/caused/);
    expect(rct).toMatch(/within the tested population/);
    for (const level of ["ANECDOTAL", "OBSERVATIONAL", "BEFORE_AFTER"] as const) {
      const s = causalLanguage({ ...base, designLevel: level }).sentence;
      expect(s).not.toMatch(/\bcaused\b|\bproves\b/);
    }
  });

  it("never generalizes automatically and lowers the gate when validity is weak", () => {
    for (const level of ["ANECDOTAL", "BEFORE_AFTER", "CONTROLLED", "RANDOMIZED"] as const) {
      expect(causalLanguage({ ...base, designLevel: level }).sentence).toMatch(
        /Not established beyond this scope\.$/,
      );
    }
    const weak = causalLanguage({ ...base, designLevel: "RANDOMIZED", internalValidity: "LOW" });
    expect(weak.gatedLevel).toBe("BEFORE_AFTER");
    expect(weak.sentence).not.toMatch(/caused/);
    expect(weak.caveats[0]).toMatch(/low/);
    const indeterminate = causalLanguage({
      ...base,
      designLevel: "CONTROLLED",
      internalValidity: "INDETERMINATE",
    });
    expect(indeterminate.gatedLevel).toBe("MATCHED_COMPARISON");
  });

  it("detects causal or general phrases that exceed the design", () => {
    expect(
      languageViolations(
        "This proves the mechanism causes the drop for all customers",
        "BEFORE_AFTER",
      ),
    ).toEqual(expect.arrayContaining(["proves", "causes", "for all customers"]));
    expect(
      languageViolations(
        "The variable changed after the intervention in five salons.",
        "BEFORE_AFTER",
      ),
    ).toEqual([]);
  });

  it("previews what a design can prove for its target claim", () => {
    const feasibility = designProofPreview(
      "DATA_FEASIBILITY_TEST",
      "OBSERVATIONAL",
      "MECHANISM_FEASIBLE",
    );
    expect(feasibility.target?.strength).toBe("STRONGLY");
    const feasibilityForCausal = designProofPreview(
      "DATA_FEASIBILITY_TEST",
      "OBSERVATIONAL",
      "MECHANISM_CAUSES_CAPABILITY",
    );
    expect(feasibilityForCausal.target?.strength).toBe("CANNOT");
    expect(
      designProofPreview("CONCIERGE_TEST", "BEFORE_AFTER", "CAPABILITY_CAUSES_TRANSFORMATION")
        .target?.strength,
    ).toBe("PARTIALLY");
    expect(
      designProofPreview("AB_TEST", "RANDOMIZED", "CAPABILITY_CAUSES_TRANSFORMATION").target
        ?.strength,
    ).toBe("STRONGLY");
    expect(
      designProofPreview("CUSTOMER_INTERVIEW", "ANECDOTAL", "ACTUAL_PURCHASE").target?.strength,
    ).toBe("CANNOT");
    expect(feasibility.cannot.join(" ")).toMatch(/causes/);
    expect(feasibility.note).toMatch(/never generalizes/);
  });
});
