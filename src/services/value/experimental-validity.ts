/**
 * Experimental validity — what a design can establish, and whether this
 * particular run can be trusted. Design levels order causal strength;
 * internal validity is assessed from the checklist the user records. The
 * user records facts (was a baseline measured? how were units assigned?);
 * the application draws the conclusion. Nothing here is model-generated.
 */
import type {
  AssignmentMethod,
  ClaimType,
  ExperimentDesignLevel,
  ExperimentType,
  InternalValidity,
} from "@/generated/prisma/enums";
import { admissibilityLevel } from "./admissibility";
import { claimNature, CLAIM_STATEMENTS } from "./claim-taxonomy";
import { sourceTypeForExperiment } from "./evidence-sources";

export const DESIGN_LEVELS: ExperimentDesignLevel[] = [
  "ANECDOTAL",
  "OBSERVATIONAL",
  "BEFORE_AFTER",
  "MATCHED_COMPARISON",
  "CONTROLLED",
  "RANDOMIZED",
];

export const DESIGN_LEVEL_LABELS: Record<ExperimentDesignLevel, string> = {
  ANECDOTAL: "Anecdotal",
  OBSERVATIONAL: "Observational",
  BEFORE_AFTER: "Before / after",
  MATCHED_COMPARISON: "Matched comparison",
  CONTROLLED: "Controlled",
  RANDOMIZED: "Randomized",
};

export const DESIGN_LEVEL_HELP: Record<ExperimentDesignLevel, string> = {
  ANECDOTAL: "Reports and statements; no measurement of the variable.",
  OBSERVATIONAL: "The variable is measured, but nothing is intervened on.",
  BEFORE_AFTER: "The variable is measured before and after an intervention on the same units.",
  MATCHED_COMPARISON: "Treated units are compared with similar untreated units.",
  CONTROLLED:
    "The intervention is applied to some units and withheld from a concurrent comparison group.",
  RANDOMIZED: "Units are assigned to intervention or comparison at random.",
};

export function designIndex(level: ExperimentDesignLevel | null | undefined): number {
  return level ? DESIGN_LEVELS.indexOf(level) : -1;
}

export function designAtLeast(
  level: ExperimentDesignLevel | null | undefined,
  required: ExperimentDesignLevel,
): boolean {
  return designIndex(level) >= designIndex(required);
}

export function minDesign(
  a: ExperimentDesignLevel,
  b: ExperimentDesignLevel,
): ExperimentDesignLevel {
  return designIndex(a) <= designIndex(b) ? a : b;
}

/** Ceiling on causal confidence (0–100) that a design level can support. */
export const DESIGN_CAUSAL_CEILING: Record<ExperimentDesignLevel, number> = {
  ANECDOTAL: 30,
  OBSERVATIONAL: 45,
  BEFORE_AFTER: 60,
  MATCHED_COMPARISON: 75,
  CONTROLLED: 90,
  RANDOMIZED: 100,
};

/** Method-quality factor of a design for causal claims (0–1). */
export const DESIGN_CAUSAL_FACTOR: Record<ExperimentDesignLevel, number> = {
  ANECDOTAL: 0.2,
  OBSERVATIONAL: 0.35,
  BEFORE_AFTER: 0.55,
  MATCHED_COMPARISON: 0.75,
  CONTROLLED: 0.9,
  RANDOMIZED: 1,
};

export const VALIDITY_FACTOR: Record<InternalValidity, number> = {
  HIGH: 1,
  MEDIUM: 0.8,
  LOW: 0.45,
  INDETERMINATE: 0.6,
};

export const INTERNAL_VALIDITY_LABELS: Record<InternalValidity, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INDETERMINATE: "Indeterminate",
};

export const ASSIGNMENT_METHOD_LABELS: Record<AssignmentMethod, string> = {
  NONE: "No assignment (single group)",
  SELF_SELECTED: "Self-selected",
  CONVENIENCE: "Convenience",
  MATCHED: "Matched",
  RANDOM: "Random",
};

/** Default design level per experiment type (the user can declare otherwise). */
export const DEFAULT_DESIGN_LEVEL: Record<ExperimentType, ExperimentDesignLevel> = {
  CUSTOMER_INTERVIEW: "ANECDOTAL",
  PRICING_TEST: "OBSERVATIONAL",
  LANDING_PAGE_TEST: "OBSERVATIONAL",
  CONCIERGE_TEST: "BEFORE_AFTER",
  PROTOTYPE_TEST: "BEFORE_AFTER",
  DATA_FEASIBILITY_TEST: "OBSERVATIONAL",
  AB_TEST: "RANDOMIZED",
  MANUAL_WORKFLOW_TEST: "BEFORE_AFTER",
  COHORT_OBSERVATION: "OBSERVATIONAL",
  TECHNICAL_SPIKE: "OBSERVATIONAL",
  RETROSPECTIVE_DATA_ANALYSIS: "OBSERVATIONAL",
  OTHER: "ANECDOTAL",
};

export function defaultDesignLevel(type: ExperimentType): ExperimentDesignLevel {
  return DEFAULT_DESIGN_LEVEL[type] ?? "ANECDOTAL";
}

/** Facts about a run. null / undefined = not recorded. */
export interface ValidityInputs {
  baselineMeasured?: boolean | null;
  comparisonGroup?: boolean | null;
  assignmentMethod?: AssignmentMethod | null;
  sameMeasurement?: boolean | null;
  interventionIsolated?: boolean | null;
  /** true = known confounders were controlled; false = known confounders left uncontrolled. */
  confoundersControlled?: boolean | null;
  attritionPercent?: number | null;
  instrumentationChanged?: boolean | null;
  sampleSize?: number | null;
  organizationCount?: number | null;
  userCount?: number | null;
  durationDays?: number | null;
  dataCompletenessPercent?: number | null;
  contaminationRisk?: boolean | null;
  seasonalityRisk?: boolean | null;
  concurrentChanges?: boolean | null;
}

export const VALIDITY_INPUT_KEYS: Array<keyof ValidityInputs> = [
  "baselineMeasured",
  "comparisonGroup",
  "assignmentMethod",
  "sameMeasurement",
  "interventionIsolated",
  "confoundersControlled",
  "attritionPercent",
  "instrumentationChanged",
  "sampleSize",
  "organizationCount",
  "userCount",
  "durationDays",
  "dataCompletenessPercent",
  "contaminationRisk",
  "seasonalityRisk",
  "concurrentChanges",
];

export const VALIDITY_INPUT_LABELS: Record<keyof ValidityInputs, string> = {
  baselineMeasured: "Baseline measured",
  comparisonGroup: "Comparison group exists",
  assignmentMethod: "Assignment method",
  sameMeasurement: "Same measurement before and after",
  interventionIsolated: "Intervention isolated",
  confoundersControlled: "Known confounders controlled",
  attritionPercent: "Attrition",
  instrumentationChanged: "Instrumentation changed",
  sampleSize: "Sample size",
  organizationCount: "Organizations",
  userCount: "Users",
  durationDays: "Duration",
  dataCompletenessPercent: "Data completeness",
  contaminationRisk: "Contamination risk",
  seasonalityRisk: "Seasonality risk",
  concurrentChanges: "Concurrent changes",
};

export function parseValidityInputs(value: unknown): ValidityInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: ValidityInputs = {};
  const bool = (k: keyof ValidityInputs) => {
    if (typeof v[k] === "boolean") (out as Record<string, unknown>)[k] = v[k];
  };
  const num = (k: keyof ValidityInputs) => {
    const n = v[k];
    if (typeof n === "number" && Number.isFinite(n)) (out as Record<string, unknown>)[k] = n;
    else if (typeof n === "string" && n.trim() && Number.isFinite(Number(n)))
      (out as Record<string, unknown>)[k] = Number(n);
  };
  for (const k of [
    "baselineMeasured",
    "comparisonGroup",
    "sameMeasurement",
    "interventionIsolated",
    "confoundersControlled",
    "instrumentationChanged",
    "contaminationRisk",
    "seasonalityRisk",
    "concurrentChanges",
  ] as const)
    bool(k);
  for (const k of [
    "attritionPercent",
    "sampleSize",
    "organizationCount",
    "userCount",
    "durationDays",
    "dataCompletenessPercent",
  ] as const)
    num(k);
  const am = v.assignmentMethod;
  if (
    am === "NONE" ||
    am === "SELF_SELECTED" ||
    am === "CONVENIENCE" ||
    am === "MATCHED" ||
    am === "RANDOM"
  )
    out.assignmentMethod = am;
  return out;
}

export interface DesignResolution {
  declared: ExperimentDesignLevel;
  effective: ExperimentDesignLevel;
  downgrades: string[];
}

/**
 * The design level a run actually achieved: the declared level, capped by
 * the recorded facts (no comparison group → at most before/after; no random
 * assignment → not randomized; no baseline → not before/after…).
 */
export function resolveDesignLevel(
  declared: ExperimentDesignLevel,
  inputs: ValidityInputs,
): DesignResolution {
  let effective = declared;
  const downgrades: string[] = [];
  const cap = (level: ExperimentDesignLevel, reason: string) => {
    if (designIndex(effective) > designIndex(level)) {
      downgrades.push(
        `${DESIGN_LEVEL_LABELS[declared]} declared, but ${reason}: treated as ${DESIGN_LEVEL_LABELS[level].toLowerCase()}.`,
      );
      effective = level;
    }
  };
  if (inputs.comparisonGroup === false) cap("BEFORE_AFTER", "no comparison group exists");
  if (inputs.assignmentMethod && inputs.assignmentMethod !== "RANDOM")
    cap("CONTROLLED", "units were not randomly assigned");
  if (inputs.assignmentMethod === "NONE") cap("BEFORE_AFTER", "there is a single group");
  if (
    designIndex(effective) === designIndex("MATCHED_COMPARISON") &&
    inputs.assignmentMethod &&
    inputs.assignmentMethod !== "MATCHED" &&
    inputs.assignmentMethod !== "RANDOM"
  )
    cap("BEFORE_AFTER", "comparison units were not matched");
  if (inputs.interventionIsolated === false && designIndex(effective) >= designIndex("CONTROLLED"))
    cap("MATCHED_COMPARISON", "the intervention was not isolated");
  if (inputs.baselineMeasured === false && designIndex(effective) === designIndex("BEFORE_AFTER"))
    cap("OBSERVATIONAL", "no baseline was measured");
  return { declared, effective, downgrades };
}

export interface ValidityCheck {
  key: string;
  label: string;
  /** true = passed, false = threat, null = not recorded. */
  ok: boolean | null;
  severity: "critical" | "moderate" | "info";
  text: string;
}

export interface InternalValidityAssessment {
  designDeclared: ExperimentDesignLevel;
  designEffective: ExperimentDesignLevel;
  internalValidity: InternalValidity;
  checks: ValidityCheck[];
  threats: string[];
  unknowns: string[];
  downgrades: string[];
  explanation: string[];
}

/**
 * Internal validity of a run. Critical threats make it LOW; moderate threats
 * make it MEDIUM (three or more: LOW); too many unrecorded critical facts make
 * it INDETERMINATE. Anecdotal and observational designs are assessed for
 * measurement quality only — validity never turns them into causal designs.
 */
export function assessInternalValidity(
  declared: ExperimentDesignLevel,
  inputs: ValidityInputs,
): InternalValidityAssessment {
  const { effective, downgrades } = resolveDesignLevel(declared, inputs);
  const checks: ValidityCheck[] = [];
  const causalDesign = designIndex(effective) >= designIndex("BEFORE_AFTER");
  const comparative = designIndex(effective) >= designIndex("MATCHED_COMPARISON");

  const push = (
    key: keyof ValidityInputs | string,
    label: string,
    ok: boolean | null,
    severity: ValidityCheck["severity"],
    text: string,
  ) => checks.push({ key, label, ok, severity, text });

  push(
    "baselineMeasured",
    VALIDITY_INPUT_LABELS.baselineMeasured,
    inputs.baselineMeasured ?? null,
    causalDesign ? "critical" : "info",
    inputs.baselineMeasured === true
      ? "A baseline was measured before the intervention."
      : inputs.baselineMeasured === false
        ? "No baseline: a change cannot be shown without a starting point."
        : "Baseline not recorded.",
  );
  push(
    "comparisonGroup",
    VALIDITY_INPUT_LABELS.comparisonGroup,
    inputs.comparisonGroup ?? null,
    comparative ? "critical" : "info",
    inputs.comparisonGroup === true
      ? "A comparison group exists."
      : inputs.comparisonGroup === false
        ? "No comparison group: what would have happened without the intervention is unobserved."
        : "Comparison group not recorded.",
  );
  push(
    "assignmentMethod",
    VALIDITY_INPUT_LABELS.assignmentMethod,
    inputs.assignmentMethod
      ? inputs.assignmentMethod === "RANDOM" || inputs.assignmentMethod === "MATCHED"
      : null,
    comparative ? "moderate" : "info",
    inputs.assignmentMethod
      ? `Assignment: ${ASSIGNMENT_METHOD_LABELS[inputs.assignmentMethod].toLowerCase()}.`
      : "Assignment method not recorded.",
  );
  push(
    "sameMeasurement",
    VALIDITY_INPUT_LABELS.sameMeasurement,
    inputs.sameMeasurement ?? null,
    "critical",
    inputs.sameMeasurement === true
      ? "The same measurement was used throughout."
      : inputs.sameMeasurement === false
        ? "The measurement changed: before and after are not comparable."
        : "Measurement consistency not recorded.",
  );
  push(
    "interventionIsolated",
    VALIDITY_INPUT_LABELS.interventionIsolated,
    inputs.interventionIsolated ?? null,
    causalDesign ? "critical" : "info",
    inputs.interventionIsolated === true
      ? "Only the intervention changed."
      : inputs.interventionIsolated === false
        ? "Other things changed with the intervention: the effect cannot be attributed to it."
        : "Isolation of the intervention not recorded.",
  );
  push(
    "confoundersControlled",
    VALIDITY_INPUT_LABELS.confoundersControlled,
    inputs.confoundersControlled ?? null,
    comparative ? "critical" : causalDesign ? "moderate" : "info",
    inputs.confoundersControlled === true
      ? "Known confounders were controlled."
      : inputs.confoundersControlled === false
        ? "Known confounders were not controlled."
        : "Confounders not recorded.",
  );
  push(
    "attritionPercent",
    VALIDITY_INPUT_LABELS.attritionPercent,
    inputs.attritionPercent == null ? null : inputs.attritionPercent <= 30,
    inputs.attritionPercent != null && inputs.attritionPercent > 30 ? "critical" : "moderate",
    inputs.attritionPercent == null
      ? "Attrition not recorded."
      : inputs.attritionPercent > 30
        ? `Attrition ${inputs.attritionPercent}%: more than 30% of units were lost.`
        : inputs.attritionPercent > 10
          ? `Attrition ${inputs.attritionPercent}%.`
          : `Attrition ${inputs.attritionPercent}%: negligible.`,
  );
  push(
    "instrumentationChanged",
    VALIDITY_INPUT_LABELS.instrumentationChanged,
    inputs.instrumentationChanged == null ? null : !inputs.instrumentationChanged,
    "critical",
    inputs.instrumentationChanged === true
      ? "Instrumentation changed during the run."
      : inputs.instrumentationChanged === false
        ? "Instrumentation unchanged."
        : "Instrumentation not recorded.",
  );
  const orgs = inputs.organizationCount ?? null;
  const n = inputs.sampleSize ?? null;
  push(
    "sampleSize",
    VALIDITY_INPUT_LABELS.sampleSize,
    orgs != null ? orgs >= 3 : n != null ? n >= 5 : null,
    "moderate",
    orgs != null
      ? `${orgs} organization${orgs === 1 ? "" : "s"}${orgs < 3 ? ": very small sample" : ""}.`
      : n != null
        ? `n = ${n}${n < 5 ? ": very small sample" : ""}.`
        : "Sample size not recorded.",
  );
  push(
    "durationDays",
    VALIDITY_INPUT_LABELS.durationDays,
    inputs.durationDays == null ? null : inputs.durationDays >= 14,
    "moderate",
    inputs.durationDays == null
      ? "Duration not recorded."
      : inputs.durationDays < 14
        ? `${inputs.durationDays} day${inputs.durationDays === 1 ? "" : "s"}: short period.`
        : `${inputs.durationDays} days.`,
  );
  push(
    "dataCompletenessPercent",
    VALIDITY_INPUT_LABELS.dataCompletenessPercent,
    inputs.dataCompletenessPercent == null ? null : inputs.dataCompletenessPercent >= 85,
    inputs.dataCompletenessPercent != null && inputs.dataCompletenessPercent < 60
      ? "critical"
      : "moderate",
    inputs.dataCompletenessPercent == null
      ? "Data completeness not recorded."
      : `${inputs.dataCompletenessPercent}% of expected data present.`,
  );
  push(
    "contaminationRisk",
    VALIDITY_INPUT_LABELS.contaminationRisk,
    inputs.contaminationRisk == null ? null : !inputs.contaminationRisk,
    comparative ? "critical" : "moderate",
    inputs.contaminationRisk === true
      ? "Comparison units may have been exposed to the intervention."
      : inputs.contaminationRisk === false
        ? "No contamination between groups."
        : "Contamination not recorded.",
  );
  push(
    "seasonalityRisk",
    VALIDITY_INPUT_LABELS.seasonalityRisk,
    inputs.seasonalityRisk == null ? null : !inputs.seasonalityRisk,
    "moderate",
    inputs.seasonalityRisk === true
      ? "Seasonality may explain part of the change."
      : inputs.seasonalityRisk === false
        ? "No seasonality effect expected."
        : "Seasonality not recorded.",
  );
  push(
    "concurrentChanges",
    VALIDITY_INPUT_LABELS.concurrentChanges,
    inputs.concurrentChanges == null ? null : !inputs.concurrentChanges,
    "moderate",
    inputs.concurrentChanges === true
      ? "Other changes happened during the run."
      : inputs.concurrentChanges === false
        ? "No concurrent changes."
        : "Concurrent changes not recorded.",
  );

  const criticalFails = checks.filter((c) => c.ok === false && c.severity === "critical");
  const moderateFails = checks.filter((c) => c.ok === false && c.severity === "moderate");
  const criticalUnknown = checks.filter((c) => c.ok === null && c.severity === "critical");
  let internalValidity: InternalValidity;
  if (criticalFails.length > 0) internalValidity = "LOW";
  else if (criticalUnknown.length >= 3) internalValidity = "INDETERMINATE";
  else if (moderateFails.length >= 3) internalValidity = "LOW";
  else if (moderateFails.length > 0 || criticalUnknown.length > 0) internalValidity = "MEDIUM";
  else internalValidity = "HIGH";

  const threats = [...criticalFails, ...moderateFails].map((c) => c.text);
  const unknowns = checks.filter((c) => c.ok === null && c.severity !== "info").map((c) => c.label);
  const explanation = [
    `Design: ${DESIGN_LEVEL_LABELS[effective]}${effective !== declared ? ` (declared ${DESIGN_LEVEL_LABELS[declared].toLowerCase()})` : ""}.`,
    `Internal validity: ${INTERNAL_VALIDITY_LABELS[internalValidity]} — ${
      criticalFails.length
        ? `${criticalFails.length} critical threat${criticalFails.length === 1 ? "" : "s"}`
        : criticalUnknown.length >= 3
          ? `${criticalUnknown.length} critical facts not recorded`
          : moderateFails.length
            ? `${moderateFails.length} moderate threat${moderateFails.length === 1 ? "" : "s"}`
            : "no recorded threats"
    }.`,
    ...downgrades,
    ...(causalDesign
      ? []
      : [`${DESIGN_LEVEL_LABELS[effective]} designs measure; they do not test what causes what.`]),
  ];
  return {
    designDeclared: declared,
    designEffective: effective,
    internalValidity,
    checks,
    threats,
    unknowns,
    downgrades,
    explanation,
  };
}

export type ProofStrength = "STRONGLY" | "PARTIALLY" | "CANNOT";

export interface DesignProofPreview {
  target: {
    claimType: ClaimType;
    statement: string;
    strength: ProofStrength;
    reason: string;
  } | null;
  strongly: string[];
  partially: string[];
  cannot: string[];
  note: string;
}

const PREVIEW: Record<
  ExperimentDesignLevel,
  { strongly: string[]; partially: string[]; cannot: string[] }
> = {
  ANECDOTAL: {
    strongly: [
      "That a pain exists and how customers describe it",
      "Stated intent and stated willingness to pay",
    ],
    partially: ["Current state and alternatives, as reported"],
    cannot: ["Magnitude or frequency", "That the mechanism changes anything", "Actual purchase"],
  },
  OBSERVATIONAL: {
    strongly: [
      "Frequency, magnitude and current state, as measured",
      "Feasibility, when the observation is technical",
    ],
    partially: ["Association between the mechanism and the variable"],
    cannot: ["That the mechanism causes the change", "Anything beyond the observed scope"],
  },
  BEFORE_AFTER: {
    strongly: [
      "Feasibility and capability within the tested scope",
      "That the variable changed after the intervention",
    ],
    partially: ["A causal effect (consistent with, not proven)"],
    cannot: ["Causality against confounders and time", "Generalization beyond the tested units"],
  },
  MATCHED_COMPARISON: {
    strongly: [
      "Feasibility, capability and occurrence within scope",
      "That treated units improved more than similar untreated units",
    ],
    partially: ["A causal effect within the tested scope"],
    cannot: [
      "Causality against unobserved differences between groups",
      "Generalization beyond the segment",
    ],
  },
  CONTROLLED: {
    strongly: ["A causal effect of the mechanism within the tested scope"],
    partially: ["The magnitude of the effect in other contexts"],
    cannot: [
      "Generalization to the whole market",
      "Willingness to pay, unless the design charges money",
    ],
  },
  RANDOMIZED: {
    strongly: ["A causal effect of the mechanism within the tested population"],
    partially: ["The size of the effect elsewhere"],
    cannot: [
      "Generalization beyond the tested scope",
      "Willingness to pay, unless the design charges money",
    ],
  },
};

/** "WHAT CAN THIS DESIGN PROVE?" — for the plan dialog. Deterministic. */
export function designProofPreview(
  experimentType: ExperimentType,
  designLevel: ExperimentDesignLevel,
  targetClaim?: ClaimType | null,
): DesignProofPreview {
  const base = PREVIEW[designLevel];
  let target: DesignProofPreview["target"] = null;
  if (targetClaim) {
    const source = sourceTypeForExperiment(experimentType, designLevel);
    const level = admissibilityLevel(source, targetClaim);
    const causal = claimNature(targetClaim) === "CAUSAL";
    let strength: ProofStrength;
    let reason: string;
    if (level === "NOT_ADMISSIBLE") {
      strength = "CANNOT";
      reason = "this kind of result is not admissible evidence for the claim.";
    } else if (causal && !designAtLeast(designLevel, "MATCHED_COMPARISON")) {
      strength = designAtLeast(designLevel, "BEFORE_AFTER") ? "PARTIALLY" : "CANNOT";
      reason =
        strength === "PARTIALLY"
          ? "a before/after change is consistent with a causal effect but does not establish it."
          : `${DESIGN_LEVEL_LABELS[designLevel].toLowerCase()} designs cannot establish causality.`;
    } else if (level === "HIGH") {
      strength = "STRONGLY";
      reason = "the result is high-admissibility evidence for this claim within the tested scope.";
    } else if (level === "MEDIUM") {
      strength = "PARTIALLY";
      reason =
        "the result is medium-admissibility evidence: it supports the claim but cannot establish it alone.";
    } else {
      strength = "CANNOT";
      reason =
        "the result is low-admissibility evidence for this claim: it can inform, not establish.";
    }
    target = { claimType: targetClaim, statement: CLAIM_STATEMENTS[targetClaim], strength, reason };
  }
  return {
    target,
    strongly: base.strongly,
    partially: base.partially,
    cannot: base.cannot,
    note: "Whatever the design, the result is observed within the tested scope only; it never generalizes automatically.",
  };
}
