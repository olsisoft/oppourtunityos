import { describe, expect, it } from "vitest";
import {
  admissibility,
  admissibilityLevel,
  admissibilityMatrix,
  ADMISSIBILITY_VERSION,
  highAdmissibilitySources,
} from "@/services/value/admissibility";
import { CLAIM_TYPES, migrateLegacyClaimType } from "@/services/value/claim-taxonomy";
import {
  SOURCE_TYPES,
  sourceTypeForExperiment,
  sourceTypeForLegacy,
} from "@/services/value/evidence-sources";

describe("admissibility matrix", () => {
  it("interviews establish that a pain exists, not causality", () => {
    expect(admissibilityLevel("INTERVIEW", "PAIN_EXISTS")).toBe("HIGH");
    expect(admissibilityLevel("SURVEY", "PAIN_EXISTS")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "MECHANISM_CAUSES_CAPABILITY")).toBe("LOW");
    expect(admissibilityLevel("INTERVIEW", "CAUSAL_EFFECT")).toBe("LOW");
    expect(admissibilityLevel("SURVEY", "TRANSFORMATION_CAUSES_OPERATIONAL_VALUE")).toBe("LOW");
  });

  it("controlled and randomized designs establish causality; feasibility work never does", () => {
    expect(admissibilityLevel("CONTROLLED_EXPERIMENT", "CAPABILITY_CAUSES_TRANSFORMATION")).toBe(
      "HIGH",
    );
    expect(admissibilityLevel("RANDOMIZED_EXPERIMENT", "CAUSAL_EFFECT")).toBe("HIGH");
    expect(admissibilityLevel("MATCHED_COMPARISON", "CAUSAL_EFFECT")).toBe("MEDIUM");
    expect(admissibilityLevel("BEFORE_AFTER_TEST", "CAUSAL_EFFECT")).toBe("MEDIUM");
    expect(admissibilityLevel("TECHNICAL_SPIKE", "CAUSAL_EFFECT")).toBe("NOT_ADMISSIBLE");
    expect(admissibilityLevel("DATA_FEASIBILITY_STUDY", "MECHANISM_CAUSES_CAPABILITY")).toBe(
      "NOT_ADMISSIBLE",
    );
    expect(admissibilityLevel("FORUM_POST", "CAUSAL_EFFECT")).toBe("NOT_ADMISSIBLE");
  });

  it("records establish magnitude and frequency; competitor reviews cannot size a problem", () => {
    expect(admissibilityLevel("TRANSACTION_RECORDS", "MAGNITUDE")).toBe("HIGH");
    expect(admissibilityLevel("FINANCIAL_RECORDS", "ECONOMIC_IMPACT")).toBe("HIGH");
    expect(admissibilityLevel("SYSTEM_LOGS", "PAIN_FREQUENCY")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "MAGNITUDE")).toBe("MEDIUM");
    expect(admissibilityLevel("INTERVIEW", "PAIN_FREQUENCY")).toBe("MEDIUM");
    expect(admissibilityLevel("FORUM_POST", "MAGNITUDE")).toBe("LOW");
    expect(admissibilityLevel("FORUM_POST", "PAIN_FREQUENCY")).toBe("LOW");
    expect(admissibilityLevel("COMPETITOR_REVIEW", "MAGNITUDE")).toBe("NOT_ADMISSIBLE");
  });

  it("feasibility is established by technical work and prototypes, never by forums", () => {
    expect(admissibilityLevel("TECHNICAL_SPIKE", "MECHANISM_FEASIBLE")).toBe("HIGH");
    expect(admissibilityLevel("DATA_FEASIBILITY_STUDY", "MECHANISM_FEASIBLE")).toBe("HIGH");
    expect(admissibilityLevel("PROTOTYPE_TEST", "MECHANISM_FEASIBLE")).toBe("HIGH");
    expect(admissibilityLevel("INTEGRATION_TEST", "MECHANISM_FEASIBLE")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "MECHANISM_FEASIBLE")).toBe("LOW");
    expect(admissibilityLevel("FORUM_POST", "MECHANISM_FEASIBLE")).toBe("NOT_ADMISSIBLE");
  });

  it("willingness to pay is established by pricing behaviour; existing spend and statements are weaker", () => {
    expect(admissibilityLevel("PRICING_EXPERIMENT", "WILLINGNESS_TO_PAY")).toBe("HIGH");
    expect(admissibilityLevel("PAID_PILOT", "WILLINGNESS_TO_PAY")).toBe("HIGH");
    expect(admissibilityLevel("SUBSCRIPTION_PURCHASE", "WILLINGNESS_TO_PAY")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "WILLINGNESS_TO_PAY")).toBe("MEDIUM");
    expect(admissibilityLevel("SURVEY", "WILLINGNESS_TO_PAY")).toBe("LOW");
    // Existing spend on an alternative is low-admissibility evidence of WTP for something new.
    expect(admissibilityLevel("FINANCIAL_RECORDS", "WILLINGNESS_TO_PAY")).toBe("LOW");
    expect(admissibilityLevel("FINANCIAL_RECORDS", "EXISTING_SPEND")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "EXISTING_SPEND")).toBe("HIGH");
  });

  it("price acceptance and actual purchase are behavioural: interviews cannot establish them", () => {
    expect(admissibilityLevel("PRICING_EXPERIMENT", "PRICE_ACCEPTANCE")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "PRICE_ACCEPTANCE")).toBe("LOW");
    expect(admissibilityLevel("SURVEY", "PRICE_ACCEPTANCE")).toBe("LOW");
    expect(admissibilityLevel("TRANSACTION_RECORDS", "ACTUAL_PURCHASE")).toBe("HIGH");
    expect(admissibilityLevel("CONTRACT", "ACTUAL_PURCHASE")).toBe("HIGH");
    expect(admissibilityLevel("PAID_PILOT", "ACTUAL_PURCHASE")).toBe("HIGH");
    expect(admissibilityLevel("INTERVIEW", "ACTUAL_PURCHASE")).toBe("NOT_ADMISSIBLE");
    expect(admissibilityLevel("INTERVIEW", "ACTUAL_RETENTION")).toBe("NOT_ADMISSIBLE");
  });

  it("is complete, deterministic, versioned and explains which rule applied", () => {
    const rows = admissibilityMatrix();
    expect(rows.length).toBe(CLAIM_TYPES.length * SOURCE_TYPES.length);
    for (const row of rows) {
      expect(["HIGH", "MEDIUM", "LOW", "NOT_ADMISSIBLE"]).toContain(row.level);
      expect(admissibilityLevel(row.sourceType, row.claimType)).toBe(row.level);
    }
    const r = admissibility("INTERVIEW", "PAIN_EXISTS");
    expect(r.version).toBe(ADMISSIBILITY_VERSION);
    expect(["source", "family", "default"]).toContain(r.ruleSource);
    expect(r.explanation).toMatch(/rule|default/);
  });

  it("unknown provenance and untyped claims never get a strong judgement", () => {
    for (const claim of CLAIM_TYPES) {
      expect(["LOW", "NOT_ADMISSIBLE"]).toContain(admissibilityLevel("OTHER", claim));
    }
    for (const source of SOURCE_TYPES) {
      expect(["LOW", "NOT_ADMISSIBLE"]).toContain(admissibilityLevel(source, "OTHER"));
    }
    expect(highAdmissibilitySources("OTHER")).toEqual([]);
    expect(highAdmissibilitySources("MECHANISM_FEASIBLE")).toContain("TECHNICAL_SPIKE");
  });

  it("maps legacy evidence types and experiment types to source types", () => {
    expect(sourceTypeForLegacy("REDDIT")).toBe("REDDIT_POST");
    expect(sourceTypeForLegacy("MARKET_REPORT")).toBe("INDUSTRY_REPORT");
    expect(sourceTypeForLegacy("EXPERIMENT", "DATA_FEASIBILITY_TEST")).toBe(
      "DATA_FEASIBILITY_STUDY",
    );
    expect(sourceTypeForExperiment("CONCIERGE_TEST", "BEFORE_AFTER")).toBe("CONCIERGE_TEST");
    expect(sourceTypeForExperiment("CONCIERGE_TEST", "RANDOMIZED")).toBe("RANDOMIZED_EXPERIMENT");
    // A feasibility study never becomes a randomized experiment by declaration.
    expect(sourceTypeForExperiment("DATA_FEASIBILITY_TEST", "RANDOMIZED")).toBe(
      "DATA_FEASIBILITY_STUDY",
    );
  });

  it("migrates legacy claim types without promoting them", () => {
    expect(migrateLegacyClaimType("WILLINGNESS_TO_PAY")).toBe("WILLINGNESS_TO_PAY");
    expect(migrateLegacyClaimType("FREQUENCY")).toBe("PAIN_FREQUENCY");
    expect(migrateLegacyClaimType("PAIN")).toBe("PAIN_EXISTS");
    expect(migrateLegacyClaimType("VALUE_CHAIN_NODE", { level: "MECHANISM" })).toBe(
      "MECHANISM_FEASIBLE",
    );
    expect(migrateLegacyClaimType("CAUSAL_LINK", { from: "MECHANISM", to: "CAPABILITY" })).toBe(
      "MECHANISM_CAUSES_CAPABILITY",
    );
    expect(migrateLegacyClaimType("CAUSAL_LINK", { from: "MECHANISM", to: "ECONOMIC_VALUE" })).toBe(
      "CAUSAL_EFFECT",
    );
    expect(migrateLegacyClaimType("SOMETHING_ELSE")).toBe("OTHER");
  });
});
