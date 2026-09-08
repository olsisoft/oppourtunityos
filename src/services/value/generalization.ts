/**
 * Scope of generalization. "Observed in a sample" never becomes "proven for
 * the market" by itself. The status is derived from the independent origins
 * behind the observations, their configuration diversity and how well their
 * scope matches the scope the claim is made for. Thresholds are constants;
 * there is no automatic promotion.
 */
import type { GeneralizationStatus } from "@/generated/prisma/enums";
import { msg, type LocalizedText, type SystemMessage } from "@/i18n/messages";
import { fitBand } from "./evidence-fit";
import {
  configurationDiversity,
  dimensionInSentence,
  isEmptyScope,
  listMessage,
  mergeScopes,
  scopeMatch,
  scopeMessage,
  type Scope,
  type ScopeDimension,
} from "./scope";

export const GENERALIZATION_THRESHOLDS = {
  /** Minimum fit for an item to count as an observation of the claim. */
  minFit: 40,
  /** Independent origins needed for SAMPLE_SUPPORTED. */
  sampleMinOrigins: 2,
  /** Independent origins and distinct configurations needed for SEGMENT_SUPPORTED. */
  segmentMinOrigins: 5,
  segmentMinConfigurations: 2,
  /** Average scope match with the claim scope needed for SEGMENT_SUPPORTED. */
  segmentMinScopeMatch: 0.6,
  /** Below this average scope match the claim as stated is a broader hypothesis. */
  broaderMaxScopeMatch: 0.5,
  /** A contradicting observation counts as "another context" below this match. */
  contextMismatchBelow: 0.6,
} as const;

export interface ObservationInput {
  originId: string;
  direction: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  fitScore: number;
  scope: Scope | null;
  /** Measurement-family evidence (observed rather than reported). */
  measurement: boolean;
}

export interface GeneralizationResult {
  status: GeneralizationStatus;
  independentOrigins: number;
  configurations: number;
  observedScope: Scope | null;
  /** Compact description of the observed scope (scopeMessage). */
  observedScopeText: SystemMessage;
  /** Average scope match of the observations with the claim scope (null when no claim scope). */
  scopeMatch: number | null;
  /** Dimensions of the claim scope the observations did not cover. */
  uncovered: ScopeDimension[];
  gap: SystemMessage;
  nextQuestion: SystemMessage | null;
  explanation: SystemMessage[];
}

/**
 * `claimStatement` is the clause the questions are built around ("the
 * mechanism is feasible"): a claim-statement message or a plain string.
 */
export function assessGeneralization(
  observations: ObservationInput[],
  claimScope: Scope | null | undefined,
  claimStatement: LocalizedText = msg("labels.claimStatement.OTHER"),
): GeneralizationResult {
  const counted = observations.filter(
    (o) => fitBand(o.fitScore) !== "LOW" && fitBand(o.fitScore) !== "NONE",
  );
  const supporting = counted.filter((o) => o.direction === "SUPPORTS");
  const contradicting = counted.filter((o) => o.direction === "CONTRADICTS");
  const origins = new Set(supporting.map((o) => o.originId));
  const scopes = supporting.map((o) => o.scope);
  const observedScope = mergeScopes(scopes);
  const configurations = configurationDiversity(scopes);
  const matches = supporting
    .map((o) => scopeMatch(o.scope, claimScope ?? null))
    .filter((m) => m.status !== "CLAIM_SCOPE_UNDECLARED");
  const avgMatch = matches.length
    ? round2(matches.reduce((s, m) => s + m.score, 0) / matches.length)
    : null;
  const uncoveredSet = new Set<ScopeDimension>();
  for (const m of matches) for (const k of [...m.mismatched, ...m.unknown]) uncoveredSet.add(k);
  const uncovered = Array.from(uncoveredSet);

  // A contradiction counts as "another context" only when its scope is
  // recorded and differs; a contradiction of unknown scope is a contradiction
  // of the claim itself (handled by the MIXED / CONTRADICTED status), not a
  // generalization finding.
  const contradictedElsewhere =
    supporting.length > 0 &&
    contradicting.some((c) => {
      if (isEmptyScope(c.scope)) return false;
      const m = scopeMatch(c.scope, observedScope);
      return m.status === "MISMATCH" || m.score < GENERALIZATION_THRESHOLDS.contextMismatchBelow;
    });

  let status: GeneralizationStatus;
  if (supporting.length === 0) status = "UNTESTED";
  else if (contradictedElsewhere) status = "CONTRADICTED_ACROSS_CONTEXTS";
  else if (avgMatch !== null && avgMatch < GENERALIZATION_THRESHOLDS.broaderMaxScopeMatch)
    status = "BROADER_HYPOTHESIS";
  else if (
    origins.size >= GENERALIZATION_THRESHOLDS.segmentMinOrigins &&
    configurations >= GENERALIZATION_THRESHOLDS.segmentMinConfigurations &&
    (avgMatch === null || avgMatch >= GENERALIZATION_THRESHOLDS.segmentMinScopeMatch)
  )
    status = "SEGMENT_SUPPORTED";
  else if (origins.size >= GENERALIZATION_THRESHOLDS.sampleMinOrigins) status = "SAMPLE_SUPPORTED";
  else status = "CASE_ONLY";

  const observedScopeText = scopeMessage(observedScope);
  const t = GENERALIZATION_THRESHOLDS;
  const claim = claimStatement;
  const scope = observedScopeText;
  const gap =
    status === "UNTESTED"
      ? msg("frontier.generalization.gap.untested", { claim })
      : status === "CASE_ONLY"
        ? msg("frontier.generalization.gap.caseOnly", {
            scope,
            missing: t.sampleMinOrigins - origins.size,
          })
        : status === "SAMPLE_SUPPORTED"
          ? msg("frontier.generalization.gap.sampleSupported", {
              origins: origins.size,
              configurations,
              scope,
              minOrigins: t.segmentMinOrigins,
              minConfigurations: t.segmentMinConfigurations,
              hasUncovered: uncovered.length > 0,
              ...(uncovered.length
                ? { dimensions: listMessage(uncovered.map(dimensionInSentence)) }
                : {}),
            })
          : status === "SEGMENT_SUPPORTED"
            ? msg("frontier.generalization.gap.segmentSupported", {
                origins: origins.size,
                configurations,
              })
            : status === "BROADER_HYPOTHESIS"
              ? msg("frontier.generalization.gap.broaderHypothesis", {
                  scope,
                  match: Math.round((avgMatch ?? 0) * 100),
                })
              : msg("frontier.generalization.gap.contradictedAcrossContexts", { scope });
  const nextQuestion =
    status === "UNTESTED" || status === "SEGMENT_SUPPORTED"
      ? null
      : status === "CONTRADICTED_ACROSS_CONTEXTS"
        ? msg("frontier.generalization.nextQuestion.contradicted", { claim })
        : uncovered.length
          ? msg("frontier.generalization.nextQuestion.uncovered", {
              claim,
              dimensions: msg("frontier.generalization.otherDimensions", {
                count: Math.min(uncovered.length, 2),
                first: dimensionInSentence(uncovered[0]),
                ...(uncovered.length > 1 ? { second: dimensionInSentence(uncovered[1]) } : {}),
              }),
              targetScope: Boolean(claimScope),
            })
          : msg("frontier.generalization.nextQuestion.elsewhere", { claim, status, scope });

  return {
    status,
    independentOrigins: origins.size,
    configurations,
    observedScope,
    observedScopeText,
    scopeMatch: avgMatch,
    uncovered,
    gap,
    nextQuestion,
    explanation: [
      msg("frontier.generalization.summary", {
        status,
        origins: origins.size,
        configurations,
        hasMatch: avgMatch !== null,
        ...(avgMatch !== null ? { match: Math.round(avgMatch * 100) } : {}),
      }),
      gap,
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
