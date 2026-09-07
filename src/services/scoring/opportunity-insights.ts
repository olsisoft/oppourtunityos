/**
 * Pure derivation of everything the UI needs to explain an opportunity:
 * stored breakdowns (already computed) plus next actions computed on the fly.
 */
import type { OpportunityWithRelations } from "@/db/workspaces";
import type { EvidenceScoreResult } from "./evidence-score";
import type { KillWarning } from "./kill-criteria";
import { computeNextActions, type NextAction } from "./next-action";
import type { OpportunityScoreResult } from "./opportunity-score";
import type { VerdictResult } from "./verdict";

export interface OpportunityInsights {
  scoreBreakdown: OpportunityScoreResult | null;
  evidenceBreakdown: EvidenceScoreResult | null;
  verdictResult: VerdictResult | null;
  killWarnings: KillWarning[];
  nextActions: NextAction[];
  primaryAction: NextAction | null;
  criticalWarnings: number;
  untestedAssumptions: number;
}

export function deriveOpportunityInsights(
  o: OpportunityWithRelations,
  mechanismCount: number,
): OpportunityInsights {
  const scoreBreakdown = (o.scoreBreakdown as unknown as OpportunityScoreResult | null) ?? null;
  const evidenceBreakdown = (o.evidenceBreakdown as unknown as EvidenceScoreResult | null) ?? null;
  const verdictResult = (o.verdictReasons as unknown as VerdictResult | null) ?? null;
  const killWarnings = ((o.killWarnings as unknown as KillWarning[] | null) ?? []).filter(Boolean);

  const nextActions = computeNextActions({
    verdict: o.verdict,
    opportunityScore: o.opportunityScore,
    evidenceScore: o.evidenceScore,
    evidence: evidenceBreakdown ?? {
      gaps: [],
      counts: { total: 0, supporting: 0, contradicting: 0, neutral: 0, direct: 0 },
      components: [],
    },
    assumptions: o.assumptions.map((a) => ({
      statement: a.statement,
      status: a.status,
      importance: a.importance,
      evidenceCount: a.links.length,
    })),
    killWarnings,
    hasTrigger: (o.pain?.triggers.length ?? 0) > 0,
    alternativeCount: o.pain?.alternatives.length ?? 0,
    mechanismCount,
    icpName: o.icp?.name ?? null,
    painDescription: o.pain?.description ?? null,
    frequency: o.frequency,
  });

  return {
    scoreBreakdown,
    evidenceBreakdown,
    verdictResult,
    killWarnings,
    nextActions,
    primaryAction: nextActions[0] ?? null,
    criticalWarnings: killWarnings.filter((w) => w.severity === "critical").length,
    untestedAssumptions: o.assumptions.filter((a) => a.status === "UNKNOWN").length,
  };
}
