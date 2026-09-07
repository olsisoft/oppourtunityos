/**
 * Value Strength — "If this variable can actually be moved, how valuable could
 * that movement be?" Five 0–10 dimensions combined with a geometric mean so
 * one very weak dimension meaningfully reduces the result.
 *
 * Missing dimensions are never guessed: the result is INCOMPLETE and names
 * the dimensions that still need validation.
 */
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

export interface ValueStrengthDimension {
  key: ValueDimension;
  label: string;
  value: number | null;
  normalized: number | null;
}

export interface ValueStrengthResult {
  status: "COMPLETE" | "INCOMPLETE";
  /** 0–100 when COMPLETE, null when INCOMPLETE. */
  score: number | null;
  missing: ValueDimension[];
  dimensions: ValueStrengthDimension[];
  weakest: ValueDimension | null;
  explanation: string[];
}

function normalize(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(10, Math.max(0, value)) / 10;
}

export function computeValueStrength(dims: ValueDimensions): ValueStrengthResult {
  const dimensions: ValueStrengthDimension[] = VALUE_DIMENSIONS.map((key) => {
    const raw = dims[key];
    const normalized = normalize(raw);
    return {
      key,
      label: VALUE_DIMENSION_LABELS[key],
      value: normalized === null ? null : Math.min(10, Math.max(0, raw as number)),
      normalized,
    };
  });
  const missing = dimensions.filter((d) => d.normalized === null).map((d) => d.key);

  if (missing.length > 0) {
    return {
      status: "INCOMPLETE",
      score: null,
      missing,
      dimensions,
      weakest: null,
      explanation: [
        "Value Strength is INCOMPLETE: required dimensions are UNKNOWN and are never guessed.",
        `Needs validation: ${missing.map((m) => VALUE_DIMENSION_LABELS[m]).join(", ")}.`,
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
    explanation: [
      ...dimensions.map((d) => `${d.label}: ${d.value}/10`),
      `Geometric mean of normalized dimensions × 100 = ${score}/100.`,
      weakest ? `Weakest dimension: ${VALUE_DIMENSION_LABELS[weakest]}.` : "",
    ].filter(Boolean),
  };
}
