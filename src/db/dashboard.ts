import { prisma } from "@/db/prisma";
import { workspaceGraphInclude } from "@/db/workspaces";
import type { Verdict } from "@/generated/prisma/enums";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import type { NextAction } from "@/services/scoring/next-action";

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

  const weakestAssumptions = await prisma.assumption.findMany({
    where: { workspace: { userId }, status: "UNKNOWN" },
    orderBy: [{ importance: "desc" }, { createdAt: "asc" }],
    take: 6,
    include: {
      workspace: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
      links: true,
    },
  });

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

  const evidenceGaps = enriched.filter(
    ({ opportunity: o }) => o.opportunityScore >= 60 && o.evidenceScore < 40,
  );

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

  const evidenceCount = workspaces.reduce((s, w) => s + w._count.evidence, 0);

  return {
    workspaces,
    opportunities: enriched,
    strongest: enriched.slice(0, 5),
    byVerdict,
    evidenceGaps,
    weakestAssumptions,
    nextAction,
    totals: {
      workspaces: workspaces.filter((w) => w.status === "ACTIVE").length,
      opportunities: opportunities.length,
      evidence: evidenceCount,
      untestedAssumptions: weakestAssumptions.length,
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
