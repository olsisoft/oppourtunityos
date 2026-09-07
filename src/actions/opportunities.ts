"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import { createOpportunitySchema, updateOpportunitySchema } from "@/domain/schemas";
import { logger } from "@/lib/logger";
import { requireUserId } from "@/lib/session";
import { getAIProvider } from "@/services/ai";
import type { InterviewGuide } from "@/services/ai/schemas";
import { buildTemplateInterviewGuide } from "@/services/interview/guide";
import { recomputeOpportunity } from "@/services/scoring/recompute";
import { safeAction, zodFieldErrors, type ActionResult } from "./shared";

export async function createOpportunityAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createOpportunitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;
  return safeAction("opportunity.create", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, d.workspaceId);
    const pain = d.painId
      ? await prisma.pain.findFirst({
          where: { id: d.painId, variable: { icp: { market: { workspaceId: d.workspaceId } } } },
          include: { variable: true },
        })
      : null;
    const opportunity = await prisma.opportunity.create({
      data: {
        workspaceId: d.workspaceId,
        title: d.title,
        icpId: d.icpId ?? (pain ? pain.variable.icpId : null),
        variableId: d.variableId ?? pain?.variableId ?? null,
        painId: pain?.id ?? null,
        problemStatement: d.problemStatement ?? null,
        mechanism: d.mechanism ?? null,
        productHypothesis: d.productHypothesis ?? null,
        valueProposition: d.valueProposition ?? null,
        metric: d.metric ?? null,
        ...d.inputs,
        provenance: "USER",
      },
    });
    await recomputeOpportunity(opportunity.id);
    logger.info("opportunity.created", {
      userId,
      workspaceId: d.workspaceId,
      opportunityId: opportunity.id,
    });
    revalidatePath(`/app/w/${d.workspaceId}`, "layout");
    revalidatePath("/app");
    return { id: opportunity.id };
  });
}

export async function updateOpportunityAction(input: unknown): Promise<ActionResult> {
  const parsed = updateOpportunitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;
  return safeAction("opportunity.update", async () => {
    const userId = await requireUserId();
    const existing = await prisma.opportunity.findUnique({ where: { id: d.opportunityId } });
    if (!existing) throw new Error("Opportunity not found");
    await assertWorkspaceAccess(userId, existing.workspaceId);
    await prisma.opportunity.update({
      where: { id: d.opportunityId },
      data: {
        title: d.title,
        problemStatement: d.problemStatement,
        mechanism: d.mechanism,
        productHypothesis: d.productHypothesis,
        valueProposition: d.valueProposition,
        metric: d.metric,
        risks: d.risks,
        nextSteps: d.nextSteps,
        ...(d.inputs ?? {}),
        // Manual edits make the inputs user-provided.
        provenance: d.inputs ? "USER" : undefined,
      },
    });
    await recomputeOpportunity(d.opportunityId);
    revalidatePath(`/app/w/${existing.workspaceId}`, "layout");
    revalidatePath("/app");
    return undefined;
  });
}

export async function deleteOpportunityAction(opportunityId: string): Promise<ActionResult> {
  return safeAction("opportunity.delete", async () => {
    const userId = await requireUserId();
    const existing = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) throw new Error("Opportunity not found");
    await assertWorkspaceAccess(userId, existing.workspaceId);
    await prisma.opportunity.delete({ where: { id: opportunityId } });
    revalidatePath(`/app/w/${existing.workspaceId}`, "layout");
    revalidatePath("/app");
    return undefined;
  });
}

export async function generateInterviewGuideAction(
  opportunityId: string,
): Promise<ActionResult<{ guide: InterviewGuide; source: "ai" | "template" | "mock" }>> {
  return safeAction("opportunity.interview_guide", async () => {
    const userId = await requireUserId();
    const o = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        icp: true,
        variable: true,
        pain: { include: { triggers: true, alternatives: true } },
      },
    });
    if (!o) throw new Error("Opportunity not found");
    await assertWorkspaceAccess(userId, o.workspaceId);

    const inputs = {
      opportunityTitle: o.title,
      icp: o.icp?.name ?? "the ICP",
      variable: o.variable?.name ?? "the variable",
      pain: o.pain?.description ?? o.problemStatement ?? "the problem",
      trigger: o.pain?.triggers[0]?.description ?? null,
      alternatives: o.pain?.alternatives.map((a) => a.name) ?? [],
    };

    let guide: InterviewGuide;
    let source: "ai" | "template" | "mock";
    try {
      const provider = getAIProvider();
      guide = await provider.generateInterviewGuide(inputs);
      source = provider.isMock ? "mock" : "ai";
    } catch (error) {
      logger.warn("interview.guide_ai_failed", { opportunityId, error });
      guide = buildTemplateInterviewGuide(inputs);
      source = "template";
    }
    if (source === "mock") {
      // The template is better than the mock output; keep it deterministic.
      guide = buildTemplateInterviewGuide(inputs);
      source = "template";
    }

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        interviewGuide: JSON.parse(
          JSON.stringify({ ...guide, source, generatedAt: new Date().toISOString() }),
        ),
      },
    });
    revalidatePath(`/app/w/${o.workspaceId}`, "layout");
    return { guide, source };
  });
}
