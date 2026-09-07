/**
 * Loads an opportunity with its evidence and related entities, runs the pure
 * scoring functions and persists the computed values. This is the only place
 * where scores are written to the database.
 */
import { prisma } from "@/db/prisma";
import { logger } from "@/lib/logger";
import type { Evidence } from "@/generated/prisma/client";
import { computeOpportunityScore } from "./opportunity-score";
import { computeEvidenceScore, type EvidenceSignal } from "./evidence-score";
import { computeVerdict } from "./verdict";
import { evaluateKillCriteria } from "./kill-criteria";

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

export async function recomputeOpportunity(opportunityId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      icp: true,
      pain: { include: { triggers: true, alternatives: true } },
    },
  });
  if (!opportunity) return null;

  const evidence = await loadOpportunityEvidence(opportunity.id, opportunity.painId);
  const signals = evidence.map(toEvidenceSignal);

  const inputs = {
    importance: opportunity.importance,
    painIntensity: opportunity.painIntensity,
    frequency: opportunity.frequency,
    gap: opportunity.gap,
    willingnessToPay: opportunity.willingnessToPay,
    alternativeWeakness: opportunity.alternativeWeakness,
  };

  const opp = computeOpportunityScore(inputs);
  const ev = computeEvidenceScore(signals);
  const verdict = computeVerdict(opp.score, ev.score);
  const killWarnings = evaluateKillCriteria({
    inputs,
    hasTrigger: (opportunity.pain?.triggers.length ?? 0) > 0,
    hasMetric: isKnown(opportunity.metric),
    economicBuyerKnown: isKnown(opportunity.icp?.economicBuyer),
    icpReachability: opportunity.icp?.reachability ?? null,
    evidenceScore: ev.score,
    hasEconomicImpactEvidence: signals.some(
      (s) => s.hasEconomicImpact && s.sentiment !== "NEGATIVE",
    ),
    alternativeCount: opportunity.pain?.alternatives.length ?? 0,
  });

  if (opportunity.verdict !== verdict.verdict) {
    logger.info("scoring.verdict_transition", {
      opportunityId,
      from: opportunity.verdict,
      to: verdict.verdict,
      opportunityScore: opp.score,
      evidenceScore: ev.score,
      rule: verdict.ruleId,
    });
  }
  logger.debug("scoring.computed", {
    opportunityId,
    opportunityScore: opp.score,
    evidenceScore: ev.score,
    verdict: verdict.verdict,
    evidenceItems: signals.length,
  });

  return prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      opportunityScore: opp.score,
      evidenceScore: ev.score,
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      scoreBreakdown: JSON.parse(JSON.stringify(opp)),
      evidenceBreakdown: JSON.parse(JSON.stringify(ev)),
      verdictReasons: JSON.parse(JSON.stringify(verdict)),
      killWarnings: JSON.parse(JSON.stringify(killWarnings)),
    },
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
export async function recomputeOpportunitiesForPain(painId: string) {
  const ids = await prisma.opportunity.findMany({ where: { painId }, select: { id: true } });
  for (const { id } of ids) {
    await recomputeOpportunity(id);
  }
}
