/**
 * Pure derivation of everything the UI needs to explain an opportunity: the
 * stored deterministic breakdowns plus the ranked actions.
 */
import type { OpportunityWithRelations } from "@/db/workspaces";
import type { CausalConfidenceResult } from "@/services/value/causal-confidence";
import type { ValueAction } from "@/services/value/next-value-action";
import type { ProofFrontierResult } from "@/services/value/proof-frontier";
import type { ValueStrengthResult } from "@/services/value/value-strength";
import type { ExtendedVerdictResult } from "@/services/value/verdict-extension";
import type { EvidenceScoreResult } from "./evidence-score";
import type { KillWarning } from "./kill-criteria";
import { computeNextActions, type NextAction } from "./next-action";
import type { OpportunityScoreResult } from "./opportunity-score";
import type { VerdictResult } from "./verdict";

export interface OpportunityInsights {
  scoreBreakdown: OpportunityScoreResult | null;
  evidenceBreakdown: EvidenceScoreResult | null;
  verdictResult: (VerdictResult & Partial<ExtendedVerdictResult>) | null;
  killWarnings: KillWarning[];
  valueStrength: ValueStrengthResult | null;
  causal: CausalConfidenceResult | null;
  frontier: ProofFrontierResult | null;
  valueActions: ValueAction[];
  primaryValueAction: ValueAction | null;
  /** Legacy ranked actions (kept for KILL / IGNORE and as secondary suggestions). */
  nextActions: NextAction[];
  primaryAction: NextAction | null;
  riskiestAssumption: OpportunityWithRelations["assumptions"][number] | null;
  criticalWarnings: number;
  untestedAssumptions: number;
}

function json<T>(value: unknown): T | null {
  return (value as T | null) ?? null;
}

export function deriveOpportunityInsights(
  o: OpportunityWithRelations,
  mechanismCount: number,
): OpportunityInsights {
  const scoreBreakdown = json<OpportunityScoreResult>(o.scoreBreakdown);
  const evidenceBreakdown = json<EvidenceScoreResult>(o.evidenceBreakdown);
  const verdictResult = json<VerdictResult & Partial<ExtendedVerdictResult>>(o.verdictReasons);
  const killWarnings = (json<KillWarning[]>(o.killWarnings) ?? []).filter(Boolean);
  const valueStrength = json<ValueStrengthResult>(o.valueStrengthBreakdown);
  const causal = json<CausalConfidenceResult>(o.causalBreakdown);
  const frontier = json<ProofFrontierResult>(o.proofFrontier);
  const valueActions = (json<ValueAction[]>(o.valueActions) ?? []).filter(Boolean);

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

  const primaryValueAction = valueActions[0] ?? null;
  const legacyPrimary = nextActions[0] ?? null;
  // KILL / IGNORE keep their legacy action; otherwise the value-engineering action leads.
  const primaryAction: NextAction | null =
    o.verdict === "KILL" || o.verdict === "IGNORE" || !primaryValueAction
      ? legacyPrimary
      : {
          type: "VALIDATE_ASSUMPTION",
          title: primaryValueAction.what,
          rationale: primaryValueAction.why,
          effort: "medium",
        };

  const riskiestAssumption =
    [...o.assumptions]
      .filter((a) => a.status === "UNKNOWN")
      .sort((a, b) => {
        const kindRank = (k: string) =>
          k === "CAUSAL" || k === "VALUE" ? 0 : k === "WTP" || k === "FEASIBILITY" ? 1 : 2;
        return (
          b.importance - a.importance ||
          kindRank(a.kind) - kindRank(b.kind) ||
          a.links.length - b.links.length
        );
      })[0] ?? null;

  return {
    scoreBreakdown,
    evidenceBreakdown,
    verdictResult,
    killWarnings,
    valueStrength,
    causal,
    frontier,
    valueActions,
    primaryValueAction,
    nextActions,
    primaryAction,
    riskiestAssumption,
    criticalWarnings: killWarnings.filter((w) => w.severity === "critical").length,
    untestedAssumptions: o.assumptions.filter((a) => a.status === "UNKNOWN").length,
  };
}
