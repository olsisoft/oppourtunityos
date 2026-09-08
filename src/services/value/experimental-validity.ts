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
import { msg, type SystemMessage } from "@/i18n/messages";
import { admissibilityLevel } from "./admissibility";
import { claimNature } from "./claim-taxonomy";
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
  /** "Randomized declared, but units were not randomly assigned: treated as controlled." */
  downgrades: SystemMessage[];
}

type DowngradeReason =
  | "noComparisonGroup"
  | "notRandomlyAssigned"
  | "singleGroup"
  | "notMatched"
  | "notIsolated"
  | "noBaseline";

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
  const downgrades: SystemMessage[] = [];
  const cap = (level: ExperimentDesignLevel, reason: DowngradeReason) => {
    if (designIndex(effective) > designIndex(level)) {
      downgrades.push(
        msg(`validity.downgrade.${reason}`, {
          declared: msg(`labels.designLevel.${declared}`),
          level: msg(`validity.designLevelLower.${level}`),
        }),
      );
      effective = level;
    }
  };
  if (inputs.comparisonGroup === false) cap("BEFORE_AFTER", "noComparisonGroup");
  if (inputs.assignmentMethod && inputs.assignmentMethod !== "RANDOM")
    cap("CONTROLLED", "notRandomlyAssigned");
  if (inputs.assignmentMethod === "NONE") cap("BEFORE_AFTER", "singleGroup");
  if (
    designIndex(effective) === designIndex("MATCHED_COMPARISON") &&
    inputs.assignmentMethod &&
    inputs.assignmentMethod !== "MATCHED" &&
    inputs.assignmentMethod !== "RANDOM"
  )
    cap("BEFORE_AFTER", "notMatched");
  if (inputs.interventionIsolated === false && designIndex(effective) >= designIndex("CONTROLLED"))
    cap("MATCHED_COMPARISON", "notIsolated");
  if (inputs.baselineMeasured === false && designIndex(effective) === designIndex("BEFORE_AFTER"))
    cap("OBSERVATIONAL", "noBaseline");
  return { declared, effective, downgrades };
}

export interface ValidityCheck {
  /** The ValidityInputs field this check reads. */
  key: string;
  /** The field's label (`labels.validityInput.<key>`). */
  label: SystemMessage;
  /** true = passed, false = threat, null = not recorded. */
  ok: boolean | null;
  severity: "critical" | "moderate" | "info";
  /** What was recorded and what it means for this run. */
  text: SystemMessage;
}

export interface InternalValidityAssessment {
  designDeclared: ExperimentDesignLevel;
  designEffective: ExperimentDesignLevel;
  internalValidity: InternalValidity;
  checks: ValidityCheck[];
  /** Texts of the failed critical and moderate checks. */
  threats: SystemMessage[];
  /** Labels of the unrecorded critical and moderate checks. */
  unknowns: SystemMessage[];
  downgrades: SystemMessage[];
  explanation: SystemMessage[];
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
    key: keyof ValidityInputs,
    ok: boolean | null,
    severity: ValidityCheck["severity"],
    text: SystemMessage,
  ) => checks.push({ key, label: msg(`labels.validityInput.${key}`), ok, severity, text });
  /** ok / fail / unknown text of a boolean fact. */
  const tri = (key: keyof ValidityInputs, state: boolean | null | undefined) =>
    msg(`validity.check.${key}.${state === true ? "ok" : state === false ? "fail" : "unknown"}`);

  push(
    "baselineMeasured",
    inputs.baselineMeasured ?? null,
    causalDesign ? "critical" : "info",
    tri("baselineMeasured", inputs.baselineMeasured),
  );
  push(
    "comparisonGroup",
    inputs.comparisonGroup ?? null,
    comparative ? "critical" : "info",
    tri("comparisonGroup", inputs.comparisonGroup),
  );
  push(
    "assignmentMethod",
    inputs.assignmentMethod
      ? inputs.assignmentMethod === "RANDOM" || inputs.assignmentMethod === "MATCHED"
      : null,
    comparative ? "moderate" : "info",
    inputs.assignmentMethod
      ? msg("validity.check.assignmentMethod.recorded", {
          method: msg(`validity.assignmentMethodLower.${inputs.assignmentMethod}`),
        })
      : msg("validity.check.assignmentMethod.unknown"),
  );
  push(
    "sameMeasurement",
    inputs.sameMeasurement ?? null,
    "critical",
    tri("sameMeasurement", inputs.sameMeasurement),
  );
  push(
    "interventionIsolated",
    inputs.interventionIsolated ?? null,
    causalDesign ? "critical" : "info",
    tri("interventionIsolated", inputs.interventionIsolated),
  );
  push(
    "confoundersControlled",
    inputs.confoundersControlled ?? null,
    comparative ? "critical" : causalDesign ? "moderate" : "info",
    tri("confoundersControlled", inputs.confoundersControlled),
  );
  push(
    "attritionPercent",
    inputs.attritionPercent == null ? null : inputs.attritionPercent <= 30,
    inputs.attritionPercent != null && inputs.attritionPercent > 30 ? "critical" : "moderate",
    inputs.attritionPercent == null
      ? msg("validity.check.attritionPercent.unknown")
      : msg(
          `validity.check.attritionPercent.${
            inputs.attritionPercent > 30
              ? "high"
              : inputs.attritionPercent > 10
                ? "moderate"
                : "negligible"
          }`,
          { percent: inputs.attritionPercent },
        ),
  );
  push(
    "instrumentationChanged",
    inputs.instrumentationChanged == null ? null : !inputs.instrumentationChanged,
    "critical",
    // ok = unchanged, fail = changed.
    tri(
      "instrumentationChanged",
      inputs.instrumentationChanged == null ? null : !inputs.instrumentationChanged,
    ),
  );
  const orgs = inputs.organizationCount ?? null;
  const n = inputs.sampleSize ?? null;
  push(
    "sampleSize",
    orgs != null ? orgs >= 3 : n != null ? n >= 5 : null,
    "moderate",
    orgs != null
      ? msg(`validity.check.sampleSize.${orgs < 3 ? "organizationsSmall" : "organizations"}`, {
          count: orgs,
        })
      : n != null
        ? msg(`validity.check.sampleSize.${n < 5 ? "unitsSmall" : "units"}`, { count: n })
        : msg("validity.check.sampleSize.unknown"),
  );
  push(
    "durationDays",
    inputs.durationDays == null ? null : inputs.durationDays >= 14,
    "moderate",
    inputs.durationDays == null
      ? msg("validity.check.durationDays.unknown")
      : msg(`validity.check.durationDays.${inputs.durationDays < 14 ? "short" : "ok"}`, {
          count: inputs.durationDays,
        }),
  );
  push(
    "dataCompletenessPercent",
    inputs.dataCompletenessPercent == null ? null : inputs.dataCompletenessPercent >= 85,
    inputs.dataCompletenessPercent != null && inputs.dataCompletenessPercent < 60
      ? "critical"
      : "moderate",
    inputs.dataCompletenessPercent == null
      ? msg("validity.check.dataCompletenessPercent.unknown")
      : msg("validity.check.dataCompletenessPercent.recorded", {
          percent: inputs.dataCompletenessPercent,
        }),
  );
  // Risk flags: ok = no risk, fail = risk present.
  push(
    "contaminationRisk",
    inputs.contaminationRisk == null ? null : !inputs.contaminationRisk,
    comparative ? "critical" : "moderate",
    tri("contaminationRisk", inputs.contaminationRisk == null ? null : !inputs.contaminationRisk),
  );
  push(
    "seasonalityRisk",
    inputs.seasonalityRisk == null ? null : !inputs.seasonalityRisk,
    "moderate",
    tri("seasonalityRisk", inputs.seasonalityRisk == null ? null : !inputs.seasonalityRisk),
  );
  push(
    "concurrentChanges",
    inputs.concurrentChanges == null ? null : !inputs.concurrentChanges,
    "moderate",
    tri("concurrentChanges", inputs.concurrentChanges == null ? null : !inputs.concurrentChanges),
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
  const validityLabel = msg(`labels.internalValidity.${internalValidity}`);
  const explanation: SystemMessage[] = [
    effective !== declared
      ? msg("validity.explanation.designDeclared", {
          level: msg(`labels.designLevel.${effective}`),
          declared: msg(`validity.designLevelLower.${declared}`),
        })
      : msg("validity.explanation.design", { level: msg(`labels.designLevel.${effective}`) }),
    criticalFails.length
      ? msg("validity.explanation.validityCriticalThreats", {
          validity: validityLabel,
          count: criticalFails.length,
        })
      : criticalUnknown.length >= 3
        ? msg("validity.explanation.validityCriticalUnknown", {
            validity: validityLabel,
            count: criticalUnknown.length,
          })
        : moderateFails.length
          ? msg("validity.explanation.validityModerateThreats", {
              validity: validityLabel,
              count: moderateFails.length,
            })
          : msg("validity.explanation.validityNoThreats", { validity: validityLabel }),
    ...downgrades,
    ...(causalDesign
      ? []
      : [
          msg("validity.explanation.measuresOnly", {
            level: msg(`labels.designLevel.${effective}`),
          }),
        ]),
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
    /** The claim statement (`labels.claimStatement.<type>`). */
    statement: SystemMessage;
    strength: ProofStrength;
    /** Why the design can, partially can or cannot establish the target claim. */
    reason: SystemMessage;
  } | null;
  strongly: SystemMessage[];
  partially: SystemMessage[];
  cannot: SystemMessage[];
  note: SystemMessage;
}

/** Dictionary keys under `validity.preview.<level>.<bucket>`. */
const PREVIEW: Record<
  ExperimentDesignLevel,
  { strongly: string[]; partially: string[]; cannot: string[] }
> = {
  ANECDOTAL: {
    strongly: ["painDescribed", "statedIntent"],
    partially: ["reportedState"],
    cannot: ["magnitude", "mechanismEffect", "actualPurchase"],
  },
  OBSERVATIONAL: {
    strongly: ["measuredState", "technicalFeasibility"],
    partially: ["association"],
    cannot: ["causation", "beyondScope"],
  },
  BEFORE_AFTER: {
    strongly: ["feasibilityInScope", "variableChanged"],
    partially: ["causalConsistent"],
    cannot: ["causalityConfounders", "generalizationUnits"],
  },
  MATCHED_COMPARISON: {
    strongly: ["occurrenceInScope", "treatedImproved"],
    partially: ["causalInScope"],
    cannot: ["unobservedDifferences", "generalizationSegment"],
  },
  CONTROLLED: {
    strongly: ["causalInScope"],
    partially: ["magnitudeElsewhere"],
    cannot: ["generalizationMarket", "willingnessToPay"],
  },
  RANDOMIZED: {
    strongly: ["causalInPopulation"],
    partially: ["effectSizeElsewhere"],
    cannot: ["generalizationScope", "willingnessToPay"],
  },
};

/** "WHAT CAN THIS DESIGN PROVE?" — for the plan dialog. Deterministic. */
export function designProofPreview(
  experimentType: ExperimentType,
  designLevel: ExperimentDesignLevel,
  targetClaim?: ClaimType | null,
): DesignProofPreview {
  const base = PREVIEW[designLevel];
  const list = (bucket: "strongly" | "partially" | "cannot") =>
    base[bucket].map((name) => msg(`validity.preview.${designLevel}.${bucket}.${name}`));
  let target: DesignProofPreview["target"] = null;
  if (targetClaim) {
    const source = sourceTypeForExperiment(experimentType, designLevel);
    const level = admissibilityLevel(source, targetClaim);
    const causal = claimNature(targetClaim) === "CAUSAL";
    let strength: ProofStrength;
    let reason: SystemMessage;
    if (level === "NOT_ADMISSIBLE") {
      strength = "CANNOT";
      reason = msg("validity.preview.reason.notAdmissible");
    } else if (causal && !designAtLeast(designLevel, "MATCHED_COMPARISON")) {
      strength = designAtLeast(designLevel, "BEFORE_AFTER") ? "PARTIALLY" : "CANNOT";
      reason =
        strength === "PARTIALLY"
          ? msg("validity.preview.reason.beforeAfter")
          : msg("validity.preview.reason.designCannotCausal", {
              level: msg(`validity.designLevelLower.${designLevel}`),
            });
    } else if (level === "HIGH") {
      strength = "STRONGLY";
      reason = msg("validity.preview.reason.high");
    } else if (level === "MEDIUM") {
      strength = "PARTIALLY";
      reason = msg("validity.preview.reason.medium");
    } else {
      strength = "CANNOT";
      reason = msg("validity.preview.reason.low");
    }
    target = {
      claimType: targetClaim,
      statement: msg(`labels.claimStatement.${targetClaim}`),
      strength,
      reason,
    };
  }
  return {
    target,
    strongly: list("strongly"),
    partially: list("partially"),
    cannot: list("cannot"),
    note: msg("validity.preview.note"),
  };
}
