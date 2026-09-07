import { prisma } from "@/db/prisma";
import { workspaceGraphInclude } from "@/db/workspaces";
import type { AssumptionKind, Verdict } from "@/generated/prisma/enums";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import type { NextAction } from "@/services/scoring/next-action";
import type { ValueAction } from "@/services/value/next-value-action";

export type EvidenceGapKind = "PROBLEM" | "MAGNITUDE" | "CAUSAL" | "WTP" | "FEASIBILITY";

export const EVIDENCE_GAP_LABELS: Record<EvidenceGapKind, string> = {
  PROBLEM: "Problem evidence gap",
  MAGNITUDE: "Economic magnitude gap",
  CAUSAL: "Causal evidence gap",
  WTP: "Willingness-to-pay gap",
  FEASIBILITY: "Mechanism feasibility gap",
};

/** Causal and value assumptions are the ones that collapse an opportunity. */
const KIND_BONUS: Record<AssumptionKind, number> = {
  CAUSAL: 9,
  VALUE: 8,
  WTP: 5,
  FEASIBILITY: 4,
  ACCESS: 3,
  GENERIC: 0,
};

export async function getDashboardData(userId: string) {
  const workspaces = await prisma.workspace.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { opportunities: true, evidence: true, assumptions: true } },
      conversations: { select: { stage: true }, take: 1 },
    },
  });

  const opportunities = await prisma.opportunity.findMany({
    where: { workspace: { userId } },
    orderBy: [{ opportunityScore: "desc" }],
    include: {
      ...workspaceGraphInclude.opportunities.include,
      workspace: { select: { id: true, name: true, isDemo: true } },
    },
  });

  const mechanismCounts = await prisma.productMechanism.groupBy({
    by: ["workspaceId"],
    where: { workspace: { userId } },
    _count: { _all: true },
  });
  const mechanismsByWorkspace = new Map(mechanismCounts.map((m) => [m.workspaceId, m._count._all]));

  const untestedAssumptions = await prisma.assumption.findMany({
    where: { workspace: { userId }, status: "UNKNOWN" },
    orderBy: [{ importance: "desc" }, { createdAt: "asc" }],
    take: 40,
    include: {
      workspace: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
      valueChainNode: { select: { level: true } },
      causalLink: { select: { statement: true } },
      links: true,
    },
  });
  const weakestAssumptions = [...untestedAssumptions]
    .sort(
      (a, b) =>
        b.importance * 10 + KIND_BONUS[b.kind] - (a.importance * 10 + KIND_BONUS[a.kind]) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .slice(0, 6);

  const byVerdict: Record<Verdict, number> = {
    TEST: 0,
    INTERVIEW: 0,
    INVESTIGATE: 0,
    RESEARCH: 0,
    KILL: 0,
    IGNORE: 0,
  };
  for (const o of opportunities) byVerdict[o.verdict]++;

  const enriched = opportunities.map((o) => ({
    opportunity: o,
    insights: deriveOpportunityInsights(o, mechanismsByWorkspace.get(o.workspaceId) ?? 0),
  }));

  // Typed evidence gaps: what kind of evidence is missing, not just "low evidence".
  const evidenceGaps = enriched
    .filter(({ opportunity: o }) => o.verdict !== "KILL" && o.verdict !== "IGNORE")
    .flatMap(({ opportunity: o, insights }) => {
      const gaps: Array<{ kind: EvidenceGapKind; detail: string }> = [];
      if (o.opportunityScore >= 60 && o.evidenceScore < 40) {
        gaps.push({
          kind: "PROBLEM",
          detail: `potential ${o.opportunityScore} · evidence ${o.evidenceScore} · ${insights.evidenceBreakdown?.gaps[0] ?? "no evidence captured"}`,
        });
      }
      if (
        insights.valueStrength?.status === "INCOMPLETE" &&
        insights.valueStrength.missing.includes("magnitude")
      ) {
        gaps.push({
          kind: "MAGNITUDE",
          detail: "The economic magnitude is unknown: nothing measured, nothing stated.",
        });
      }
      if (
        o.valueChainNodes.length > 0 &&
        (o.causalConfidence === null || o.causalConfidence < 40)
      ) {
        gaps.push({
          kind: "CAUSAL",
          detail:
            o.causalConfidence === null
              ? "A critical causal link has no evidence at all."
              : `Causal confidence ${o.causalConfidence}: the weakest critical link is barely supported.`,
        });
      }
      const wtpEvidence =
        o.evidence.some((e) => e.hasPurchaseIntent) ||
        o.claimLinks.some(
          (l) => l.claimType === "WILLINGNESS_TO_PAY" && l.direction === "SUPPORTS",
        );
      if (!wtpEvidence && o.opportunityScore >= 60) {
        gaps.push({
          kind: "WTP",
          detail: "No evidence of purchase intent or spend on an alternative.",
        });
      }
      if (o.assumptions.some((a) => a.kind === "FEASIBILITY" && a.status === "UNKNOWN")) {
        gaps.push({
          kind: "FEASIBILITY",
          detail: "A feasibility assumption about the mechanism is untested.",
        });
      }
      return gaps.map((g) => ({ opportunity: o, insights, ...g }));
    })
    .slice(0, 10);

  const candidate =
    enriched.find(({ opportunity: o }) => o.verdict !== "KILL" && o.verdict !== "IGNORE") ?? null;
  const nextAction:
    (NextAction & { opportunityId: string; opportunityTitle: string; workspaceId: string }) | null =
    candidate && candidate.insights.primaryAction
      ? {
          ...candidate.insights.primaryAction,
          opportunityId: candidate.opportunity.id,
          opportunityTitle: candidate.opportunity.title,
          workspaceId: candidate.opportunity.workspaceId,
        }
      : null;
  const nextValueAction: (ValueAction & { frontier: string | null }) | null =
    candidate && candidate.insights.primaryValueAction
      ? {
          ...candidate.insights.primaryValueAction,
          frontier: candidate.opportunity.proofFrontierRung,
        }
      : null;

  const evidenceCount = workspaces.reduce((s, w) => s + w._count.evidence, 0);

  return {
    workspaces,
    opportunities: enriched,
    strongest: enriched.slice(0, 5),
    byVerdict,
    evidenceGaps,
    weakestAssumptions,
    nextAction,
    nextValueAction,
    totals: {
      workspaces: workspaces.filter((w) => w.status === "ACTIVE").length,
      opportunities: opportunities.length,
      evidence: evidenceCount,
      untestedAssumptions: untestedAssumptions.length,
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
