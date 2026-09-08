/**
 * Epistemic assessment of a claim (value-chain node, causal link, or a
 * problem-side claim such as "the pain exists").
 *
 * The status is computed from linked evidence weighted by its fitness for
 * THIS claim, plus linked assumptions. SUPPORTED, STRONGLY_SUPPORTED and
 * OBSERVED are evidence-driven by construction — no code path lets the LLM
 * set them, promote evidence quality or override admissibility.
 *
 *   - evidence that is not admissible for the claim counts nothing
 *   - low-fit evidence informs but cannot lift confidence past the low-fit cap
 *   - OBSERVED requires a high-fit measurement (records, behaviour, experiment)
 *   - STRONGLY_SUPPORTED requires corroboration from ≥ 2 independent origins
 *   - MIXED: high-fit evidence supports AND contradicts; never averaged away
 */
import type {
  AssumptionKind,
  AssumptionStatus,
  ClaimType,
  EpistemicStatus,
  EvidenceLinkDirection,
  EvidenceSentiment,
  ExperimentDesignLevel,
  Provenance,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import {
  computeEvidenceScore,
  computeSupportScore,
  signalWeight,
  type EvidenceScoreResult,
  type EvidenceSignal,
} from "@/services/scoring/evidence-score";
import { msg, type SystemMessage } from "@/i18n/messages";
import { claimGroup, claimStatement } from "./claim-taxonomy";
import { fitBand, type EvidenceFit, type FitBand } from "./evidence-fit";
import { IMPLIED_DESIGN_LEVEL, sourceTypeForLegacy } from "./evidence-sources";
import { designIndex } from "./experimental-validity";
import { assessGeneralization, type GeneralizationResult } from "./generalization";
import { inferenceSentence } from "./language-gate";
import { scopeMessage, type Scope } from "./scope";

/**
 * Same thresholds as the verdict grid: TEST needs ≥ 75 evidence, INVESTIGATE
 * ≥ 40. lowFitCap: the highest confidence low-fit evidence alone can reach.
 */
export const EPISTEMIC_THRESHOLDS = { strong: 75, supported: 40, lowFitCap: 39 } as const;

/** An assumption is "critical" when its importance is at least this value. */
export const CRITICAL_ASSUMPTION_IMPORTANCE = 8;

/** Independent origins required before a claim can be STRONGLY_SUPPORTED. */
export const STRONG_MIN_ORIGINS = 2;

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
  /** Fitness of this evidence for THIS claim. Absent = legacy caller: treated as full fit. */
  fit?: EvidenceFit | null;
  /** Scope of what was observed (feeds the observed scope and generalization). */
  scope?: Scope | null;
  /** Origin key (derivatives of one source share it). */
  originId?: string;
  /** Measurement-family evidence (observed rather than reported). */
  measurement?: boolean;
  /** Design level when no fit is supplied (legacy callers, tests). */
  designLevel?: ExperimentDesignLevel | null;
}

export interface ClaimAssumptionInput {
  statement: string;
  status: AssumptionStatus;
  importance: number;
  kind?: AssumptionKind;
}

export interface ClaimFitness {
  /** Linked evidence items, admissible ones, and how the best of them fits. */
  total: number;
  admissible: number;
  best: number;
  bestBand: FitBand;
  highFit: number;
  mediumFit: number;
  /** Every admissible supporting item is low-fit: confidence is capped. */
  lowFitOnly: boolean;
  /** Distinct independent origins among supporting evidence (medium fit or better). */
  independentOrigins: number;
  /** A high- or medium-fit contradiction exists and weighs at least half the support. */
  strongContradiction: boolean;
  /** Per-item view for the claim detail. */
  items: Array<{
    direction: EvidenceLinkDirection;
    fit: number;
    band: FitBand;
    originId: string;
    duplicate: boolean;
    measurement: boolean;
    /** The fit summary of the item (evidence-fit), null for legacy inputs without fit. */
    summary: EvidenceFit["summary"] | null;
  }>;
}

export interface ClaimAssessment {
  status: EpistemicStatus;
  /** 0–100, from the Evidence Confidence engine applied to fitness-weighted linked evidence. */
  confidence: number;
  evidence: EvidenceScoreResult;
  supportingWeight: number;
  contradictingWeight: number;
  /** A high-fit contradiction is at least half the weight of the support (status MIXED). */
  unresolvedContradiction: boolean;
  untestedCriticalAssumptions: string[];
  contradictedAssumptions: string[];
  claimType: ClaimType | null;
  fitness: ClaimFitness;
  /** A high-fit measurement supports the claim: it was observed, within a scope. */
  observed: boolean;
  observedScope: Scope | null;
  /** Compact description of the observed scope (scopeMessage), null when none was observed. */
  observedScopeText: SystemMessage | null;
  generalization: GeneralizationResult | null;
  /** Strongest design level among admissible supporting evidence (null without evidence). */
  designLevel: ExperimentDesignLevel | null;
  /** Language-gated one-sentence inference (empty text for a claim without a claim type). */
  inference: SystemMessage;
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
  /** The claim's type (drives the inference wording and generalization statement). */
  claimType?: ClaimType | null;
  /** The scope the claim is made for. */
  claimScope?: Scope | null;
}

/** Problem-side claims (market, problem, problem-value) are scored by the problem engine. */
export function usesProblemEngine(claimType: ClaimType | null): boolean {
  if (!claimType) return true;
  const group = claimGroup(claimType);
  if (group === "PROBLEM" || group === "MARKET") return true;
  return (
    claimType === "VARIABLE_IMPORTANCE" ||
    claimType === "MAGNITUDE" ||
    claimType === "POPULATION_AFFECTED" ||
    claimType === "ECONOMIC_IMPACT"
  );
}

function itemFit(e: ClaimEvidenceInput): number | null {
  return e.fit ? e.fit.fitScore : null;
}

export function assessClaim(params: AssessClaimParams): ClaimAssessment {
  const assumptions = params.assumptions ?? [];
  const claimType = params.claimType ?? null;

  // Fitness-weighted signals. Not-admissible evidence (fit 0) is dropped from
  // the engine input: it is linked, but it is not evidence for this claim.
  const enriched = params.evidence.map((e, index) => {
    const fit = itemFit(e);
    const band: FitBand = fit === null ? "HIGH" : fitBand(fit);
    const originId = e.originId ?? e.fit?.originId ?? `#${index}`;
    return {
      input: e,
      fit,
      band,
      originId,
      admissible: fit === null || fit > 0,
      signal: {
        ...e.signal,
        sentiment: directionToSentiment(e.direction),
        fit: fit ?? undefined,
        originId,
      } as EvidenceSignal,
    };
  });
  const admissible = enriched.filter((x) => x.admissible);
  const signals = admissible.map((x) => x.signal);
  const strongSignals = admissible
    .filter((x) => x.band === "HIGH" || x.band === "MEDIUM")
    .map((x) => x.signal);

  // Problem-side claims use the gated problem engine (explicit pain, economic
  // impact, purchase intent…); every other claim uses the generic support
  // engine, where those gates are meaningless.
  const engine = usesProblemEngine(claimType) ? computeEvidenceScore : computeSupportScore;
  const all = engine(signals, params.now);
  const strong = strongSignals.length === signals.length ? all : engine(strongSignals, params.now);
  // Low-fit evidence may inform, never dominate: alone it cannot pass the cap.
  const confidence = Math.max(strong.score, Math.min(all.score, EPISTEMIC_THRESHOLDS.lowFitCap));
  const evidence: EvidenceScoreResult =
    confidence === all.score
      ? all
      : {
          ...all,
          score: confidence,
          explanation: [
            ...all.explanation,
            msg("frontier.epistemic.lowFitCapped", { before: all.score, after: confidence }),
          ],
        };

  const supportingWeight = round2(
    signals.filter((s) => s.sentiment !== "NEGATIVE").reduce((sum, s) => sum + signalWeight(s), 0),
  );
  const contradictingWeight = round2(
    signals.filter((s) => s.sentiment === "NEGATIVE").reduce((sum, s) => sum + signalWeight(s), 0),
  );
  const strongContradictionExists = admissible.some(
    (x) => x.input.direction === "CONTRADICTS" && (x.band === "HIGH" || x.band === "MEDIUM"),
  );
  const strongContradiction =
    strongContradictionExists &&
    contradictingWeight > 0 &&
    contradictingWeight >= 0.5 * Math.max(supportingWeight, 0.0001);

  const supporting = admissible.filter((x) => x.input.direction !== "CONTRADICTS");
  const supportingStrong = supporting.filter((x) => x.band === "HIGH" || x.band === "MEDIUM");
  const origins = new Set(supportingStrong.map((x) => x.originId));
  const best = admissible.reduce((m, x) => Math.max(m, x.fit ?? 100), 0);
  const observedItems = supporting.filter((x) => x.input.measurement && x.band === "HIGH");
  const observed = observedItems.length > 0;
  const lowFitOnly = supporting.length > 0 && supportingStrong.length === 0;

  const fitness: ClaimFitness = {
    total: params.evidence.length,
    admissible: admissible.length,
    best,
    bestBand: admissible.length === 0 ? "NONE" : fitBand(best),
    highFit: admissible.filter((x) => x.band === "HIGH").length,
    mediumFit: admissible.filter((x) => x.band === "MEDIUM").length,
    lowFitOnly,
    independentOrigins: origins.size,
    strongContradiction,
    items: enriched.map((x) => ({
      direction: x.input.direction,
      fit: x.fit ?? 100,
      band: x.admissible ? x.band : "NONE",
      originId: x.originId,
      duplicate: x.input.fit?.duplicateOfOrigin ?? false,
      measurement: x.input.measurement ?? false,
      summary: x.input.fit?.summary ?? null,
    })),
  };

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
  } else if (strongContradiction) {
    status = "MIXED";
  } else if (observed && confidence >= EPISTEMIC_THRESHOLDS.supported) {
    status = "OBSERVED";
  } else if (confidence >= EPISTEMIC_THRESHOLDS.strong && origins.size >= STRONG_MIN_ORIGINS) {
    status = "STRONGLY_SUPPORTED";
  } else if (confidence >= EPISTEMIC_THRESHOLDS.supported) {
    status = "SUPPORTED";
  } else {
    status = "UNPROVEN";
  }

  // Generalization and observed scope from the supporting observations.
  const statement = claimStatement(claimType ?? "OTHER");
  const generalization =
    params.hasStatement && admissible.length > 0
      ? assessGeneralization(
          admissible.map((x) => ({
            originId: x.originId,
            direction: x.input.direction,
            fitScore: x.fit ?? 100,
            scope: x.input.scope ?? null,
            measurement: x.input.measurement ?? false,
          })),
          params.claimScope ?? null,
          statement,
        )
      : null;
  const observedScope = generalization?.observedScope ?? null;
  const observedScopeText = observedScope ? scopeMessage(observedScope) : null;

  const designLevel =
    admissible
      .filter((x) => x.input.direction !== "CONTRADICTS")
      .map(
        (x) =>
          x.input.fit?.designLevel ??
          x.input.designLevel ??
          IMPLIED_DESIGN_LEVEL[sourceTypeForLegacy(x.input.signal.type)],
      )
      .filter((d): d is ExperimentDesignLevel => d !== null && d !== undefined)
      .sort((a, b) => designIndex(b) - designIndex(a))[0] ?? (signals.length ? "ANECDOTAL" : null);

  // The language gate takes the scope as English text for now; once
  // `inferenceSentence` accepts a LocalizedText scope, pass observedScopeText itself.
  const inference: SystemMessage = claimType
    ? inferenceSentence({
        claimType,
        status,
        scopeText: observedScopeText ?? null,
        generalization: generalization?.status ?? null,
        bestFitBand: fitness.bestBand,
        designLevel,
      })
    : msg("frontier.inference.none");

  return {
    status,
    confidence,
    evidence,
    supportingWeight,
    contradictingWeight,
    unresolvedContradiction: strongContradiction,
    untestedCriticalAssumptions,
    contradictedAssumptions,
    claimType,
    fitness,
    observed,
    observedScope,
    observedScopeText,
    generalization,
    designLevel,
    inference,
  };
}

/** A claim can carry the Proof Frontier only when its status is evidence-backed. */
export function isEvidenceBacked(status: EpistemicStatus): boolean {
  return status === "SUPPORTED" || status === "STRONGLY_SUPPORTED" || status === "OBSERVED";
}

/** Rank of a status from weakest to strongest (for diffs and sorting). */
export const EPISTEMIC_RANK: Record<EpistemicStatus, number> = {
  CONTRADICTED: 0,
  MIXED: 1,
  UNKNOWN: 2,
  HYPOTHESIS: 3,
  UNPROVEN: 4,
  SUPPORTED: 5,
  STRONGLY_SUPPORTED: 6,
  OBSERVED: 7,
};

/**
 * Legacy PROVEN migration rule (mirrors migration 20260908120000): a PROVEN
 * claim backed by a supporting measurement-family source becomes OBSERVED,
 * otherwise STRONGLY_SUPPORTED. The audit trail keeps the original strings.
 */
export function migrateLegacyProven(
  status: string,
  supportingSources: Array<{ measurement: boolean }>,
): EpistemicStatus {
  if (status !== "PROVEN") return status as EpistemicStatus;
  return supportingSources.some((s) => s.measurement) ? "OBSERVED" : "STRONGLY_SUPPORTED";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
