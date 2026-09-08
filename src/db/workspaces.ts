import { prisma } from "@/db/prisma";
import { ForbiddenError } from "@/lib/errors";
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

const evidenceSummarySelect = {
  id: true,
  sourceTitle: true,
  type: true,
  sourceType: true,
  sourceOriginId: true,
  scope: true,
  organizationCount: true,
  sampleSize: true,
  sentiment: true,
  strengthScore: true,
  relevanceScore: true,
  isDemo: true,
  isMocked: true,
} as const;

const variableParentSelect = {
  id: true,
  name: true,
  desiredDirection: true,
  variableType: true,
  variablePolarity: true,
  parentVariableId: true,
  provenance: true,
  fieldProvenance: true,
} as const;

export const opportunityInclude = {
  icp: true,
  variable: { include: { parent: { select: variableParentSelect } } },
  pain: { include: { triggers: true, alternatives: true } },
  assumptions: { include: { links: true } },
  evidence: true,
  valueChainNodes: {
    orderBy: { causalDistance: "asc" as const },
    include: {
      evidenceLinks: { include: { evidence: { select: evidenceSummarySelect } } },
      assumptions: { include: { links: true } },
    },
  },
  causalLinks: {
    include: {
      fromNode: { select: { id: true, level: true, statement: true } },
      toNode: { select: { id: true, level: true, statement: true } },
      evidenceLinks: { include: { evidence: { select: evidenceSummarySelect } } },
      assumptions: { include: { links: true } },
    },
  },
  experiments: {
    orderBy: { createdAt: "desc" as const },
    include: {
      resultRecord: true,
      evidence: { select: evidenceSummarySelect },
      causalLink: {
        select: {
          id: true,
          statement: true,
          status: true,
          confidence: true,
          fromNode: { select: { level: true } },
          toNode: { select: { level: true } },
        },
      },
      assumption: { select: { id: true, statement: true, status: true, importance: true } },
      valueChainNode: { select: { id: true, level: true, statement: true, status: true } },
    },
  },
  claimLinks: { include: { evidence: { select: evidenceSummarySelect } } },
  knowledgeChanges: {
    orderBy: { createdAt: "desc" as const },
    take: 40,
    include: {
      experiment: { select: { id: true, title: true } },
      evidence: { select: { id: true, sourceTitle: true } },
    },
  },
  valuePaths: { orderBy: { createdAt: "asc" as const } },
};

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
              parent: { select: variableParentSelect },
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
    include: {
      pain: { select: { id: true, description: true } },
      experiment: { select: { id: true, title: true } },
      claimLinks: {
        include: {
          valueChainNode: { select: { id: true, level: true, statement: true } },
          causalLink: { select: { id: true, statement: true } },
        },
      },
    },
  },
  mechanisms: { orderBy: { createdAt: "asc" as const } },
  opportunities: {
    orderBy: [{ opportunityScore: "desc" as const }, { createdAt: "asc" as const }],
    include: opportunityInclude,
  },
  assumptions: {
    orderBy: [{ importance: "desc" as const }, { createdAt: "asc" as const }],
    include: {
      links: { include: { evidence: { select: { id: true, sourceTitle: true } } } },
      valueChainNode: { select: { id: true, level: true, statement: true } },
      causalLink: { select: { id: true, statement: true } },
    },
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
export type GraphValueChainNode = OpportunityWithRelations["valueChainNodes"][number];
export type GraphCausalLink = OpportunityWithRelations["causalLinks"][number];
export type GraphExperiment = OpportunityWithRelations["experiments"][number];
export type GraphKnowledgeChange = OpportunityWithRelations["knowledgeChanges"][number];
export type GraphValuePath = OpportunityWithRelations["valuePaths"][number];
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
    valueChainNodes,
    experiments,
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
    prisma.valueChainNode.count({ where: { opportunity: { workspaceId } } }),
    prisma.experiment.count({ where: { opportunity: { workspaceId } } }),
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
    valueChainNodes,
    experiments,
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
