/**
 * Value Strength — "If this variable can actually be moved, how valuable could
 * that movement be?" Five 0–10 dimensions combined with a geometric mean so
 * one very weak dimension meaningfully reduces the result.
 *
 * Missing dimensions are never guessed: the result is INCOMPLETE, says how
 * many dimensions are known (e.g. 4/5), names what is missing, carries the
 * provenance of every known dimension and asks the next value question.
 * UNKNOWN never becomes zero.
 *
 * Every sentence is a SystemMessage (see src/i18n/messages.ts) so it renders
 * in the reader's language; `text` holds the canonical English.
 */
import { msg, type MessageParams, type SystemMessage } from "@/i18n/messages";

export const VALUE_DIMENSIONS = [
  "importance",
  "magnitude",
  "frequency",
  "population",
  "attributability",
] as const;

export type ValueDimension = (typeof VALUE_DIMENSIONS)[number];

export type ValueDimensions = Record<ValueDimension, number | null | undefined>;

export const VALUE_DIMENSION_LABELS: Record<ValueDimension, string> = {
  importance: "Importance",
  magnitude: "Magnitude",
  frequency: "Frequency",
  population: "Population affected",
  attributability: "Attributability",
};

export const VALUE_DIMENSION_HELP: Record<ValueDimension, string> = {
  importance: "How much does this variable matter to the ICP?",
  magnitude: "How large is the expected or observed movement of the variable?",
  frequency: "How often does the problem or value event happen?",
  population: "How much of the customer's operation is affected?",
  attributability: "How directly could the proposed mechanism cause the change?",
};

export interface ValueStrengthContext {
  variableName?: string | null;
  icpName?: string | null;
  mechanism?: string | null;
  /** Provenance label per dimension (USER / INTERVIEW / EVIDENCE / HYPOTHESIS…). */
  provenance?: Partial<Record<ValueDimension, string | null | undefined>>;
}

export interface ValueStrengthDimension {
  key: ValueDimension;
  label: SystemMessage;
  value: number | null;
  normalized: number | null;
  /** Provenance of the value; "UNKNOWN" when the value is missing. */
  provenance: string;
}

export interface ValueStrengthResult {
  status: "COMPLETE" | "INCOMPLETE";
  /** 0–100 when COMPLETE, null when INCOMPLETE. */
  score: number | null;
  missing: ValueDimension[];
  dimensions: ValueStrengthDimension[];
  weakest: ValueDimension | null;
  /** Known dimensions over required dimensions, e.g. 4/5. */
  known: number;
  total: number;
  completeness: string;
  /** The question that would complete the score (first missing dimension). */
  nextQuestion: SystemMessage | null;
  explanation: SystemMessage[];
}

function normalize(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(10, Math.max(0, value)) / 10;
}

/** Display token per provenance key (mirrors labels.fieldStatus). */
const PROVENANCE_LABEL: Record<string, string> = {
  USER: "USER",
  INTERVIEW: "INTERVIEW",
  EXTERNAL_EVIDENCE: "EVIDENCE",
  AI_HYPOTHESIS: "HYPOTHESIS",
  COMPUTED: "COMPUTED",
  UNKNOWN: "UNKNOWN",
};

function dimensionLabel(dim: ValueDimension): SystemMessage {
  return msg(`labels.valueDimension.${dim}`);
}

/** Localized provenance for a sentence; unknown keys pass through as text. */
function provenanceLabel(key: string): SystemMessage | string {
  return key in PROVENANCE_LABEL ? msg(`labels.fieldStatus.${key}`) : key;
}

export function valueQuestion(dim: ValueDimension, ctx: ValueStrengthContext = {}): SystemMessage {
  const variable = ctx.variableName?.trim() || msg("scoring.valueStrength.defaultVariable");
  const icp = ctx.icpName?.trim() || msg("scoring.valueStrength.defaultIcp");
  const mechanism = ctx.mechanism?.trim() || msg("scoring.valueStrength.defaultMechanism");
  switch (dim) {
    case "population":
      return msg("scoring.valueStrength.question.population", { icp, variable });
    case "magnitude":
      return msg("scoring.valueStrength.question.magnitude", { variable });
    case "frequency":
      return msg("scoring.valueStrength.question.frequency", { variable, icp });
    case "importance":
      return msg("scoring.valueStrength.question.importance", { variable, icp });
    case "attributability":
      return msg("scoring.valueStrength.question.attributability", { mechanism, variable });
  }
}

export function computeValueStrength(
  dims: ValueDimensions,
  ctx: ValueStrengthContext = {},
): ValueStrengthResult {
  const provenanceKeys: Record<string, string> = {};
  const dimensions: ValueStrengthDimension[] = VALUE_DIMENSIONS.map((key) => {
    const raw = dims[key];
    const normalized = normalize(raw);
    const provKey = normalized === null ? "UNKNOWN" : ctx.provenance?.[key] || "AI_HYPOTHESIS";
    provenanceKeys[key] = provKey;
    return {
      key,
      label: dimensionLabel(key),
      value: normalized === null ? null : Math.min(10, Math.max(0, raw as number)),
      normalized,
      provenance: PROVENANCE_LABEL[provKey] ?? provKey,
    };
  });
  const missing = dimensions.filter((d) => d.normalized === null).map((d) => d.key);
  const total = VALUE_DIMENSIONS.length;
  const known = total - missing.length;
  const completeness = `${known}/${total}`;
  const dimLines = dimensions.map((d) => {
    const provenance = provenanceLabel(provenanceKeys[d.key] ?? "UNKNOWN");
    return d.value === null
      ? msg("scoring.valueStrength.dimensionUnknown", { label: d.label, provenance })
      : msg("scoring.valueStrength.dimensionLine", { label: d.label, value: d.value, provenance });
  });

  if (missing.length > 0) {
    const nextQuestion = valueQuestion(missing[0], ctx);
    const missingParams: MessageParams = { count: missing.length };
    missing.forEach((m, i) => {
      missingParams[`d${i + 1}`] = dimensionLabel(m);
    });
    return {
      status: "INCOMPLETE",
      score: null,
      missing,
      dimensions,
      weakest: null,
      known,
      total,
      completeness,
      nextQuestion,
      explanation: [
        msg("scoring.valueStrength.incomplete", { known, total }),
        msg("scoring.valueStrength.missing", missingParams),
        ...dimLines,
        msg("scoring.valueStrength.nextQuestion", { question: nextQuestion }),
      ],
    };
  }

  const product = dimensions.reduce((p, d) => p * (d.normalized as number), 1);
  const geometricMean = product === 0 ? 0 : Math.pow(product, 1 / dimensions.length);
  const score = Math.round(100 * geometricMean);
  const weakest =
    [...dimensions].sort((a, b) => (a.normalized as number) - (b.normalized as number))[0]?.key ??
    null;

  return {
    status: "COMPLETE",
    score,
    missing: [],
    dimensions,
    weakest,
    known,
    total,
    completeness,
    nextQuestion: null,
    explanation: [
      ...dimLines,
      msg("scoring.valueStrength.geometricMean", { score }),
      ...(weakest
        ? [msg("scoring.valueStrength.weakest", { label: dimensionLabel(weakest) })]
        : []),
    ],
  };
}
