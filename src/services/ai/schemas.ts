/**
 * Wire schemas for structured LLM outputs. Constraints are expressed in
 * descriptions (structured-output engines reject numeric min/max); values are
 * clamped and sanitized by the apply layer before touching the database.
 * Nullable is used instead of optional for provider compatibility.
 */
import { z } from "zod";
import {
  AlternativeCategory,
  DesiredDirection,
  DiscoveryStage,
  MechanismCategory,
  VariableCategory,
} from "@/generated/prisma/enums";

const stageEnum = z.enum(Object.values(DiscoveryStage) as [DiscoveryStage, ...DiscoveryStage[]]);
const variableCategory = z.enum(
  Object.values(VariableCategory) as [VariableCategory, ...VariableCategory[]],
);
const direction = z.enum(
  Object.values(DesiredDirection) as [DesiredDirection, ...DesiredDirection[]],
);
const alternativeCategory = z.enum(
  Object.values(AlternativeCategory) as [AlternativeCategory, ...AlternativeCategory[]],
);
const mechanismCategory = z.enum(
  Object.values(MechanismCategory) as [MechanismCategory, ...MechanismCategory[]],
);

const source = z
  .enum(["USER", "AI_HYPOTHESIS"])
  .describe("USER only if the user stated it; otherwise AI_HYPOTHESIS");
const score = z.number().describe("Integer 0-10. Use 5 when unknown.");
const text = z.string();
const optText = z.string().nullable();

export const UserContextSchema = z.object({
  industries: z.array(text),
  audiences: z.array(text).describe("Kinds of people the user can realistically talk to"),
  businessModel: z.enum(["B2B", "B2C", "EITHER", "UNKNOWN"]),
  productPreferences: z.array(text).describe("software, AI, hardware, marketplace, open..."),
  avoidIndustries: z.array(text),
  technicalStrengths: z.array(text),
});

export const MarketDraftSchema = z.object({
  name: text,
  description: optText,
  attractivenessNotes: optText,
  source,
});

export const IcpDraftSchema = z.object({
  marketName: text.describe("Exact name of the market this ICP belongs to"),
  name: text,
  role: optText,
  companyType: optText,
  companySize: optText,
  responsibilities: optText,
  economicBuyer: optText.describe("Who controls the budget. UNKNOWN if not established."),
  userRole: optText,
  reachability: optText.describe("How the user can reach this ICP. UNKNOWN if not established."),
  notes: optText,
  source,
});

export const VariableDraftSchema = z.object({
  icpName: text,
  name: text,
  description: optText,
  category: variableCategory,
  desiredDirection: direction,
  importanceScore: score,
  source,
});

export const PainDraftSchema = z.object({
  variableName: text,
  description: text,
  severityScore: score,
  frequencyScore: score,
  currentState: optText.describe("UNKNOWN when nobody measured it"),
  desiredState: optText,
  gapDescription: optText,
  source,
});

export const TriggerDraftSchema = z.object({
  painDescription: text.describe("Exact description of the pain this trigger belongs to"),
  description: text,
  urgencyScore: score,
  frequency: optText,
  source,
});

export const AlternativeDraftSchema = z.object({
  painDescription: text,
  name: text,
  category: alternativeCategory,
  description: optText,
  costEstimate: optText,
  weaknessDescription: optText,
  weaknessScore: score.describe("10 = alternative fails completely, 0 = solves the problem"),
  source,
});

export const MechanismDraftSchema = z.object({
  painDescription: optText,
  name: text,
  description: optText,
  category: mechanismCategory,
});

export const AssumptionDraftSchema = z.object({
  statement: text,
  importance: score,
  opportunityTitle: optText.describe("Title of the opportunity this assumption belongs to, if any"),
});

export const OpportunityInputsDraftSchema = z.object({
  importance: score,
  painIntensity: score,
  frequency: score,
  gap: score,
  willingnessToPay: score,
  alternativeWeakness: score,
});

export const OpportunityDraftSchema = z.object({
  title: text,
  icpName: optText,
  variableName: optText,
  painDescription: optText,
  problemStatement: optText,
  mechanism: optText,
  productHypothesis: optText,
  valueProposition: optText,
  metric: optText.describe("The measurable outcome that would prove value"),
  inputs: OpportunityInputsDraftSchema,
  inputJustification: optText.describe("One line per input explaining the proposed value"),
  risks: z.array(text),
  nextSteps: z.array(text),
});

export const QuestionCardSchema = z.object({
  question: text,
  options: z.array(text),
  allowFreeText: z.boolean(),
});

export const DiscoveryExtractionSchema = z.object({
  stage: z.object({
    readyToAdvance: z.boolean(),
    suggestedStage: stageEnum,
    reasoning: text,
  }),
  userContext: UserContextSchema.nullable(),
  markets: z.array(MarketDraftSchema),
  icps: z.array(IcpDraftSchema),
  variables: z.array(VariableDraftSchema),
  pains: z.array(PainDraftSchema),
  triggers: z.array(TriggerDraftSchema),
  alternatives: z.array(AlternativeDraftSchema),
  mechanisms: z.array(MechanismDraftSchema),
  assumptions: z.array(AssumptionDraftSchema),
  opportunities: z.array(OpportunityDraftSchema),
  suggestedReplies: z.array(text),
  questionCard: QuestionCardSchema.nullable(),
});

export type DiscoveryExtraction = z.infer<typeof DiscoveryExtractionSchema>;
export type OpportunityDraft = z.infer<typeof OpportunityDraftSchema>;
export type QuestionCard = z.infer<typeof QuestionCardSchema>;

export const EvidenceSummarySchema = z.object({
  summary: text,
  hasExplicitPain: z.boolean(),
  hasEconomicImpact: z.boolean(),
  hasWorkaround: z.boolean(),
  hasPurchaseIntent: z.boolean(),
  isDirectCustomer: z.boolean(),
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
  strengthScore: score,
  relevanceScore: score,
  caveats: z.array(text),
});
export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

export const InterviewGuideSchema = z.object({
  title: text,
  targetProfile: text,
  sections: z.array(
    z.object({
      name: text,
      questions: z.array(text),
    }),
  ),
  listenFor: z.array(text),
  avoid: z.array(text),
});
export type InterviewGuide = z.infer<typeof InterviewGuideSchema>;

export const MechanismListSchema = z.object({
  mechanisms: z.array(MechanismDraftSchema),
});

export const MarketMapSchema = z.object({ markets: z.array(MarketDraftSchema) });
export const IcpMapSchema = z.object({ icps: z.array(IcpDraftSchema) });
export const VariableMapSchema = z.object({ variables: z.array(VariableDraftSchema) });
export const PainAnalysisSchema = z.object({
  pains: z.array(PainDraftSchema),
  triggers: z.array(TriggerDraftSchema),
  alternatives: z.array(AlternativeDraftSchema),
});
