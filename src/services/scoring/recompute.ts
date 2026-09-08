/**
 * Loads an opportunity with its evidence, value chain and assumptions, runs
 * the pure scoring functions and persists the computed values. This is the
 * only place where scores, statuses, the Proof Frontier and verdicts are
 * written to the database.
 *
 * Four independent scores:
 *   Opportunity Potential  ← six structural 0–10 inputs
 *   Evidence Confidence    ← evidence about the problem (pain / economic pain)
 *   Value Strength         ← five value dimensions (null = INCOMPLETE)
 *   Causal Confidence      ← evidence on the mechanism → value causal links
 *
 * Every recompute that changes something records a KnowledgeChange: the
 * audit trail of how the workspace came to believe what it believes.
 */
import { prisma } from "@/db/prisma";
import { logger } from "@/lib/logger";
import { VALUE_CHAIN_LEVEL_LABELS } from "@/domain/enums";
import type {
  ClaimType,
  Evidence,
  EvidenceLinkDirection,
  KnowledgeTrigger,
  Prisma,
} from "@/generated/prisma/client";
import type { EpistemicStatus, ValueChainLevel } from "@/generated/prisma/enums";
import { computeOpportunityScore } from "./opportunity-score";
import { computeEvidenceScore, type EvidenceSignal } from "./evidence-score";
import { computeVerdict } from "./verdict";
import { evaluateKillCriteria } from "./kill-criteria";
import {
  assessClaim,
  CAUSAL_DISTANCE_BY_LEVEL,
  directionToSentiment,
  sentimentToDirection,
  type ClaimAssessment,
  type ClaimAssumptionInput,
  type ClaimEvidenceInput,
} from "@/services/value/epistemic";
import {
  computeCausalConfidence,
  type CausalConfidenceResult,
} from "@/services/value/causal-confidence";
import {
  diffKnowledge,
  type KnowledgeClaim,
  type KnowledgeDiff,
  type KnowledgeSnapshot,
} from "@/services/value/knowledge-change";
import {
  computeProofFrontier,
  PROOF_RUNG_LABELS,
  rungForLevel,
  type FrontierLinkInput,
  type FrontierPosition,
  type FrontierRungInput,
  type ProofFrontierResult,
  type ProofRung,
} from "@/services/value/proof-frontier";
import { computeValueStrength, type ValueStrengthResult } from "@/services/value/value-strength";
import { extendVerdict } from "@/services/value/verdict-extension";
import { computeValueActions } from "@/services/value/next-value-action";

/** A field is "known" when it has content and is not an explicit UNKNOWN marker. */
export function isKnown(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.length > 0 && !/^unknown\b/i.test(v);
}

export function toEvidenceSignal(e: Evidence): EvidenceSignal {
  return {
    type: e.type,
    strengthScore: e.strengthScore,
    relevanceScore: e.relevanceScore,
    sentiment: e.sentiment,
    sourceDate: e.sourceDate,
    isDirectCustomer: e.isDirectCustomer,
    hasExplicitPain: e.hasExplicitPain,
    hasEconomicImpact: e.hasEconomicImpact,
    hasWorkaround: e.hasWorkaround,
    hasPurchaseIntent: e.hasPurchaseIntent,
  };
}

/** Evidence linked directly to the opportunity plus evidence on its pain. */
export async function loadOpportunityEvidence(opportunityId: string, painId: string | null) {
  const rows = await prisma.evidence.findMany({
    where: {
      OR: [{ opportunityId }, ...(painId ? [{ painId }] : [])],
    },
    orderBy: { capturedAt: "desc" },
  });
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/** Claim types that speak to the problem (feed Evidence Confidence). */
const PROBLEM_CLAIM_TYPES: ReadonlySet<ClaimType> = new Set<ClaimType>([
  "ICP",
  "VARIABLE",
  "CURRENT_STATE",
  "PAIN",
  "MAGNITUDE",
  "FREQUENCY",
  "ECONOMIC_IMPACT",
  "ALTERNATIVE",
  "TRIGGER",
]);

const PROBLEM_RUNGS: ProofRung[] = ["VARIABLE_IMPORTANCE", "PAIN", "ECONOMIC_PAIN"];

function toClaimInput(e: Evidence, direction: EvidenceLinkDirection): ClaimEvidenceInput {
  return { signal: toEvidenceSignal(e), direction };
}

function toAssumptionInput(a: {
  statement: string;
  status: "UNKNOWN" | "SUPPORTED" | "CONTRADICTED";
  importance: number;
  kind: ClaimAssumptionInput["kind"];
}): ClaimAssumptionInput {
  return { statement: a.statement, status: a.status, importance: a.importance, kind: a.kind };
}

function serialize(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function linkKey(from: ValueChainLevel, to: ValueChainLevel): string {
  return `link:${from}->${to}`;
}

function linkLabel(from: ValueChainLevel, to: ValueChainLevel): string {
  return `${VALUE_CHAIN_LEVEL_LABELS[from]} → ${VALUE_CHAIN_LEVEL_LABELS[to]}`;
}

export interface RecomputeContext {
  trigger?: KnowledgeTrigger;
  experimentId?: string | null;
  evidenceId?: string | null;
}

export async function recomputeOpportunity(opportunityId: string, ctx: RecomputeContext = {}) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      icp: true,
      variable: true,
      pain: { include: { triggers: true, alternatives: true } },
      assumptions: { include: { links: true } },
      valueChainNodes: {
        include: {
          evidenceLinks: { include: { evidence: true } },
          assumptions: { include: { links: true } },
        },
      },
      causalLinks: {
        include: {
          fromNode: true,
          toNode: true,
          evidenceLinks: { include: { evidence: true } },
          assumptions: { include: { links: true } },
        },
      },
      claimLinks: { include: { evidence: true } },
      experiments: {
        select: {
          id: true,
          status: true,
          assumptionId: true,
          causalLinkId: true,
          valueChainNodeId: true,
          decisionImpact: true,
          expectedInformationGain: true,
          effort: true,
          timeEstimate: true,
          costEstimate: true,
        },
      },
      valuePaths: true,
    },
  });
  if (!opportunity) return null;

  // ---- Snapshot of what was believed before this recompute --------------------
  const storedFrontier = opportunity.proofFrontier as unknown as ProofFrontierResult | null;
  const storedValue = opportunity.valueStrengthBreakdown as unknown as ValueStrengthResult | null;
  const storedCausal = opportunity.causalBreakdown as unknown as CausalConfidenceResult | null;
  const neverComputed = opportunity.scoreBreakdown === null;
  const before: KnowledgeSnapshot = {
    frontier: (opportunity.proofFrontierRung as FrontierPosition | null) ?? "NONE",
    evidenceConfidence: opportunity.evidenceScore,
    valueStrength: opportunity.valueStrength,
    valueCompleteness:
      storedValue?.completeness ?? (opportunity.valueStrength === null ? "?/5" : "5/5"),
    causalConfidence: opportunity.causalConfidence,
    causalCompleteness:
      storedCausal?.completeness ?? (opportunity.causalConfidence === null ? "?/5" : "4/4"),
    verdict: opportunity.verdict,
    claims: [
      ...(storedFrontier?.rungs ?? [])
        .filter((r) => PROBLEM_RUNGS.includes(r.rung) && r.present)
        .map<KnowledgeClaim>((r) => ({
          key: `rung:${r.rung}`,
          label: PROOF_RUNG_LABELS[r.rung],
          status: r.status,
          confidence: r.confidence,
        })),
      ...opportunity.valueChainNodes.map<KnowledgeClaim>((n) => ({
        key: `node:${n.level}`,
        label: VALUE_CHAIN_LEVEL_LABELS[n.level],
        status: n.status,
        confidence: n.confidence,
      })),
      ...opportunity.causalLinks.map<KnowledgeClaim>((l) => ({
        key: linkKey(l.fromNode.level, l.toNode.level),
        label: linkLabel(l.fromNode.level, l.toNode.level),
        status: l.status,
        confidence: l.confidence,
      })),
    ],
  };

  // ---- Evidence Confidence (problem evidence) --------------------------------
  const problemEvidence = await loadOpportunityEvidence(opportunity.id, opportunity.painId);
  const problemIds = new Set(problemEvidence.map((e) => e.id));
  const claimProblemLinks = opportunity.claimLinks.filter(
    (l) => PROBLEM_CLAIM_TYPES.has(l.claimType) && !problemIds.has(l.evidenceId),
  );
  const problemSignals: EvidenceSignal[] = [
    ...problemEvidence.map(toEvidenceSignal),
    ...claimProblemLinks.map((l) => ({
      ...toEvidenceSignal(l.evidence),
      sentiment: directionToSentiment(l.direction),
    })),
  ];

  const inputs = {
    importance: opportunity.importance,
    painIntensity: opportunity.painIntensity,
    frequency: opportunity.frequency,
    gap: opportunity.gap,
    willingnessToPay: opportunity.willingnessToPay,
    alternativeWeakness: opportunity.alternativeWeakness,
  };
  const opp = computeOpportunityScore(inputs);
  const ev = computeEvidenceScore(problemSignals);

  // ---- Problem-side claims for the Proof Frontier ----------------------------
  const claimLinksOf = (types: ClaimType[]) =>
    opportunity.claimLinks
      .filter((l) => types.includes(l.claimType))
      .map((l) => toClaimInput(l.evidence, l.direction));
  const painInputs = (filter: (e: Evidence) => boolean) =>
    problemEvidence.filter(filter).map((e) => toClaimInput(e, sentimentToDirection(e.sentiment)));

  const variableImportance = assessClaim({
    hasStatement: Boolean(opportunity.variable),
    generatedBy: opportunity.variable?.provenance ?? "AI_HYPOTHESIS",
    evidence: [
      ...painInputs((e) => e.hasExplicitPain || e.isDirectCustomer),
      ...claimLinksOf(["VARIABLE", "CURRENT_STATE", "ICP"]),
    ],
  });
  const pain = assessClaim({
    hasStatement: Boolean(opportunity.pain || opportunity.problemStatement),
    generatedBy: opportunity.pain?.provenance ?? opportunity.provenance,
    evidence: [
      ...painInputs(() => true),
      ...claimLinksOf(["PAIN", "FREQUENCY", "TRIGGER", "ALTERNATIVE"]),
    ],
  });
  const economicPain = assessClaim({
    hasStatement: Boolean(opportunity.pain || opportunity.problemStatement),
    generatedBy: opportunity.pain?.provenance ?? opportunity.provenance,
    evidence: [
      ...painInputs((e) => e.hasEconomicImpact),
      ...claimLinksOf(["ECONOMIC_IMPACT", "MAGNITUDE"]),
    ],
  });

  // ---- Value chain nodes and causal links ------------------------------------
  const nodeAssessments = new Map<string, ClaimAssessment>();
  for (const node of opportunity.valueChainNodes) {
    const assessment = assessClaim({
      hasStatement: node.statement.trim().length > 0,
      generatedBy: node.generatedBy,
      evidence: node.evidenceLinks.map((l) => toClaimInput(l.evidence, l.direction)),
      assumptions: node.assumptions.map(toAssumptionInput),
    });
    nodeAssessments.set(node.id, assessment);
    const causalDistance = CAUSAL_DISTANCE_BY_LEVEL[node.level];
    if (
      node.status !== assessment.status ||
      node.confidence !== assessment.confidence ||
      node.causalDistance !== causalDistance
    ) {
      await prisma.valueChainNode.update({
        where: { id: node.id },
        data: { status: assessment.status, confidence: assessment.confidence, causalDistance },
      });
    }
  }

  const linkAssessments = new Map<string, ClaimAssessment>();
  for (const link of opportunity.causalLinks) {
    const assessment = assessClaim({
      hasStatement: link.statement.trim().length > 0,
      generatedBy: link.generatedBy,
      evidence: link.evidenceLinks.map((l) => toClaimInput(l.evidence, l.direction)),
      assumptions: link.assumptions.map(toAssumptionInput),
    });
    linkAssessments.set(link.id, assessment);
    if (link.status !== assessment.status || link.confidence !== assessment.confidence) {
      await prisma.causalLink.update({
        where: { id: link.id },
        data: { status: assessment.status, confidence: assessment.confidence },
      });
    }
  }

  // ---- Proof Frontier ---------------------------------------------------------
  const frontierRungs: FrontierRungInput[] = [
    { rung: "VARIABLE_IMPORTANCE", assessment: variableImportance },
    { rung: "PAIN", assessment: pain },
    { rung: "ECONOMIC_PAIN", assessment: economicPain },
    ...opportunity.valueChainNodes.map((n) => ({
      rung: rungForLevel(n.level),
      assessment: nodeAssessments.get(n.id)!,
    })),
  ];
  const frontierLinks: FrontierLinkInput[] = opportunity.causalLinks.map((l) => ({
    from: rungForLevel(l.fromNode.level),
    to: rungForLevel(l.toNode.level),
    statement: l.statement,
    criticality: l.criticality,
    assessment: linkAssessments.get(l.id)!,
  }));
  const frontier = computeProofFrontier(frontierRungs, frontierLinks);

  // ---- Causal Confidence ---------------------------------------------------------
  const causal = computeCausalConfidence(
    opportunity.causalLinks.map((l) => ({
      from: l.fromNode.level,
      to: l.toNode.level,
      statement: l.statement,
      criticality: l.criticality,
      assessment: linkAssessments.get(l.id)!,
    })),
  );

  // ---- Value Strength -------------------------------------------------------------
  const mechanismStatement =
    opportunity.mechanism ??
    opportunity.valueChainNodes.find((n) => n.level === "MECHANISM")?.statement ??
    null;
  const valueStrength = computeValueStrength(
    {
      importance: opportunity.vsImportance,
      magnitude: opportunity.vsMagnitude,
      frequency: opportunity.vsFrequency,
      population: opportunity.vsPopulation,
      attributability: opportunity.vsAttributability,
    },
    {
      variableName: opportunity.variable?.name ?? null,
      icpName: opportunity.icp?.name ?? null,
      mechanism: mechanismStatement,
      provenance: (opportunity.valueDimensionProvenance as Record<string, string> | null) ?? {},
    },
  );

  // ---- Verdict (base rules + documented extensions) --------------------------------
  const base = computeVerdict(opp.score, ev.score);
  const criticalContradiction =
    pain.status === "CONTRADICTED" ||
    economicPain.status === "CONTRADICTED" ||
    opportunity.causalLinks.some(
      (l) => l.criticality === "CRITICAL" && linkAssessments.get(l.id)?.status === "CONTRADICTED",
    );
  const openCriticalCustomerQuestion = opportunity.assumptions.some(
    (a) =>
      (a.kind === "WTP" || a.kind === "ACCESS" || a.kind === "VALUE") &&
      a.status === "UNKNOWN" &&
      a.importance >= 8,
  );
  const verdict = extendVerdict(base, {
    evidenceScore: ev.score,
    valueStrength: valueStrength.score,
    causalConfidence: causal.score,
    criticalContradiction,
    frontier: frontier.frontier,
    openCriticalCustomerQuestion,
  });

  const killWarnings = evaluateKillCriteria({
    inputs,
    hasTrigger: (opportunity.pain?.triggers.length ?? 0) > 0,
    hasMetric: isKnown(opportunity.metric),
    economicBuyerKnown: isKnown(opportunity.icp?.economicBuyer),
    icpReachability: opportunity.icp?.reachability ?? null,
    evidenceScore: ev.score,
    hasEconomicImpactEvidence: problemSignals.some(
      (s) => s.hasEconomicImpact && s.sentiment !== "NEGATIVE",
    ),
    alternativeCount: opportunity.pain?.alternatives.length ?? 0,
  });

  // ---- Next value action ---------------------------------------------------------------
  const valueActions = computeValueActions({
    frontier,
    causal,
    valueStrength,
    evidence: ev,
    assumptions: opportunity.assumptions.map((a) => ({
      id: a.id,
      statement: a.statement,
      kind: a.kind,
      status: a.status,
      importance: a.importance,
      evidenceCount: a.links.length,
      linkedTo: a.causalLinkId
        ? (() => {
            const l = opportunity.causalLinks.find((x) => x.id === a.causalLinkId);
            return l ? linkLabel(l.fromNode.level, l.toNode.level) : null;
          })()
        : a.valueChainNodeId
          ? (opportunity.valueChainNodes.find((n) => n.id === a.valueChainNodeId)?.level ?? null)
          : null,
    })),
    links: opportunity.causalLinks.map((l) => ({
      id: l.id,
      statement: l.statement,
      from: l.fromNode.level,
      to: l.toNode.level,
      criticality: l.criticality,
      assessment: linkAssessments.get(l.id)!,
    })),
    nodes: opportunity.valueChainNodes.map((n) => ({
      level: n.level,
      statement: n.statement,
      assessment: nodeAssessments.get(n.id)!,
    })),
    icpName: opportunity.icp?.name ?? null,
    variableName: opportunity.variable?.name ?? null,
    painDescription: opportunity.pain?.description ?? opportunity.problemStatement ?? null,
    mechanism: mechanismStatement,
    experiments: opportunity.experiments,
  });

  // ---- Snapshot after, diff and audit trail ----------------------------------------------
  const problemClaim = (rung: ProofRung, a: ClaimAssessment): KnowledgeClaim => ({
    key: `rung:${rung}`,
    label: PROOF_RUNG_LABELS[rung],
    status: a.status,
    confidence: a.confidence,
  });
  const after: KnowledgeSnapshot = {
    frontier: frontier.frontier,
    evidenceConfidence: ev.score,
    valueStrength: valueStrength.score,
    valueCompleteness: valueStrength.completeness,
    causalConfidence: causal.score,
    causalCompleteness: causal.completeness,
    verdict: verdict.verdict,
    claims: [
      ...(opportunity.variable ? [problemClaim("VARIABLE_IMPORTANCE", variableImportance)] : []),
      ...(opportunity.pain || opportunity.problemStatement
        ? [problemClaim("PAIN", pain), problemClaim("ECONOMIC_PAIN", economicPain)]
        : []),
      ...opportunity.valueChainNodes.map<KnowledgeClaim>((n) => {
        const a = nodeAssessments.get(n.id)!;
        return {
          key: `node:${n.level}`,
          label: VALUE_CHAIN_LEVEL_LABELS[n.level],
          status: a.status,
          confidence: a.confidence,
        };
      }),
      ...opportunity.causalLinks.map<KnowledgeClaim>((l) => {
        const a = linkAssessments.get(l.id)!;
        return {
          key: linkKey(l.fromNode.level, l.toNode.level),
          label: linkLabel(l.fromNode.level, l.toNode.level),
          status: a.status,
          confidence: a.confidence,
        };
      }),
    ],
  };
  const diff: KnowledgeDiff | null = neverComputed ? null : diffKnowledge(before, after);

  let knowledgeChangeId: string | null = null;
  if (diff?.changed) {
    const change = await prisma.knowledgeChange.create({
      data: {
        opportunityId,
        experimentId: ctx.experimentId ?? null,
        evidenceId: ctx.evidenceId ?? null,
        trigger: ctx.trigger ?? "RECOMPUTE",
        previousFrontier: before.frontier,
        newFrontier: after.frontier,
        previousEvidenceConfidence: before.evidenceConfidence,
        newEvidenceConfidence: after.evidenceConfidence,
        previousValueStrength: before.valueStrength,
        newValueStrength: after.valueStrength,
        previousCausalConfidence: before.causalConfidence,
        newCausalConfidence: after.causalConfidence,
        previousVerdict: before.verdict,
        newVerdict: after.verdict,
        claimsStrengthened: serialize(diff.strengthened),
        claimsWeakened: serialize(diff.weakened),
        claimsContradicted: serialize(diff.contradicted),
        summary: diff.summary,
      },
    });
    knowledgeChangeId = change.id;
  }

  // ---- Primary value path (one default path per opportunity) --------------------------
  const ladderStatus: EpistemicStatus =
    opportunity.valueChainNodes.length === 0
      ? "UNKNOWN"
      : (opportunity.valueChainNodes
          .map((n) => ({ n, a: nodeAssessments.get(n.id)! }))
          .find((x) => x.n.level === frontier.frontier)?.a.status ?? "HYPOTHESIS");
  const pathData = {
    primaryVariableId: opportunity.variableId,
    parentEconomicVariableId: opportunity.variable?.parentVariableId ?? null,
    nodeIds: opportunity.valueChainNodes.map((n) => n.id),
    causalLinkIds: opportunity.causalLinks.map((l) => l.id),
    proofFrontier: frontier.frontier,
    status: ladderStatus,
  };
  const primaryPath = opportunity.valuePaths.find((p) => p.isPrimary) ?? opportunity.valuePaths[0];
  if (primaryPath) {
    await prisma.valuePath.update({ where: { id: primaryPath.id }, data: pathData });
  } else if (opportunity.valueChainNodes.length > 0) {
    await prisma.valuePath.create({
      data: { opportunityId, name: "Primary value path", isPrimary: true, ...pathData },
    });
  }

  if (opportunity.verdict !== verdict.verdict) {
    logger.info("scoring.verdict_transition", {
      opportunityId,
      from: opportunity.verdict,
      to: verdict.verdict,
      opportunityScore: opp.score,
      evidenceScore: ev.score,
      rule: verdict.extension.ruleId ?? verdict.ruleId,
    });
  }
  logger.debug("scoring.computed", {
    opportunityId,
    opportunityScore: opp.score,
    evidenceScore: ev.score,
    valueStrength: valueStrength.score,
    causalConfidence: causal.score,
    frontier: frontier.frontier,
    verdict: verdict.verdict,
    changed: diff?.changed ?? false,
  });

  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      opportunityScore: opp.score,
      evidenceScore: ev.score,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      scoreBreakdown: serialize(opp),
      evidenceBreakdown: serialize(ev),
      verdictReasons: serialize(verdict),
      killWarnings: serialize(killWarnings),
      valueStrength: valueStrength.score,
      valueStrengthBreakdown: serialize(valueStrength),
      causalConfidence: causal.score,
      causalBreakdown: serialize(causal),
      proofFrontier: serialize(frontier),
      proofFrontierRung: frontier.frontier,
      valueActions: serialize(valueActions),
    },
  });
  return Object.assign(updated, {
    knowledgeDiff: diff,
    knowledgeChangeId,
    knowledgeBefore: before,
    knowledgeAfter: after,
    nextAction: valueActions[0] ?? null,
  });
}

export async function recomputeWorkspaceOpportunities(workspaceId: string) {
  const ids = await prisma.opportunity.findMany({ where: { workspaceId }, select: { id: true } });
  for (const { id } of ids) {
    await recomputeOpportunity(id);
  }
  return ids.length;
}

/** Recompute every opportunity that shares a pain (evidence changed on that pain). */
export async function recomputeOpportunitiesForPain(painId: string, ctx: RecomputeContext = {}) {
  const ids = await prisma.opportunity.findMany({ where: { painId }, select: { id: true } });
  for (const { id } of ids) {
    await recomputeOpportunity(id, ctx);
  }
}

/** Recompute every opportunity touched by a piece of evidence (direct, pain or claim links). */
export async function recomputeOpportunitiesForEvidence(
  evidenceId: string,
  ctx: RecomputeContext = {},
) {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: { claimLinks: { select: { opportunityId: true } } },
  });
  if (!evidence) return;
  const ids = new Set<string>();
  if (evidence.opportunityId) ids.add(evidence.opportunityId);
  for (const l of evidence.claimLinks) if (l.opportunityId) ids.add(l.opportunityId);
  if (evidence.painId) {
    const viaPain = await prisma.opportunity.findMany({
      where: { painId: evidence.painId },
      select: { id: true },
    });
    for (const o of viaPain) ids.add(o.id);
  }
  const context: RecomputeContext = { trigger: "EVIDENCE_LINKED", evidenceId, ...ctx };
  for (const id of ids) await recomputeOpportunity(id, context);
}
