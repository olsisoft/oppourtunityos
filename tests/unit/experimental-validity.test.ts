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
  inferenceSentence,
  languageViolations,
} from "@/services/value/language-gate";
import { outcomeToDirection } from "@/services/value/experiment-outcome";
import { assessClaim } from "@/services/value/epistemic";
import { textOf } from "@/i18n/messages";
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
    const downgrade = resolveDesignLevel("CONTROLLED", { comparisonGroup: false }).downgrades[0];
    expect(downgrade.text).toMatch(/no comparison group/);
    expect(downgrade.text).toBe(
      "Controlled declared, but no comparison group exists: treated as before / after.",
    );
    expect(downgrade.key).toBe("validity.downgrade.noComparisonGroup");
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
    expect(changed.threats.map(textOf).join(" ")).toMatch(/Instrumentation changed/);
    expect(changed.checks.find((c) => c.key === "instrumentationChanged")?.label.text).toBe(
      "Instrumentation changed",
    );

    const unknown = assessInternalValidity("CONTROLLED", {});
    expect(unknown.internalValidity).toBe("INDETERMINATE");
    expect(unknown.unknowns.length).toBeGreaterThan(3);
    expect(unknown.explanation.map(textOf).join(" ")).toMatch(
      /Internal validity: Indeterminate — \d+ critical facts not recorded\./,
    );
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
    expect(beforeAfter.explanation.map(textOf).join(" ")).not.toMatch(/cannot establish/);
    expect(beforeAfter.explanation[0].text).toBe("Design: Before / after.");
    expect(beforeAfter.explanation[1].text).toBe("Internal validity: Medium — 1 moderate threat.");
    expect(beforeAfter.checks.find((c) => c.key === "sampleSize")?.text.text).toBe(
      "5 organizations.",
    );
    const anecdotal = assessInternalValidity("ANECDOTAL", {});
    expect(anecdotal.explanation.map(textOf).join(" ")).toMatch(/measure; they do not test/);
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
    expect(r.sentence.text).toMatch(/invalid/i);
    expect(r.sentence.text).not.toMatch(/caused/);
    expect(r.sentence.key).toBe("validity.interpretation.invalid");
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
    expect(textOf(a.inference)).toMatch(/low fit|does not fit|not sufficient/);
  });
});

describe("epistemic language gate", () => {
  const base = {
    mechanism: "weekly reconciliation",
    outcome: "unrecorded services fell",
    scope: "5 salons, 3 POS configurations, one month",
  };

  it("uses the wording the design level allows, never more", () => {
    expect(causalLanguage({ ...base, designLevel: "ANECDOTAL" }).sentence.text).toMatch(
      /^Customers report/,
    );
    expect(causalLanguage({ ...base, designLevel: "OBSERVATIONAL" }).sentence.text).toBe(
      "Weekly reconciliation is associated with unrecorded services fell in 5 salons, 3 POS configurations, one month. Not established beyond this scope.",
    );
    const ba = causalLanguage({ ...base, designLevel: "BEFORE_AFTER" }).sentence.text;
    expect(ba).toMatch(/changed after/);
    expect(ba).toMatch(/consistent with/);
    const matched = causalLanguage({ ...base, designLevel: "MATCHED_COMPARISON" }).sentence.text;
    expect(matched).toMatch(/improved more than/);
    expect(matched).toMatch(/supports a causal effect/);
    expect(causalLanguage({ ...base, designLevel: "CONTROLLED" }).sentence.text).toMatch(
      /supports the conclusion that/,
    );
    const rct = causalLanguage({
      ...base,
      designLevel: "RANDOMIZED",
      internalValidity: "HIGH",
    }).sentence;
    expect(rct.text).toMatch(/caused/);
    expect(rct.text).toMatch(/within the tested population/);
    expect(rct.key).toBe("validity.gate.sentence.RANDOMIZED.supports");
    for (const level of ["ANECDOTAL", "OBSERVATIONAL", "BEFORE_AFTER"] as const) {
      const s = causalLanguage({ ...base, designLevel: level }).sentence.text;
      expect(s).not.toMatch(/\bcaused\b|\bproves\b/);
    }
  });

  it("falls back to generic wording when the mechanism, outcome or scope is missing", () => {
    const empty = causalLanguage({
      designLevel: "CONTROLLED",
      mechanism: "",
      outcome: "",
      scope: "  ",
    }).sentence;
    expect(empty.text).toBe(
      "The controlled experiment supports the conclusion that the intervention causes the variable changed within the tested scope. Not established beyond this scope.",
    );
    const contradicted = causalLanguage({
      ...base,
      designLevel: "RANDOMIZED",
      direction: "CONTRADICTS",
    }).sentence.text;
    expect(contradicted).toMatch(/did not cause/);
  });

  it("never generalizes automatically and lowers the gate when validity is weak", () => {
    for (const level of ["ANECDOTAL", "BEFORE_AFTER", "CONTROLLED", "RANDOMIZED"] as const) {
      expect(causalLanguage({ ...base, designLevel: level }).sentence.text).toMatch(
        /Not established beyond this scope\.$/,
      );
    }
    const weak = causalLanguage({ ...base, designLevel: "RANDOMIZED", internalValidity: "LOW" });
    expect(weak.gatedLevel).toBe("BEFORE_AFTER");
    expect(weak.sentence.text).not.toMatch(/caused/);
    expect(weak.caveats[0].text).toMatch(/low/);
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
    expect(feasibility.cannot.map(textOf).join(" ")).toMatch(/causes/);
    expect(feasibility.note.text).toMatch(/never generalizes/);
    expect(feasibility.target?.statement.text).toBe("the mechanism is feasible");
    expect(feasibilityForCausal.target?.reason.key).toBe("validity.preview.reason.notAdmissible");
    expect(
      designProofPreview("COHORT_OBSERVATION", "OBSERVATIONAL", "MECHANISM_CAUSES_CAPABILITY")
        .target?.reason.text,
    ).toBe("observational designs cannot establish causality.");
  });

  it("writes the claim inference from the status, the scope and the generalization", () => {
    const observed = inferenceSentence({
      claimType: "PAIN_EXISTS",
      status: "OBSERVED",
      scopeText: "5 salons",
      generalization: "CASE_ONLY",
    });
    expect(observed.text).toBe(
      "The pain exists: observed within 5 salons. One case; not established elsewhere.",
    );
    expect(
      inferenceSentence({
        claimType: "PAIN_EXISTS",
        status: "OBSERVED",
        generalization: "UNTESTED",
      }).text,
    ).toBe("The pain exists: observed within the observed scope.");
    expect(
      inferenceSentence({
        claimType: "MECHANISM_CAUSES_CAPABILITY",
        status: "STRONGLY_SUPPORTED",
        scopeText: "5 salons",
        designLevel: "CONTROLLED",
        generalization: "SAMPLE_SUPPORTED",
      }).text,
    ).toBe(
      "Evidence strongly supports that the mechanism causes the capability (5 salons), at controlled design strength. Nothing has measured it directly. Observed in a sample; not established for the market.",
    );
    expect(
      inferenceSentence({ claimType: "PAIN_EXISTS", status: "SUPPORTED", bestFitBand: "LOW" }).text,
    ).toMatch(/low fit/);
    expect(inferenceSentence({ claimType: "PAIN_EXISTS", status: "HYPOTHESIS" }).text).toBe(
      "Hypothesis: nothing tested whether the pain exists.",
    );
    expect(inferenceSentence({ claimType: "PAIN_EXISTS", status: "UNKNOWN" }).text).toBe(
      "Not stated.",
    );
  });

  it("interprets a non-causal result as an observation bound to its scope", () => {
    const r = experimentInterpretation({
      targetIsCausal: false,
      designLevel: "OBSERVATIONAL",
      internalValidity: "LOW",
      mechanism: "the mechanism",
      outcome: "Matched appointments: 97 %.",
      scope: "5 salons",
      direction: "SUPPORTS",
      outcomeLabel: "SUPPORTED",
    });
    expect(r.sentence.text).toBe(
      "Matched appointments: 97 % was observed in 5 salons. Internal validity is low: treat the observation with caution. Observed within this scope only; not established beyond it.",
    );
    expect(r.caveats.map(textOf)).toEqual([
      "Internal validity is low: treat the observation with caution.",
    ]);
    const inconclusive = experimentInterpretation({
      targetIsCausal: true,
      designLevel: "CONTROLLED",
      internalValidity: "HIGH",
      mechanism: "the mechanism",
      outcome: "Leakage fell by 2%",
      scope: "5 salons",
      direction: "NEUTRAL",
      outcomeLabel: "INCONCLUSIVE",
    });
    expect(inconclusive.sentence.text).toBe(
      "Inconclusive: leakage fell by 2% in 5 salons decides nothing either way. The claim stays where it was.",
    );
  });
});
