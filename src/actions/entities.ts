"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import {
  createAlternativeSchema,
  createMechanismSchema,
  updateIcpSchema,
  updatePainSchema,
  updateVariableSchema,
} from "@/domain/schemas";
import { getT } from "@/i18n/server";
import { requireUserId } from "@/lib/session";
import {
  recomputeOpportunitiesForPain,
  recomputeWorkspaceOpportunities,
} from "@/services/scoring/recompute";
import { safeAction, zodFieldErrors, type ActionResult } from "./shared";

async function workspaceIdForIcp(icpId: string) {
  const icp = await prisma.iCP.findUnique({ where: { id: icpId }, include: { market: true } });
  if (!icp) throw new Error("ICP not found");
  return icp.market.workspaceId;
}

async function workspaceIdForVariable(variableId: string) {
  const v = await prisma.variable.findUnique({
    where: { id: variableId },
    include: { icp: { include: { market: true } } },
  });
  if (!v) throw new Error("Variable not found");
  return v.icp.market.workspaceId;
}

async function workspaceIdForPain(painId: string) {
  const p = await prisma.pain.findUnique({
    where: { id: painId },
    include: { variable: { include: { icp: { include: { market: true } } } } },
  });
  if (!p) throw new Error("Pain not found");
  return p.variable.icp.market.workspaceId;
}

export async function updateIcpAction(input: unknown): Promise<ActionResult> {
  const parsed = updateIcpSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getT();
    return {
      ok: false,
      error: t("validation.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const { icpId, ...data } = parsed.data;
  return safeAction("icp.update", async () => {
    const userId = await requireUserId();
    const workspaceId = await workspaceIdForIcp(icpId);
    await assertWorkspaceAccess(userId, workspaceId);
    await prisma.iCP.update({ where: { id: icpId }, data: { ...data, provenance: "USER" } });
    await recomputeWorkspaceOpportunities(workspaceId);
    revalidatePath(`/app/w/${workspaceId}`, "layout");
    return undefined;
  });
}

export async function updateVariableAction(input: unknown): Promise<ActionResult> {
  const parsed = updateVariableSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getT();
    return {
      ok: false,
      error: t("validation.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const { variableId, ...data } = parsed.data;
  return safeAction("variable.update", async () => {
    const userId = await requireUserId();
    const workspaceId = await workspaceIdForVariable(variableId);
    await assertWorkspaceAccess(userId, workspaceId);
    await prisma.variable.update({
      where: { id: variableId },
      data: { ...data, provenance: "USER" },
    });
    revalidatePath(`/app/w/${workspaceId}`, "layout");
    return undefined;
  });
}

export async function updatePainAction(input: unknown): Promise<ActionResult> {
  const parsed = updatePainSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getT();
    return {
      ok: false,
      error: t("validation.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const { painId, ...data } = parsed.data;
  return safeAction("pain.update", async () => {
    const userId = await requireUserId();
    const workspaceId = await workspaceIdForPain(painId);
    await assertWorkspaceAccess(userId, workspaceId);
    await prisma.pain.update({ where: { id: painId }, data: { ...data, provenance: "USER" } });
    await recomputeOpportunitiesForPain(painId);
    revalidatePath(`/app/w/${workspaceId}`, "layout");
    return undefined;
  });
}

export async function createAlternativeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAlternativeSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getT();
    return {
      ok: false,
      error: t("validation.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;
  return safeAction("alternative.create", async () => {
    const userId = await requireUserId();
    const workspaceId = await workspaceIdForPain(d.painId);
    await assertWorkspaceAccess(userId, workspaceId);
    const a = await prisma.alternative.create({
      data: {
        painId: d.painId,
        name: d.name,
        category: d.category,
        description: d.description ?? null,
        costEstimate: d.costEstimate ?? null,
        weaknessDescription: d.weaknessDescription ?? null,
        weaknessScore: d.weaknessScore,
        provenance: "USER",
      },
    });
    await recomputeOpportunitiesForPain(d.painId);
    revalidatePath(`/app/w/${workspaceId}`, "layout");
    return { id: a.id };
  });
}

export async function createMechanismAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createMechanismSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getT();
    return {
      ok: false,
      error: t("validation.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const d = parsed.data;
  return safeAction("mechanism.create", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, d.workspaceId);
    const m = await prisma.productMechanism.create({
      data: {
        workspaceId: d.workspaceId,
        painId: d.painId ?? null,
        name: d.name,
        description: d.description ?? null,
        category: d.category,
        provenance: "USER",
      },
    });
    revalidatePath(`/app/w/${d.workspaceId}`, "layout");
    return { id: m.id };
  });
}

export async function deleteEntityAction(input: {
  kind: "market" | "icp" | "variable" | "pain" | "trigger" | "alternative" | "mechanism";
  id: string;
  workspaceId: string;
}): Promise<ActionResult> {
  return safeAction("entity.delete", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, input.workspaceId);
    const w = input.workspaceId;
    switch (input.kind) {
      case "market":
        await prisma.market.deleteMany({ where: { id: input.id, workspaceId: w } });
        break;
      case "icp":
        await prisma.iCP.deleteMany({ where: { id: input.id, market: { workspaceId: w } } });
        break;
      case "variable":
        await prisma.variable.deleteMany({
          where: { id: input.id, icp: { market: { workspaceId: w } } },
        });
        break;
      case "pain":
        await prisma.pain.deleteMany({
          where: { id: input.id, variable: { icp: { market: { workspaceId: w } } } },
        });
        break;
      case "trigger":
        await prisma.trigger.deleteMany({
          where: { id: input.id, pain: { variable: { icp: { market: { workspaceId: w } } } } },
        });
        break;
      case "alternative":
        await prisma.alternative.deleteMany({
          where: { id: input.id, pain: { variable: { icp: { market: { workspaceId: w } } } } },
        });
        break;
      case "mechanism":
        await prisma.productMechanism.deleteMany({ where: { id: input.id, workspaceId: w } });
        break;
    }
    await recomputeWorkspaceOpportunities(w);
    revalidatePath(`/app/w/${w}`, "layout");
    return undefined;
  });
}
