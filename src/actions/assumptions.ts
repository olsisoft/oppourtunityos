"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import {
  createAssumptionSchema,
  linkAssumptionEvidenceSchema,
  updateAssumptionSchema,
} from "@/domain/schemas";
import { requireUserId } from "@/lib/session";
import { deriveAssumptionStatus } from "@/services/scoring/assumption-status";
import { recomputeOpportunity } from "@/services/scoring/recompute";
import { signalWeight } from "@/services/scoring/evidence-score";
import { toEvidenceSignal } from "@/services/scoring/recompute";
import { safeAction, zodFieldErrors, type ActionResult } from "./shared";

async function refreshAssumption(assumptionId: string) {
  const links = await prisma.assumptionEvidence.findMany({
    where: { assumptionId },
    include: { evidence: true },
  });
  const derived = deriveAssumptionStatus(
    links.map((l) => ({
      direction: l.direction,
      weight: signalWeight(toEvidenceSignal(l.evidence)),
    })),
  );
  const updated = await prisma.assumption.update({
    where: { id: assumptionId },
    data: { status: derived.status, confidence: derived.confidence },
  });
  if (updated.opportunityId) await recomputeOpportunity(updated.opportunityId);
}

export async function createAssumptionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAssumptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;
  return safeAction("assumption.create", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, d.workspaceId);
    const a = await prisma.assumption.create({
      data: {
        workspaceId: d.workspaceId,
        opportunityId: d.opportunityId ?? null,
        valueChainNodeId: d.valueChainNodeId ?? null,
        causalLinkId: d.causalLinkId ?? null,
        kind: d.kind,
        statement: d.statement,
        importance: d.importance,
        status: d.status,
        notes: d.notes ?? null,
        provenance: "USER",
      },
    });
    if (a.opportunityId) await recomputeOpportunity(a.opportunityId);
    revalidatePath(`/app/w/${d.workspaceId}`, "layout");
    return { id: a.id };
  });
}

export async function updateAssumptionAction(input: unknown): Promise<ActionResult> {
  const parsed = updateAssumptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;
  return safeAction("assumption.update", async () => {
    const userId = await requireUserId();
    const existing = await prisma.assumption.findUnique({ where: { id: d.assumptionId } });
    if (!existing) throw new Error("Assumption not found");
    await assertWorkspaceAccess(userId, existing.workspaceId);
    await prisma.assumption.update({
      where: { id: d.assumptionId },
      data: {
        statement: d.statement,
        importance: d.importance,
        status: d.status,
        kind: d.kind,
        valueChainNodeId: d.valueChainNodeId,
        causalLinkId: d.causalLinkId,
        notes: d.notes,
        // A manual status override is the user's judgement.
        confidence:
          d.status && d.status !== "UNKNOWN" ? Math.max(existing.confidence, 50) : undefined,
      },
    });
    if (existing.opportunityId) await recomputeOpportunity(existing.opportunityId);
    revalidatePath(`/app/w/${existing.workspaceId}`, "layout");
    return undefined;
  });
}

export async function deleteAssumptionAction(assumptionId: string): Promise<ActionResult> {
  return safeAction("assumption.delete", async () => {
    const userId = await requireUserId();
    const existing = await prisma.assumption.findUnique({ where: { id: assumptionId } });
    if (!existing) throw new Error("Assumption not found");
    await assertWorkspaceAccess(userId, existing.workspaceId);
    await prisma.assumption.delete({ where: { id: assumptionId } });
    if (existing.opportunityId) await recomputeOpportunity(existing.opportunityId);
    revalidatePath(`/app/w/${existing.workspaceId}`, "layout");
    return undefined;
  });
}

export async function linkAssumptionEvidenceAction(input: unknown): Promise<ActionResult> {
  const parsed = linkAssumptionEvidenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;
  return safeAction("assumption.link_evidence", async () => {
    const userId = await requireUserId();
    const assumption = await prisma.assumption.findUnique({ where: { id: d.assumptionId } });
    if (!assumption) throw new Error("Assumption not found");
    await assertWorkspaceAccess(userId, assumption.workspaceId);
    const evidence = await prisma.evidence.findFirst({
      where: { id: d.evidenceId, workspaceId: assumption.workspaceId },
    });
    if (!evidence) throw new Error("Evidence not found in workspace");
    await prisma.assumptionEvidence.upsert({
      where: {
        assumptionId_evidenceId: { assumptionId: d.assumptionId, evidenceId: d.evidenceId },
      },
      create: { assumptionId: d.assumptionId, evidenceId: d.evidenceId, direction: d.direction },
      update: { direction: d.direction },
    });
    await refreshAssumption(d.assumptionId);
    revalidatePath(`/app/w/${assumption.workspaceId}`, "layout");
    return undefined;
  });
}

export async function unlinkAssumptionEvidenceAction(
  assumptionId: string,
  evidenceId: string,
): Promise<ActionResult> {
  return safeAction("assumption.unlink_evidence", async () => {
    const userId = await requireUserId();
    const assumption = await prisma.assumption.findUnique({ where: { id: assumptionId } });
    if (!assumption) throw new Error("Assumption not found");
    await assertWorkspaceAccess(userId, assumption.workspaceId);
    await prisma.assumptionEvidence.deleteMany({ where: { assumptionId, evidenceId } });
    await refreshAssumption(assumptionId);
    revalidatePath(`/app/w/${assumption.workspaceId}`, "layout");
    return undefined;
  });
}
