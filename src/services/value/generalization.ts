/**
 * Scope of generalization. "Observed in a sample" never becomes "proven for
 * the market" by itself. The status is derived from the independent origins
 * behind the observations, their configuration diversity and how well their
 * scope matches the scope the claim is made for. Thresholds are constants;
 * there is no automatic promotion.
 */
import type { GeneralizationStatus } from "@/generated/prisma/enums";
import { fitBand } from "./evidence-fit";
import {
  configurationDiversity,
  describeScope,
  isEmptyScope,
  mergeScopes,
  SCOPE_LABELS,
  scopeMatch,
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
  observedScopeText: string;
  /** Average scope match of the observations with the claim scope (null when no claim scope). */
  scopeMatch: number | null;
  /** Dimensions of the claim scope the observations did not cover. */
  uncovered: ScopeDimension[];
  gap: string;
  nextQuestion: string | null;
  explanation: string[];
}

export function assessGeneralization(
  observations: ObservationInput[],
  claimScope: Scope | null | undefined,
  claimStatement = "the claim holds",
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

  const observedScopeText = describeScope(observedScope);
  const t = GENERALIZATION_THRESHOLDS;
  const gap =
    status === "UNTESTED"
      ? `Nothing with medium or high fit supports that ${claimStatement}.`
      : status === "CASE_ONLY"
        ? `Observed in one independent case (${observedScopeText}); ${t.sampleMinOrigins - origins.size} more independent case${t.sampleMinOrigins - origins.size === 1 ? "" : "s"} would make it sample-supported.`
        : status === "SAMPLE_SUPPORTED"
          ? `Observed across ${origins.size} independent cases and ${configurations} configuration${configurations === 1 ? "" : "s"} (${observedScopeText}); segment support needs ≥ ${t.segmentMinOrigins} cases across ≥ ${t.segmentMinConfigurations} configurations${uncovered.length ? ` and coverage of ${uncovered.map((k) => SCOPE_LABELS[k].toLowerCase()).join(", ")}` : ""}.`
          : status === "SEGMENT_SUPPORTED"
            ? `Observed across ${origins.size} independent cases and ${configurations} configurations within the claim's scope. Still not the whole market.`
            : status === "BROADER_HYPOTHESIS"
              ? `Observed in ${observedScopeText}, but the claim is made for a broader scope (match ${Math.round((avgMatch ?? 0) * 100)}%): the broader claim is a hypothesis.`
              : `Supported in ${observedScopeText} and contradicted in another context.`;
  const nextQuestion =
    status === "UNTESTED" || status === "SEGMENT_SUPPORTED"
      ? null
      : status === "CONTRADICTED_ACROSS_CONTEXTS"
        ? `What differs between the contexts where ${claimStatement} and the context where it does not?`
        : uncovered.length
          ? `Does it still hold that ${claimStatement} for ${uncovered
              .slice(0, 2)
              .map((k) => `other ${SCOPE_LABELS[k].toLowerCase()}`)
              .join(" and ")}${claimScope ? " within the target scope" : ""}?`
          : `Does it still hold that ${claimStatement} in ${status === "CASE_ONLY" ? "other organizations" : "other configurations"} (${observedScopeText} so far)?`;

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
      `Generalization: ${status} — ${origins.size} independent origin${origins.size === 1 ? "" : "s"}, ${configurations} configuration${configurations === 1 ? "" : "s"}${avgMatch !== null ? `, scope match ${Math.round(avgMatch * 100)}%` : ", claim scope undeclared"}.`,
      gap,
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
