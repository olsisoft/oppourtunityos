/**
 * Epistemic assessment of a claim (value-chain node, causal link, or a
 * problem-side claim such as "the pain exists").
 *
 * The status is computed from linked evidence and linked assumptions using the
 * existing Evidence Confidence engine. PROVEN and SUPPORTED are therefore
 * evidence-driven by construction — no code path lets the LLM set them.
 */
import type {
  AssumptionKind,
  AssumptionStatus,
  EpistemicStatus,
  EvidenceLinkDirection,
  EvidenceSentiment,
  Provenance,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import {
  computeEvidenceScore,
  signalWeight,
  type EvidenceScoreResult,
  type EvidenceSignal,
} from "@/services/scoring/evidence-score";

/** Same thresholds as the verdict grid: TEST needs ≥75 evidence, INVESTIGATE ≥40. */
export const EPISTEMIC_THRESHOLDS = { proven: 75, supported: 40 } as const;

/** An assumption is "critical" when its importance is at least this value. */
export const CRITICAL_ASSUMPTION_IMPORTANCE = 8;

export const VALUE_CHAIN_LEVEL_ORDER: ValueChainLevel[] = [
  "MECHANISM",
  "CAPABILITY",
  "TRANSFORMATION",
  "OPERATIONAL_VALUE",
  "ECONOMIC_VALUE",
  "STRATEGIC_OUTCOME",
  "BUSINESS_OUTCOME",
];

/** Causal distance of each ladder level (CD0 direct … CD5 business outcome). */
export const CAUSAL_DISTANCE_BY_LEVEL: Record<ValueChainLevel, number> = {
  MECHANISM: 0,
  CAPABILITY: 1,
  TRANSFORMATION: 2,
  OPERATIONAL_VALUE: 2,
  ECONOMIC_VALUE: 3,
  STRATEGIC_OUTCOME: 4,
  BUSINESS_OUTCOME: 5,
};

export const CAUSAL_DISTANCE_LABELS: Record<number, { code: string; label: string; help: string }> =
  {
    0: {
      code: "CD0",
      label: "Direct",
      help: "The product directly performs or produces the result.",
    },
    1: {
      code: "CD1",
      label: "Near",
      help: "Immediate consequence with very little causal uncertainty.",
    },
    2: { code: "CD2", label: "Operational", help: "Workflow or process improvement." },
    3: { code: "CD3", label: "Economic", help: "Financial consequence." },
    4: { code: "CD4", label: "Strategic", help: "Company-level operational consequence." },
    5: {
      code: "CD5",
      label: "Business outcome",
      help: "Revenue, profit, market share or other downstream outcome.",
    },
  };

export function causalDistanceHelp(distance: number): string {
  return `Higher causal distance means higher attribution uncertainty and a higher proof burden. ${CAUSAL_DISTANCE_LABELS[distance]?.help ?? ""}`.trim();
}

export interface ClaimEvidenceInput {
  signal: EvidenceSignal;
  /** Direction of this evidence relative to THIS claim (overrides the item's own sentiment). */
  direction: EvidenceLinkDirection;
}

export interface ClaimAssumptionInput {
  statement: string;
  status: AssumptionStatus;
  importance: number;
  kind?: AssumptionKind;
}

export interface ClaimAssessment {
  status: EpistemicStatus;
  /** 0–100, from the Evidence Confidence engine applied to linked evidence. */
  confidence: number;
  evidence: EvidenceScoreResult;
  supportingWeight: number;
  contradictingWeight: number;
  /** Contradicting evidence is at least half the weight of supporting evidence. */
  unresolvedContradiction: boolean;
  untestedCriticalAssumptions: string[];
  contradictedAssumptions: string[];
}

export function directionToSentiment(direction: EvidenceLinkDirection): EvidenceSentiment {
  if (direction === "SUPPORTS") return "POSITIVE";
  if (direction === "CONTRADICTS") return "NEGATIVE";
  return "NEUTRAL";
}

export function sentimentToDirection(sentiment: EvidenceSentiment): EvidenceLinkDirection {
  if (sentiment === "POSITIVE") return "SUPPORTS";
  if (sentiment === "NEGATIVE") return "CONTRADICTS";
  return "NEUTRAL";
}

export interface AssessClaimParams {
  /** Does the claim have a statement at all? Without one the status is UNKNOWN. */
  hasStatement: boolean;
  /** Who stated the claim. User assertions without evidence are UNPROVEN, AI ones HYPOTHESIS. */
  generatedBy: Provenance;
  evidence: ClaimEvidenceInput[];
  assumptions?: ClaimAssumptionInput[];
  now?: Date;
}

export function assessClaim(params: AssessClaimParams): ClaimAssessment {
  const assumptions = params.assumptions ?? [];
  const signals: EvidenceSignal[] = params.evidence.map((e) => ({
    ...e.signal,
    sentiment: directionToSentiment(e.direction),
  }));
  const evidence = computeEvidenceScore(signals, params.now);

  const supportingWeight = round2(
    signals.filter((s) => s.sentiment !== "NEGATIVE").reduce((sum, s) => sum + signalWeight(s), 0),
  );
  const contradictingWeight = round2(
    signals.filter((s) => s.sentiment === "NEGATIVE").reduce((sum, s) => sum + signalWeight(s), 0),
  );
  const unresolvedContradiction =
    contradictingWeight > 0 && contradictingWeight >= 0.5 * Math.max(supportingWeight, 0.0001);

  const untestedCriticalAssumptions = assumptions
    .filter((a) => a.status === "UNKNOWN" && a.importance >= CRITICAL_ASSUMPTION_IMPORTANCE)
    .map((a) => a.statement);
  const contradictedAssumptions = assumptions
    .filter((a) => a.status === "CONTRADICTED" && a.importance >= 7)
    .map((a) => a.statement);

  let status: EpistemicStatus;
  if (!params.hasStatement) {
    status = "UNKNOWN";
  } else if (signals.length === 0) {
    status = contradictedAssumptions.length
      ? "CONTRADICTED"
      : params.generatedBy === "AI_HYPOTHESIS"
        ? "HYPOTHESIS"
        : "UNPROVEN";
  } else if (contradictingWeight > supportingWeight || contradictedAssumptions.length) {
    status = "CONTRADICTED";
  } else if (evidence.score >= EPISTEMIC_THRESHOLDS.proven) {
    status = "PROVEN";
  } else if (evidence.score >= EPISTEMIC_THRESHOLDS.supported) {
    status = "SUPPORTED";
  } else {
    status = "UNPROVEN";
  }

  return {
    status,
    confidence: evidence.score,
    evidence,
    supportingWeight,
    contradictingWeight,
    unresolvedContradiction,
    untestedCriticalAssumptions,
    contradictedAssumptions,
  };
}

/** A claim can carry the Proof Frontier only when its status is evidence-backed. */
export function isEvidenceBacked(status: EpistemicStatus): boolean {
  return status === "PROVEN" || status === "SUPPORTED";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
