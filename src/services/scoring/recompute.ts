/**
 * Loads an opportunity with its evidence, value chain and assumptions, runs
 * the pure scoring functions and persists the computed values. This is the
 * only place where scores, statuses, evidence fitness, the Proof Frontier
 * and verdicts are written to the database.
 *
 * Four independent scores:
 *   Opportunity Potential  ← six structural 0–10 inputs
 *   Evidence Confidence    ← evidence about the problem (pain / economic pain)
 *   Value Strength         ← five value dimensions (null = INCOMPLETE)
 *   Causal Confidence      ← evidence on the mechanism → value causal links
 *
 * Every claim is assessed from evidence weighted by its fitness for THAT
 * claim (admissibility × directness × method × independence × scope × sample
 * × recency). Fit is persisted on every evidence→claim link so the UI can
 * show it; it is never edited by a user or a model.
 *
 * Every recompute that changes something records a KnowledgeChange: the
 * audit trail of how the workspace came to believe what it believes.
 */
import { prisma } from "@/db/prisma";
import { logger } from "@/lib/logger";
import { VALUE_CHAIN_LEVEL_LABELS } from "@/domain/enums";
import { Prisma } from "@/generated/prisma/client";
import type {
  ClaimType,
  Evidence,
  EvidenceLinkDirection,
  ExperimentDesignLevel,
  InternalValidity,
  KnowledgeTrigger,
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
  claimTypeForLevel,
  claimTypeForLink,
  COMMERCIAL_LADDER,
  PROBLEM_CLAIM_TYPES,
  RUNG_CLAIM_TYPES,
  RUNG_PRIMARY_CLAIM,
} from "@/services/value/claim-taxonomy";
import { computeCommercialLadder } from "@/services/value/commercial-ladder";
import {
  computeEvidenceFit,
  FIT_VERSION,
  originOf,
  type EvidenceFit,
  type EvidenceFitInput,
} from "@/services/value/evidence-fit";
import { isMeasurementSource } from "@/services/value/evidence-sources";
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
import { describeScope, parseScope, scopeFromContext, type Scope } from "@/services/value/scope";
import { computeValueStrength, type ValueStrengthResult } from "@/services/value/value-strength";
import { extendVerdict } from "@/services/value/verdict-extension";
import { computeValueActions } from "@/services/value/next-value-action";

/** A field is "known" when it has content and is not an explicit UNKNOWN marker. */
export function isKnown(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.length > 0 && !/^unknown\b/i.test(v);
}

/** Evidence row plus the validity of the experiment result it came from, if any. */
export type EvidenceRow = Evidence & {
  experimentResult?: {
    designLevel: ExperimentDesignLevel | null;
    internalValidity: InternalValidity | null;
  } | null;
};

const evidenceValidityInclude = {
  experimentResult: { select: { designLevel: true, internalValidity: true } },
} as const;

export function toEvidenceSignal(e: EvidenceRow): EvidenceSignal {
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
    sourceType: e.sourceType,
    originId: originOf(e),
  };
}

export function toFitInput(e: EvidenceRow): EvidenceFitInput {
  return {
    id: e.id,
    sourceType: e.sourceType,
    strengthScore: e.strengthScore,
    relevanceScore: e.relevanceScore,
    isDirectCustomer: e.isDirectCustomer,
    sourceDate: e.sourceDate,
    scope: parseScope(e.scope),
    sampleSize: e.sampleSize,
    organizationCount: e.organizationCount,
    userCount: e.userCount,
    sourceOriginId: e.sourceOriginId,
    limitations: e.limitations,
    designLevel: e.experimentResult?.designLevel ?? null,
    internalValidity: e.experimentResult?.internalValidity ?? null,
  };
}

/** Evidence linked directly to the opportunity plus evidence on its pain. */
export async function loadOpportunityEvidence(
  opportunityId: string,
  painId: string | null,
): Promise<EvidenceRow[]> {
  const rows = await prisma.evidence.findMany({
    where: {
      OR: [{ opportunityId }, ...(painId ? [{ painId }] : [])],
    },
    orderBy: { capturedAt: "desc" },
    include: evidenceValidityInclude,
  });
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

const PROBLEM_RUNGS: ProofRung[] = ["VARIABLE_IMPORTANCE", "PAIN", "ECONOMIC_PAIN"];

/** One evidence item as used for one claim (with its claim link id when it came from a link). */
interface ClaimUse {
  e: EvidenceRow;
  direction: EvidenceLinkDirection;
  claimType: ClaimType;
  linkId?: string;
}

/**
 * Fitness for a set of uses of one claim. Independence is judged within the
 * set: the strongest item of each origin counts fully, later derivatives of
 * the same origin do not. Fit computed for claim links is collected for
 * persistence.
 */
function fitUses(
  uses: ClaimUse[],
  claimScope: Scope | null,
  now: Date,
  sink: Map<string, EvidenceFit>,
): ClaimEvidenceInput[] {
  const order = [...uses].sort(
    (a, b) =>
      b.e.strengthScore * b.e.relevanceScore - a.e.strengthScore * a.e.relevanceScore ||
      a.e.id.localeCompare(b.e.id),
  );
  const seen = new Set<string>();
  const fits = new Map<ClaimUse, EvidenceFit>();
  for (const use of order) {
    const fit = computeEvidenceFit(toFitInput(use.e), {
      claimType: use.claimType,
      claimScope,
      now,
      priorOrigins: seen,
    });
    seen.add(fit.originId);
    fits.set(use, fit);
    if (use.linkId) sink.set(use.linkId, fit);
  }
  return uses.map((use) => {
    const fit = fits.get(use)!;
    return {
      signal: { ...toEvidenceSignal(use.e), fit: fit.fitScore },
      direction: use.direction,
      fit,
      scope: parseScope(use.e.scope),
      originId: fit.originId,
      measurement: isMeasurementSource(use.e.sourceType),
    };
  });
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

function serializeNullable(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : serialize(value);
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
  const now = new Date();
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      icp: { include: { market: { select: { name: true } } } },
      variable: true,
      pain: { include: { triggers: true, alternatives: true } },
      assumptions: { include: { links: true } },
      valueChainNodes: {
        include: {
          evidenceLinks: { include: { evidence: { include: evidenceValidityInclude } } },
          assumptions: { include: { links: true } },
        },
      },
      causalLinks: {
        include: {
          fromNode: true,
          toNode: true,
          evidenceLinks: { include: { evidence: { include: evidenceValidityInclude } } },
          assumptions: { include: { links: true } },
        },
      },
      claimLinks: { include: { evidence: { include: evidenceValidityInclude } } },
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

  // ---- Claim scope: what the opportunity's claims are made for -----------------
  const oppScope: Scope | null =
    parseScope(opportunity.claimScope) ??
    scopeFromContext({
      icpName: opportunity.icp?.name ?? null,
      companyType: opportunity.icp?.companyType ?? null,
      companySize: opportunity.icp?.companySize ?? null,
      marketName: opportunity.icp?.market?.name ?? null,
    });

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
          scope: r.summary?.scopeText ?? null,
          generalization: r.summary?.generalization ?? null,
        })),
      ...opportunity.valueChainNodes.map<KnowledgeClaim>((n) => ({
        key: `node:${n.level}`,
        label: VALUE_CHAIN_LEVEL_LABELS[n.level],
        status: n.status,
        confidence: n.confidence,
        scope: n.observedScope ? describeScope(parseScope(n.observedScope)) : null,
        generalization: n.generalization,
      })),
      ...opportunity.causalLinks.map<KnowledgeClaim>((l) => ({
        key: linkKey(l.fromNode.level, l.toNode.level),
        label: linkLabel(l.fromNode.level, l.toNode.level),
        status: l.status,
        confidence: l.confidence,
        scope: l.observedScope ? describeScope(parseScope(l.observedScope)) : null,
        generalization: l.generalization,
      })),
    ],
  };

  // ---- Problem-side claims for the Proof Frontier ----------------------------
  const fitSink = new Map<string, EvidenceFit>();
  const problemEvidence = await loadOpportunityEvidence(opportunity.id, opportunity.painId);
  const problemIds = new Set(problemEvidence.map((e) => e.id));
  const linksOf = (types: ClaimType[]): ClaimUse[] =>
    opportunity.claimLinks
      .filter((l) => types.includes(l.claimType) && !l.valueChainNodeId && !l.causalLinkId)
      .map((l) => ({
        e: l.evidence,
        direction: l.direction,
        claimType: l.claimType,
        linkId: l.id,
      }));
  const painUses = (filter: (e: EvidenceRow) => boolean, claimType: ClaimType): ClaimUse[] =>
    problemEvidence
      .filter(filter)
      .map((e) => ({ e, direction: sentimentToDirection(e.sentiment), claimType }));

  const variableUses = [
    ...painUses(
      (e) => e.hasExplicitPain || e.isDirectCustomer,
      RUNG_PRIMARY_CLAIM.VARIABLE_IMPORTANCE,
    ),
    ...linksOf(RUNG_CLAIM_TYPES.VARIABLE_IMPORTANCE!),
  ];
  const painClaimUses = [
    ...painUses(() => true, RUNG_PRIMARY_CLAIM.PAIN),
    ...linksOf(RUNG_CLAIM_TYPES.PAIN!),
  ];
  const economicUses = [
    ...painUses((e) => e.hasEconomicImpact, RUNG_PRIMARY_CLAIM.ECONOMIC_PAIN),
    ...linksOf(RUNG_CLAIM_TYPES.ECONOMIC_PAIN!),
  ];

  const variableInputs = fitUses(variableUses, oppScope, now, fitSink);
  const painInputs = fitUses(painClaimUses, oppScope, now, fitSink);
  const economicInputs = fitUses(economicUses, oppScope, now, fitSink);

  const variableImportance = assessClaim({
    hasStatement: Boolean(opportunity.variable),
    generatedBy: opportunity.variable?.provenance ?? "AI_HYPOTHESIS",
    evidence: variableInputs,
    claimType: RUNG_PRIMARY_CLAIM.VARIABLE_IMPORTANCE,
    claimScope: oppScope,
    now,
  });
  const pain = assessClaim({
    hasStatement: Boolean(opportunity.pain || opportunity.problemStatement),
    generatedBy: opportunity.pain?.provenance ?? opportunity.provenance,
    evidence: painInputs,
    claimType: RUNG_PRIMARY_CLAIM.PAIN,
    claimScope: oppScope,
    now,
  });
  const economicPain = assessClaim({
    hasStatement: Boolean(opportunity.pain || opportunity.problemStatement),
    generatedBy: opportunity.pain?.provenance ?? opportunity.provenance,
    evidence: economicInputs,
    claimType: RUNG_PRIMARY_CLAIM.ECONOMIC_PAIN,
    claimScope: oppScope,
    now,
  });

  // ---- Evidence Confidence (problem evidence, weighted by problem-claim fit) ---
  const bestProblemFit = new Map<string, number>();
  const noteFit = (uses: ClaimUse[], inputs: ClaimEvidenceInput[]) =>
    uses.forEach((u, idx) => {
      const f = inputs[idx]?.fit?.fitScore ?? 0;
      bestProblemFit.set(u.e.id, Math.max(bestProblemFit.get(u.e.id) ?? 0, f));
    });
  noteFit(variableUses, variableInputs);
  noteFit(painClaimUses, painInputs);
  noteFit(economicUses, economicInputs);
  const claimProblemLinks = opportunity.claimLinks.filter(
    (l) =>
      PROBLEM_CLAIM_TYPES.has(l.claimType) &&
      !l.valueChainNodeId &&
      !l.causalLinkId &&
      !problemIds.has(l.evidenceId),
  );
  const problemSignals: EvidenceSignal[] = [
    ...problemEvidence.map((e) => ({
      ...toEvidenceSignal(e),
      fit: bestProblemFit.get(e.id) ?? null,
    })),
    ...claimProblemLinks.map((l) => ({
      ...toEvidenceSignal(l.evidence),
      sentiment: directionToSentiment(l.direction),
      fit: fitSink.get(l.id)?.fitScore ?? bestProblemFit.get(l.evidenceId) ?? null,
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
  const ev = computeEvidenceScore(problemSignals, now);

  // ---- Value chain nodes and causal links ------------------------------------
  const nodeAssessments = new Map<string, ClaimAssessment>();
  for (const node of opportunity.valueChainNodes) {
    const claimType = claimTypeForLevel(node.level);
    const nodeScope = parseScope(node.claimScope) ?? oppScope;
    const uses: ClaimUse[] = [
      ...node.evidenceLinks.map((l) => ({
        e: l.evidence,
        direction: l.direction,
        claimType,
        linkId: l.id,
      })),
      // Problem-side links typed with this level's claim (e.g. mechanism feasibility) attach here.
      ...opportunity.claimLinks
        .filter((l) => l.claimType === claimType && !l.valueChainNodeId && !l.causalLinkId)
        .map((l) => ({ e: l.evidence, direction: l.direction, claimType, linkId: l.id })),
    ];
    const assessment = assessClaim({
      hasStatement: node.statement.trim().length > 0,
      generatedBy: node.generatedBy,
      evidence: fitUses(uses, nodeScope, now, fitSink),
      assumptions: node.assumptions.map(toAssumptionInput),
      claimType,
      claimScope: nodeScope,
      now,
    });
    nodeAssessments.set(node.id, assessment);
    const causalDistance = CAUSAL_DISTANCE_BY_LEVEL[node.level];
    const generalization = assessment.generalization?.status ?? "UNTESTED";
    const observedScopeJson = assessment.observedScope
      ? JSON.stringify(assessment.observedScope)
      : null;
    if (
      node.status !== assessment.status ||
      node.confidence !== assessment.confidence ||
      node.causalDistance !== causalDistance ||
      node.generalization !== generalization ||
      node.inference !== assessment.inference ||
      (node.observedScope ? JSON.stringify(node.observedScope) : null) !== observedScopeJson
    ) {
      await prisma.valueChainNode.update({
        where: { id: node.id },
        data: {
          status: assessment.status,
          confidence: assessment.confidence,
          causalDistance,
          generalization,
          observedScope: serializeNullable(assessment.observedScope),
          inference: assessment.inference,
        },
      });
    }
  }

  const linkAssessments = new Map<string, ClaimAssessment>();
  for (const link of opportunity.causalLinks) {
    const claimType = claimTypeForLink(link.fromNode.level, link.toNode.level);
    const linkScope = parseScope(link.claimScope) ?? oppScope;
    const assessment = assessClaim({
      hasStatement: link.statement.trim().length > 0,
      generatedBy: link.generatedBy,
      evidence: fitUses(
        link.evidenceLinks.map((l) => ({
          e: l.evidence,
          direction: l.direction,
          claimType,
          linkId: l.id,
        })),
        linkScope,
        now,
        fitSink,
      ),
      assumptions: link.assumptions.map(toAssumptionInput),
      claimType,
      claimScope: linkScope,
      now,
    });
    linkAssessments.set(link.id, assessment);
    const generalization = assessment.generalization?.status ?? "UNTESTED";
    const observedScopeJson = assessment.observedScope
      ? JSON.stringify(assessment.observedScope)
      : null;
    if (
      link.status !== assessment.status ||
      link.confidence !== assessment.confidence ||
      link.generalization !== generalization ||
      link.inference !== assessment.inference ||
      (link.observedScope ? JSON.stringify(link.observedScope) : null) !== observedScopeJson
    ) {
      await prisma.causalLink.update({
        where: { id: link.id },
        data: {
          status: assessment.status,
          confidence: assessment.confidence,
          generalization,
          observedScope: serializeNullable(assessment.observedScope),
          inference: assessment.inference,
        },
      });
    }
  }

  // ---- Commercial ladder (each rung is its own claim) ------------------------
  const commercialAssessments: Partial<Record<ClaimType, ClaimAssessment>> = {};
  for (const claimType of COMMERCIAL_LADDER) {
    const uses = linksOf([claimType]);
    commercialAssessments[claimType] = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: fitUses(uses, oppScope, now, fitSink),
      claimType,
      claimScope: oppScope,
      now,
    });
  }
  const commercial = computeCommercialLadder(commercialAssessments);

  // ---- Persist evidence fitness on every claim link ---------------------------
  const linkRows = new Map(opportunity.claimLinks.map((l) => [l.id, l]));
  for (const node of opportunity.valueChainNodes)
    for (const l of node.evidenceLinks) linkRows.set(l.id, l);
  for (const link of opportunity.causalLinks)
    for (const l of link.evidenceLinks) linkRows.set(l.id, l);
  for (const [linkId, fit] of fitSink) {
    const row = linkRows.get(linkId);
    if (!row) continue;
    if (
      row.fitScore !== fit.fitScore ||
      row.admissibility !== fit.admissibility ||
      row.fitVersion !== FIT_VERSION
    ) {
      await prisma.evidenceClaimLink.update({
        where: { id: linkId },
        data: {
          admissibility: fit.admissibility,
          fitScore: fit.fitScore,
          fitBreakdown: serialize({
            claimType: fit.claimType,
            band: fit.band,
            cap: fit.cap,
            dimensions: fit.dimensions,
            limitationsPenalty: fit.limitationsPenalty,
            duplicateOfOrigin: fit.duplicateOfOrigin,
            originId: fit.originId,
            designLevel: fit.designLevel,
            scope: fit.scope,
            admissibilityExplanation: fit.admissibilityExplanation,
            explanation: fit.explanation,
            summary: fit.summary,
          }),
          fitVersion: FIT_VERSION,
          fitComputedAt: now,
        },
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
  const frontier: ProofFrontierResult = {
    ...computeProofFrontier(frontierRungs, frontierLinks),
    commercial,
  };

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
      (s) => s.hasEconomicImpact && s.sentiment !== "NEGATIVE" && (s.fit ?? 100) > 0,
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
    commercial,
  });

  // ---- Snapshot after, diff and audit trail ----------------------------------------------
  const problemClaim = (rung: ProofRung, a: ClaimAssessment): KnowledgeClaim => ({
    key: `rung:${rung}`,
    label: PROOF_RUNG_LABELS[rung],
    status: a.status,
    confidence: a.confidence,
    scope: a.observedScopeText,
    generalization: a.generalization?.status ?? null,
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
          scope: a.observedScopeText,
          generalization: a.generalization?.status ?? "UNTESTED",
        };
      }),
      ...opportunity.causalLinks.map<KnowledgeClaim>((l) => {
        const a = linkAssessments.get(l.id)!;
        return {
          key: linkKey(l.fromNode.level, l.toNode.level),
          label: linkLabel(l.fromNode.level, l.toNode.level),
          status: a.status,
          confidence: a.confidence,
          scope: a.observedScopeText,
          generalization: a.generalization?.status ?? "UNTESTED",
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
      claimScope: serializeNullable(oppScope),
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
