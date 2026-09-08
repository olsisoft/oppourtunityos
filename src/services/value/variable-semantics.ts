/**
 * Valuable Variable semantics.
 *
 * A variable expresses ACTION × VARIABLE × TARGET. The compatibility check
 * operates on the action verb and the *variable type* (what is directly
 * moved: leakage, churn, revenue…), never on the parent economic category.
 * "Reduce × Leakage" is coherent even though leakage lives under Revenue.
 *
 * The taxonomy is open: known types carry a polarity; custom types are
 * allowed and get an explicit polarity or stay UNKNOWN (no warning).
 * Warnings are advisory only — the user can always keep the pair.
 *
 * Per-field provenance: UNKNOWN is a first-class status — a field without a
 * value is UNKNOWN regardless of the record's overall provenance.
 */
import type { DesiredDirection, Provenance, VariablePolarity } from "@/generated/prisma/enums";
import { DIRECTION_LABELS } from "@/domain/enums";

export interface VariableTypeDef {
  name: string;
  polarity: VariablePolarity;
  aliases?: string[];
}

/** Open taxonomy of variable types (Part 1.2). Not a closed set. */
export const VARIABLE_TYPE_TAXONOMY: VariableTypeDef[] = [
  // POSITIVE — more is desirable
  { name: "Revenue", polarity: "POSITIVE", aliases: ["sales", "turnover"] },
  { name: "Margin", polarity: "POSITIVE" },
  { name: "Profit", polarity: "POSITIVE" },
  { name: "Cash", polarity: "POSITIVE", aliases: ["cash flow"] },
  { name: "Retention", polarity: "POSITIVE" },
  { name: "Reliability", polarity: "POSITIVE" },
  { name: "Availability", polarity: "POSITIVE", aliases: ["uptime"] },
  { name: "Capacity", polarity: "POSITIVE" },
  { name: "Productivity", polarity: "POSITIVE" },
  { name: "Conversion", polarity: "POSITIVE", aliases: ["conversion rate"] },
  { name: "Quality", polarity: "POSITIVE" },
  { name: "Visibility", polarity: "POSITIVE" },
  { name: "Predictability", polarity: "POSITIVE" },
  { name: "Utilization", polarity: "POSITIVE", aliases: ["utilisation", "occupancy"] },
  { name: "Security", polarity: "POSITIVE" },
  // NEGATIVE — less is desirable
  { name: "Cost", polarity: "NEGATIVE", aliases: ["expense", "spend"] },
  { name: "Loss", polarity: "NEGATIVE" },
  { name: "Leakage", polarity: "NEGATIVE", aliases: ["revenue leakage"] },
  { name: "Waste", polarity: "NEGATIVE" },
  { name: "Risk", polarity: "NEGATIVE" },
  { name: "Exposure", polarity: "NEGATIVE" },
  { name: "Fraud", polarity: "NEGATIVE" },
  { name: "Error", polarity: "NEGATIVE", aliases: ["errors", "error rate"] },
  { name: "Downtime", polarity: "NEGATIVE" },
  { name: "Churn", polarity: "NEGATIVE" },
  { name: "Latency", polarity: "NEGATIVE" },
  { name: "Complexity", polarity: "NEGATIVE" },
  { name: "Delay", polarity: "NEGATIVE" },
  { name: "Defect", polarity: "NEGATIVE", aliases: ["defects", "defect rate"] },
  { name: "Idle capacity", polarity: "NEGATIVE", aliases: ["idle time", "idle labor"] },
  { name: "Manual effort", polarity: "NEGATIVE", aliases: ["manual work"] },
  { name: "No-show rate", polarity: "NEGATIVE", aliases: ["no-shows", "no shows"] },
  { name: "Shrinkage", polarity: "NEGATIVE" },
  // NEUTRAL / contextual — direction depends on the situation
  { name: "Time", polarity: "NEUTRAL" },
  { name: "Volume", polarity: "NEUTRAL" },
  { name: "Frequency", polarity: "NEUTRAL" },
  { name: "Throughput", polarity: "NEUTRAL" },
  { name: "Engagement", polarity: "NEUTRAL" },
  { name: "Inventory", polarity: "NEUTRAL", aliases: ["stock"] },
  { name: "Headcount", polarity: "NEUTRAL" },
  { name: "Workload", polarity: "NEUTRAL" },
  { name: "Processing time", polarity: "NEUTRAL" },
  { name: "Cycle time", polarity: "NEUTRAL" },
  { name: "Time-to-value", polarity: "NEUTRAL" },
  { name: "Other", polarity: "NEUTRAL" },
];

export const VARIABLE_TYPES_BY_POLARITY: Record<VariablePolarity, string[]> = {
  POSITIVE: VARIABLE_TYPE_TAXONOMY.filter((t) => t.polarity === "POSITIVE").map((t) => t.name),
  NEGATIVE: VARIABLE_TYPE_TAXONOMY.filter((t) => t.polarity === "NEGATIVE").map((t) => t.name),
  NEUTRAL: VARIABLE_TYPE_TAXONOMY.filter((t) => t.polarity === "NEUTRAL").map((t) => t.name),
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Known type definition for a name or alias (case-insensitive); null for custom types. */
export function knownVariableType(type: string | null | undefined): VariableTypeDef | null {
  if (!type) return null;
  const n = norm(type);
  return (
    VARIABLE_TYPE_TAXONOMY.find(
      (t) => norm(t.name) === n || (t.aliases ?? []).some((a) => norm(a) === n),
    ) ?? null
  );
}

/**
 * Polarity of a variable: an explicit polarity wins (custom types), then the
 * taxonomy; null means UNKNOWN — and UNKNOWN never triggers a warning.
 */
export function polarityOf(
  type: string | null | undefined,
  explicit?: VariablePolarity | null,
): VariablePolarity | null {
  if (explicit) return explicit;
  return knownVariableType(type)?.polarity ?? null;
}

/** Verbs that make the variable smaller / less frequent. */
export const DECREASING_VERBS: ReadonlySet<DesiredDirection> = new Set<DesiredDirection>([
  "DECREASE",
  "PREVENT",
  "SIMPLIFY",
  "AUTOMATE",
]);
/** Verbs that make the variable bigger / stronger. */
export const INCREASING_VERBS: ReadonlySet<DesiredDirection> = new Set<DesiredDirection>([
  "INCREASE",
  "EXPAND",
  "PROTECT",
  "RECOVER",
  "IMPROVE",
  "MAINTAIN",
  "ACCELERATE",
]);

export type VerbTypeLevel = "ok" | "warning" | "unknown";

export interface VerbTypeCheck {
  level: VerbTypeLevel;
  polarity: VariablePolarity | null;
  message: string | null;
}

/**
 * Advisory compatibility of an action verb with a variable type.
 * Never blocking; the user can override.
 */
export function checkVerbType(
  verb: DesiredDirection,
  type: string | null | undefined,
  explicitPolarity?: VariablePolarity | null,
): VerbTypeCheck {
  const polarity = polarityOf(type, explicitPolarity);
  const v = DIRECTION_LABELS[verb];
  if (!polarity) {
    return {
      level: "unknown",
      polarity: null,
      message:
        "Variable type is UNKNOWN, so the action verb cannot be checked. Choose a type (or set the polarity of a custom type).",
    };
  }
  const t = type?.trim() || polarity.toLowerCase();
  if (polarity === "POSITIVE" && DECREASING_VERBS.has(verb)) {
    return {
      level: "warning",
      polarity,
      message: `"${v} × ${t}" reads as making a desirable thing smaller. Did you mean ${suggestedVerbsFor(
        polarity,
      )
        .slice(0, 3)
        .map((s) => DIRECTION_LABELS[s])
        .join(", ")}? You may keep it if it is intended.`,
    };
  }
  if (polarity === "NEGATIVE" && INCREASING_VERBS.has(verb)) {
    return {
      level: "warning",
      polarity,
      message: `"${v} × ${t}" reads as making an undesirable thing bigger. Did you mean ${suggestedVerbsFor(
        polarity,
      )
        .slice(0, 3)
        .map((s) => DIRECTION_LABELS[s])
        .join(", ")}? You may keep it if it is intended.`,
    };
  }
  return { level: "ok", polarity, message: null };
}

export function suggestedVerbsFor(polarity: VariablePolarity | null): DesiredDirection[] {
  if (polarity === "NEGATIVE")
    return ["DECREASE", "PREVENT", "DETECT", "SIMPLIFY", "AUTOMATE", "MEASURE"];
  if (polarity === "POSITIVE")
    return ["INCREASE", "PROTECT", "IMPROVE", "RECOVER", "EXPAND", "MAINTAIN"];
  if (polarity === "NEUTRAL")
    return ["OPTIMIZE", "ACCELERATE", "DECREASE", "STABILIZE", "MEASURE", "INCREASE"];
  return ["IMPROVE", "OPTIMIZE", "MEASURE", "INCREASE", "DECREASE"];
}

/** Compact glyph for a verb: ↓ smaller, ↑ bigger, ⇄ hold, ◎ observe. */
export function directionGlyph(verb: DesiredDirection): string {
  if (DECREASING_VERBS.has(verb)) return "↓";
  if (verb === "PROTECT" || verb === "MAINTAIN" || verb === "STABILIZE") return "⇄";
  if (verb === "DETECT" || verb === "MEASURE" || verb === "TRACE") return "◎";
  if (INCREASING_VERBS.has(verb)) return "↑";
  return "◎";
}

/** "Reduce no-show rate" — the compact sentence used in lists (Part 1.5). */
export function verbSentence(verb: DesiredDirection, name: string): string {
  const n = name.trim();
  return `${DIRECTION_LABELS[verb]} ${n.charAt(0).toLowerCase()}${n.slice(1)}`;
}

/** "↓ No-show rate" — the compact label used on nodes and tiles. */
export function compactLabel(verb: DesiredDirection, name: string): string {
  return `${directionGlyph(verb)} ${name.trim()}`;
}

export const VARIABLE_FIELDS = [
  "name",
  "category",
  "variableType",
  "variablePolarity",
  "desiredDirection",
  "target",
  "scope",
  "currentState",
  "desiredState",
  "unit",
  "importanceScore",
  "whoValuesIt",
  "whyItMatters",
  "parentVariableId",
  "parentDirection",
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
