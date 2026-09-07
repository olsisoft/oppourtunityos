import { prisma } from "@/db/prisma";
import { ForbiddenError } from "@/lib/session";
import type { ProgressCounts } from "@/services/scoring/discovery-progress";

/**
 * Every read/write of workspace data goes through `assertWorkspaceAccess`.
 * A missing workspace is reported as Forbidden to avoid id enumeration.
 */
export async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
  });
  if (!workspace) throw new ForbiddenError("You do not have access to this workspace.");
  return workspace;
}

export async function listWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { opportunities: true, evidence: true } },
    },
  });
}

export const workspaceGraphInclude = {
  markets: {
    orderBy: { createdAt: "asc" as const },
    include: {
      icps: {
        orderBy: { createdAt: "asc" as const },
        include: {
          variables: {
            orderBy: [{ importanceScore: "desc" as const }, { createdAt: "asc" as const }],
            include: {
              pains: {
                orderBy: { createdAt: "asc" as const },
                include: {
                  triggers: { orderBy: { createdAt: "asc" as const } },
                  alternatives: { orderBy: { createdAt: "asc" as const } },
                  evidence: { orderBy: { capturedAt: "desc" as const } },
                  mechanisms: { orderBy: { createdAt: "asc" as const } },
                },
              },
            },
          },
        },
      },
    },
  },
  evidence: {
    orderBy: { capturedAt: "desc" as const },
    include: { pain: { select: { id: true, description: true } } },
  },
  mechanisms: { orderBy: { createdAt: "asc" as const } },
  opportunities: {
    orderBy: [{ opportunityScore: "desc" as const }, { createdAt: "asc" as const }],
    include: {
      icp: true,
      variable: true,
      pain: { include: { triggers: true, alternatives: true } },
      assumptions: { include: { links: true } },
      evidence: true,
    },
  },
  assumptions: {
    orderBy: [{ importance: "desc" as const }, { createdAt: "asc" as const }],
    include: { links: { include: { evidence: { select: { id: true, sourceTitle: true } } } } },
  },
  conversations: {
    orderBy: { createdAt: "asc" as const },
    take: 1,
    include: { messages: { orderBy: { createdAt: "asc" as const } } },
  },
};

export async function getWorkspaceGraph(workspaceId: string) {
  return prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: workspaceGraphInclude,
  });
}

export type WorkspaceGraph = Awaited<ReturnType<typeof getWorkspaceGraph>>;
export type OpportunityWithRelations = WorkspaceGraph["opportunities"][number];
export type GraphMarket = WorkspaceGraph["markets"][number];
export type GraphIcp = GraphMarket["icps"][number];
export type GraphVariable = GraphIcp["variables"][number];
export type GraphPain = GraphVariable["pains"][number];
export type GraphEvidence = WorkspaceGraph["evidence"][number];
export type GraphAssumption = WorkspaceGraph["assumptions"][number];
export type GraphMessage = WorkspaceGraph["conversations"][number]["messages"][number];

export async function getWorkspaceCounts(workspaceId: string): Promise<ProgressCounts> {
  const [
    markets,
    icps,
    variables,
    pains,
    triggers,
    alternatives,
    evidence,
    mechanisms,
    opportunities,
    scored,
    conversation,
  ] = await Promise.all([
    prisma.market.count({ where: { workspaceId } }),
    prisma.iCP.count({ where: { market: { workspaceId } } }),
    prisma.variable.count({ where: { icp: { market: { workspaceId } } } }),
    prisma.pain.count({ where: { variable: { icp: { market: { workspaceId } } } } }),
    prisma.trigger.count({ where: { pain: { variable: { icp: { market: { workspaceId } } } } } }),
    prisma.alternative.count({
      where: { pain: { variable: { icp: { market: { workspaceId } } } } },
    }),
    prisma.evidence.count({ where: { workspaceId } }),
    prisma.productMechanism.count({ where: { workspaceId } }),
    prisma.opportunity.count({ where: { workspaceId } }),
    prisma.opportunity.count({ where: { workspaceId, opportunityScore: { gt: 0 } } }),
    prisma.conversation.findFirst({ where: { workspaceId }, select: { userContext: true } }),
  ]);
  const ctx = conversation?.userContext as { industries?: unknown[]; audiences?: unknown[] } | null;
  return {
    userContextCaptured: Boolean(
      ctx && ((ctx.industries?.length ?? 0) > 0 || (ctx.audiences?.length ?? 0) > 0),
    ),
    markets,
    icps,
    variables,
    pains,
    triggers,
    alternatives,
    evidence,
    mechanisms,
    opportunities,
    scoredOpportunities: scored,
  };
}

export async function getOrCreateConversation(workspaceId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { workspaceId },
    include: { messages: true },
  });
}
