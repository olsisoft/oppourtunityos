"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { assertWorkspaceAccess } from "@/db/workspaces";
import {
  completeExperimentSchema,
  createExperimentSchema,
  linkEvidenceClaimSchema,
  scopeFromFields,
  updateExperimentSchema,
  updateValueDimensionsSchema,
  updateVariableValueFieldsSchema,
  upsertCausalLinkSchema,
  upsertValueChainNodeSchema,
  validityInputsFromFields,
} from "@/domain/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { msg, type LocalizedText, type SystemMessage } from "@/i18n/messages";
import { getT } from "@/i18n/server";
import { claimTypeForLevel, claimTypeForLink } from "@/services/value/claim-taxonomy";
import { sourceTypeForExperiment } from "@/services/value/evidence-sources";
import {
  assessInternalValidity,
  defaultDesignLevel,
  parseValidityInputs,
  type InternalValidityAssessment,
} from "@/services/value/experimental-validity";
import { experimentInterpretation } from "@/services/value/language-gate";
import { describeScope, parseScope, scopeMessage, type Scope } from "@/services/value/scope";
import { logger } from "@/lib/logger";
import { requireUserId } from "@/lib/session";
import {
  recomputeOpportunitiesForEvidence,
  recomputeOpportunity,
  recomputeWorkspaceOpportunities,
} from "@/services/scoring/recompute";
import { CAUSAL_DISTANCE_BY_LEVEL } from "@/services/value/epistemic";
import {
  classifyOutcome,
  outcomeToDirection,
  outcomeToSentiment,
} from "@/services/value/experiment-outcome";
import type { KnowledgeDiff, KnowledgeSnapshot } from "@/services/value/knowledge-change";
import type { ValueAction } from "@/services/value/next-value-action";
import { cleanText } from "@/lib/sanitize";
import {
  VARIABLE_FIELDS,
  withFieldProvenance,
  type VariableField,
} from "@/services/value/variable-semantics";
import { safeAction, zodFieldErrors, type ActionResult } from "./shared";

async function ownedOpportunity(userId: string, opportunityId: string) {
  const o = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!o) throw new Error((await getT())("validity.action.opportunityNotFound"));
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
      error: (await getT())("validity.action.checkFields"),
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
    const t = await getT();
    const node = await prisma.valueChainNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error(t("validity.action.nodeNotFound"));
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
      error: (await getT())("validity.action.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("value.link_upsert", async () => {
    const userId = await requireUserId();
    const t = await getT();
    const o = await ownedOpportunity(userId, d.opportunityId);
    const [from, to] = await Promise.all([
      prisma.valueChainNode.findUnique({
        where: { opportunityId_level: { opportunityId: o.id, level: d.fromLevel } },
      }),
      prisma.valueChainNode.findUnique({
        where: { opportunityId_level: { opportunityId: o.id, level: d.toLevel } },
      }),
    ]);
    if (!from || !to) throw new Error(t("validity.action.ladderLevelsMustExist"));
    if (from.id === to.id) throw new Error(t("validity.action.linkNeedsTwoLevels"));
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
    const t = await getT();
    const link = await prisma.causalLink.findUnique({ where: { id: linkId } });
    if (!link) throw new Error(t("validity.action.linkNotFound"));
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
      error: (await getT())("validity.action.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("value.claim_link", async () => {
    const userId = await requireUserId();
    const t = await getT();
    const evidence = await prisma.evidence.findUnique({ where: { id: d.evidenceId } });
    if (!evidence) throw new Error(t("validity.action.evidenceNotFound"));
    await assertWorkspaceAccess(userId, evidence.workspaceId);

    let opportunityId = d.opportunityId ?? null;
    if (d.valueChainNodeId) {
      const node = await prisma.valueChainNode.findUnique({
        where: { id: d.valueChainNodeId },
        include: { opportunity: true },
      });
      if (!node || node.opportunity.workspaceId !== evidence.workspaceId)
        throw new Error(t("validity.action.nodeNotInWorkspace"));
      opportunityId = node.opportunityId;
    }
    if (d.causalLinkId) {
      const link = await prisma.causalLink.findUnique({
        where: { id: d.causalLinkId },
        include: { opportunity: true },
      });
      if (!link || link.opportunity.workspaceId !== evidence.workspaceId)
        throw new Error(t("validity.action.linkNotInWorkspace"));
      opportunityId = link.opportunityId;
    }
    if (opportunityId) {
      const opp = await prisma.opportunity.findFirst({
        where: { id: opportunityId, workspaceId: evidence.workspaceId },
      });
      if (!opp) throw new Error(t("validity.action.opportunityNotInWorkspace"));
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
    const t = await getT();
    const link = await prisma.evidenceClaimLink.findUnique({
      where: { id: claimLinkId },
      include: { evidence: true },
    });
    if (!link) throw new Error(t("validity.action.linkNotFound"));
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
      error: (await getT())("validity.action.checkFields"),
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
      error: (await getT())("validity.action.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const { variableId, ...fields } = parsed.data;
  return safeAction("variable.value_fields_update", async () => {
    const userId = await requireUserId();
    const t = await getT();
    const variable = await prisma.variable.findUnique({
      where: { id: variableId },
      include: { icp: { include: { market: true } } },
    });
    if (!variable) throw new Error(t("validity.action.variableNotFound"));
    const workspaceId = variable.icp.market.workspaceId;
    await assertWorkspaceAccess(userId, workspaceId);
    if (fields.parentVariableId) {
      const parent = await prisma.variable.findFirst({
        where: { id: fields.parentVariableId, icp: { market: { workspaceId } } },
      });
      if (!parent || parent.id === variable.id)
        throw new Error(t("validity.action.parentVariableNotInWorkspace"));
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
//
// ASSUMPTION → EXPERIMENT → RESULT → EVIDENCE → CLAIM UPDATE → CAUSAL UPDATE →
// PROOF FRONTIER MOVEMENT → SCORE / VERDICT UPDATE → NEXT BEST ACTION.
// The outcome is decided by thresholds when they exist, never by the model.
// The result becomes an Evidence item (type EXPERIMENT) that preserves the
// methodology and limitations; the deterministic engine decides what it proves.

type ExperimentFields = Omit<
  ReturnType<typeof createExperimentSchema.parse>,
  "opportunityId" | "title" | "hypothesis"
>;

async function verifyExperimentTargets(opportunityId: string, d: ExperimentFields) {
  const t = await getT();
  if (d.causalLinkId) {
    const link = await prisma.causalLink.findFirst({
      where: { id: d.causalLinkId, opportunityId },
      select: { id: true },
    });
    if (!link) throw new Error(t("validity.action.causalLinkNotOnOpportunity"));
  }
  if (d.assumptionId) {
    const a = await prisma.assumption.findFirst({
      where: { id: d.assumptionId, opportunityId },
      select: { id: true },
    });
    if (!a) throw new Error(t("validity.action.assumptionNotOnOpportunity"));
  }
  if (d.valueChainNodeId) {
    const n = await prisma.valueChainNode.findFirst({
      where: { id: d.valueChainNodeId, opportunityId },
      select: { id: true },
    });
    if (!n) throw new Error(t("validity.action.ladderLevelNotOnOpportunity"));
  }
}

function experimentData(d: ExperimentFields) {
  const text = (v: string | undefined) => (v === undefined ? undefined : (v ?? null));
  const num = (v: number | null | undefined) => (v === undefined ? undefined : v);
  return {
    causalLinkId: d.causalLinkId === undefined ? undefined : (d.causalLinkId ?? null),
    assumptionId: d.assumptionId === undefined ? undefined : (d.assumptionId ?? null),
    valueChainNodeId: d.valueChainNodeId === undefined ? undefined : (d.valueChainNodeId ?? null),
    experimentType: d.experimentType,
    decisionQuestion: text(d.decisionQuestion),
    design: text(d.design),
    successMetric: text(d.successMetric),
    successThreshold: num(d.successThreshold),
    failureThreshold: num(d.failureThreshold),
    unit: text(d.unit),
    population: text(d.population),
    sampleSize: num(d.sampleSize),
    duration: text(d.duration),
    expectedInformationGain: num(d.expectedInformationGain),
    decisionImpact: num(d.decisionImpact),
    effort: num(d.effort),
    costEstimate: text(d.costEstimate),
    timeEstimate: text(d.timeEstimate),
    owner: text(d.owner),
    notes: text(d.notes),
    designLevel: d.designLevel === undefined ? undefined : (d.designLevel ?? null),
    validityPlan: hasAny(validityInputsFromFields(d))
      ? (JSON.parse(JSON.stringify(validityInputsFromFields(d))) as Prisma.InputJsonValue)
      : undefined,
    scope: (() => {
      const scope = scopeFromFields(d, {
        sampleSize: d.sampleSize ?? null,
        organizationCount: d.organizationCount ?? null,
        userCount: d.userCount ?? null,
      });
      return scope ? (JSON.parse(JSON.stringify(scope)) as Prisma.InputJsonValue) : undefined;
    })(),
  };
}

function hasAny(o: object): boolean {
  return Object.keys(o).length > 0;
}

export async function createExperimentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createExperimentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: (await getT())("validity.action.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("experiment.create", async () => {
    const userId = await requireUserId();
    const o = await ownedOpportunity(userId, d.opportunityId);
    await verifyExperimentTargets(o.id, d);
    const exp = await prisma.experiment.create({
      data: {
        opportunityId: o.id,
        title: d.title,
        hypothesis: d.hypothesis,
        ...experimentData(d),
      },
    });
    // A planned experiment changes the next-best-action ranking (effort / time / cost).
    await recomputeOpportunity(o.id);
    logger.info("experiment.created", { userId, opportunityId: o.id, experimentId: exp.id });
    revalidate(o.workspaceId);
    return { id: exp.id };
  });
}

export async function updateExperimentAction(input: unknown): Promise<ActionResult> {
  const parsed = updateExperimentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: (await getT())("validity.action.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("experiment.update", async () => {
    const userId = await requireUserId();
    const t = await getT();
    const exp = await prisma.experiment.findUnique({
      where: { id: d.experimentId },
      include: { opportunity: { select: { id: true, workspaceId: true } } },
    });
    if (!exp) throw new Error(t("validity.action.experimentNotFound"));
    await assertWorkspaceAccess(userId, exp.opportunity.workspaceId);
    await verifyExperimentTargets(exp.opportunityId, d);
    const startedAt =
      d.status === "RUNNING" && !exp.startedAt ? new Date() : (exp.startedAt ?? undefined);
    await prisma.experiment.update({
      where: { id: exp.id },
      data: {
        title: d.title,
        hypothesis: d.hypothesis,
        status: d.status,
        result: d.result === undefined ? undefined : (d.result ?? null),
        startedAt: startedAt ?? undefined,
        ...experimentData(d),
      },
    });
    await recomputeOpportunity(exp.opportunityId);
    revalidate(exp.opportunity.workspaceId);
    return undefined;
  });
}

export interface ExperimentValiditySummary {
  /** Checks, threats, unknowns, downgrades and explanation are SystemMessages. */
  assessment: InternalValidityAssessment;
  /** System-generated, language-gated interpretation (also persisted as `interpretationMessage`). */
  interpretation: SystemMessage;
  gatedLevel: InternalValidityAssessment["designEffective"];
  caveats: SystemMessage[];
  /** English phrases the wording must not use at the gated level (not translated). */
  forbidden: string[];
  /** English rendering of the scope (`describeScope(scope)`); the UI re-renders from `scope`. */
  scopeText: string;
  /** The scope object, so the UI can describe it in the reader's language. */
  scope: Scope | null;
  observed: string | null;
}

export interface ExperimentCompletion {
  experimentId: string;
  resultId: string;
  evidenceId: string | null;
  outcome: "SUPPORTED" | "CONTRADICTED" | "INCONCLUSIVE" | "INVALID";
  outcomeSource: "THRESHOLD" | "USER";
  /** How the outcome was decided; a SystemMessage here, a string when the threshold engine decided. */
  outcomeExplanation: LocalizedText;
  validity: ExperimentValiditySummary;
  knowledgeChangeId: string | null;
  diff: KnowledgeDiff | null;
  before: KnowledgeSnapshot | null;
  after: KnowledgeSnapshot | null;
  nextAction: ValueAction | null;
}

/**
 * Record an experiment result and close the learning loop:
 * result → evidence (type EXPERIMENT) → claim links → recompute → KnowledgeChange.
 */
export async function completeExperimentAction(
  input: unknown,
): Promise<ActionResult<ExperimentCompletion>> {
  const parsed = completeExperimentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: (await getT())("validity.action.checkFields"),
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  const d = parsed.data;
  return safeAction("experiment.complete", async () => {
    const userId = await requireUserId();
    const t = await getT();
    const exp = await prisma.experiment.findUnique({
      where: { id: d.experimentId },
      include: {
        opportunity: {
          select: {
            id: true,
            workspaceId: true,
            painId: true,
            mechanism: true,
            claimScope: true,
            icp: { select: { name: true } },
          },
        },
        resultRecord: true,
        causalLink: {
          select: {
            id: true,
            statement: true,
            fromNode: { select: { level: true } },
            toNode: { select: { level: true } },
          },
        },
        valueChainNode: { select: { id: true, level: true, statement: true } },
      },
    });
    if (!exp) throw new Error(t("validity.action.experimentNotFound"));
    if (exp.resultRecord) throw new Error(t("validity.action.experimentHasResult"));
    await assertWorkspaceAccess(userId, exp.opportunity.workspaceId);
    const workspaceId = exp.opportunity.workspaceId;

    // 1. Outcome: thresholds decide when configured; otherwise the user's explicit
    //    classification; otherwise INCONCLUSIVE. Never the model.
    const decided = classifyOutcome({
      observedValue: d.observedValue ?? null,
      successThreshold: exp.successThreshold,
      failureThreshold: exp.failureThreshold,
    });
    const outcome =
      d.outcome === "INVALID"
        ? "INVALID"
        : decided
          ? decided.outcome
          : (d.outcome ?? "INCONCLUSIVE");
    const outcomeSource = d.outcome === "INVALID" ? "USER" : decided ? "THRESHOLD" : "USER";
    const outcomeExplanation: LocalizedText =
      d.outcome === "INVALID"
        ? msg("validity.complete.outcome.invalid")
        : decided
          ? decided.explanation
          : d.outcome
            ? msg("validity.complete.outcome.userClassified")
            : msg("validity.complete.outcome.inconclusive");

    // 2. Raw evidence referenced must belong to the workspace.
    const rawEvidence = d.rawEvidenceIds.length
      ? await prisma.evidence.findMany({
          where: { id: { in: d.rawEvidenceIds }, workspaceId },
          select: { id: true },
        })
      : [];

    // 2b. Experimental validity: the recorded facts of the run decide the
    //     effective design level and the internal validity; the user cannot
    //     rewrite the inference strength. Planned facts are the defaults.
    const declaredDesign =
      d.designLevel ?? exp.designLevel ?? defaultDesignLevel(exp.experimentType);
    const validityInputs = {
      ...parseValidityInputs(exp.validityPlan),
      ...validityInputsFromFields(d),
    };
    if (validityInputs.sampleSize == null && (d.sampleSize ?? exp.sampleSize) != null)
      validityInputs.sampleSize = d.sampleSize ?? exp.sampleSize ?? undefined;
    const validity = assessInternalValidity(declaredDesign, validityInputs);
    const scope =
      scopeFromFields(d, {
        sampleSize: d.sampleSize ?? exp.sampleSize ?? null,
        organizationCount: d.organizationCount ?? validityInputs.organizationCount ?? null,
        userCount: d.userCount ?? validityInputs.userCount ?? null,
      }) ??
      parseScope(exp.scope) ??
      parseScope({
        population: exp.population,
        sampleSize: d.sampleSize ?? exp.sampleSize ?? undefined,
        organizationCount: validityInputs.organizationCount ?? undefined,
      });
    const scopeText = describeScope(scope);
    const observedText =
      d.observedValue !== null && d.observedValue !== undefined
        ? `${d.observedMetric ?? exp.successMetric ?? "Observed"}: ${d.observedValue}${(d.unit ?? exp.unit) ? ` ${d.unit ?? exp.unit}` : ""}`
        : (d.observedMetric ?? null);
    const targetIsCausal = Boolean(exp.causalLinkId);
    const interpretation = experimentInterpretation({
      targetIsCausal,
      designLevel: validity.designEffective,
      internalValidity: validity.internalValidity,
      mechanism: exp.opportunity.mechanism ?? exp.valueChainNode?.statement ?? "the intervention",
      outcome: observedText ?? exp.hypothesis,
      scope: scopeMessage(scope),
      direction: outcomeToDirection(outcome) ?? "NEUTRAL",
      outcomeLabel: outcome,
    });
    const validitySummary: ExperimentValiditySummary = {
      assessment: validity,
      interpretation: interpretation.sentence,
      gatedLevel: interpretation.gatedLevel,
      caveats: interpretation.caveats,
      forbidden: interpretation.forbidden,
      scopeText,
      scope,
      observed: observedText,
    };

    const result = await prisma.experimentResult.create({
      data: {
        experimentId: exp.id,
        outcome,
        outcomeSource,
        observedMetric: d.observedMetric ?? exp.successMetric ?? null,
        observedValue: d.observedValue ?? null,
        unit: d.unit ?? exp.unit ?? null,
        sampleSize: d.sampleSize ?? exp.sampleSize ?? null,
        measurementPeriod: d.measurementPeriod ?? null,
        resultSummary: cleanText(d.resultSummary, 4000),
        limitations: d.limitations ?? null,
        confounders: d.confounders ?? null,
        anomalies: d.anomalies ?? null,
        rawEvidenceIds: rawEvidence.map((e) => e.id),
        enteredBy: d.enteredBy ?? null,
        designLevel: validity.designEffective,
        internalValidity: validity.internalValidity,
        validityInputs: JSON.parse(JSON.stringify(validityInputs)),
        validityAssessment: JSON.parse(
          JSON.stringify({
            designDeclared: validity.designDeclared,
            designEffective: validity.designEffective,
            internalValidity: validity.internalValidity,
            checks: validity.checks,
            threats: validity.threats,
            unknowns: validity.unknowns,
            downgrades: validity.downgrades,
            explanation: validity.explanation,
            gatedLevel: interpretation.gatedLevel,
            caveats: interpretation.caveats,
          }),
        ),
        interpretation: interpretation.sentence.text,
        interpretationMessage: JSON.parse(JSON.stringify(interpretation.sentence)),
        scope: scope ? JSON.parse(JSON.stringify(scope)) : undefined,
        organizationCount: d.organizationCount ?? validityInputs.organizationCount ?? null,
        userCount: d.userCount ?? validityInputs.userCount ?? null,
      },
    });

    // 3. The result becomes Evidence — except an INVALID run, which never does.
    let evidenceId: string | null = null;
    const direction = outcomeToDirection(outcome);
    if (direction) {
      const methodology = [
        `Design level: ${validity.designEffective}${validity.designEffective !== validity.designDeclared ? ` (declared ${validity.designDeclared})` : ""} · internal validity: ${validity.internalValidity}`,
        exp.design ? `Design: ${exp.design}` : null,
        exp.population ? `Population: ${exp.population}` : null,
        d.measurementPeriod ? `Period: ${d.measurementPeriod}` : null,
        exp.successThreshold !== null || exp.failureThreshold !== null
          ? `Thresholds: success ${exp.successThreshold ?? "—"}, failure ${exp.failureThreshold ?? "—"}${exp.unit ? ` ${exp.unit}` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const observed = observedText;
      const excerpt = [
        `EXPERIMENT RESULT (${outcome}, ${outcomeSource === "THRESHOLD" ? "decided by thresholds" : "classified by the user"}).`,
        observed,
        interpretation.sentence.text,
        d.resultSummary,
        d.limitations ? `Limitations: ${d.limitations}` : null,
        d.confounders ? `Confounders: ${d.confounders}` : null,
        d.anomalies ? `Anomalies: ${d.anomalies}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const evidence = await prisma.evidence.create({
        data: {
          workspaceId,
          opportunityId: exp.opportunityId,
          painId: null,
          type: "EXPERIMENT",
          origin: "EXPERIMENT_RESULT",
          sourceTitle: cleanText(`Experiment: ${exp.title}`, 200),
          sourceExcerpt: cleanText(excerpt, 4000),
          sourceDate: new Date(),
          sourceAuthor: d.enteredBy ?? null,
          relevanceScore: d.relevanceScore,
          strengthScore: d.strengthScore,
          sentiment: outcomeToSentiment(outcome),
          isDirectCustomer: d.isDirectCustomer,
          hasExplicitPain: false,
          hasEconomicImpact: d.hasEconomicImpact,
          hasWorkaround: false,
          hasPurchaseIntent: d.hasPurchaseIntent,
          experimentId: exp.id,
          experimentResultId: result.id,
          methodology: methodology || null,
          sampleSize: d.sampleSize ?? exp.sampleSize ?? null,
          observedMetric: observed,
          limitations: d.limitations ?? null,
          // Evidence Fitness inputs: the source type follows the experiment
          // type and the EFFECTIVE design level; the run is one origin.
          sourceType: sourceTypeForExperiment(exp.experimentType, validity.designEffective),
          sourceOriginId: `experiment:${exp.id}`,
          organizationCount: d.organizationCount ?? validityInputs.organizationCount ?? null,
          userCount: d.userCount ?? validityInputs.userCount ?? null,
          scope: scope ? JSON.parse(JSON.stringify(scope)) : undefined,
        },
      });
      evidenceId = evidence.id;

      // 4. Link the evidence to the claims the experiment tested (+ extra claims).
      //    Ladder targets take the claim type of their level / link.
      const claimRows: Array<{
        claimType: (typeof d.claims)[number]["claimType"];
        valueChainNodeId?: string | null;
        causalLinkId?: string | null;
        direction: typeof direction;
      }> = [];
      if (exp.causalLinkId && exp.causalLink)
        claimRows.push({
          claimType: claimTypeForLink(exp.causalLink.fromNode.level, exp.causalLink.toNode.level),
          causalLinkId: exp.causalLinkId,
          direction,
        });
      if (exp.valueChainNodeId && exp.valueChainNode)
        claimRows.push({
          claimType: claimTypeForLevel(exp.valueChainNode.level),
          valueChainNodeId: exp.valueChainNodeId,
          direction,
        });
      for (const c of d.claims) {
        claimRows.push({
          claimType: c.claimType,
          valueChainNodeId: c.valueChainNodeId ?? null,
          causalLinkId: c.causalLinkId ?? null,
          direction: c.direction,
        });
      }
      for (const row of claimRows) {
        if (row.valueChainNodeId) {
          const n = await prisma.valueChainNode.findFirst({
            where: { id: row.valueChainNodeId, opportunityId: exp.opportunityId },
            select: { id: true },
          });
          if (!n) continue;
        }
        if (row.causalLinkId) {
          const l = await prisma.causalLink.findFirst({
            where: { id: row.causalLinkId, opportunityId: exp.opportunityId },
            select: { id: true },
          });
          if (!l) continue;
        }
        await prisma.evidenceClaimLink.create({
          data: {
            evidenceId: evidence.id,
            opportunityId: exp.opportunityId,
            claimType: row.claimType,
            valueChainNodeId: row.valueChainNodeId ?? null,
            causalLinkId: row.causalLinkId ?? null,
            direction: row.direction,
            note: `From experiment "${exp.title}"`,
          },
        });
      }
      if (exp.assumptionId) {
        await prisma.assumptionEvidence.upsert({
          where: {
            assumptionId_evidenceId: { assumptionId: exp.assumptionId, evidenceId: evidence.id },
          },
          create: { assumptionId: exp.assumptionId, evidenceId: evidence.id, direction },
          update: { direction },
        });
        await refreshAssumptionFromLinks(exp.assumptionId);
      }
    }

    await prisma.experiment.update({
      where: { id: exp.id },
      data: {
        status: outcome === "INVALID" ? "INVALID" : "COMPLETED",
        completedAt: new Date(),
        result: cleanText(d.resultSummary, 4000),
      },
    });

    // 5–7. Recompute claims, links, scores, frontier and verdict; record what changed.
    const recomputed = await recomputeOpportunity(exp.opportunityId, {
      trigger: "EXPERIMENT_RESULT",
      experimentId: exp.id,
      evidenceId,
    });
    logger.info("experiment.completed", {
      userId,
      opportunityId: exp.opportunityId,
      experimentId: exp.id,
      outcome,
      outcomeSource,
      evidenceId,
      frontier: recomputed?.proofFrontierRung ?? null,
    });
    revalidate(workspaceId);
    revalidatePath("/app");
    return {
      experimentId: exp.id,
      resultId: result.id,
      evidenceId,
      outcome,
      outcomeSource,
      outcomeExplanation,
      validity: validitySummary,
      knowledgeChangeId: recomputed?.knowledgeChangeId ?? null,
      diff: recomputed?.knowledgeDiff ?? null,
      before: recomputed?.knowledgeBefore ?? null,
      after: recomputed?.knowledgeAfter ?? null,
      nextAction: recomputed?.nextAction ?? null,
    };
  });
}

/** Re-derive an assumption's status from its evidence links (mirrors actions/assumptions). */
async function refreshAssumptionFromLinks(assumptionId: string) {
  const { deriveAssumptionStatus } = await import("@/services/scoring/assumption-status");
  const { signalWeight } = await import("@/services/scoring/evidence-score");
  const { toEvidenceSignal } = await import("@/services/scoring/recompute");
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
  await prisma.assumption.update({
    where: { id: assumptionId },
    data: { status: derived.status, confidence: derived.confidence },
  });
}

export async function deleteExperimentAction(experimentId: string): Promise<ActionResult> {
  return safeAction("experiment.delete", async () => {
    const userId = await requireUserId();
    const t = await getT();
    const exp = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: { opportunity: { select: { id: true, workspaceId: true } } },
    });
    if (!exp) throw new Error(t("validity.action.experimentNotFound"));
    await assertWorkspaceAccess(userId, exp.opportunity.workspaceId);
    // Evidence produced by the experiment is kept (it is external material now);
    // its experiment reference is nulled by the schema.
    await prisma.experiment.delete({ where: { id: experimentId } });
    await recomputeOpportunity(exp.opportunityId);
    revalidate(exp.opportunity.workspaceId);
    return undefined;
  });
}
