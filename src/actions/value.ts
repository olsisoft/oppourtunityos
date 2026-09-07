"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import {
  createExperimentSchema,
  linkEvidenceClaimSchema,
  updateExperimentSchema,
  updateValueDimensionsSchema,
  updateVariableValueFieldsSchema,
  upsertCausalLinkSchema,
  upsertValueChainNodeSchema,
} from "@/domain/schemas";
import { logger } from "@/lib/logger";
import { requireUserId } from "@/lib/session";
import {
  recomputeOpportunitiesForEvidence,
  recomputeOpportunity,
  recomputeWorkspaceOpportunities,
} from "@/services/scoring/recompute";
import { CAUSAL_DISTANCE_BY_LEVEL } from "@/services/value/epistemic";
import {
  VARIABLE_FIELDS,
  withFieldProvenance,
  type VariableField,
} from "@/services/value/variable-semantics";
import { safeAction, zodFieldErrors, type ActionResult } from "./shared";

async function ownedOpportunity(userId: string, opportunityId: string) {
  const o = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!o) throw new Error("Opportunity not found");
  await assertWorkspaceAccess(userId, o.workspaceId);
  return o;
}

function revalidate(workspaceId: string) {
  revalidatePath(`/app/w/${workspaceId}`, "layout");
  revalidatePath("/app");
}

// ---- Value chain -------------------------------------------------------------

export async function upsertValueChainNodeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertValueChainNodeSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("value.node_upsert", async () => {
    const userId = await requireUserId();
    const o = await ownedOpportunity(userId, d.opportunityId);
    const node = await prisma.valueChainNode.upsert({
      where: { opportunityId_level: { opportunityId: o.id, level: d.level } },
      create: {
        opportunityId: o.id,
        level: d.level,
        statement: d.statement,
        notes: d.notes ?? null,
        causalDistance: CAUSAL_DISTANCE_BY_LEVEL[d.level],
        generatedBy: "USER",
        status: "UNPROVEN",
      },
      // A manual edit makes the statement the user's own; evidence status is recomputed.
      update: { statement: d.statement, notes: d.notes ?? null, generatedBy: "USER" },
    });
    await recomputeOpportunity(o.id);
    revalidate(o.workspaceId);
    return { id: node.id };
  });
}

export async function deleteValueChainNodeAction(nodeId: string): Promise<ActionResult> {
  return safeAction("value.node_delete", async () => {
    const userId = await requireUserId();
    const node = await prisma.valueChainNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error("Node not found");
    const o = await ownedOpportunity(userId, node.opportunityId);
    await prisma.valueChainNode.delete({ where: { id: nodeId } });
    await recomputeOpportunity(o.id);
    revalidate(o.workspaceId);
    return undefined;
  });
}

export async function upsertCausalLinkAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertCausalLinkSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("value.link_upsert", async () => {
    const userId = await requireUserId();
    const o = await ownedOpportunity(userId, d.opportunityId);
    const [from, to] = await Promise.all([
      prisma.valueChainNode.findUnique({
        where: { opportunityId_level: { opportunityId: o.id, level: d.fromLevel } },
      }),
      prisma.valueChainNode.findUnique({
        where: { opportunityId_level: { opportunityId: o.id, level: d.toLevel } },
      }),
    ]);
    if (!from || !to) throw new Error("Both ladder levels must exist before linking them.");
    if (from.id === to.id) throw new Error("A causal link needs two different levels.");
    const link = await prisma.causalLink.upsert({
      where: { fromNodeId_toNodeId: { fromNodeId: from.id, toNodeId: to.id } },
      create: {
        opportunityId: o.id,
        fromNodeId: from.id,
        toNodeId: to.id,
        statement: d.statement,
        criticality: d.criticality,
        notes: d.notes ?? null,
        generatedBy: "USER",
        status: "UNPROVEN",
      },
      update: {
        statement: d.statement,
        criticality: d.criticality,
        notes: d.notes ?? null,
        generatedBy: "USER",
      },
    });
    await recomputeOpportunity(o.id);
    revalidate(o.workspaceId);
    return { id: link.id };
  });
}

export async function deleteCausalLinkAction(linkId: string): Promise<ActionResult> {
  return safeAction("value.link_delete", async () => {
    const userId = await requireUserId();
    const link = await prisma.causalLink.findUnique({ where: { id: linkId } });
    if (!link) throw new Error("Link not found");
    const o = await ownedOpportunity(userId, link.opportunityId);
    await prisma.causalLink.delete({ where: { id: linkId } });
    await recomputeOpportunity(o.id);
    revalidate(o.workspaceId);
    return undefined;
  });
}

// ---- Evidence → claim links -----------------------------------------------------

export async function linkEvidenceClaimAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = linkEvidenceClaimSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("value.claim_link", async () => {
    const userId = await requireUserId();
    const evidence = await prisma.evidence.findUnique({ where: { id: d.evidenceId } });
    if (!evidence) throw new Error("Evidence not found");
    await assertWorkspaceAccess(userId, evidence.workspaceId);

    let opportunityId = d.opportunityId ?? null;
    if (d.valueChainNodeId) {
      const node = await prisma.valueChainNode.findUnique({
        where: { id: d.valueChainNodeId },
        include: { opportunity: true },
      });
      if (!node || node.opportunity.workspaceId !== evidence.workspaceId)
        throw new Error("Node not found in workspace");
      opportunityId = node.opportunityId;
    }
    if (d.causalLinkId) {
      const link = await prisma.causalLink.findUnique({
        where: { id: d.causalLinkId },
        include: { opportunity: true },
      });
      if (!link || link.opportunity.workspaceId !== evidence.workspaceId)
        throw new Error("Link not found in workspace");
      opportunityId = link.opportunityId;
    }
    if (opportunityId) {
      const opp = await prisma.opportunity.findFirst({
        where: { id: opportunityId, workspaceId: evidence.workspaceId },
      });
      if (!opp) throw new Error("Opportunity not found in workspace");
    }

    const existing = await prisma.evidenceClaimLink.findFirst({
      where: {
        evidenceId: d.evidenceId,
        claimType: d.claimType,
        claimId: d.claimId ?? null,
        valueChainNodeId: d.valueChainNodeId ?? null,
        causalLinkId: d.causalLinkId ?? null,
        opportunityId,
      },
    });
    const link = existing
      ? await prisma.evidenceClaimLink.update({
          where: { id: existing.id },
          data: { direction: d.direction, note: d.note ?? null },
        })
      : await prisma.evidenceClaimLink.create({
          data: {
            evidenceId: d.evidenceId,
            opportunityId,
            claimType: d.claimType,
            claimId: d.claimId ?? null,
            valueChainNodeId: d.valueChainNodeId ?? null,
            causalLinkId: d.causalLinkId ?? null,
            direction: d.direction,
            note: d.note ?? null,
          },
        });
    await recomputeOpportunitiesForEvidence(d.evidenceId);
    logger.info("evidence.claim_linked", {
      userId,
      evidenceId: d.evidenceId,
      claimType: d.claimType,
      direction: d.direction,
    });
    revalidate(evidence.workspaceId);
    return { id: link.id };
  });
}

export async function unlinkEvidenceClaimAction(claimLinkId: string): Promise<ActionResult> {
  return safeAction("value.claim_unlink", async () => {
    const userId = await requireUserId();
    const link = await prisma.evidenceClaimLink.findUnique({
      where: { id: claimLinkId },
      include: { evidence: true },
    });
    if (!link) throw new Error("Link not found");
    await assertWorkspaceAccess(userId, link.evidence.workspaceId);
    await prisma.evidenceClaimLink.delete({ where: { id: claimLinkId } });
    await recomputeOpportunitiesForEvidence(link.evidenceId);
    revalidate(link.evidence.workspaceId);
    return undefined;
  });
}

// ---- Value dimensions --------------------------------------------------------------

export async function updateValueDimensionsAction(input: unknown): Promise<ActionResult> {
  const parsed = updateValueDimensionsSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("value.dimensions_update", async () => {
    const userId = await requireUserId();
    const o = await ownedOpportunity(userId, d.opportunityId);
    const provenance = { ...((o.valueDimensionProvenance as Record<string, string> | null) ?? {}) };
    const map = {
      importance: "vsImportance",
      magnitude: "vsMagnitude",
      frequency: "vsFrequency",
      population: "vsPopulation",
      attributability: "vsAttributability",
    } as const;
    const data: Record<string, number | null> = {};
    for (const [dim, column] of Object.entries(map) as Array<
      [keyof typeof map, (typeof map)[keyof typeof map]]
    >) {
      if (d[dim] === undefined) continue;
      data[column] = d[dim] ?? null; // explicit null resets the dimension to UNKNOWN
      if (d[dim] === null) delete provenance[dim];
      else provenance[dim] = "USER";
    }
    await prisma.opportunity.update({
      where: { id: o.id },
      data: { ...data, valueDimensionProvenance: provenance },
    });
    await recomputeOpportunity(o.id);
    revalidate(o.workspaceId);
    return undefined;
  });
}

// ---- Valuable Variable fields ----------------------------------------------------------

export async function updateVariableValueFieldsAction(input: unknown): Promise<ActionResult> {
  const parsed = updateVariableValueFieldsSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const { variableId, ...fields } = parsed.data;
  return safeAction("variable.value_fields_update", async () => {
    const userId = await requireUserId();
    const variable = await prisma.variable.findUnique({
      where: { id: variableId },
      include: { icp: { include: { market: true } } },
    });
    if (!variable) throw new Error("Variable not found");
    const workspaceId = variable.icp.market.workspaceId;
    await assertWorkspaceAccess(userId, workspaceId);
    if (fields.parentVariableId) {
      const parent = await prisma.variable.findFirst({
        where: { id: fields.parentVariableId, icp: { market: { workspaceId } } },
      });
      if (!parent || parent.id === variable.id)
        throw new Error("Parent variable not found in workspace");
    }
    const changed = (Object.keys(fields) as Array<keyof typeof fields>).filter(
      (k) => fields[k] !== undefined,
    );
    const data: Record<string, unknown> = {};
    for (const k of changed) data[k] = fields[k] === "" ? null : (fields[k] ?? null);
    const provenanceFields = changed.filter((k): k is VariableField =>
      (VARIABLE_FIELDS as readonly string[]).includes(k),
    );
    await prisma.variable.update({
      where: { id: variableId },
      data: {
        ...data,
        provenance: "USER",
        fieldProvenance: withFieldProvenance(variable.fieldProvenance, provenanceFields, "USER"),
      },
    });
    await recomputeWorkspaceOpportunities(workspaceId);
    revalidate(workspaceId);
    return undefined;
  });
}

// ---- Experiments -------------------------------------------------------------------------

export async function createExperimentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createExperimentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("experiment.create", async () => {
    const userId = await requireUserId();
    const o = await ownedOpportunity(userId, d.opportunityId);
    const exp = await prisma.experiment.create({
      data: {
        opportunityId: o.id,
        causalLinkId: d.causalLinkId ?? null,
        assumptionId: d.assumptionId ?? null,
        title: d.title,
        hypothesis: d.hypothesis,
        design: d.design ?? null,
        successMetric: d.successMetric ?? null,
      },
    });
    revalidate(o.workspaceId);
    return { id: exp.id };
  });
}

export async function updateExperimentAction(input: unknown): Promise<ActionResult> {
  const parsed = updateExperimentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the fields.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("experiment.update", async () => {
    const userId = await requireUserId();
    const exp = await prisma.experiment.findUnique({ where: { id: d.experimentId } });
    if (!exp) throw new Error("Experiment not found");
    const o = await ownedOpportunity(userId, exp.opportunityId);
    await prisma.experiment.update({
      where: { id: exp.id },
      data: {
        status: d.status,
        result: d.result,
        design: d.design,
        successMetric: d.successMetric,
      },
    });
    revalidate(o.workspaceId);
    return undefined;
  });
}

export async function deleteExperimentAction(experimentId: string): Promise<ActionResult> {
  return safeAction("experiment.delete", async () => {
    const userId = await requireUserId();
    const exp = await prisma.experiment.findUnique({ where: { id: experimentId } });
    if (!exp) throw new Error("Experiment not found");
    const o = await ownedOpportunity(userId, exp.opportunityId);
    await prisma.experiment.delete({ where: { id: experimentId } });
    revalidate(o.workspaceId);
    return undefined;
  });
}
