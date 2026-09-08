/**
 * Evidence source taxonomy — what kind of thing a piece of evidence is.
 * Source types are grouped into families; the admissibility matrix is
 * written per family with per-source overrides, and the fitness engine reads
 * a method-quality baseline and an implied design level from here.
 */
import type {
  EvidenceSourceType,
  EvidenceType,
  ExperimentDesignLevel,
  ExperimentType,
} from "@/generated/prisma/enums";

export type EvidenceSourceFamily =
  | "SELF_REPORTED"
  | "BEHAVIORAL"
  | "OPERATIONAL"
  | "MARKET"
  | "EXPERIMENTAL"
  | "TECHNICAL"
  | "COMMERCIAL"
  | "UNKNOWN";

export const SOURCE_FAMILY_LABELS: Record<EvidenceSourceFamily, string> = {
  SELF_REPORTED: "Self-reported",
  BEHAVIORAL: "Behavioral",
  OPERATIONAL: "Operational data",
  MARKET: "Market",
  EXPERIMENTAL: "Experimental",
  TECHNICAL: "Technical",
  COMMERCIAL: "Commercial",
  UNKNOWN: "Unknown provenance",
};

export const SOURCE_FAMILY: Record<EvidenceSourceType, EvidenceSourceFamily> = {
  INTERVIEW: "SELF_REPORTED",
  SURVEY: "SELF_REPORTED",
  CUSTOMER_QUOTE: "SELF_REPORTED",
  FORUM_POST: "SELF_REPORTED",
  REDDIT_POST: "SELF_REPORTED",
  SALES_CONVERSATION: "SELF_REPORTED",
  OBSERVED_WORKFLOW: "BEHAVIORAL",
  PRODUCT_USAGE: "BEHAVIORAL",
  CLICKSTREAM: "BEHAVIORAL",
  PURCHASE_BEHAVIOR: "BEHAVIORAL",
  CRM_DATA: "BEHAVIORAL",
  TRANSACTION_RECORDS: "OPERATIONAL",
  FINANCIAL_RECORDS: "OPERATIONAL",
  SYSTEM_LOGS: "OPERATIONAL",
  BOOKING_DATA: "OPERATIONAL",
  POS_DATA: "OPERATIONAL",
  ERP_DATA: "OPERATIONAL",
  SUPPORT_TICKETS: "OPERATIONAL",
  TIME_TRACKING_DATA: "OPERATIONAL",
  COMPETITOR_REVIEW: "MARKET",
  PRICING_PAGE: "MARKET",
  JOB_POSTING: "MARKET",
  PUBLIC_FINANCIALS: "MARKET",
  INDUSTRY_REPORT: "MARKET",
  GOVERNMENT_DATA: "MARKET",
  MARKET_DATASET: "MARKET",
  PROTOTYPE_TEST: "EXPERIMENTAL",
  CONCIERGE_TEST: "EXPERIMENTAL",
  BEFORE_AFTER_TEST: "EXPERIMENTAL",
  MATCHED_COMPARISON: "EXPERIMENTAL",
  CONTROLLED_EXPERIMENT: "EXPERIMENTAL",
  AB_TEST: "EXPERIMENTAL",
  RANDOMIZED_EXPERIMENT: "EXPERIMENTAL",
  PRICING_EXPERIMENT: "EXPERIMENTAL",
  LANDING_PAGE_EXPERIMENT: "EXPERIMENTAL",
  TECHNICAL_SPIKE: "TECHNICAL",
  BENCHMARK: "TECHNICAL",
  DATA_FEASIBILITY_STUDY: "TECHNICAL",
  INTEGRATION_TEST: "TECHNICAL",
  LOAD_TEST: "TECHNICAL",
  SIGNED_LOI: "COMMERCIAL",
  PAID_PILOT: "COMMERCIAL",
  CONTRACT: "COMMERCIAL",
  INVOICE: "COMMERCIAL",
  SUBSCRIPTION_PURCHASE: "COMMERCIAL",
  RENEWAL: "COMMERCIAL",
  EXPANSION: "COMMERCIAL",
  OTHER: "UNKNOWN",
};

export const SOURCE_TYPES: EvidenceSourceType[] = Object.keys(
  SOURCE_FAMILY,
) as EvidenceSourceType[];

export function sourceFamily(type: EvidenceSourceType): EvidenceSourceFamily {
  return SOURCE_FAMILY[type] ?? "UNKNOWN";
}

/** Families whose evidence is a measurement or observation rather than a statement. */
export const MEASUREMENT_FAMILIES: ReadonlySet<EvidenceSourceFamily> =
  new Set<EvidenceSourceFamily>([
    "BEHAVIORAL",
    "OPERATIONAL",
    "EXPERIMENTAL",
    "TECHNICAL",
    "COMMERCIAL",
  ]);

export function isMeasurementSource(type: EvidenceSourceType): boolean {
  return MEASUREMENT_FAMILIES.has(sourceFamily(type));
}

/** Third-party sources: not the customer speaking or acting. */
export const THIRD_PARTY_FAMILIES: ReadonlySet<EvidenceSourceFamily> =
  new Set<EvidenceSourceFamily>(["MARKET", "UNKNOWN"]);

/**
 * Method-quality baseline of each source type (0–1), before the per-item
 * strength score, internal validity and design level are applied.
 */
export const METHOD_QUALITY_BASE: Record<EvidenceSourceType, number> = {
  INTERVIEW: 0.6,
  SURVEY: 0.65,
  CUSTOMER_QUOTE: 0.5,
  FORUM_POST: 0.3,
  REDDIT_POST: 0.3,
  SALES_CONVERSATION: 0.55,
  OBSERVED_WORKFLOW: 0.8,
  PRODUCT_USAGE: 0.85,
  CLICKSTREAM: 0.8,
  PURCHASE_BEHAVIOR: 0.9,
  CRM_DATA: 0.75,
  TRANSACTION_RECORDS: 0.9,
  FINANCIAL_RECORDS: 0.9,
  SYSTEM_LOGS: 0.85,
  BOOKING_DATA: 0.85,
  POS_DATA: 0.85,
  ERP_DATA: 0.85,
  SUPPORT_TICKETS: 0.75,
  TIME_TRACKING_DATA: 0.8,
  COMPETITOR_REVIEW: 0.4,
  PRICING_PAGE: 0.6,
  JOB_POSTING: 0.5,
  PUBLIC_FINANCIALS: 0.8,
  INDUSTRY_REPORT: 0.6,
  GOVERNMENT_DATA: 0.8,
  MARKET_DATASET: 0.7,
  PROTOTYPE_TEST: 0.7,
  CONCIERGE_TEST: 0.7,
  BEFORE_AFTER_TEST: 0.7,
  MATCHED_COMPARISON: 0.85,
  CONTROLLED_EXPERIMENT: 0.95,
  AB_TEST: 0.95,
  RANDOMIZED_EXPERIMENT: 1,
  PRICING_EXPERIMENT: 0.8,
  LANDING_PAGE_EXPERIMENT: 0.65,
  TECHNICAL_SPIKE: 0.75,
  BENCHMARK: 0.9,
  DATA_FEASIBILITY_STUDY: 0.85,
  INTEGRATION_TEST: 0.9,
  LOAD_TEST: 0.9,
  SIGNED_LOI: 0.8,
  PAID_PILOT: 0.9,
  CONTRACT: 0.95,
  INVOICE: 0.95,
  SUBSCRIPTION_PURCHASE: 0.95,
  RENEWAL: 0.95,
  EXPANSION: 0.95,
  OTHER: 0.3,
};

/**
 * Design level implied by a source type when no experiment record says
 * otherwise. Self-reported sources are anecdotal; records are observational;
 * only experimental designs go higher.
 */
export const IMPLIED_DESIGN_LEVEL: Record<EvidenceSourceType, ExperimentDesignLevel> = {
  INTERVIEW: "ANECDOTAL",
  SURVEY: "ANECDOTAL",
  CUSTOMER_QUOTE: "ANECDOTAL",
  FORUM_POST: "ANECDOTAL",
  REDDIT_POST: "ANECDOTAL",
  SALES_CONVERSATION: "ANECDOTAL",
  OBSERVED_WORKFLOW: "OBSERVATIONAL",
  PRODUCT_USAGE: "OBSERVATIONAL",
  CLICKSTREAM: "OBSERVATIONAL",
  PURCHASE_BEHAVIOR: "OBSERVATIONAL",
  CRM_DATA: "OBSERVATIONAL",
  TRANSACTION_RECORDS: "OBSERVATIONAL",
  FINANCIAL_RECORDS: "OBSERVATIONAL",
  SYSTEM_LOGS: "OBSERVATIONAL",
  BOOKING_DATA: "OBSERVATIONAL",
  POS_DATA: "OBSERVATIONAL",
  ERP_DATA: "OBSERVATIONAL",
  SUPPORT_TICKETS: "OBSERVATIONAL",
  TIME_TRACKING_DATA: "OBSERVATIONAL",
  COMPETITOR_REVIEW: "ANECDOTAL",
  PRICING_PAGE: "OBSERVATIONAL",
  JOB_POSTING: "OBSERVATIONAL",
  PUBLIC_FINANCIALS: "OBSERVATIONAL",
  INDUSTRY_REPORT: "OBSERVATIONAL",
  GOVERNMENT_DATA: "OBSERVATIONAL",
  MARKET_DATASET: "OBSERVATIONAL",
  PROTOTYPE_TEST: "BEFORE_AFTER",
  CONCIERGE_TEST: "BEFORE_AFTER",
  BEFORE_AFTER_TEST: "BEFORE_AFTER",
  MATCHED_COMPARISON: "MATCHED_COMPARISON",
  CONTROLLED_EXPERIMENT: "CONTROLLED",
  AB_TEST: "RANDOMIZED",
  RANDOMIZED_EXPERIMENT: "RANDOMIZED",
  PRICING_EXPERIMENT: "OBSERVATIONAL",
  LANDING_PAGE_EXPERIMENT: "OBSERVATIONAL",
  TECHNICAL_SPIKE: "OBSERVATIONAL",
  BENCHMARK: "OBSERVATIONAL",
  DATA_FEASIBILITY_STUDY: "OBSERVATIONAL",
  INTEGRATION_TEST: "OBSERVATIONAL",
  LOAD_TEST: "OBSERVATIONAL",
  SIGNED_LOI: "OBSERVATIONAL",
  PAID_PILOT: "BEFORE_AFTER",
  CONTRACT: "OBSERVATIONAL",
  INVOICE: "OBSERVATIONAL",
  SUBSCRIPTION_PURCHASE: "OBSERVATIONAL",
  RENEWAL: "OBSERVATIONAL",
  EXPANSION: "OBSERVATIONAL",
  OTHER: "ANECDOTAL",
};

/** Source type produced by each experiment type (the result becomes evidence). */
export const SOURCE_TYPE_BY_EXPERIMENT: Record<ExperimentType, EvidenceSourceType> = {
  CUSTOMER_INTERVIEW: "INTERVIEW",
  PRICING_TEST: "PRICING_EXPERIMENT",
  LANDING_PAGE_TEST: "LANDING_PAGE_EXPERIMENT",
  CONCIERGE_TEST: "CONCIERGE_TEST",
  PROTOTYPE_TEST: "PROTOTYPE_TEST",
  DATA_FEASIBILITY_TEST: "DATA_FEASIBILITY_STUDY",
  AB_TEST: "AB_TEST",
  MANUAL_WORKFLOW_TEST: "CONCIERGE_TEST",
  COHORT_OBSERVATION: "OBSERVED_WORKFLOW",
  TECHNICAL_SPIKE: "TECHNICAL_SPIKE",
  RETROSPECTIVE_DATA_ANALYSIS: "TRANSACTION_RECORDS",
  OTHER: "OTHER",
};

/**
 * Source type for an experiment result: the declared design level refines
 * the experiment type (a concierge test run as a randomized comparison is
 * randomized evidence; a data feasibility study never becomes one).
 */
export function sourceTypeForExperiment(
  experimentType: ExperimentType,
  designLevel?: ExperimentDesignLevel | null,
): EvidenceSourceType {
  const base = SOURCE_TYPE_BY_EXPERIMENT[experimentType] ?? "OTHER";
  const family = sourceFamily(base);
  if (family !== "EXPERIMENTAL" && family !== "UNKNOWN") return base;
  switch (designLevel) {
    case "RANDOMIZED":
      return base === "AB_TEST" ? "AB_TEST" : "RANDOMIZED_EXPERIMENT";
    case "CONTROLLED":
      return "CONTROLLED_EXPERIMENT";
    case "MATCHED_COMPARISON":
      return "MATCHED_COMPARISON";
    case "BEFORE_AFTER":
      return base === "OTHER" ? "BEFORE_AFTER_TEST" : base;
    default:
      return base;
  }
}

/** Legacy evidence type → source type (same rule as the migration backfill). */
export const SOURCE_TYPE_BY_LEGACY: Record<EvidenceType, EvidenceSourceType> = {
  INTERVIEW: "INTERVIEW",
  SURVEY: "SURVEY",
  CUSTOMER_QUOTE: "CUSTOMER_QUOTE",
  FORUM_POST: "FORUM_POST",
  REDDIT: "REDDIT_POST",
  REVIEW: "COMPETITOR_REVIEW",
  COMPETITOR_REVIEW: "COMPETITOR_REVIEW",
  JOB_POSTING: "JOB_POSTING",
  SEARCH_SIGNAL: "MARKET_DATASET",
  MARKET_REPORT: "INDUSTRY_REPORT",
  MANUAL_NOTE: "OTHER",
  EXPERIMENT: "OTHER",
  OTHER: "OTHER",
};

export function sourceTypeForLegacy(
  type: EvidenceType,
  experimentType?: ExperimentType | null,
  designLevel?: ExperimentDesignLevel | null,
): EvidenceSourceType {
  if (type === "EXPERIMENT")
    return experimentType ? sourceTypeForExperiment(experimentType, designLevel) : "OTHER";
  return SOURCE_TYPE_BY_LEGACY[type] ?? "OTHER";
}

/** Legacy evidence type that best represents a source type (kept for the old engine inputs). */
export function legacyTypeForSource(type: EvidenceSourceType): EvidenceType {
  switch (type) {
    case "INTERVIEW":
    case "SALES_CONVERSATION":
      return "INTERVIEW";
    case "SURVEY":
      return "SURVEY";
    case "CUSTOMER_QUOTE":
      return "CUSTOMER_QUOTE";
    case "FORUM_POST":
      return "FORUM_POST";
    case "REDDIT_POST":
      return "REDDIT";
    case "COMPETITOR_REVIEW":
      return "COMPETITOR_REVIEW";
    case "JOB_POSTING":
      return "JOB_POSTING";
    case "PRICING_PAGE":
    case "PUBLIC_FINANCIALS":
    case "INDUSTRY_REPORT":
    case "GOVERNMENT_DATA":
    case "MARKET_DATASET":
      return "MARKET_REPORT";
    case "OTHER":
      return "MANUAL_NOTE";
    default:
      return sourceFamily(type) === "EXPERIMENTAL" || sourceFamily(type) === "TECHNICAL"
        ? "EXPERIMENT"
        : "OTHER";
  }
}

/**
 * How direct a source is as evidence about the customer's situation, before
 * per-item strength and relevance (legacy TYPE_DIRECTNESS, per source type).
 */
export const SOURCE_DIRECTNESS: Record<EvidenceSourceType, number> = {
  INTERVIEW: 1,
  SURVEY: 0.9,
  CUSTOMER_QUOTE: 1,
  FORUM_POST: 0.5,
  REDDIT_POST: 0.5,
  SALES_CONVERSATION: 0.9,
  OBSERVED_WORKFLOW: 0.95,
  PRODUCT_USAGE: 0.9,
  CLICKSTREAM: 0.8,
  PURCHASE_BEHAVIOR: 0.95,
  CRM_DATA: 0.8,
  TRANSACTION_RECORDS: 0.9,
  FINANCIAL_RECORDS: 0.9,
  SYSTEM_LOGS: 0.85,
  BOOKING_DATA: 0.9,
  POS_DATA: 0.9,
  ERP_DATA: 0.85,
  SUPPORT_TICKETS: 0.85,
  TIME_TRACKING_DATA: 0.85,
  COMPETITOR_REVIEW: 0.7,
  PRICING_PAGE: 0.6,
  JOB_POSTING: 0.6,
  PUBLIC_FINANCIALS: 0.6,
  INDUSTRY_REPORT: 0.6,
  GOVERNMENT_DATA: 0.6,
  MARKET_DATASET: 0.5,
  PROTOTYPE_TEST: 0.9,
  CONCIERGE_TEST: 0.9,
  BEFORE_AFTER_TEST: 0.9,
  MATCHED_COMPARISON: 0.9,
  CONTROLLED_EXPERIMENT: 0.9,
  AB_TEST: 0.9,
  RANDOMIZED_EXPERIMENT: 0.9,
  PRICING_EXPERIMENT: 0.9,
  LANDING_PAGE_EXPERIMENT: 0.8,
  TECHNICAL_SPIKE: 0.9,
  BENCHMARK: 0.9,
  DATA_FEASIBILITY_STUDY: 0.9,
  INTEGRATION_TEST: 0.9,
  LOAD_TEST: 0.9,
  SIGNED_LOI: 0.95,
  PAID_PILOT: 1,
  CONTRACT: 1,
  INVOICE: 1,
  SUBSCRIPTION_PURCHASE: 1,
  RENEWAL: 1,
  EXPANSION: 1,
  OTHER: 0.3,
};

/** Sources that come from the customer directly (statements, behaviour, records, purchases). */
export function isDirectSource(type: EvidenceSourceType): boolean {
  const family = sourceFamily(type);
  if (family === "BEHAVIORAL" || family === "OPERATIONAL" || family === "COMMERCIAL") return true;
  return (
    type === "INTERVIEW" ||
    type === "SURVEY" ||
    type === "CUSTOMER_QUOTE" ||
    type === "SALES_CONVERSATION"
  );
}
