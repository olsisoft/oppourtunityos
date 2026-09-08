/**
 * Evidence Confidence — deterministic, explainable, 0–100.
 *
 * Evidence is never a count of mentions. Each item is weighted by strength,
 * relevance and directness, then feeds gated components (a Reddit comment with
 * no explicit pain does not increase the "explicit pain" component). Every
 * component saturates so many weak items cannot outweigh one strong, direct
 * customer statement. Contradictory evidence subtracts.
 */
import { clamp } from "@/lib/utils";
import type { EvidenceSentiment, EvidenceSourceType, EvidenceType } from "@/generated/prisma/enums";
import { fitFactor } from "@/services/value/evidence-fit";
import {
  isDirectSource,
  isMeasurementSource,
  SOURCE_DIRECTNESS,
  sourceFamily,
} from "@/services/value/evidence-sources";

export interface EvidenceSignal {
  type: EvidenceType;
  strengthScore: number; // 0–10
  relevanceScore: number; // 0–10
  sentiment: EvidenceSentiment;
  sourceDate?: Date | string | null;
  isDirectCustomer: boolean;
  hasExplicitPain: boolean;
  hasEconomicImpact: boolean;
  hasWorkaround: boolean;
  hasPurchaseIntent: boolean;
  /** Source taxonomy (feeds diversity by family). Absent = legacy type only. */
  sourceType?: EvidenceSourceType | null;
  /** Fitness (0–100) of this item for the claim being scored. Absent = full weight. */
  fit?: number | null;
  /** Origin key: derivatives of one source share it and count once for diversity. */
  originId?: string | null;
}

export type EvidenceComponentKey =
  | "directCustomer"
  | "explicitPain"
  | "economicImpact"
  | "workaround"
  | "purchaseIntent"
  | "diversity"
  | "recency"
  // Generic claim-support engine (product, causal, outcome, commercial, access claims).
  | "support"
  | "corroboration"
  | "measurement";

export const EVIDENCE_WEIGHTS: Record<EvidenceComponentKey, number> = {
  directCustomer: 25,
  explicitPain: 20,
  economicImpact: 20,
  workaround: 10,
  purchaseIntent: 15,
  diversity: 5,
  recency: 5,
  support: 60,
  corroboration: 20,
  measurement: 10,
};

export const EVIDENCE_COMPONENT_LABELS: Record<EvidenceComponentKey, string> = {
  directCustomer: "Direct customer evidence",
  explicitPain: "Explicit pain statements",
  economicImpact: "Economic impact evidence",
  workaround: "Workaround behavior",
  purchaseIntent: "Purchase intent / willingness to pay",
  diversity: "Source diversity",
  recency: "Recency",
  support: "Fitting supporting evidence",
  corroboration: "Independent corroboration",
  measurement: "Direct measurement",
};

/** Weights of the generic claim-support engine (sum = 100). */
const SUPPORT_WEIGHTS = { support: 60, corroboration: 20, measurement: 10, recency: 10 } as const;

/** How direct a source type is, before per-item strength/relevance. */
export const TYPE_DIRECTNESS: Record<EvidenceType, number> = {
  INTERVIEW: 1.0,
  CUSTOMER_QUOTE: 1.0,
  /// An experiment result observed by the user; direct-customer credit is
  /// granted only when the result flags real customers, never by type.
  EXPERIMENT: 0.9,
  SURVEY: 0.9,
  REVIEW: 0.7,
  COMPETITOR_REVIEW: 0.7,
  JOB_POSTING: 0.6,
  MARKET_REPORT: 0.6,
  FORUM_POST: 0.5,
  REDDIT: 0.5,
  SEARCH_SIGNAL: 0.4,
  OTHER: 0.4,
  MANUAL_NOTE: 0.3,
};

const DIRECT_TYPES: ReadonlySet<EvidenceType> = new Set(["INTERVIEW", "CUSTOMER_QUOTE", "SURVEY"]);

/** Saturation constant: one strong direct signal (~0.8) yields ~63% of a component. */
const SATURATION_K = 0.8;
const MAX_CONTRADICTION_PENALTY = 30;
const RECENT_MONTHS = 12;

export interface EvidenceComponentResult {
  key: EvidenceComponentKey;
  label: string;
  weight: number;
  /** 0–1 saturation of this component. */
  fill: number;
  points: number;
  /** Number of items that contributed. */
  itemCount: number;
}

export interface EvidenceScoreResult {
  score: number;
  components: EvidenceComponentResult[];
  penalty: { points: number; contradictingCount: number; contradictingWeight: number };
  counts: {
    total: number;
    supporting: number;
    contradicting: number;
    neutral: number;
    direct: number;
  };
  explanation: string[];
  gaps: string[];
}

export function saturate(x: number, k = SATURATION_K): number {
  if (x <= 0) return 0;
  return 1 - Math.exp(-x / k);
}

/**
 * Weight of one item: strength × relevance × directness × fitness. Evidence
 * that does not fit the claim (fit 0) weighs nothing; high-fit evidence
 * weighs fully.
 */
export function signalWeight(item: EvidenceSignal): number {
  const strength = clamp(Number(item.strengthScore) || 0, 0, 10) / 10;
  const relevance = clamp(Number(item.relevanceScore) || 0, 0, 10) / 10;
  const directness = item.sourceType
    ? (SOURCE_DIRECTNESS[item.sourceType] ?? 0.4)
    : (TYPE_DIRECTNESS[item.type] ?? 0.4);
  return strength * relevance * directness * fitFactor(item.fit);
}

function isDirect(item: EvidenceSignal): boolean {
  if (item.isDirectCustomer || DIRECT_TYPES.has(item.type)) return true;
  return item.sourceType ? isDirectSource(item.sourceType) : false;
}

function recencyFactor(item: EvidenceSignal, now: Date): number {
  if (!item.sourceDate) return 0.5; // undated: half credit
  const d = typeof item.sourceDate === "string" ? new Date(item.sourceDate) : item.sourceDate;
  if (Number.isNaN(d.getTime())) return 0.5;
  const months = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= RECENT_MONTHS) return 1;
  if (months <= RECENT_MONTHS * 2) return 0.5;
  return 0.2;
}

export function computeEvidenceScore(
  items: EvidenceSignal[],
  now: Date = new Date(),
): EvidenceScoreResult {
  const supporting = items.filter((i) => i.sentiment !== "NEGATIVE");
  const contradicting = items.filter((i) => i.sentiment === "NEGATIVE");
  const neutral = items.filter((i) => i.sentiment === "NEUTRAL");

  const gated = (predicate: (i: EvidenceSignal) => boolean) => {
    const matching = supporting.filter(predicate);
    // Neutral items count at half weight for supporting components.
    const weight = matching.reduce(
      (sum, i) => sum + signalWeight(i) * (i.sentiment === "NEUTRAL" ? 0.5 : 1),
      0,
    );
    return { fill: saturate(weight), count: matching.length };
  };

  const direct = gated(isDirect);
  const pain = gated((i) => i.hasExplicitPain);
  const economic = gated((i) => i.hasEconomicImpact);
  const workaround = gated((i) => i.hasWorkaround);
  const intent = gated((i) => i.hasPurchaseIntent);

  // Diversity: distinct source kinds AND distinct independent origins. Ten
  // derivatives of one source are one source.
  const distinctTypes = new Set(
    supporting.map((i) =>
      i.sourceType ? `${sourceFamily(i.sourceType)}:${i.sourceType}` : i.type,
    ),
  ).size;
  const distinctOrigins = new Set(supporting.map((i, idx) => i.originId ?? `#${idx}`)).size;
  const diversity = {
    fill: clamp(0.6 * (distinctTypes / 4) + 0.4 * (Math.min(distinctOrigins, 4) / 4), 0, 1),
    count: distinctTypes,
  };

  const totalSupportWeight = supporting.reduce((s, i) => s + signalWeight(i), 0);
  const recencyFill =
    totalSupportWeight > 0
      ? supporting.reduce((s, i) => s + signalWeight(i) * recencyFactor(i, now), 0) /
        totalSupportWeight
      : 0;
  const recency = { fill: recencyFill, count: supporting.length };

  const build = (
    key: EvidenceComponentKey,
    r: { fill: number; count: number },
  ): EvidenceComponentResult => ({
    key,
    label: EVIDENCE_COMPONENT_LABELS[key],
    weight: EVIDENCE_WEIGHTS[key],
    fill: round2(r.fill),
    points: round1(r.fill * EVIDENCE_WEIGHTS[key]),
    itemCount: r.count,
  });

  const components = [
    build("directCustomer", direct),
    build("explicitPain", pain),
    build("economicImpact", economic),
    build("workaround", workaround),
    build("purchaseIntent", intent),
    build("diversity", diversity),
    build("recency", recency),
  ];

  const contradictingWeight = contradicting.reduce((s, i) => s + signalWeight(i), 0);
  const penaltyPoints = round1(MAX_CONTRADICTION_PENALTY * saturate(contradictingWeight));

  const raw = components.reduce((s, c) => s + c.points, 0) - penaltyPoints;
  const score = items.length === 0 ? 0 : Math.round(clamp(raw, 0, 100));

  const explanation: string[] = [];
  if (items.length === 0) {
    explanation.push(
      "No evidence captured. Everything about this opportunity is still a hypothesis.",
    );
  } else {
    for (const c of components) {
      explanation.push(
        `${c.label}: ${Math.round(c.fill * 100)}% of ${c.weight} pts → ${c.points} pts (${c.itemCount} item${c.itemCount === 1 ? "" : "s"})`,
      );
    }
    if (contradicting.length > 0) {
      explanation.push(
        `Contradictory evidence: ${contradicting.length} item${contradicting.length === 1 ? "" : "s"} → −${penaltyPoints} pts`,
      );
    }
    explanation.push(`Total: ${score}/100`);
  }

  const gaps: string[] = [];
  if (direct.count === 0) gaps.push("No direct customer evidence (interview, quote or survey).");
  if (pain.count === 0) gaps.push("No source states the pain explicitly.");
  if (economic.count === 0)
    gaps.push("No evidence of economic impact (money, time or capacity lost).");
  if (workaround.count === 0)
    gaps.push("No evidence of workaround behavior (people already trying to solve it).");
  if (intent.count === 0) gaps.push("No willingness-to-pay or purchase-intent evidence.");
  if (contradictingWeight > totalSupportWeight && items.length > 0) {
    gaps.push("Contradictory evidence outweighs supporting evidence.");
  }

  return {
    score,
    components,
    penalty: {
      points: penaltyPoints,
      contradictingCount: contradicting.length,
      contradictingWeight: round2(contradictingWeight),
    },
    counts: {
      total: items.length,
      supporting: supporting.length - neutral.length,
      contradicting: contradicting.length,
      neutral: neutral.length,
      direct: supporting.filter(isDirect).length,
    },
    explanation,
    gaps,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generic claim support — for claims whose evidence is not "problem
 * evidence" (feasibility, capability, outcomes, causal links, commercial and
 * access claims). The gated problem components (explicit pain, purchase
 * intent…) do not apply there; what matters is fitting support, independent
 * corroboration, direct measurement and recency. Contradiction subtracts.
 */
export function computeSupportScore(
  items: EvidenceSignal[],
  now: Date = new Date(),
): EvidenceScoreResult {
  const supporting = items.filter((i) => i.sentiment !== "NEGATIVE");
  const contradicting = items.filter((i) => i.sentiment === "NEGATIVE");
  const neutral = items.filter((i) => i.sentiment === "NEUTRAL");

  const supportWeight = supporting.reduce(
    (sum, i) => sum + signalWeight(i) * (i.sentiment === "NEUTRAL" ? 0.5 : 1),
    0,
  );
  const origins = new Set(supporting.map((i, idx) => i.originId ?? `#${idx}`)).size;
  const corroborationFill = origins === 0 ? 0 : origins === 1 ? 0.4 : origins === 2 ? 0.7 : 1;
  const measurementWeight = supporting
    .filter((i) => (i.sourceType ? isMeasurementSource(i.sourceType) : i.type === "EXPERIMENT"))
    .reduce((sum, i) => sum + signalWeight(i), 0);
  const recencyFill =
    supportWeight > 0
      ? supporting.reduce((s, i) => s + signalWeight(i) * recencyFactor(i, now), 0) / supportWeight
      : 0;

  const build = (
    key: EvidenceComponentKey,
    fill: number,
    weight: number,
    count: number,
  ): EvidenceComponentResult => ({
    key,
    label: EVIDENCE_COMPONENT_LABELS[key],
    weight,
    fill: round2(fill),
    points: round1(fill * weight),
    itemCount: count,
  });
  const components = [
    build("support", saturate(supportWeight), SUPPORT_WEIGHTS.support, supporting.length),
    build("corroboration", corroborationFill, SUPPORT_WEIGHTS.corroboration, origins),
    build(
      "measurement",
      saturate(measurementWeight),
      SUPPORT_WEIGHTS.measurement,
      supporting.filter((i) => (i.sourceType ? isMeasurementSource(i.sourceType) : false)).length,
    ),
    build("recency", recencyFill, SUPPORT_WEIGHTS.recency, supporting.length),
  ];
  const contradictingWeight = contradicting.reduce((s, i) => s + signalWeight(i), 0);
  const penaltyPoints = round1(MAX_CONTRADICTION_PENALTY * saturate(contradictingWeight));
  const raw = components.reduce((s, c) => s + c.points, 0) - penaltyPoints;
  const score = items.length === 0 ? 0 : Math.round(clamp(raw, 0, 100));

  const explanation: string[] = [];
  if (items.length === 0) {
    explanation.push("No admissible evidence linked to this claim.");
  } else {
    for (const c of components) {
      explanation.push(
        `${c.label}: ${Math.round(c.fill * 100)}% of ${c.weight} pts → ${c.points} pts (${c.itemCount} item${c.itemCount === 1 ? "" : "s"})`,
      );
    }
    if (contradicting.length > 0)
      explanation.push(
        `Contradictory evidence: ${contradicting.length} item${contradicting.length === 1 ? "" : "s"} → −${penaltyPoints} pts`,
      );
    explanation.push(`Total: ${score}/100`);
  }
  const gaps: string[] = [];
  if (supporting.length === 0) gaps.push("No supporting evidence.");
  if (origins < 2 && supporting.length > 0)
    gaps.push("A single independent source: no corroboration yet.");
  if (measurementWeight === 0 && supporting.length > 0)
    gaps.push("Nothing measured or observed directly: the claim rests on reports.");
  if (contradictingWeight > supportWeight && items.length > 0)
    gaps.push("Contradictory evidence outweighs supporting evidence.");

  return {
    score,
    components,
    penalty: {
      points: penaltyPoints,
      contradictingCount: contradicting.length,
      contradictingWeight: round2(contradictingWeight),
    },
    counts: {
      total: items.length,
      supporting: supporting.length - neutral.length,
      contradicting: contradicting.length,
      neutral: neutral.length,
      direct: supporting.filter(isDirect).length,
    },
    explanation,
    gaps,
  };
}
