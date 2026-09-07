/**
 * Applies a validated DiscoveryExtraction to the workspace state.
 *
 * - Every string is sanitized, every number clamped, every reference resolved
 *   by name inside this workspace only.
 * - Provenance is USER only when the model marked the item as stated by the
 *   user; everything else is AI_HYPOTHESIS.
 * - Evidence is never created here: the extraction schema has no evidence.
 */
import { cleanNullableScore } from "@/services/discovery/clean-score";
import type { Prisma, ValueChainLevel } from "@/generated/prisma/client";
import { prisma } from "@/db/prisma";
import { logger } from "@/lib/logger";
import { cleanOptionalText, cleanScore, cleanStringList, cleanText } from "@/lib/sanitize";
import type { DiscoveryExtraction } from "@/services/ai/schemas";
import { recomputeOpportunity } from "@/services/scoring/recompute";
import { CAUSAL_DISTANCE_BY_LEVEL } from "@/services/value/epistemic";
import { VALUE_DIMENSIONS } from "@/services/value/value-strength";

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
  valueChainNodes: number;
  causalLinks: number;
  experiments: number;
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
    valueChainNodes: 0,
    causalLinks: 0,
    experiments: 0,
    opportunityIds: [],
    userContextUpdated: false,
  };
  const touchedOpportunityIds = new Set<string>();

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
    const variableFieldValues = (draft: DiscoveryExtraction["variables"][number]) => ({
      target: cleanOptionalText(draft.target, 300),
      currentState: cleanOptionalText(draft.currentState, 300),
      desiredState: cleanOptionalText(draft.desiredState, 300),
      unit: cleanOptionalText(draft.unit, 80),
      whoValuesIt: cleanOptionalText(draft.whoValuesIt, 200),
      whyItMatters: cleanOptionalText(draft.whyItMatters, 600),
    });
    const fieldProvenanceFor = (
      draft: DiscoveryExtraction["variables"][number],
      values: Record<string, string | number | null>,
      existing: Record<string, string> = {},
    ) => {
      const out: Record<string, string> = { ...existing };
      const userStated = new Set((draft.userStatedFields ?? []).map((f) => String(f)));
      for (const [field, value] of Object.entries(values)) {
        if (value === null || value === undefined || value === "") continue;
        out[field] = userStated.has(field) || draft.source === "USER" ? "USER" : "AI_HYPOTHESIS";
      }
      return out;
    };
    const resolveParent = async (
      draft: DiscoveryExtraction["variables"][number],
      icpId: string,
    ) => {
      const parentName = cleanOptionalText(draft.parentVariableName, 120);
      if (!parentName) return null;
      const existing = findVariable(parentName);
      if (existing) return existing.id;
      const parent = await tx.variable.create({
        data: {
          icpId,
          name: parentName,
          category: "OTHER",
          desiredDirection: "IMPROVE",
          importanceScore: 5,
          provenance: "AI_HYPOTHESIS",
          fieldProvenance: { name: "AI_HYPOTHESIS" },
        },
      });
      variables.push(parent);
      summary.variables++;
      return parent.id;
    };
    for (const draft of extraction.variables) {
      const name = cleanText(draft.name, 120);
      if (!name) continue;
      const values = variableFieldValues(draft);
      const existingVariable = findVariable(name);
      if (existingVariable) {
        // Enrich UNKNOWN fields only; never overwrite what was already captured.
        const patch: Record<string, string | null> = {};
        for (const [field, value] of Object.entries(values)) {
          if (value && !(existingVariable as unknown as Record<string, unknown>)[field])
            patch[field] = value;
        }
        const parentVariableId =
          existingVariable.parentVariableId ?? (await resolveParent(draft, existingVariable.icpId));
        if (Object.keys(patch).length || (parentVariableId && !existingVariable.parentVariableId)) {
          await tx.variable.update({
            where: { id: existingVariable.id },
            data: {
              ...patch,
              parentVariableId,
              fieldProvenance: fieldProvenanceFor(
                draft,
                {
                  ...patch,
                  parentVariableId:
                    parentVariableId && !existingVariable.parentVariableId
                      ? parentVariableId
                      : null,
                },
                (existingVariable.fieldProvenance as Record<string, string> | null) ?? {},
              ),
            },
          });
        }
        continue;
      }
      const icp = findIcp(draft.icpName) ?? icps[0];
      if (!icp) continue;
      const parentVariableId = await resolveParent(draft, icp.id);
      const base = {
        name,
        category: draft.category,
        desiredDirection: draft.desiredDirection,
        importanceScore: cleanScore(draft.importanceScore),
      };
      const created = await tx.variable.create({
        data: {
          icpId: icp.id,
          description: cleanOptionalText(draft.description),
          ...base,
          ...values,
          parentVariableId,
          provenance: provenanceOf(draft.source),
          fieldProvenance: fieldProvenanceFor(draft, { ...base, ...values, parentVariableId }),
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
      touchedOpportunityIds.add(created.id);
    }

    // ---- value chains (ladder nodes + causal links) -------------------------------
    const findOpportunity = (title: string | null | undefined) =>
      title ? opportunities.find((o) => sameName(o.title, title)) : undefined;
    for (const chain of extraction.valueChains) {
      const opp =
        findOpportunity(chain.opportunityTitle) ??
        (opportunities.length === 1 ? opportunities[0] : undefined);
      if (!opp) continue;
      const existingNodes = await tx.valueChainNode.findMany({ where: { opportunityId: opp.id } });
      const nodeByLevel = new Map<ValueChainLevel, { id: string }>(
        existingNodes.map((n) => [n.level, n]),
      );
      for (const nodeDraft of chain.nodes) {
        const statement = cleanText(nodeDraft.statement, 400);
        if (!statement || nodeByLevel.has(nodeDraft.level)) continue;
        const created = await tx.valueChainNode.create({
          data: {
            opportunityId: opp.id,
            level: nodeDraft.level,
            statement,
            status: "HYPOTHESIS",
            causalDistance: CAUSAL_DISTANCE_BY_LEVEL[nodeDraft.level],
            generatedBy: "AI_HYPOTHESIS",
          },
        });
        nodeByLevel.set(nodeDraft.level, created);
        summary.valueChainNodes++;
        touchedOpportunityIds.add(opp.id);
      }
      const existingLinks = await tx.causalLink.findMany({ where: { opportunityId: opp.id } });
      for (const linkDraft of chain.links) {
        const statement = cleanText(linkDraft.statement, 400);
        const from = nodeByLevel.get(linkDraft.fromLevel);
        const to = nodeByLevel.get(linkDraft.toLevel);
        if (!statement || !from || !to || from.id === to.id) continue;
        if (existingLinks.some((l) => l.fromNodeId === from.id && l.toNodeId === to.id)) continue;
        const created = await tx.causalLink.create({
          data: {
            opportunityId: opp.id,
            fromNodeId: from.id,
            toNodeId: to.id,
            statement,
            criticality: linkDraft.criticality,
            status: "HYPOTHESIS",
            generatedBy: "AI_HYPOTHESIS",
          },
        });
        existingLinks.push(created);
        summary.causalLinks++;
        touchedOpportunityIds.add(opp.id);
      }
    }

    // ---- value dimensions: fill UNKNOWN dimensions only; null stays null -----------
    for (const dims of extraction.valueDimensions) {
      const opp =
        findOpportunity(dims.opportunityTitle) ??
        (opportunities.length === 1 ? opportunities[0] : undefined);
      if (!opp) continue;
      const current = await tx.opportunity.findUnique({
        where: { id: opp.id },
        select: {
          vsImportance: true,
          vsMagnitude: true,
          vsFrequency: true,
          vsPopulation: true,
          vsAttributability: true,
          valueDimensionProvenance: true,
        },
      });
      if (!current) continue;
      const column: Record<
        string,
        "vsImportance" | "vsMagnitude" | "vsFrequency" | "vsPopulation" | "vsAttributability"
      > = {
        importance: "vsImportance",
        magnitude: "vsMagnitude",
        frequency: "vsFrequency",
        population: "vsPopulation",
        attributability: "vsAttributability",
      };
      const userStated = new Set((dims.userStatedDimensions ?? []).map(String));
      const patch: Record<string, number> = {};
      const provenance = {
        ...((current.valueDimensionProvenance as Record<string, string> | null) ?? {}),
      };
      for (const dim of VALUE_DIMENSIONS) {
        const value = cleanNullableScore((dims as Record<string, unknown>)[dim]);
        if (value === null) continue; // UNKNOWN stays UNKNOWN
        if (current[column[dim]] !== null) continue; // never overwrite captured values
        patch[column[dim]] = value;
        provenance[dim] = userStated.has(dim) ? "USER" : "AI_HYPOTHESIS";
      }
      if (Object.keys(patch).length) {
        await tx.opportunity.update({
          where: { id: opp.id },
          data: { ...patch, valueDimensionProvenance: provenance },
        });
        touchedOpportunityIds.add(opp.id);
      }
    }

    // ---- experiments -------------------------------------------------------------------
    for (const exp of extraction.experiments) {
      const opp =
        findOpportunity(exp.opportunityTitle) ??
        (opportunities.length === 1 ? opportunities[0] : undefined);
      const title = cleanText(exp.title, 200);
      const hypothesis = cleanText(exp.hypothesis, 600);
      if (!opp || !title || !hypothesis) continue;
      const existing = await tx.experiment.findFirst({ where: { opportunityId: opp.id, title } });
      if (existing) continue;
      let causalLinkId: string | null = null;
      if (exp.causalLink) {
        const link = await tx.causalLink.findFirst({
          where: {
            opportunityId: opp.id,
            fromNode: { level: exp.causalLink.fromLevel },
            toNode: { level: exp.causalLink.toLevel },
          },
        });
        causalLinkId = link?.id ?? null;
      }
      await tx.experiment.create({
        data: {
          opportunityId: opp.id,
          causalLinkId,
          title,
          hypothesis,
          design: cleanOptionalText(exp.design, 1000),
          successMetric: cleanOptionalText(exp.successMetric, 300),
        },
      });
      summary.experiments++;
    }

    // ---- assumptions
    const assumptions = await tx.assumption.findMany({ where: { workspaceId } });
    for (const draft of extraction.assumptions) {
      const statement = cleanText(draft.statement, 500);
      if (!statement || assumptions.some((a) => sameName(a.statement, statement))) continue;
      const opp = draft.opportunityTitle
        ? opportunities.find((o) => sameName(o.title, draft.opportunityTitle!))
        : undefined;
      let valueChainNodeId: string | null = null;
      let causalLinkId: string | null = null;
      if (opp && draft.linkedCausalLink) {
        const link = await tx.causalLink.findFirst({
          where: {
            opportunityId: opp.id,
            fromNode: { level: draft.linkedCausalLink.fromLevel },
            toNode: { level: draft.linkedCausalLink.toLevel },
          },
        });
        causalLinkId = link?.id ?? null;
      } else if (opp && draft.linkedLevel) {
        const node = await tx.valueChainNode.findFirst({
          where: { opportunityId: opp.id, level: draft.linkedLevel },
        });
        valueChainNodeId = node?.id ?? null;
      }
      const created = await tx.assumption.create({
        data: {
          workspaceId,
          opportunityId: opp?.id ?? null,
          valueChainNodeId,
          causalLinkId,
          kind: draft.kind ?? "GENERIC",
          statement,
          importance: cleanScore(draft.importance),
          provenance: "AI_HYPOTHESIS",
        },
      });
      assumptions.push(created);
      summary.assumptions++;
      if (opp) touchedOpportunityIds.add(opp.id);
    }
  });

  // Scores are computed outside the transaction (pure functions + writes).
  for (const id of touchedOpportunityIds) {
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
