import { ScoreTile } from "@/components/value/score-tile";
import type { OpportunityWithRelations } from "@/db/workspaces";
import { cn } from "@/lib/utils";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import { PROOF_RUNG_LABELS, type FrontierPosition } from "@/services/value/proof-frontier";

export const SCORE_QUESTIONS = {
  potential: "Opportunity Potential — is the problem structurally attractive?",
  evidence: "Evidence Confidence — do we have credible evidence that the problem is real?",
  value: "Value Strength — if we move the variable, how much value could be created?",
  causal: "Causal Confidence — do we know the proposed mechanism can actually move it?",
} as const;

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
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      <ScoreTile
        label="Opportunity potential"
        question={SCORE_QUESTIONS.potential}
        value={o.opportunityScore}
        lines={insights.scoreBreakdown?.explanation ?? []}
        size={size}
      />
      <ScoreTile
        label="Evidence confidence"
        question={SCORE_QUESTIONS.evidence}
        value={o.evidenceScore}
        lines={insights.evidenceBreakdown?.explanation ?? []}
        size={size}
      />
      <ScoreTile
        label="Value strength"
        question={SCORE_QUESTIONS.value}
        value={o.valueStrength}
        lines={insights.valueStrength?.explanation ?? ["Not computed yet."]}
        size={size}
      />
      <ScoreTile
        label="Causal confidence"
        question={SCORE_QUESTIONS.causal}
        value={o.causalConfidence}
        lines={insights.causal?.explanation ?? ["Not computed yet."]}
        size={size}
      />
    </div>
  );
}

export function frontierText(frontier: FrontierPosition | string | null | undefined): string {
  if (!frontier) return "Not computed";
  return PROOF_RUNG_LABELS[frontier as FrontierPosition] ?? String(frontier);
}
