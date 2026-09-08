/**
 * Evidence admissibility matrix — [source type × claim type] → HIGH | MEDIUM |
 * LOW | NOT_ADMISSIBLE. Centralized, deterministic and versioned; the UI
 * never hardcodes a judgement and the model can never override a cell.
 *
 * Rules are written per claim: a default level, a level per source family
 * and per-source overrides. Resolution order: source override → family
 * level → default. The resolution path is returned so every judgement is
 * inspectable ("interview × causal effect: LOW — family rule, self-reported").
 *
 * Principles encoded here:
 *   - interviews establish that a pain exists; they do not establish causality
 *   - operational records establish frequency and magnitude; forums do not
 *   - feasibility is established by technical work, never by forums
 *   - causality is established by controlled or randomized designs
 *   - willingness to pay is established by pricing behaviour; existing spend is
 *     evidence of existing spend, not of willingness to pay for something new
 *   - an actual purchase is established by transactions, never by interviews
 */
import type {
  ClaimType,
  EvidenceAdmissibility,
  EvidenceSourceType,
} from "@/generated/prisma/enums";
import { CLAIM_TYPES } from "./claim-taxonomy";
import { SOURCE_TYPES, sourceFamily, type EvidenceSourceFamily } from "./evidence-sources";

export const ADMISSIBILITY_VERSION = "2026-09-08.1";

type Level = EvidenceAdmissibility;
type FamilyLevels = Partial<Record<EvidenceSourceFamily, Level>>;
type SourceLevels = Partial<Record<EvidenceSourceType, Level>>;

export interface AdmissibilityRule {
  default: Level;
  families: FamilyLevels;
  sources: SourceLevels;
}

const H: Level = "HIGH";
const M: Level = "MEDIUM";
const L: Level = "LOW";
const N: Level = "NOT_ADMISSIBLE";

function rule(
  def: Level,
  families: FamilyLevels = {},
  sources: SourceLevels = {},
): AdmissibilityRule {
  return { default: def, families, sources };
}

/** Shared family profiles. */
const CAUSAL_RULE = rule(
  L,
  {
    EXPERIMENTAL: L,
    SELF_REPORTED: L,
    OPERATIONAL: L,
    BEHAVIORAL: L,
    MARKET: N,
    TECHNICAL: N,
    COMMERCIAL: L,
    UNKNOWN: N,
  },
  {
    RANDOMIZED_EXPERIMENT: H,
    AB_TEST: H,
    CONTROLLED_EXPERIMENT: H,
    MATCHED_COMPARISON: M,
    BEFORE_AFTER_TEST: M,
    // Concierge and prototype runs are before/after interventions by nature;
    // the fitness engine then scales them by their effective design level.
    CONCIERGE_TEST: M,
    PROTOTYPE_TEST: M,
    LANDING_PAGE_EXPERIMENT: N,
    PRICING_EXPERIMENT: L,
    FORUM_POST: N,
    REDDIT_POST: N,
    COMPETITOR_REVIEW: L,
  },
);

const OUTCOME_RULE = rule(
  L,
  {
    EXPERIMENTAL: H,
    OPERATIONAL: H,
    BEHAVIORAL: H,
    COMMERCIAL: M,
    SELF_REPORTED: L,
    MARKET: L,
    TECHNICAL: N,
    UNKNOWN: L,
  },
  {
    INTERVIEW: M,
    SALES_CONVERSATION: L,
    FORUM_POST: L,
    REDDIT_POST: L,
    LANDING_PAGE_EXPERIMENT: L,
    PRICING_EXPERIMENT: L,
    COMPETITOR_REVIEW: N,
  },
);

const MAGNITUDE_RULE = rule(
  L,
  {
    OPERATIONAL: H,
    BEHAVIORAL: M,
    SELF_REPORTED: M,
    MARKET: L,
    EXPERIMENTAL: M,
    TECHNICAL: N,
    COMMERCIAL: L,
    UNKNOWN: L,
  },
  {
    FORUM_POST: L,
    REDDIT_POST: L,
    CUSTOMER_QUOTE: L,
    COMPETITOR_REVIEW: N,
    INDUSTRY_REPORT: M,
    GOVERNMENT_DATA: M,
    PUBLIC_FINANCIALS: M,
    INVOICE: M,
    LANDING_PAGE_EXPERIMENT: L,
  },
);

const REACH_RULE = rule(
  L,
  {
    SELF_REPORTED: M,
    EXPERIMENTAL: M,
    COMMERCIAL: H,
    BEHAVIORAL: M,
    MARKET: L,
    OPERATIONAL: L,
    TECHNICAL: N,
    UNKNOWN: L,
  },
  {
    SALES_CONVERSATION: H,
    LANDING_PAGE_EXPERIMENT: H,
    CRM_DATA: H,
    FORUM_POST: L,
    REDDIT_POST: L,
  },
);

export const ADMISSIBILITY_RULES: Record<ClaimType, AdmissibilityRule> = {
  MARKET_EXISTS: rule(
    L,
    {
      MARKET: H,
      SELF_REPORTED: M,
      OPERATIONAL: M,
      BEHAVIORAL: M,
      COMMERCIAL: M,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    { COMPETITOR_REVIEW: M, FORUM_POST: L, REDDIT_POST: L },
  ),
  ICP_EXISTS: rule(
    L,
    {
      SELF_REPORTED: H,
      MARKET: M,
      BEHAVIORAL: M,
      OPERATIONAL: M,
      COMMERCIAL: H,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    { JOB_POSTING: H, FORUM_POST: M, REDDIT_POST: M },
  ),
  ICP_ACCESSIBLE: REACH_RULE,
  PAIN_EXISTS: rule(
    L,
    {
      SELF_REPORTED: H,
      BEHAVIORAL: H,
      OPERATIONAL: M,
      COMMERCIAL: M,
      MARKET: L,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    {
      FORUM_POST: M,
      REDDIT_POST: M,
      COMPETITOR_REVIEW: M,
      JOB_POSTING: M,
      SUPPORT_TICKETS: H,
      AB_TEST: L,
    },
  ),
  PAIN_SEVERITY: rule(
    L,
    {
      SELF_REPORTED: M,
      BEHAVIORAL: H,
      OPERATIONAL: H,
      MARKET: L,
      EXPERIMENTAL: L,
      TECHNICAL: N,
      COMMERCIAL: L,
    },
    { INTERVIEW: H, FORUM_POST: L, REDDIT_POST: L },
  ),
  PAIN_FREQUENCY: rule(
    L,
    {
      OPERATIONAL: H,
      BEHAVIORAL: H,
      SELF_REPORTED: M,
      MARKET: L,
      EXPERIMENTAL: L,
      TECHNICAL: N,
      COMMERCIAL: L,
    },
    { FORUM_POST: L, REDDIT_POST: L, CUSTOMER_QUOTE: L },
  ),
  CURRENT_STATE: rule(
    L,
    {
      SELF_REPORTED: H,
      BEHAVIORAL: H,
      OPERATIONAL: H,
      MARKET: L,
      EXPERIMENTAL: L,
      TECHNICAL: L,
      COMMERCIAL: L,
    },
    { JOB_POSTING: M, FORUM_POST: M, REDDIT_POST: M },
  ),
  TRIGGER_EXISTS: rule(
    L,
    {
      SELF_REPORTED: H,
      BEHAVIORAL: H,
      OPERATIONAL: M,
      MARKET: L,
      EXPERIMENTAL: L,
      TECHNICAL: N,
      COMMERCIAL: L,
    },
    { FORUM_POST: M, REDDIT_POST: M, SUPPORT_TICKETS: H },
  ),
  ALTERNATIVE_EXISTS: rule(
    L,
    {
      MARKET: H,
      SELF_REPORTED: H,
      BEHAVIORAL: M,
      OPERATIONAL: M,
      COMMERCIAL: M,
      EXPERIMENTAL: L,
      TECHNICAL: L,
    },
    { FORUM_POST: M, REDDIT_POST: M, INDUSTRY_REPORT: M },
  ),
  VARIABLE_IMPORTANCE: rule(
    L,
    {
      SELF_REPORTED: H,
      COMMERCIAL: H,
      OPERATIONAL: M,
      BEHAVIORAL: M,
      MARKET: M,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    { FORUM_POST: M, REDDIT_POST: M, COMPETITOR_REVIEW: L },
  ),
  MAGNITUDE: MAGNITUDE_RULE,
  POPULATION_AFFECTED: rule(
    L,
    {
      MARKET: H,
      SELF_REPORTED: M,
      OPERATIONAL: M,
      BEHAVIORAL: M,
      EXPERIMENTAL: L,
      TECHNICAL: N,
      COMMERCIAL: L,
    },
    {
      SURVEY: H,
      INTERVIEW: L,
      CUSTOMER_QUOTE: L,
      FORUM_POST: L,
      REDDIT_POST: L,
      COMPETITOR_REVIEW: L,
    },
  ),
  ECONOMIC_IMPACT: MAGNITUDE_RULE,
  OPERATIONAL_VALUE: OUTCOME_RULE,
  ECONOMIC_VALUE: rule(
    L,
    {
      OPERATIONAL: H,
      EXPERIMENTAL: H,
      BEHAVIORAL: M,
      COMMERCIAL: M,
      SELF_REPORTED: L,
      MARKET: L,
      TECHNICAL: N,
    },
    {
      FINANCIAL_RECORDS: H,
      INTERVIEW: M,
      LANDING_PAGE_EXPERIMENT: L,
      PRICING_EXPERIMENT: L,
      COMPETITOR_REVIEW: N,
    },
  ),
  STRATEGIC_OUTCOME: rule(
    L,
    {
      OPERATIONAL: H,
      COMMERCIAL: H,
      BEHAVIORAL: M,
      EXPERIMENTAL: M,
      SELF_REPORTED: L,
      MARKET: L,
      TECHNICAL: N,
    },
    { RENEWAL: H, EXPANSION: H, PUBLIC_FINANCIALS: M, INTERVIEW: M, COMPETITOR_REVIEW: N },
  ),
  BUSINESS_OUTCOME: rule(
    L,
    {
      OPERATIONAL: H,
      COMMERCIAL: H,
      BEHAVIORAL: M,
      EXPERIMENTAL: M,
      SELF_REPORTED: L,
      MARKET: M,
      TECHNICAL: N,
    },
    { PUBLIC_FINANCIALS: H, FINANCIAL_RECORDS: H, INTERVIEW: L, COMPETITOR_REVIEW: N },
  ),
  MECHANISM_FEASIBLE: rule(
    L,
    {
      TECHNICAL: H,
      EXPERIMENTAL: H,
      OPERATIONAL: M,
      SELF_REPORTED: L,
      BEHAVIORAL: L,
      MARKET: L,
      COMMERCIAL: L,
    },
    {
      FORUM_POST: N,
      REDDIT_POST: N,
      COMPETITOR_REVIEW: M,
      LANDING_PAGE_EXPERIMENT: N,
      PRICING_EXPERIMENT: N,
    },
  ),
  CAPABILITY_EXISTS: rule(
    L,
    {
      EXPERIMENTAL: H,
      TECHNICAL: H,
      BEHAVIORAL: H,
      OPERATIONAL: M,
      SELF_REPORTED: L,
      MARKET: L,
      COMMERCIAL: L,
    },
    {
      FORUM_POST: N,
      REDDIT_POST: N,
      LANDING_PAGE_EXPERIMENT: N,
      PRICING_EXPERIMENT: N,
      COMPETITOR_REVIEW: L,
    },
  ),
  TRANSFORMATION_OCCURS: rule(
    L,
    {
      EXPERIMENTAL: H,
      OPERATIONAL: H,
      BEHAVIORAL: H,
      COMMERCIAL: L,
      SELF_REPORTED: L,
      MARKET: L,
      TECHNICAL: L,
    },
    { INTERVIEW: M, LANDING_PAGE_EXPERIMENT: N, PRICING_EXPERIMENT: N, COMPETITOR_REVIEW: N },
  ),
  MECHANISM_CAUSES_CAPABILITY: CAUSAL_RULE,
  CAPABILITY_CAUSES_TRANSFORMATION: CAUSAL_RULE,
  TRANSFORMATION_CAUSES_OPERATIONAL_VALUE: CAUSAL_RULE,
  OPERATIONAL_VALUE_CAUSES_ECONOMIC_VALUE: CAUSAL_RULE,
  ECONOMIC_VALUE_CAUSES_STRATEGIC_OUTCOME: CAUSAL_RULE,
  STRATEGIC_OUTCOME_CAUSES_BUSINESS_OUTCOME: CAUSAL_RULE,
  CAUSAL_EFFECT: CAUSAL_RULE,
  EXISTING_SPEND: rule(
    L,
    {
      OPERATIONAL: H,
      COMMERCIAL: H,
      SELF_REPORTED: H,
      BEHAVIORAL: H,
      MARKET: M,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    {
      FORUM_POST: M,
      REDDIT_POST: M,
      SURVEY: M,
      PRICING_PAGE: M,
      PUBLIC_FINANCIALS: M,
      INDUSTRY_REPORT: M,
    },
  ),
  PURCHASE_INTENT: rule(
    L,
    {
      SELF_REPORTED: H,
      EXPERIMENTAL: M,
      COMMERCIAL: H,
      BEHAVIORAL: M,
      OPERATIONAL: L,
      MARKET: L,
      TECHNICAL: N,
    },
    { SURVEY: M, FORUM_POST: L, REDDIT_POST: L, LANDING_PAGE_EXPERIMENT: H, PRICING_EXPERIMENT: H },
  ),
  WILLINGNESS_TO_PAY: rule(
    L,
    {
      EXPERIMENTAL: L,
      COMMERCIAL: H,
      SELF_REPORTED: M,
      BEHAVIORAL: L,
      OPERATIONAL: L,
      MARKET: L,
      TECHNICAL: N,
    },
    {
      PRICING_EXPERIMENT: H,
      LANDING_PAGE_EXPERIMENT: M,
      PAID_PILOT: H,
      SUBSCRIPTION_PURCHASE: H,
      CONTRACT: H,
      INVOICE: H,
      SIGNED_LOI: M,
      SURVEY: L,
      FORUM_POST: L,
      REDDIT_POST: L,
      CUSTOMER_QUOTE: L,
    },
  ),
  PRICE_ACCEPTANCE: rule(
    L,
    {
      EXPERIMENTAL: L,
      COMMERCIAL: H,
      SELF_REPORTED: L,
      BEHAVIORAL: M,
      OPERATIONAL: L,
      MARKET: L,
      TECHNICAL: N,
    },
    { PRICING_EXPERIMENT: H, SIGNED_LOI: M, PURCHASE_BEHAVIOR: H },
  ),
  ACTUAL_PURCHASE: rule(
    N,
    {
      COMMERCIAL: H,
      OPERATIONAL: H,
      BEHAVIORAL: H,
      SELF_REPORTED: N,
      EXPERIMENTAL: L,
      MARKET: N,
      TECHNICAL: N,
    },
    { PRICING_EXPERIMENT: M, SIGNED_LOI: L, PURCHASE_BEHAVIOR: H, TRANSACTION_RECORDS: H },
  ),
  RETENTION_INTENT: rule(
    L,
    {
      SELF_REPORTED: H,
      BEHAVIORAL: M,
      COMMERCIAL: M,
      OPERATIONAL: L,
      MARKET: L,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    { FORUM_POST: L, REDDIT_POST: L },
  ),
  ACTUAL_RETENTION: rule(
    N,
    {
      COMMERCIAL: H,
      BEHAVIORAL: H,
      OPERATIONAL: H,
      SELF_REPORTED: N,
      EXPERIMENTAL: L,
      MARKET: N,
      TECHNICAL: N,
    },
    { RENEWAL: H, EXPANSION: H, PRODUCT_USAGE: H },
  ),
  BUYER_REACHABILITY: REACH_RULE,
  CHANNEL_ACCESS: REACH_RULE,
  PROCUREMENT_FEASIBILITY: rule(
    L,
    {
      SELF_REPORTED: M,
      COMMERCIAL: H,
      MARKET: M,
      BEHAVIORAL: L,
      OPERATIONAL: L,
      EXPERIMENTAL: L,
      TECHNICAL: N,
    },
    { INTERVIEW: M, SALES_CONVERSATION: H, FORUM_POST: L, REDDIT_POST: L },
  ),
  // No strong automated judgement for untyped claims: nothing above LOW.
  OTHER: rule(L, { TECHNICAL: L, UNKNOWN: L }, {}),
};

export type AdmissibilityRuleSource = "source" | "family" | "default";

export interface AdmissibilityResult {
  level: EvidenceAdmissibility;
  ruleSource: AdmissibilityRuleSource;
  family: EvidenceSourceFamily;
  version: string;
  explanation: string;
}

export const ADMISSIBILITY_LABELS: Record<EvidenceAdmissibility, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  NOT_ADMISSIBLE: "Not admissible",
};

/** Numeric value of an admissibility level inside the fitness score (0–1). */
export const ADMISSIBILITY_VALUE: Record<EvidenceAdmissibility, number> = {
  HIGH: 1,
  MEDIUM: 0.6,
  LOW: 0.3,
  NOT_ADMISSIBLE: 0,
};

/** Maximum fitness a source of this admissibility can reach for the claim. */
export const ADMISSIBILITY_FIT_CAP: Record<EvidenceAdmissibility, number> = {
  HIGH: 100,
  MEDIUM: 69,
  LOW: 39,
  NOT_ADMISSIBLE: 0,
};

export function admissibility(
  sourceType: EvidenceSourceType,
  claimType: ClaimType,
): AdmissibilityResult {
  const r = ADMISSIBILITY_RULES[claimType] ?? ADMISSIBILITY_RULES.OTHER;
  const family = sourceFamily(sourceType);
  // Unknown-provenance sources never exceed LOW, whatever the claim says.
  if (family === "UNKNOWN") {
    const level: Level =
      r.families.UNKNOWN ?? (r.default === "NOT_ADMISSIBLE" ? "NOT_ADMISSIBLE" : "LOW");
    return {
      level,
      ruleSource: "family",
      family,
      version: ADMISSIBILITY_VERSION,
      explanation: `${ADMISSIBILITY_LABELS[level]}: a source of unknown provenance cannot be more than low-admissibility evidence.`,
    };
  }
  const source = r.sources[sourceType];
  if (source) {
    return {
      level: source,
      ruleSource: "source",
      family,
      version: ADMISSIBILITY_VERSION,
      explanation: `${ADMISSIBILITY_LABELS[source]}: source-specific rule for this claim type (matrix ${ADMISSIBILITY_VERSION}).`,
    };
  }
  const fam = r.families[family];
  if (fam) {
    return {
      level: fam,
      ruleSource: "family",
      family,
      version: ADMISSIBILITY_VERSION,
      explanation: `${ADMISSIBILITY_LABELS[fam]}: family rule (${family.toLowerCase().replace("_", "-")} sources) for this claim type.`,
    };
  }
  return {
    level: r.default,
    ruleSource: "default",
    family,
    version: ADMISSIBILITY_VERSION,
    explanation: `${ADMISSIBILITY_LABELS[r.default]}: default for this claim type; no family or source rule applies.`,
  };
}

export function admissibilityLevel(
  sourceType: EvidenceSourceType,
  claimType: ClaimType,
): EvidenceAdmissibility {
  return admissibility(sourceType, claimType).level;
}

/** Source types that are HIGH-admissibility evidence for a claim (for "what would strengthen"). */
export function highAdmissibilitySources(claimType: ClaimType): EvidenceSourceType[] {
  return SOURCE_TYPES.filter((source) => admissibilityLevel(source, claimType) === "HIGH");
}

/** Every [source, claim] cell, for audits and tests. */
export function admissibilityMatrix(): Array<{
  sourceType: EvidenceSourceType;
  claimType: ClaimType;
  level: EvidenceAdmissibility;
}> {
  const rows: Array<{
    sourceType: EvidenceSourceType;
    claimType: ClaimType;
    level: EvidenceAdmissibility;
  }> = [];
  for (const claimType of CLAIM_TYPES) {
    for (const sourceType of SOURCE_TYPES) {
      rows.push({ sourceType, claimType, level: admissibilityLevel(sourceType, claimType) });
    }
  }
  return rows;
}
