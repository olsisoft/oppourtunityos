/**
 * Applies a validated DiscoveryExtraction to the workspace state.
 *
 * - Every string is sanitized, every number clamped, every reference resolved
 *   by name inside this workspace only.
 * - Provenance is USER only when the model marked the item as stated by the
 *   user; everything else is AI_HYPOTHESIS.
 * - Evidence is never created here: the extraction schema has no evidence.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/db/prisma";
import { logger } from "@/lib/logger";
import { cleanOptionalText, cleanScore, cleanStringList, cleanText } from "@/lib/sanitize";
import type { DiscoveryExtraction } from "@/services/ai/schemas";
import { recomputeOpportunity } from "@/services/scoring/recompute";

export interface AppliedSummary {
  markets: number;
  icps: number;
  variables: number;
  pains: number;
  triggers: number;
  alternatives: number;
  mechanisms: number;
  assumptions: number;
  opportunities: number;
  opportunityIds: string[];
  userContextUpdated: boolean;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameName(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (x === y) return true;
  if (x.length > 12 && y.length > 12 && (x.includes(y) || y.includes(x))) return true;
  return x.slice(0, 40) === y.slice(0, 40) && x.length > 20;
}

function provenanceOf(source: "USER" | "AI_HYPOTHESIS") {
  return source === "USER" ? "USER" : "AI_HYPOTHESIS";
}

export async function applyExtraction(
  workspaceId: string,
  extraction: DiscoveryExtraction,
): Promise<AppliedSummary> {
  const summary: AppliedSummary = {
    markets: 0,
    icps: 0,
    variables: 0,
    pains: 0,
    triggers: 0,
    alternatives: 0,
    mechanisms: 0,
    assumptions: 0,
    opportunities: 0,
    opportunityIds: [],
    userContextUpdated: false,
  };

  await prisma.$transaction(async (tx) => {
    // ---- markets
    const markets = await tx.market.findMany({ where: { workspaceId } });
    const findMarket = (name: string) => markets.find((m) => sameName(m.name, name));
    for (const draft of extraction.markets) {
      const name = cleanText(draft.name, 120);
      if (!name || findMarket(name)) continue;
      const created = await tx.market.create({
        data: {
          workspaceId,
          name,
          description: cleanOptionalText(draft.description),
          attractivenessNotes: cleanOptionalText(draft.attractivenessNotes),
          provenance: provenanceOf(draft.source),
        },
      });
      markets.push(created);
      summary.markets++;
    }

    // ---- icps
    const icps = await tx.iCP.findMany({ where: { market: { workspaceId } } });
    const findIcp = (name: string) => icps.find((i) => sameName(i.name, name));
    for (const draft of extraction.icps) {
      const name = cleanText(draft.name, 120);
      if (!name) continue;
      const existing = findIcp(name);
      if (existing) {
        // Enrich unknown fields only; never overwrite user-provided data.
        await tx.iCP.update({
          where: { id: existing.id },
          data: {
            role: existing.role ?? cleanOptionalText(draft.role),
            companyType: existing.companyType ?? cleanOptionalText(draft.companyType),
            companySize: existing.companySize ?? cleanOptionalText(draft.companySize),
            responsibilities:
              existing.responsibilities ?? cleanOptionalText(draft.responsibilities),
            economicBuyer: existing.economicBuyer ?? cleanOptionalText(draft.economicBuyer),
            userRole: existing.userRole ?? cleanOptionalText(draft.userRole),
            reachability: existing.reachability ?? cleanOptionalText(draft.reachability),
          },
        });
        continue;
      }
      let market = findMarket(draft.marketName) ?? markets[0];
      if (!market) {
        market = await tx.market.create({
          data: {
            workspaceId,
            name: cleanText(draft.marketName, 120) || "Unnamed market",
            provenance: "AI_HYPOTHESIS",
          },
        });
        markets.push(market);
        summary.markets++;
      }
      const created = await tx.iCP.create({
        data: {
          marketId: market.id,
          name,
          role: cleanOptionalText(draft.role),
          companyType: cleanOptionalText(draft.companyType),
          companySize: cleanOptionalText(draft.companySize),
          responsibilities: cleanOptionalText(draft.responsibilities),
          economicBuyer: cleanOptionalText(draft.economicBuyer),
          userRole: cleanOptionalText(draft.userRole),
          reachability: cleanOptionalText(draft.reachability),
          notes: cleanOptionalText(draft.notes),
          provenance: provenanceOf(draft.source),
        },
      });
      icps.push(created);
      summary.icps++;
    }

    // ---- variables
    const variables = await tx.variable.findMany({ where: { icp: { market: { workspaceId } } } });
    const findVariable = (name: string) => variables.find((v) => sameName(v.name, name));
    for (const draft of extraction.variables) {
      const name = cleanText(draft.name, 120);
      if (!name || findVariable(name)) continue;
      const icp = findIcp(draft.icpName) ?? icps[0];
      if (!icp) continue;
      const created = await tx.variable.create({
        data: {
          icpId: icp.id,
          name,
          description: cleanOptionalText(draft.description),
          category: draft.category,
          desiredDirection: draft.desiredDirection,
          importanceScore: cleanScore(draft.importanceScore),
          provenance: provenanceOf(draft.source),
        },
      });
      variables.push(created);
      summary.variables++;
    }

    // ---- pains
    const pains = await tx.pain.findMany({
      where: { variable: { icp: { market: { workspaceId } } } },
    });
    const findPain = (description: string | null | undefined) => {
      if (!description) return pains.at(-1);
      return pains.find((p) => sameName(p.description, description)) ?? pains.at(-1);
    };
    for (const draft of extraction.pains) {
      const description = cleanText(draft.description, 1000);
      if (!description || pains.some((p) => sameName(p.description, description))) continue;
      const variable = findVariable(draft.variableName) ?? variables[0];
      if (!variable) continue;
      const created = await tx.pain.create({
        data: {
          variableId: variable.id,
          description,
          severityScore: cleanScore(draft.severityScore),
          frequencyScore: cleanScore(draft.frequencyScore),
          currentState: cleanOptionalText(draft.currentState),
          desiredState: cleanOptionalText(draft.desiredState),
          gapDescription: cleanOptionalText(draft.gapDescription),
          provenance: provenanceOf(draft.source),
        },
      });
      pains.push(created);
      summary.pains++;
    }

    // ---- triggers
    const triggers = await tx.trigger.findMany({
      where: { pain: { variable: { icp: { market: { workspaceId } } } } },
    });
    for (const draft of extraction.triggers) {
      const description = cleanText(draft.description, 600);
      const pain = findPain(draft.painDescription);
      if (!description || !pain) continue;
      if (triggers.some((t) => t.painId === pain.id && sameName(t.description, description)))
        continue;
      const created = await tx.trigger.create({
        data: {
          painId: pain.id,
          description,
          urgencyScore: cleanScore(draft.urgencyScore),
          frequency: cleanOptionalText(draft.frequency, 200),
          provenance: provenanceOf(draft.source),
        },
      });
      triggers.push(created);
      summary.triggers++;
    }

    // ---- alternatives
    const alternatives = await tx.alternative.findMany({
      where: { pain: { variable: { icp: { market: { workspaceId } } } } },
    });
    for (const draft of extraction.alternatives) {
      const name = cleanText(draft.name, 160);
      const pain = findPain(draft.painDescription);
      if (!name || !pain) continue;
      if (alternatives.some((a) => a.painId === pain.id && sameName(a.name, name))) continue;
      const created = await tx.alternative.create({
        data: {
          painId: pain.id,
          name,
          category: draft.category,
          description: cleanOptionalText(draft.description),
          costEstimate: cleanOptionalText(draft.costEstimate, 300),
          weaknessDescription: cleanOptionalText(draft.weaknessDescription),
          weaknessScore: cleanScore(draft.weaknessScore),
          provenance: provenanceOf(draft.source),
        },
      });
      alternatives.push(created);
      summary.alternatives++;
    }

    // ---- mechanisms
    const mechanisms = await tx.productMechanism.findMany({ where: { workspaceId } });
    for (const draft of extraction.mechanisms) {
      const name = cleanText(draft.name, 160);
      if (!name || mechanisms.some((m) => sameName(m.name, name))) continue;
      const pain = draft.painDescription ? findPain(draft.painDescription) : pains.at(-1);
      const created = await tx.productMechanism.create({
        data: {
          workspaceId,
          painId: pain?.id ?? null,
          name,
          description: cleanOptionalText(draft.description),
          category: draft.category,
          provenance: "AI_HYPOTHESIS",
        },
      });
      mechanisms.push(created);
      summary.mechanisms++;
    }

    // ---- opportunities
    const opportunities = await tx.opportunity.findMany({ where: { workspaceId } });
    for (const draft of extraction.opportunities) {
      const title = cleanText(draft.title, 160);
      if (!title || opportunities.some((o) => sameName(o.title, title))) continue;
      const icp = draft.icpName ? findIcp(draft.icpName) : undefined;
      const variable = draft.variableName ? findVariable(draft.variableName) : undefined;
      const pain = draft.painDescription ? findPain(draft.painDescription) : undefined;
      const created = await tx.opportunity.create({
        data: {
          workspaceId,
          title,
          icpId:
            icp?.id ??
            (variable ? variables.find((v) => v.id === variable.id)?.icpId : undefined) ??
            null,
          variableId: variable?.id ?? (pain ? pain.variableId : undefined) ?? null,
          painId: pain?.id ?? null,
          problemStatement: cleanOptionalText(draft.problemStatement),
          mechanism: cleanOptionalText(draft.mechanism, 300),
          productHypothesis: cleanOptionalText(draft.productHypothesis),
          valueProposition: cleanOptionalText(draft.valueProposition),
          metric: cleanOptionalText(draft.metric, 300),
          importance: cleanScore(draft.inputs.importance),
          painIntensity: cleanScore(draft.inputs.painIntensity),
          frequency: cleanScore(draft.inputs.frequency),
          gap: cleanScore(draft.inputs.gap),
          willingnessToPay: cleanScore(draft.inputs.willingnessToPay),
          alternativeWeakness: cleanScore(draft.inputs.alternativeWeakness),
          risks: cleanStringList(draft.risks),
          nextSteps: cleanStringList(draft.nextSteps),
          provenance: "AI_HYPOTHESIS",
        },
      });
      opportunities.push(created);
      summary.opportunities++;
      summary.opportunityIds.push(created.id);
    }

    // ---- assumptions
    const assumptions = await tx.assumption.findMany({ where: { workspaceId } });
    for (const draft of extraction.assumptions) {
      const statement = cleanText(draft.statement, 500);
      if (!statement || assumptions.some((a) => sameName(a.statement, statement))) continue;
      const opp = draft.opportunityTitle
        ? opportunities.find((o) => sameName(o.title, draft.opportunityTitle!))
        : undefined;
      const created = await tx.assumption.create({
        data: {
          workspaceId,
          opportunityId: opp?.id ?? null,
          statement,
          importance: cleanScore(draft.importance),
          provenance: "AI_HYPOTHESIS",
        },
      });
      assumptions.push(created);
      summary.assumptions++;
    }
  });

  // Scores are computed outside the transaction (pure functions + writes).
  for (const id of summary.opportunityIds) {
    await recomputeOpportunity(id);
  }

  logger.info("discovery.extraction_applied", {
    workspaceId,
    ...summary,
    opportunityIds: undefined,
  });
  return summary;
}

export function sanitizeUserContext(
  ctx: DiscoveryExtraction["userContext"],
): Prisma.InputJsonValue | null {
  if (!ctx) return null;
  const hasContent =
    ctx.industries.length +
      ctx.audiences.length +
      ctx.productPreferences.length +
      ctx.technicalStrengths.length >
      0 || ctx.businessModel !== "UNKNOWN";
  if (!hasContent) return null;
  return {
    industries: cleanStringList(ctx.industries, 8, 80),
    audiences: cleanStringList(ctx.audiences, 8, 80),
    businessModel: ctx.businessModel,
    productPreferences: cleanStringList(ctx.productPreferences, 8, 80),
    avoidIndustries: cleanStringList(ctx.avoidIndustries, 8, 80),
    technicalStrengths: cleanStringList(ctx.technicalStrengths, 8, 80),
  };
}
