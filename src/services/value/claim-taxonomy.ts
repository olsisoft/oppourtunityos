/**
 * Claim taxonomy — the normalized set of claims a piece of evidence can
 * speak to. Every scoring rule that depends on "what kind of claim is this"
 * (admissibility, fitness weights, frontier requirements, language gate)
 * reads this module rather than inspecting labels.
 *
 * Groups follow the product model: MARKET → PROBLEM → VALUE → PRODUCT →
 * CAUSAL → COMMERCIAL → ACCESS. The nature of a claim (existence,
 * quantitative, outcome, causal, behavioral) decides how much evidence
 * quality and method matter relative to admissibility.
 */
import type { ClaimType, ValueChainLevel } from "@/generated/prisma/enums";
import type { ProofRung } from "./proof-frontier";

export type ClaimGroup =
  "MARKET" | "PROBLEM" | "VALUE" | "PRODUCT" | "CAUSAL" | "COMMERCIAL" | "ACCESS" | "OTHER";

/** What kind of statement the claim is; decides fitness weights and language. */
export type ClaimNature =
  "EXISTENCE" | "QUANTITATIVE" | "OUTCOME" | "CAUSAL" | "BEHAVIORAL" | "OTHER";

export const CLAIM_GROUP_LABELS: Record<ClaimGroup, string> = {
  MARKET: "Market",
  PROBLEM: "Problem",
  VALUE: "Value",
  PRODUCT: "Product / mechanism",
  CAUSAL: "Causal",
  COMMERCIAL: "Commercial",
  ACCESS: "Access",
  OTHER: "Other",
};

export const CLAIM_GROUP: Record<ClaimType, ClaimGroup> = {
  MARKET_EXISTS: "MARKET",
  ICP_EXISTS: "MARKET",
  ICP_ACCESSIBLE: "MARKET",
  PAIN_EXISTS: "PROBLEM",
  PAIN_SEVERITY: "PROBLEM",
  PAIN_FREQUENCY: "PROBLEM",
  CURRENT_STATE: "PROBLEM",
  TRIGGER_EXISTS: "PROBLEM",
  ALTERNATIVE_EXISTS: "PROBLEM",
  VARIABLE_IMPORTANCE: "VALUE",
  MAGNITUDE: "VALUE",
  POPULATION_AFFECTED: "VALUE",
  ECONOMIC_IMPACT: "VALUE",
  OPERATIONAL_VALUE: "VALUE",
  ECONOMIC_VALUE: "VALUE",
  STRATEGIC_OUTCOME: "VALUE",
  BUSINESS_OUTCOME: "VALUE",
  MECHANISM_FEASIBLE: "PRODUCT",
  CAPABILITY_EXISTS: "PRODUCT",
  TRANSFORMATION_OCCURS: "PRODUCT",
  MECHANISM_CAUSES_CAPABILITY: "CAUSAL",
  CAPABILITY_CAUSES_TRANSFORMATION: "CAUSAL",
  TRANSFORMATION_CAUSES_OPERATIONAL_VALUE: "CAUSAL",
  OPERATIONAL_VALUE_CAUSES_ECONOMIC_VALUE: "CAUSAL",
  ECONOMIC_VALUE_CAUSES_STRATEGIC_OUTCOME: "CAUSAL",
  STRATEGIC_OUTCOME_CAUSES_BUSINESS_OUTCOME: "CAUSAL",
  CAUSAL_EFFECT: "CAUSAL",
  EXISTING_SPEND: "COMMERCIAL",
  PURCHASE_INTENT: "COMMERCIAL",
  WILLINGNESS_TO_PAY: "COMMERCIAL",
  PRICE_ACCEPTANCE: "COMMERCIAL",
  ACTUAL_PURCHASE: "COMMERCIAL",
  RETENTION_INTENT: "COMMERCIAL",
  ACTUAL_RETENTION: "COMMERCIAL",
  BUYER_REACHABILITY: "ACCESS",
  CHANNEL_ACCESS: "ACCESS",
  PROCUREMENT_FEASIBILITY: "ACCESS",
  OTHER: "OTHER",
};

export const CLAIM_NATURE: Record<ClaimType, ClaimNature> = {
  MARKET_EXISTS: "EXISTENCE",
  ICP_EXISTS: "EXISTENCE",
  ICP_ACCESSIBLE: "EXISTENCE",
  PAIN_EXISTS: "EXISTENCE",
  PAIN_SEVERITY: "QUANTITATIVE",
  PAIN_FREQUENCY: "QUANTITATIVE",
  CURRENT_STATE: "EXISTENCE",
  TRIGGER_EXISTS: "EXISTENCE",
  ALTERNATIVE_EXISTS: "EXISTENCE",
  VARIABLE_IMPORTANCE: "EXISTENCE",
  MAGNITUDE: "QUANTITATIVE",
  POPULATION_AFFECTED: "QUANTITATIVE",
  ECONOMIC_IMPACT: "QUANTITATIVE",
  OPERATIONAL_VALUE: "OUTCOME",
  ECONOMIC_VALUE: "OUTCOME",
  STRATEGIC_OUTCOME: "OUTCOME",
  BUSINESS_OUTCOME: "OUTCOME",
  MECHANISM_FEASIBLE: "EXISTENCE",
  CAPABILITY_EXISTS: "EXISTENCE",
  TRANSFORMATION_OCCURS: "OUTCOME",
  MECHANISM_CAUSES_CAPABILITY: "CAUSAL",
  CAPABILITY_CAUSES_TRANSFORMATION: "CAUSAL",
  TRANSFORMATION_CAUSES_OPERATIONAL_VALUE: "CAUSAL",
  OPERATIONAL_VALUE_CAUSES_ECONOMIC_VALUE: "CAUSAL",
  ECONOMIC_VALUE_CAUSES_STRATEGIC_OUTCOME: "CAUSAL",
  STRATEGIC_OUTCOME_CAUSES_BUSINESS_OUTCOME: "CAUSAL",
  CAUSAL_EFFECT: "CAUSAL",
  EXISTING_SPEND: "QUANTITATIVE",
  PURCHASE_INTENT: "EXISTENCE",
  WILLINGNESS_TO_PAY: "EXISTENCE",
  PRICE_ACCEPTANCE: "BEHAVIORAL",
  ACTUAL_PURCHASE: "BEHAVIORAL",
  RETENTION_INTENT: "EXISTENCE",
  ACTUAL_RETENTION: "BEHAVIORAL",
  BUYER_REACHABILITY: "EXISTENCE",
  CHANNEL_ACCESS: "EXISTENCE",
  PROCUREMENT_FEASIBILITY: "EXISTENCE",
  OTHER: "OTHER",
};

/** Short, human claim statements used in explanations ("evidence for pain exists"). */
export const CLAIM_STATEMENTS: Record<ClaimType, string> = {
  MARKET_EXISTS: "the market exists",
  ICP_EXISTS: "the ICP exists",
  ICP_ACCESSIBLE: "the ICP is accessible",
  PAIN_EXISTS: "the pain exists",
  PAIN_SEVERITY: "the pain is severe",
  PAIN_FREQUENCY: "the pain is frequent",
  CURRENT_STATE: "the current state is as described",
  TRIGGER_EXISTS: "the trigger exists",
  ALTERNATIVE_EXISTS: "the alternative exists",
  VARIABLE_IMPORTANCE: "the variable matters to the ICP",
  MAGNITUDE: "the magnitude is as stated",
  POPULATION_AFFECTED: "the affected population is as stated",
  ECONOMIC_IMPACT: "the economic impact is as stated",
  OPERATIONAL_VALUE: "the operational value materializes",
  ECONOMIC_VALUE: "the economic value materializes",
  STRATEGIC_OUTCOME: "the strategic outcome materializes",
  BUSINESS_OUTCOME: "the business outcome materializes",
  MECHANISM_FEASIBLE: "the mechanism is feasible",
  CAPABILITY_EXISTS: "the capability exists",
  TRANSFORMATION_OCCURS: "the transformation occurs",
  MECHANISM_CAUSES_CAPABILITY: "the mechanism causes the capability",
  CAPABILITY_CAUSES_TRANSFORMATION: "the capability causes the transformation",
  TRANSFORMATION_CAUSES_OPERATIONAL_VALUE: "the transformation causes the operational value",
  OPERATIONAL_VALUE_CAUSES_ECONOMIC_VALUE: "the operational value causes the economic value",
  ECONOMIC_VALUE_CAUSES_STRATEGIC_OUTCOME: "the economic value causes the strategic outcome",
  STRATEGIC_OUTCOME_CAUSES_BUSINESS_OUTCOME: "the strategic outcome causes the business outcome",
  CAUSAL_EFFECT: "the cause produces the effect",
  EXISTING_SPEND: "buyers already spend on this",
  PURCHASE_INTENT: "buyers intend to buy",
  WILLINGNESS_TO_PAY: "buyers state they would pay",
  PRICE_ACCEPTANCE: "buyers accept the price",
  ACTUAL_PURCHASE: "buyers actually bought",
  RETENTION_INTENT: "buyers intend to keep paying",
  ACTUAL_RETENTION: "buyers actually kept paying",
  BUYER_REACHABILITY: "the buyer can be reached",
  CHANNEL_ACCESS: "the channel is accessible",
  PROCUREMENT_FEASIBILITY: "procurement is feasible",
  OTHER: "the claim holds",
};

export const CLAIM_TYPES: ClaimType[] = Object.keys(CLAIM_GROUP) as ClaimType[];

export function claimGroup(type: ClaimType): ClaimGroup {
  return CLAIM_GROUP[type] ?? "OTHER";
}

export function claimNature(type: ClaimType): ClaimNature {
  return CLAIM_NATURE[type] ?? "OTHER";
}

export function isCausalClaim(type: ClaimType): boolean {
  return claimNature(type) === "CAUSAL";
}

export function isBehavioralClaim(type: ClaimType): boolean {
  return claimNature(type) === "BEHAVIORAL";
}

/** The claim a value-chain node states, by ladder level. */
export const CLAIM_TYPE_BY_LEVEL: Record<ValueChainLevel, ClaimType> = {
  MECHANISM: "MECHANISM_FEASIBLE",
  CAPABILITY: "CAPABILITY_EXISTS",
  TRANSFORMATION: "TRANSFORMATION_OCCURS",
  OPERATIONAL_VALUE: "OPERATIONAL_VALUE",
  ECONOMIC_VALUE: "ECONOMIC_VALUE",
  STRATEGIC_OUTCOME: "STRATEGIC_OUTCOME",
  BUSINESS_OUTCOME: "BUSINESS_OUTCOME",
};

export function claimTypeForLevel(level: ValueChainLevel): ClaimType {
  return CLAIM_TYPE_BY_LEVEL[level];
}

/** The causal claim a link states, by (from → to) levels; non-adjacent links are generic. */
export function claimTypeForLink(from: ValueChainLevel, to: ValueChainLevel): ClaimType {
  const key = `${from}>${to}`;
  switch (key) {
    case "MECHANISM>CAPABILITY":
      return "MECHANISM_CAUSES_CAPABILITY";
    case "CAPABILITY>TRANSFORMATION":
      return "CAPABILITY_CAUSES_TRANSFORMATION";
    case "TRANSFORMATION>OPERATIONAL_VALUE":
      return "TRANSFORMATION_CAUSES_OPERATIONAL_VALUE";
    case "OPERATIONAL_VALUE>ECONOMIC_VALUE":
      return "OPERATIONAL_VALUE_CAUSES_ECONOMIC_VALUE";
    case "ECONOMIC_VALUE>STRATEGIC_OUTCOME":
      return "ECONOMIC_VALUE_CAUSES_STRATEGIC_OUTCOME";
    case "STRATEGIC_OUTCOME>BUSINESS_OUTCOME":
      return "STRATEGIC_OUTCOME_CAUSES_BUSINESS_OUTCOME";
    default:
      return "CAUSAL_EFFECT";
  }
}

/** Problem-side claim types that feed each problem rung of the Proof Frontier. */
export const RUNG_CLAIM_TYPES: Partial<Record<ProofRung, ClaimType[]>> = {
  VARIABLE_IMPORTANCE: ["VARIABLE_IMPORTANCE", "CURRENT_STATE", "ICP_EXISTS", "MARKET_EXISTS"],
  PAIN: ["PAIN_EXISTS", "PAIN_SEVERITY", "PAIN_FREQUENCY", "TRIGGER_EXISTS", "ALTERNATIVE_EXISTS"],
  ECONOMIC_PAIN: ["ECONOMIC_IMPACT", "MAGNITUDE", "POPULATION_AFFECTED"],
};

/** The claim each problem rung is assessed as (for evidence without a typed link). */
export const RUNG_PRIMARY_CLAIM: Record<
  "VARIABLE_IMPORTANCE" | "PAIN" | "ECONOMIC_PAIN",
  ClaimType
> = {
  VARIABLE_IMPORTANCE: "VARIABLE_IMPORTANCE",
  PAIN: "PAIN_EXISTS",
  ECONOMIC_PAIN: "ECONOMIC_IMPACT",
};

/** Claim types that speak to the problem (feed Evidence Confidence). */
export const PROBLEM_CLAIM_TYPES: ReadonlySet<ClaimType> = new Set<ClaimType>([
  ...RUNG_CLAIM_TYPES.VARIABLE_IMPORTANCE!,
  ...RUNG_CLAIM_TYPES.PAIN!,
  ...RUNG_CLAIM_TYPES.ECONOMIC_PAIN!,
]);

/**
 * The commercial ladder. Evidence for one rung never implies the rungs above:
 * existing spend is not willingness to pay; stated willingness is not a purchase.
 */
export const COMMERCIAL_LADDER: ClaimType[] = [
  "EXISTING_SPEND",
  "PURCHASE_INTENT",
  "WILLINGNESS_TO_PAY",
  "PRICE_ACCEPTANCE",
  "ACTUAL_PURCHASE",
];

/** Selectable problem / commercial / access claims for an opportunity. */
export const SELECTABLE_CLAIM_TYPES: ClaimType[] = [
  "MARKET_EXISTS",
  "ICP_EXISTS",
  "ICP_ACCESSIBLE",
  "PAIN_EXISTS",
  "PAIN_SEVERITY",
  "PAIN_FREQUENCY",
  "CURRENT_STATE",
  "TRIGGER_EXISTS",
  "ALTERNATIVE_EXISTS",
  "VARIABLE_IMPORTANCE",
  "MAGNITUDE",
  "POPULATION_AFFECTED",
  "ECONOMIC_IMPACT",
  "MECHANISM_FEASIBLE",
  ...COMMERCIAL_LADDER,
  "RETENTION_INTENT",
  "ACTUAL_RETENTION",
  "BUYER_REACHABILITY",
  "CHANNEL_ACCESS",
  "PROCUREMENT_FEASIBILITY",
  "OTHER",
];

/**
 * Migration map from the legacy generic claim types. Mirrors the SQL in
 * migration 20260908120000_evidence_fitness; kept here so the rule is tested.
 * Legacy VALUE_CHAIN_NODE / CAUSAL_LINK take the type of their level / link.
 */
export const LEGACY_CLAIM_TYPE_MAP: Record<string, ClaimType> = {
  ICP: "ICP_EXISTS",
  VARIABLE: "VARIABLE_IMPORTANCE",
  CURRENT_STATE: "CURRENT_STATE",
  PAIN: "PAIN_EXISTS",
  MAGNITUDE: "MAGNITUDE",
  FREQUENCY: "PAIN_FREQUENCY",
  ECONOMIC_IMPACT: "ECONOMIC_IMPACT",
  MECHANISM: "MECHANISM_FEASIBLE",
  // Stated willingness stays stated willingness: never promoted, never demoted.
  WILLINGNESS_TO_PAY: "WILLINGNESS_TO_PAY",
  ALTERNATIVE: "ALTERNATIVE_EXISTS",
  TRIGGER: "TRIGGER_EXISTS",
};

export function migrateLegacyClaimType(
  legacy: string,
  target: {
    level?: ValueChainLevel | null;
    from?: ValueChainLevel | null;
    to?: ValueChainLevel | null;
  } = {},
): ClaimType {
  if (legacy === "VALUE_CHAIN_NODE")
    return target.level ? claimTypeForLevel(target.level) : "OTHER";
  if (legacy === "CAUSAL_LINK")
    return target.from && target.to ? claimTypeForLink(target.from, target.to) : "CAUSAL_EFFECT";
  return LEGACY_CLAIM_TYPE_MAP[legacy] ?? "OTHER";
}
