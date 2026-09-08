"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import { createWorkspaceSchema, updateWorkspaceSchema } from "@/domain/schemas";
import { getT } from "@/i18n/server";
import { logger } from "@/lib/logger";
import { requireUserId } from "@/lib/session";
import { safeAction, type ActionResult } from "./shared";

export async function createWorkspaceAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) {
    const t = await getT();
    return { ok: false, error: t(parsed.error.issues[0]?.message ?? "common.invalidInput") };
  }
  const result = await safeAction("workspace.create", async () => {
    const userId = await requireUserId();
    const workspace = await prisma.workspace.create({
      data: { userId, name: parsed.data.name, description: parsed.data.description ?? null },
    });
    await prisma.conversation.create({ data: { workspaceId: workspace.id } });
    logger.info("workspace.created", { userId, workspaceId: workspace.id });
    return { id: workspace.id };
  });
  if (result.ok) {
    revalidatePath("/app");
    redirect(`/app/w/${result.data.id}`);
  }
  return result;
}

export async function updateWorkspaceAction(input: unknown): Promise<ActionResult> {
  const parsed = updateWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getT();
    return { ok: false, error: t("common.invalidInput") };
  }
  return safeAction("workspace.update", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, parsed.data.workspaceId);
    await prisma.workspace.update({
      where: { id: parsed.data.workspaceId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        entryMode: parsed.data.entryMode,
        ideaStatement: parsed.data.ideaStatement,
      },
    });
    revalidatePath("/app");
    revalidatePath(`/app/w/${parsed.data.workspaceId}`);
    return undefined;
  });
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  const result = await safeAction("workspace.delete", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, workspaceId);
    await prisma.workspace.delete({ where: { id: workspaceId } });
    logger.info("workspace.deleted", { userId, workspaceId });
    return undefined;
  });
  if (result.ok) {
    revalidatePath("/app");
    redirect("/app");
  }
  return result;
}

export async function resetConversationAction(workspaceId: string): Promise<ActionResult> {
  return safeAction("workspace.reset_conversation", async () => {
    const userId = await requireUserId();
    await assertWorkspaceAccess(userId, workspaceId);
    await prisma.conversation.deleteMany({ where: { workspaceId } });
    await prisma.conversation.create({ data: { workspaceId } });
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { entryMode: null, ideaStatement: null },
    });
    revalidatePath(`/app/w/${workspaceId}`);
    return undefined;
  });
}
