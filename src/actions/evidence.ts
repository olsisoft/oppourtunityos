"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import { createEvidenceSchema } from "@/domain/schemas";
import { logger } from "@/lib/logger";
import { cleanText, cleanUrl } from "@/lib/sanitize";
import { requireUserId } from "@/lib/session";
import { getAIProvider } from "@/services/ai";
import type { EvidenceSummary } from "@/services/ai/schemas";
import { getResearchProvider, type ResearchResult } from "@/services/research";
import {
  recomputeOpportunitiesForEvidence,
  recomputeOpportunitiesForPain,
  recomputeOpportunity,
} from "@/services/scoring/recompute";
import { safeAction, zodFieldErrors, type ActionResult } from "./shared";

async function recomputeAfterEvidence(painId?: string | null, opportunityId?: string | null) {
  if (opportunityId) await recomputeOpportunity(opportunityId);
  if (painId) await recomputeOpportunitiesForPain(painId);
}

export async function createEvidenceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createEvidenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;
  return safeAction("evidence.create", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, d.workspaceId);

    // Referenced pain / opportunity must belong to this workspace.
    if (d.painId) {
      const pain = await prisma.pain.findFirst({
        where: { id: d.painId, variable: { icp: { market: { workspaceId: d.workspaceId } } } },
        select: { id: true },
      });
      if (!pain) throw new Error("Pain not found in workspace");
    }
    if (d.opportunityId) {
      const opp = await prisma.opportunity.findFirst({
        where: { id: d.opportunityId, workspaceId: d.workspaceId },
        select: { id: true },
      });
      if (!opp) throw new Error("Opportunity not found in workspace");
    }

    const sourceDate = d.sourceDate ? new Date(d.sourceDate) : null;
    const evidence = await prisma.evidence.create({
      data: {
        workspaceId: d.workspaceId,
        painId: d.painId ?? null,
        opportunityId: d.opportunityId ?? null,
        type: d.isInterview ? "INTERVIEW" : d.type,
        origin: d.isInterview ? "INTERVIEW" : "USER_CAPTURED",
        sourceTitle: cleanText(d.sourceTitle, 200),
        sourceUrl: cleanUrl(d.sourceUrl),
        sourceExcerpt: cleanText(d.sourceExcerpt, 4000),
        sourceDate: sourceDate && !Number.isNaN(sourceDate.getTime()) ? sourceDate : null,
        sourceAuthor: d.sourceAuthor ? cleanText(d.sourceAuthor, 200) : null,
        relevanceScore: d.relevanceScore,
        strengthScore: d.strengthScore,
        sentiment: d.sentiment,
        isDirectCustomer: d.isDirectCustomer || d.isInterview,
        hasExplicitPain: d.hasExplicitPain,
        hasEconomicImpact: d.hasEconomicImpact,
        hasWorkaround: d.hasWorkaround,
        hasPurchaseIntent: d.hasPurchaseIntent,
      },
    });
    // Claims this evidence affects. Every target must belong to the workspace.
    // Linking never changes the evidence itself; the deterministic engine
    // interprets it during recompute.
    let linkedClaims = 0;
    for (const claim of d.claims) {
      let opportunityId = claim.opportunityId ?? d.opportunityId ?? null;
      if (claim.valueChainNodeId) {
        const node = await prisma.valueChainNode.findFirst({
          where: { id: claim.valueChainNodeId, opportunity: { workspaceId: d.workspaceId } },
          select: { opportunityId: true },
        });
        if (!node) continue;
        opportunityId = node.opportunityId;
      }
      if (claim.causalLinkId) {
        const link = await prisma.causalLink.findFirst({
          where: { id: claim.causalLinkId, opportunity: { workspaceId: d.workspaceId } },
          select: { opportunityId: true },
        });
        if (!link) continue;
        opportunityId = link.opportunityId;
      }
      if (opportunityId) {
        const opp = await prisma.opportunity.findFirst({
          where: { id: opportunityId, workspaceId: d.workspaceId },
          select: { id: true },
        });
        if (!opp) continue;
      }
      await prisma.evidenceClaimLink.create({
        data: {
          evidenceId: evidence.id,
          opportunityId,
          claimType: claim.claimType,
          valueChainNodeId: claim.valueChainNodeId ?? null,
          causalLinkId: claim.causalLinkId ?? null,
          direction: claim.direction,
        },
      });
      linkedClaims++;
    }
    await recomputeAfterEvidence(d.painId, d.opportunityId);
    if (linkedClaims > 0) await recomputeOpportunitiesForEvidence(evidence.id);
    logger.info("evidence.created", {
      userId,
      workspaceId: d.workspaceId,
      evidenceId: evidence.id,
      type: evidence.type,
    });
    revalidatePath(`/app/w/${d.workspaceId}`, "layout");
    revalidatePath("/app");
    return { id: evidence.id };
  });
}

export async function deleteEvidenceAction(
  workspaceId: string,
  evidenceId: string,
): Promise<ActionResult> {
  return safeAction("evidence.delete", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, workspaceId);
    const evidence = await prisma.evidence.findFirst({ where: { id: evidenceId, workspaceId } });
    if (!evidence) throw new Error("Evidence not found");
    await prisma.evidence.delete({ where: { id: evidenceId } });
    await recomputeAfterEvidence(evidence.painId, evidence.opportunityId);
    revalidatePath(`/app/w/${workspaceId}`, "layout");
    return undefined;
  });
}

/**
 * Ask the AI provider to propose evidence signals for an excerpt. The excerpt
 * is wrapped as untrusted content; the user confirms every flag before saving.
 */
export async function suggestEvidenceSignalsAction(input: {
  workspaceId: string;
  sourceTitle: string;
  excerpt: string;
  hypothesis: string;
}): Promise<ActionResult<EvidenceSummary & { isMock: boolean }>> {
  return safeAction("evidence.suggest_signals", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, input.workspaceId);
    const provider = getAIProvider();
    const summary = await provider.summarizeEvidence(
      cleanText(input.sourceTitle, 200),
      cleanText(input.excerpt, 4000),
      cleanText(input.hypothesis, 500),
    );
    return { ...summary, isMock: provider.isMock };
  });
}

export async function runResearchAction(input: {
  workspaceId: string;
  query: string;
  hypothesis?: string;
}): Promise<ActionResult<{ providerName: string; isMocked: boolean; results: ResearchResult[] }>> {
  return safeAction("research.search", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, input.workspaceId);
    const provider = getResearchProvider();
    const results = await provider.search({
      query: cleanText(input.query, 200),
      hypothesis: input.hypothesis ? cleanText(input.hypothesis, 500) : undefined,
      limit: 5,
    });
    logger.info("research.search", {
      userId,
      workspaceId: input.workspaceId,
      provider: provider.name,
      count: results.length,
    });
    return { providerName: provider.name, isMocked: provider.isMocked, results };
  });
}

export async function importResearchResultAction(input: {
  workspaceId: string;
  painId?: string;
  opportunityId?: string;
  result: ResearchResult;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  relevanceScore: number;
  strengthScore: number;
}): Promise<ActionResult<{ id: string }>> {
  return safeAction("research.import", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, input.workspaceId);
    const r = input.result;
    const evidence = await prisma.evidence.create({
      data: {
        workspaceId: input.workspaceId,
        painId: input.painId ?? null,
        opportunityId: input.opportunityId ?? null,
        type: r.type,
        origin: "RESEARCH_PROVIDER",
        providerName: cleanText(r.providerName, 80),
        isMocked: Boolean(r.isMocked),
        sourceTitle: cleanText(r.title, 200),
        sourceUrl: cleanUrl(r.url),
        sourceExcerpt: cleanText(r.excerpt, 4000),
        sourceDate: r.publishedAt ? new Date(r.publishedAt) : null,
        sourceAuthor: r.author ? cleanText(r.author, 200) : null,
        sentiment: input.sentiment,
        relevanceScore: Math.min(10, Math.max(0, Math.round(input.relevanceScore))),
        strengthScore: Math.min(10, Math.max(0, Math.round(input.strengthScore))),
      },
    });
    await recomputeAfterEvidence(input.painId, input.opportunityId);
    revalidatePath(`/app/w/${input.workspaceId}`, "layout");
    return { id: evidence.id };
  });
}
