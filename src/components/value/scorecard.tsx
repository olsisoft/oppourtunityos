import { ScoreTile } from "@/components/value/score-tile";
import type { OpportunityWithRelations } from "@/db/workspaces";
import { msg, textOf } from "@/i18n/messages";
import type { T } from "@/i18n/t";
import { cn } from "@/lib/utils";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import { PROOF_RUNG_LABELS, type FrontierPosition } from "@/services/value/proof-frontier";
import { VALUE_DIMENSION_LABELS } from "@/services/value/value-strength";

/** Canonical English questions behind the four scores (see SCORE_QUESTION_KEYS to localize). */
export const SCORE_QUESTIONS = {
  potential: "Opportunity Potential — is the problem structurally attractive?",
  evidence: "Evidence Confidence — do we have credible evidence that the problem is real?",
  value: "Value Strength — if we move the variable, how much value could be created?",
  causal: "Causal Confidence — do we know the proposed mechanism can actually move it?",
} as const;

/** Dictionary keys of the four score questions — render with t(). */
export const SCORE_QUESTION_KEYS = {
  potential: "value.scorecard.question.potential",
  evidence: "value.scorecard.question.evidence",
  value: "value.scorecard.question.value",
  causal: "value.scorecard.question.causal",
} as const;

/** What is missing from Value Strength, as a short list (localized when `t` is given). */
export function valueMissingText(insights: OpportunityInsights, t?: T): string | null {
  const m = insights.valueStrength?.missing ?? [];
  if (!m.length) return null;
  return m.map((k) => (t ? t(`labels.valueDimension.${k}`) : VALUE_DIMENSION_LABELS[k])).join(", ");
}

/** The link blocking Causal Confidence, if any (localized when `t` is given). */
export function causalBlockingText(insights: OpportunityInsights, t?: T): string | null {
  const blocking = insights.causal?.blocking;
  if (!blocking) return null;
  if (!t) return textOf(blocking.label);
  return t("value.ladder.linkTitle", {
    from: t(`labels.valueChainLevel.${blocking.from}`),
    to: t(`labels.valueChainLevel.${blocking.to}`),
  });
}

/**
 * Hook-free on purpose: this module is imported by server components. Every
 * text is passed to ScoreTile as a key or a system message and rendered there.
 */
export function Scorecard({
  opportunity: o,
  insights,
  size = "md",
  className,
}: {
  opportunity: OpportunityWithRelations;
  insights: OpportunityInsights;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const blocking = insights.causal?.blocking ?? null;
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      <ScoreTile
        label="value.scorecard.potential"
        question={SCORE_QUESTION_KEYS.potential}
        value={o.opportunityScore}
        lines={insights.scoreBreakdown?.explanation ?? []}
        size={size}
      />
      <ScoreTile
        label="value.scorecard.evidence"
        question={SCORE_QUESTION_KEYS.evidence}
        value={o.evidenceScore}
        lines={insights.evidenceBreakdown?.explanation ?? []}
        size={size}
      />
      <ScoreTile
        label="value.scorecard.value"
        question={SCORE_QUESTION_KEYS.value}
        value={o.valueStrength}
        completeness={insights.valueStrength?.completeness}
        missing={
          size === "sm"
            ? null
            : (insights.valueStrength?.missing ?? []).map((k) => `labels.valueDimension.${k}`)
        }
        lines={insights.valueStrength?.explanation ?? ["value.scorecard.notComputedYet"]}
        size={size}
      />
      <ScoreTile
        label="value.scorecard.causal"
        question={SCORE_QUESTION_KEYS.causal}
        value={o.causalConfidence}
        completeness={
          insights.causal
            ? msg("value.scorecard.linksCompleteness", {
                completeness: insights.causal.completeness,
              })
            : undefined
        }
        missing={
          size === "sm" || !blocking
            ? null
            : msg("value.ladder.linkTitle", {
                from: msg(`labels.valueChainLevel.${blocking.from}`),
                to: msg(`labels.valueChainLevel.${blocking.to}`),
              })
        }
        lines={insights.causal?.explanation ?? ["value.scorecard.notComputedYet"]}
        size={size}
      />
    </div>
  );
}

/** Label of a frontier position; pass `t` to render it in the current locale. */
export function frontierText(
  frontier: FrontierPosition | string | null | undefined,
  t?: T,
): string {
  if (!frontier) return t ? t("value.scorecard.notComputed") : "Not computed";
  if (t && t.has(`labels.proofRung.${frontier}`)) return t(`labels.proofRung.${frontier}`);
  return PROOF_RUNG_LABELS[frontier as FrontierPosition] ?? String(frontier);
}
