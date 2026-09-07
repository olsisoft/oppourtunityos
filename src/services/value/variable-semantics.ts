/**
 * Valuable Variable semantics: verb × category compatibility and per-field
 * provenance. UNKNOWN is a first-class status: a field without a value is
 * UNKNOWN regardless of what the record's overall provenance says.
 */
import type { DesiredDirection, Provenance, VariableCategory } from "@/generated/prisma/enums";
import { DIRECTION_LABELS, VARIABLE_CATEGORY_LABELS } from "@/domain/enums";

/** Categories where "more" is desirable. */
const GOOD_CATEGORIES: ReadonlySet<VariableCategory> = new Set<VariableCategory>([
  "REVENUE",
  "MARGIN",
  "CASH",
  "RELIABILITY",
  "QUALITY",
  "RETENTION",
  "CONVERSION",
  "PRODUCTIVITY",
  "PERFORMANCE",
  "CAPACITY",
  "UTILIZATION",
  "VISIBILITY",
  "PREDICTABILITY",
  "AVAILABILITY",
  "COMPLIANCE",
]);

/** Categories where "less" is desirable. */
const BAD_CATEGORIES: ReadonlySet<VariableCategory> = new Set<VariableCategory>([
  "COST",
  "RISK",
  "COMPLEXITY",
  "DOWNTIME",
  "FRAUD",
]);

const DECREASING_VERBS: ReadonlySet<DesiredDirection> = new Set<DesiredDirection>([
  "DECREASE",
  "PREVENT",
  "SIMPLIFY",
]);
const INCREASING_VERBS: ReadonlySet<DesiredDirection> = new Set<DesiredDirection>([
  "INCREASE",
  "EXPAND",
  "PROTECT",
  "RECOVER",
  "ACCELERATE",
]);

export interface VerbCategoryCheck {
  level: "ok" | "warning";
  message: string | null;
}

export function checkVerbCategory(
  verb: DesiredDirection,
  category: VariableCategory,
): VerbCategoryCheck {
  const v = DIRECTION_LABELS[verb];
  const c = VARIABLE_CATEGORY_LABELS[category];
  if (DECREASING_VERBS.has(verb) && GOOD_CATEGORIES.has(category)) {
    return {
      level: "warning",
      message: `"${v} × ${c}" reads as making a desirable thing smaller. Did you mean ${suggestedVerbs(
        category,
      )
        .slice(0, 3)
        .map((s) => DIRECTION_LABELS[s])
        .join(", ")}?`,
    };
  }
  if (INCREASING_VERBS.has(verb) && BAD_CATEGORIES.has(category)) {
    return {
      level: "warning",
      message: `"${v} × ${c}" reads as making an undesirable thing bigger. Did you mean ${suggestedVerbs(
        category,
      )
        .slice(0, 3)
        .map((s) => DIRECTION_LABELS[s])
        .join(", ")}?`,
    };
  }
  return { level: "ok", message: null };
}

export function suggestedVerbs(category: VariableCategory): DesiredDirection[] {
  if (BAD_CATEGORIES.has(category))
    return ["DECREASE", "PREVENT", "DETECT", "SIMPLIFY", "STABILIZE", "MEASURE"];
  if (GOOD_CATEGORIES.has(category))
    return ["INCREASE", "PROTECT", "IMPROVE", "RECOVER", "EXPAND", "MAINTAIN"];
  if (category === "TIME") return ["ACCELERATE", "DECREASE", "STABILIZE", "MEASURE"];
  if (category === "INVENTORY") return ["OPTIMIZE", "DECREASE", "TRACE", "RELEASE"];
  return ["IMPROVE", "OPTIMIZE", "MEASURE", "INCREASE", "DECREASE"];
}

export const VARIABLE_FIELDS = [
  "name",
  "category",
  "desiredDirection",
  "target",
  "currentState",
  "desiredState",
  "unit",
  "importanceScore",
  "whoValuesIt",
  "whyItMatters",
  "parentVariableId",
] as const;

export type VariableField = (typeof VARIABLE_FIELDS)[number];
export type FieldStatus = Provenance | "UNKNOWN";

export const FIELD_STATUS_LABELS: Record<FieldStatus, string> = {
  USER: "USER",
  INTERVIEW: "INTERVIEW",
  EXTERNAL_EVIDENCE: "EVIDENCE",
  AI_HYPOTHESIS: "HYPOTHESIS",
  COMPUTED: "COMPUTED",
  UNKNOWN: "UNKNOWN",
};

export interface VariableLike {
  provenance: Provenance;
  fieldProvenance?: unknown;
  [key: string]: unknown;
}

const PROVENANCES: ReadonlySet<string> = new Set([
  "USER",
  "INTERVIEW",
  "EXTERNAL_EVIDENCE",
  "AI_HYPOTHESIS",
  "COMPUTED",
]);

/** Status of one field: UNKNOWN when empty, otherwise its recorded provenance (falls back to the record's). */
export function fieldStatus(variable: VariableLike, field: VariableField): FieldStatus {
  const value = variable[field];
  const empty =
    value === null || value === undefined || (typeof value === "string" && value.trim() === "");
  if (empty) return "UNKNOWN";
  const map = (variable.fieldProvenance ?? {}) as Record<string, unknown>;
  const recorded = map[field];
  if (typeof recorded === "string" && PROVENANCES.has(recorded)) return recorded as Provenance;
  return variable.provenance;
}

/** Merge a provenance update for the fields that changed. */
export function withFieldProvenance(
  existing: unknown,
  fields: VariableField[],
  provenance: Provenance,
): Record<string, string> {
  const base = (
    existing && typeof existing === "object" ? { ...(existing as Record<string, string>) } : {}
  ) as Record<string, string>;
  for (const f of fields) base[f] = provenance;
  return base;
}
