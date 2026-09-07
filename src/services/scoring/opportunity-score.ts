/**
 * Opportunity Potential — deterministic, explainable, 0–100.
 *
 * The LLM never produces this number. It may propose the six 0–10 inputs;
 * the user can edit them; this function converts them into a score.
 */
import { clamp } from "@/lib/utils";

export interface OpportunityScoreInputs {
  importance: number;
  painIntensity: number;
  frequency: number;
  gap: number;
  willingnessToPay: number;
  alternativeWeakness: number;
}

export type OpportunityInputKey = keyof OpportunityScoreInputs;

/** Weights sum to 1.0 — each 0–10 input contributes weight × 10 points max. */
export const OPPORTUNITY_WEIGHTS: Record<OpportunityInputKey, number> = {
  importance: 0.2,
  painIntensity: 0.2,
  frequency: 0.15,
  gap: 0.15,
  willingnessToPay: 0.2,
  alternativeWeakness: 0.1,
};

export const OPPORTUNITY_INPUT_LABELS: Record<OpportunityInputKey, string> = {
  importance: "Importance of the variable",
  painIntensity: "Pain intensity",
  frequency: "Frequency of the problem",
  gap: "Gap between current and desired state",
  willingnessToPay: "Willingness to pay",
  alternativeWeakness: "Weakness of current alternatives",
};

export const OPPORTUNITY_INPUT_HELP: Record<OpportunityInputKey, string> = {
  importance: "How economically meaningful is the variable to the ICP? 10 = a top-3 P&L driver.",
  painIntensity: "How badly does the gap hurt when it happens? 10 = existential, 0 = shrug.",
  frequency: "How often does the problem occur? 10 = many times per day, 0 = once a year.",
  gap: "How far is the current state from the desired state? 10 = an order of magnitude.",
  willingnessToPay: "Is there budget and a buyer? 10 = they already pay for partial solutions.",
  alternativeWeakness: "How badly do current alternatives fail? 10 = nothing works, 0 = solved.",
};

export interface OpportunityScoreComponent {
  key: OpportunityInputKey;
  label: string;
  /** Normalized input, 0–10. */
  value: number;
  weight: number;
  /** Points contributed to the 0–100 score. */
  points: number;
  maxPoints: number;
}

export interface OpportunityScoreResult {
  score: number;
  components: OpportunityScoreComponent[];
  /** Human-readable explanation lines shown in the UI. */
  explanation: string[];
  /** Inputs that hold the score back the most (lowest value first). */
  weakestInputs: OpportunityInputKey[];
}

export function normalizeTen(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 10);
}

export function normalizeInputs(inputs: Partial<OpportunityScoreInputs>): OpportunityScoreInputs {
  return {
    importance: normalizeTen(inputs.importance),
    painIntensity: normalizeTen(inputs.painIntensity),
    frequency: normalizeTen(inputs.frequency),
    gap: normalizeTen(inputs.gap),
    willingnessToPay: normalizeTen(inputs.willingnessToPay),
    alternativeWeakness: normalizeTen(inputs.alternativeWeakness),
  };
}

export function computeOpportunityScore(
  rawInputs: Partial<OpportunityScoreInputs>,
): OpportunityScoreResult {
  const inputs = normalizeInputs(rawInputs);
  const keys = Object.keys(OPPORTUNITY_WEIGHTS) as OpportunityInputKey[];

  const components: OpportunityScoreComponent[] = keys.map((key) => {
    const weight = OPPORTUNITY_WEIGHTS[key];
    const value = inputs[key];
    return {
      key,
      label: OPPORTUNITY_INPUT_LABELS[key],
      value,
      weight,
      points: round1(value * weight * 10),
      maxPoints: round1(weight * 100),
    };
  });

  const total = components.reduce((sum, c) => sum + c.points, 0);
  const score = Math.round(clamp(total, 0, 100));

  const weakestInputs = [...keys].sort((a, b) => inputs[a] - inputs[b]).slice(0, 2);

  const explanation = components.map(
    (c) => `${c.label}: ${c.value}/10 × ${Math.round(c.weight * 100)}% → ${c.points} pts`,
  );
  explanation.push(`Total: ${score}/100`);

  return { score, components, explanation, weakestInputs };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
