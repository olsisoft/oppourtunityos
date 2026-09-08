/**
 * Zod schemas for user-facing forms and server actions.
 * Everything that crosses the client/server boundary is validated here.
 */
import { z } from "zod";
import {
  AlternativeCategory,
  AssumptionKind,
  AssumptionStatus,
  ClaimType,
  Criticality,
  DesiredDirection,
  ExperimentOutcome,
  ExperimentStatus,
  ExperimentType,
  ValueChainLevel,
  VariablePolarity,
  EntryMode,
  EvidenceSentiment,
  EvidenceType,
  MechanismCategory,
  VariableCategory,
} from "@/generated/prisma/enums";

const score10 = z.coerce.number().int().min(0).max(10);
const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().max(4000);
const optionalLong = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);
const optionalId = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const createWorkspaceSchema = z.object({
  name: shortText,
  description: optionalLong,
  entryMode: z.nativeEnum(EntryMode).optional(),
  ideaStatement: optionalLong,
});

export const updateWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: shortText.optional(),
  description: optionalLong,
  entryMode: z.nativeEnum(EntryMode).optional(),
  ideaStatement: optionalLong,
});

export const evidenceClaimInputSchema = z.object({
  claimType: z.nativeEnum(ClaimType),
  opportunityId: optionalId,
  valueChainNodeId: optionalId,
  causalLinkId: optionalId,
  direction: z.enum(["SUPPORTS", "CONTRADICTS", "NEUTRAL"]).default("SUPPORTS"),
});
export type EvidenceClaimInput = z.infer<typeof evidenceClaimInputSchema>;

export const createEvidenceSchema = z.object({
  workspaceId: z.string().min(1),
  painId: optionalId,
  opportunityId: optionalId,
  type: z.nativeEnum(EvidenceType),
  sourceTitle: shortText,
  sourceUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  sourceExcerpt: longText.min(1, "Paste the quote, note or excerpt"),
  sourceDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  sourceAuthor: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  relevanceScore: score10,
  strengthScore: score10,
  sentiment: z.nativeEnum(EvidenceSentiment),
  isDirectCustomer: z.coerce.boolean().default(false),
  hasExplicitPain: z.coerce.boolean().default(false),
  hasEconomicImpact: z.coerce.boolean().default(false),
  hasWorkaround: z.coerce.boolean().default(false),
  hasPurchaseIntent: z.coerce.boolean().default(false),
  isInterview: z.coerce.boolean().default(false),
  /** "What claim does this evidence affect?" — one item may affect several claims. */
  claims: z.array(evidenceClaimInputSchema).max(40).default([]),
});

export const opportunityInputsSchema = z.object({
  importance: score10,
  painIntensity: score10,
  frequency: score10,
  gap: score10,
  willingnessToPay: score10,
  alternativeWeakness: score10,
});

export const createOpportunitySchema = z.object({
  workspaceId: z.string().min(1),
  title: shortText,
  icpId: optionalId,
  variableId: optionalId,
  painId: optionalId,
  problemStatement: optionalLong,
  mechanism: optionalLong,
  productHypothesis: optionalLong,
  valueProposition: optionalLong,
  metric: optionalLong,
  inputs: opportunityInputsSchema,
});

export const updateOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
  title: shortText.optional(),
  icpId: optionalId,
  variableId: optionalId,
  painId: optionalId,
  problemStatement: optionalLong,
  mechanism: optionalLong,
  productHypothesis: optionalLong,
  valueProposition: optionalLong,
  metric: optionalLong,
  inputs: opportunityInputsSchema.optional(),
  risks: z.array(z.string().trim().max(300)).max(12).optional(),
  nextSteps: z.array(z.string().trim().max(300)).max(12).optional(),
});

export const createAssumptionSchema = z.object({
  workspaceId: z.string().min(1),
  opportunityId: optionalId,
  valueChainNodeId: optionalId,
  causalLinkId: optionalId,
  kind: z.nativeEnum(AssumptionKind).default(AssumptionKind.GENERIC),
  statement: z.string().trim().min(3).max(500),
  importance: score10,
  status: z.nativeEnum(AssumptionStatus).default(AssumptionStatus.UNKNOWN),
  notes: optionalLong,
});

export const updateAssumptionSchema = z.object({
  assumptionId: z.string().min(1),
  statement: z.string().trim().min(3).max(500).optional(),
  importance: score10.optional(),
  status: z.nativeEnum(AssumptionStatus).optional(),
  kind: z.nativeEnum(AssumptionKind).optional(),
  valueChainNodeId: optionalId,
  causalLinkId: optionalId,
  notes: optionalLong,
});

export const linkAssumptionEvidenceSchema = z.object({
  assumptionId: z.string().min(1),
  evidenceId: z.string().min(1),
  direction: z.enum(["SUPPORTS", "CONTRADICTS", "NEUTRAL"]),
});

// ---- Value engineering -------------------------------------------------------

export const upsertValueChainNodeSchema = z.object({
  opportunityId: z.string().min(1),
  level: z.nativeEnum(ValueChainLevel),
  statement: z.string().trim().min(3).max(500),
  notes: optionalLong,
});

export const upsertCausalLinkSchema = z.object({
  opportunityId: z.string().min(1),
  fromLevel: z.nativeEnum(ValueChainLevel),
  toLevel: z.nativeEnum(ValueChainLevel),
  statement: z.string().trim().min(3).max(500),
  criticality: z.nativeEnum(Criticality).default(Criticality.CRITICAL),
  notes: optionalLong,
});

export const linkEvidenceClaimSchema = z.object({
  evidenceId: z.string().min(1),
  opportunityId: optionalId,
  claimType: z.nativeEnum(ClaimType),
  claimId: optionalId,
  valueChainNodeId: optionalId,
  causalLinkId: optionalId,
  direction: z.enum(["SUPPORTS", "CONTRADICTS", "NEUTRAL"]).default("SUPPORTS"),
  note: optionalLong,
});

const nullableScore10 = z.union([z.coerce.number().int().min(0).max(10), z.null()]).optional();

export const updateValueDimensionsSchema = z.object({
  opportunityId: z.string().min(1),
  importance: nullableScore10,
  magnitude: nullableScore10,
  frequency: nullableScore10,
  population: nullableScore10,
  attributability: nullableScore10,
});

const nullableEnum = <T extends Record<string, string>>(e: T) =>
  z.union([z.nativeEnum(e), z.null(), z.literal("")]).optional();

export const updateVariableValueFieldsSchema = z.object({
  variableId: z.string().min(1),
  name: shortText.optional(),
  category: z.nativeEnum(VariableCategory).optional(),
  /** Open taxonomy: any text; "" or null resets to UNKNOWN. */
  variableType: optionalLong,
  variablePolarity: nullableEnum(VariablePolarity),
  desiredDirection: z.nativeEnum(DesiredDirection).optional(),
  parentDirection: nullableEnum(DesiredDirection),
  importanceScore: score10.optional(),
  target: optionalLong,
  scope: optionalLong,
  currentState: optionalLong,
  desiredState: optionalLong,
  unit: optionalLong,
  whoValuesIt: optionalLong,
  whyItMatters: optionalLong,
  parentVariableId: optionalId,
  description: optionalLong,
});

const nullableNumber = z
  .union([z.coerce.number(), z.null(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));
const nullableInt = z
  .union([z.coerce.number().int().min(0), z.null(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));
const nullableOrdinal = z
  .union([z.coerce.number().int().min(0).max(10), z.null(), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const experimentFields = {
  causalLinkId: optionalId,
  assumptionId: optionalId,
  valueChainNodeId: optionalId,
  experimentType: z.nativeEnum(ExperimentType).optional(),
  hypothesis: z.string().trim().min(3).max(1000).optional(),
  decisionQuestion: optionalLong,
  design: optionalLong,
  successMetric: optionalLong,
  successThreshold: nullableNumber,
  failureThreshold: nullableNumber,
  unit: optionalLong,
  population: optionalLong,
  sampleSize: nullableInt,
  duration: optionalLong,
  expectedInformationGain: nullableOrdinal,
  decisionImpact: nullableOrdinal,
  effort: nullableOrdinal,
  costEstimate: optionalLong,
  timeEstimate: optionalLong,
  owner: optionalLong,
  notes: optionalLong,
};

export const createExperimentSchema = z.object({
  opportunityId: z.string().min(1),
  title: shortText,
  ...experimentFields,
  hypothesis: z.string().trim().min(3).max(1000),
});

export const updateExperimentSchema = z.object({
  experimentId: z.string().min(1),
  title: shortText.optional(),
  status: z.nativeEnum(ExperimentStatus).optional(),
  result: optionalLong,
  ...experimentFields,
});

/**
 * Recording a result. The outcome is decided by the thresholds when they
 * exist; `outcome` is only honoured when no deterministic decision is
 * possible (or to declare the run INVALID).
 */
export const completeExperimentSchema = z.object({
  experimentId: z.string().min(1),
  outcome: z.nativeEnum(ExperimentOutcome).optional(),
  observedMetric: optionalLong,
  observedValue: nullableNumber,
  unit: optionalLong,
  sampleSize: nullableInt,
  measurementPeriod: optionalLong,
  resultSummary: z.string().trim().min(3).max(4000),
  limitations: optionalLong,
  confounders: optionalLong,
  anomalies: optionalLong,
  enteredBy: optionalLong,
  /** Evidence signals for the resulting EXPERIMENT evidence item. */
  strengthScore: score10.default(6),
  relevanceScore: score10.default(8),
  isDirectCustomer: z.coerce.boolean().default(false),
  hasEconomicImpact: z.coerce.boolean().default(false),
  hasPurchaseIntent: z.coerce.boolean().default(false),
  /** Additional claims the result speaks to (besides the experiment's own target). */
  claims: z.array(evidenceClaimInputSchema).max(40).default([]),
  /** Ids of raw evidence items captured alongside (already in the workspace). */
  rawEvidenceIds: z.array(z.string().min(1)).max(50).default([]),
});
export type CompleteExperimentInput = z.infer<typeof completeExperimentSchema>;

export const updateVariableSchema = z.object({
  variableId: z.string().min(1),
  name: shortText.optional(),
  description: optionalLong,
  category: z.nativeEnum(VariableCategory).optional(),
  desiredDirection: z.nativeEnum(DesiredDirection).optional(),
  importanceScore: score10.optional(),
});

export const updatePainSchema = z.object({
  painId: z.string().min(1),
  description: longText.min(1).optional(),
  severityScore: score10.optional(),
  frequencyScore: score10.optional(),
  currentState: optionalLong,
  desiredState: optionalLong,
  gapDescription: optionalLong,
});

export const updateIcpSchema = z.object({
  icpId: z.string().min(1),
  name: shortText.optional(),
  role: optionalLong,
  companyType: optionalLong,
  companySize: optionalLong,
  responsibilities: optionalLong,
  economicBuyer: optionalLong,
  userRole: optionalLong,
  reachability: optionalLong,
  notes: optionalLong,
});

export const createAlternativeSchema = z.object({
  painId: z.string().min(1),
  name: shortText,
  category: z.nativeEnum(AlternativeCategory),
  description: optionalLong,
  costEstimate: optionalLong,
  weaknessDescription: optionalLong,
  weaknessScore: score10,
});

export const createMechanismSchema = z.object({
  workspaceId: z.string().min(1),
  painId: optionalId,
  name: shortText,
  description: optionalLong,
  category: z.nativeEnum(MechanismCategory),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  entryMode: z.nativeEnum(EntryMode).optional(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type OpportunityInputs = z.infer<typeof opportunityInputsSchema>;
