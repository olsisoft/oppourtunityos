/**
 * Value Strength — "If this variable can actually be moved, how valuable could
 * that movement be?" Five 0–10 dimensions combined with a geometric mean so
 * one very weak dimension meaningfully reduces the result.
 *
 * Missing dimensions are never guessed: the result is INCOMPLETE, says how
 * many dimensions are known (e.g. 4/5), names what is missing, carries the
 * provenance of every known dimension and asks the next value question.
 * UNKNOWN never becomes zero.
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

export interface ValueStrengthContext {
  variableName?: string | null;
  icpName?: string | null;
  mechanism?: string | null;
  /** Provenance label per dimension (USER / INTERVIEW / EVIDENCE / HYPOTHESIS…). */
  provenance?: Partial<Record<ValueDimension, string | null | undefined>>;
}

export interface ValueStrengthDimension {
  key: ValueDimension;
  label: string;
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
  nextQuestion: string | null;
  explanation: string[];
}

function normalize(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(10, Math.max(0, value)) / 10;
}

const PROVENANCE_LABEL: Record<string, string> = {
  USER: "USER",
  INTERVIEW: "INTERVIEW",
  EXTERNAL_EVIDENCE: "EVIDENCE",
  AI_HYPOTHESIS: "HYPOTHESIS",
  COMPUTED: "COMPUTED",
};

export function valueQuestion(dim: ValueDimension, ctx: ValueStrengthContext = {}): string {
  const v = ctx.variableName?.trim() || "the variable";
  const icp = ctx.icpName?.trim() || "the customer";
  const mechanism = ctx.mechanism?.trim() || "the proposed mechanism";
  switch (dim) {
    case "population":
      return `What share of ${icp}'s operation (capacity, revenue or transactions) is actually affected by ${v}?`;
    case "magnitude":
      return `How much does ${v} move — or cost — per occurrence, in numbers (money, hours, capacity)?`;
    case "frequency":
      return `How often does ${v} actually occur for ${icp} (per week or month)?`;
    case "importance":
      return `How much does ${v} matter to ${icp} compared with their other problems?`;
    case "attributability":
      return `How directly could ${mechanism} cause the change in ${v}, versus other factors?`;
  }
}

export function computeValueStrength(
  dims: ValueDimensions,
  ctx: ValueStrengthContext = {},
): ValueStrengthResult {
  const dimensions: ValueStrengthDimension[] = VALUE_DIMENSIONS.map((key) => {
    const raw = dims[key];
    const normalized = normalize(raw);
    const prov = ctx.provenance?.[key];
    return {
      key,
      label: VALUE_DIMENSION_LABELS[key],
      value: normalized === null ? null : Math.min(10, Math.max(0, raw as number)),
      normalized,
      provenance:
        normalized === null ? "UNKNOWN" : prov ? (PROVENANCE_LABEL[prov] ?? prov) : "HYPOTHESIS",
    };
  });
  const missing = dimensions.filter((d) => d.normalized === null).map((d) => d.key);
  const total = VALUE_DIMENSIONS.length;
  const known = total - missing.length;
  const completeness = `${known}/${total}`;
  const dimLines = dimensions.map(
    (d) => `${d.label}: ${d.value === null ? "UNKNOWN" : `${d.value}/10`} (${d.provenance})`,
  );

  if (missing.length > 0) {
    const nextQuestion = valueQuestion(missing[0], ctx);
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
        `Value Strength is INCOMPLETE · ${completeness}: a required dimension is UNKNOWN and is never guessed (UNKNOWN ≠ 0).`,
        `Missing: ${missing.map((m) => VALUE_DIMENSION_LABELS[m]).join(", ")}.`,
        ...dimLines,
        `Next value question: ${nextQuestion}`,
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
      `Geometric mean of normalized dimensions × 100 = ${score}/100.`,
      weakest ? `Weakest dimension: ${VALUE_DIMENSION_LABELS[weakest]}.` : "",
    ].filter(Boolean),
  };
}
