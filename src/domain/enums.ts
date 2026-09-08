/**
 * Domain enums and human-readable labels. Safe to import from client
 * components (no Prisma runtime involved; enums are plain objects).
 */
import {
  AlternativeCategory,
  AssumptionKind,
  AssumptionStatus,
  ClaimType,
  Confidence,
  Criticality,
  EpistemicStatus,
  ExperimentOutcome,
  ExperimentStatus,
  ExperimentType,
  KnowledgeTrigger,
  OutcomeSource,
  DesiredDirection,
  DiscoveryStage,
  EntryMode,
  EvidenceOrigin,
  EvidenceSentiment,
  EvidenceType,
  MechanismCategory,
  Provenance,
  ValueChainLevel,
  VariableCategory,
  VariablePolarity,
  Verdict,
} from "@/generated/prisma/enums";

export {
  AlternativeCategory,
  AssumptionKind,
  AssumptionStatus,
  ClaimType,
  Confidence,
  Criticality,
  EpistemicStatus,
  ExperimentOutcome,
  ExperimentStatus,
  ExperimentType,
  KnowledgeTrigger,
  OutcomeSource,
  DesiredDirection,
  DiscoveryStage,
  EntryMode,
  EvidenceOrigin,
  EvidenceSentiment,
  EvidenceType,
  MechanismCategory,
  Provenance,
  ValueChainLevel,
  VariableCategory,
  VariablePolarity,
  Verdict,
};

export const STAGE_ORDER: DiscoveryStage[] = [
  DiscoveryStage.START,
  DiscoveryStage.USER_CONTEXT,
  DiscoveryStage.MARKET_SELECTION,
  DiscoveryStage.ICP_DISCOVERY,
  DiscoveryStage.VARIABLE_DISCOVERY,
  DiscoveryStage.PAIN_DISCOVERY,
  DiscoveryStage.TRIGGER_DISCOVERY,
  DiscoveryStage.ALTERNATIVE_DISCOVERY,
  DiscoveryStage.EVIDENCE_DISCOVERY,
  DiscoveryStage.MECHANISM_DISCOVERY,
  DiscoveryStage.OPPORTUNITY_FORMATION,
  DiscoveryStage.VALUE_CAUSALITY,
  DiscoveryStage.SCORING,
  DiscoveryStage.EXPERIMENT_DESIGN,
  DiscoveryStage.RECOMMENDATION,
];

export const STAGE_LABELS: Record<DiscoveryStage, string> = {
  START: "Start",
  USER_CONTEXT: "Your context",
  MARKET_SELECTION: "Market",
  ICP_DISCOVERY: "ICP",
  VARIABLE_DISCOVERY: "Variables",
  PAIN_DISCOVERY: "Pain",
  TRIGGER_DISCOVERY: "Trigger",
  ALTERNATIVE_DISCOVERY: "Alternatives",
  EVIDENCE_DISCOVERY: "Evidence",
  MECHANISM_DISCOVERY: "Mechanisms",
  OPPORTUNITY_FORMATION: "Opportunity",
  VALUE_CAUSALITY: "Value chain",
  SCORING: "Scoring",
  EXPERIMENT_DESIGN: "Experiment",
  RECOMMENDATION: "Decision",
};

export const VERDICT_ORDER: Verdict[] = [
  Verdict.TEST,
  Verdict.INTERVIEW,
  Verdict.INVESTIGATE,
  Verdict.RESEARCH,
  Verdict.KILL,
  Verdict.IGNORE,
];

export const VERDICT_LABELS: Record<Verdict, string> = {
  IGNORE: "Ignore",
  KILL: "Kill",
  RESEARCH: "Research",
  INVESTIGATE: "Investigate",
  INTERVIEW: "Interview",
  TEST: "Test",
};

export const VERDICT_DESCRIPTIONS: Record<Verdict, string> = {
  IGNORE: "Structurally weak and unproven. Do not invest time.",
  KILL: "Evidence shows the opportunity is structurally weak.",
  RESEARCH: "Promising hypothesis, insufficient proof. Gather evidence.",
  INVESTIGATE: "Moderate potential and partial evidence. Deepen the analysis.",
  INTERVIEW: "Strong enough to justify customer discovery interviews.",
  TEST: "Strong enough for a lightweight market test (concierge, landing page, prototype).",
};

export const VERDICT_TONE: Record<Verdict, "positive" | "info" | "warning" | "negative" | "muted"> =
  {
    TEST: "positive",
    INTERVIEW: "positive",
    INVESTIGATE: "info",
    RESEARCH: "warning",
    KILL: "negative",
    IGNORE: "muted",
  };

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  USER: "Stated by you",
  AI_HYPOTHESIS: "AI hypothesis",
  EXTERNAL_EVIDENCE: "External evidence",
  INTERVIEW: "Interview",
  COMPUTED: "Computed",
};

export const PROVENANCE_SHORT: Record<Provenance, string> = {
  USER: "USER",
  AI_HYPOTHESIS: "HYPOTHESIS",
  EXTERNAL_EVIDENCE: "EVIDENCE",
  INTERVIEW: "INTERVIEW",
  COMPUTED: "COMPUTED",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  FORUM_POST: "Forum post",
  REDDIT: "Reddit",
  REVIEW: "Review",
  COMPETITOR_REVIEW: "Competitor review",
  INTERVIEW: "Interview",
  SURVEY: "Survey",
  JOB_POSTING: "Job posting",
  SEARCH_SIGNAL: "Search signal",
  CUSTOMER_QUOTE: "Customer quote",
  MARKET_REPORT: "Market report",
  MANUAL_NOTE: "Manual note",
  EXPERIMENT: "Experiment result",
  OTHER: "Other",
};

export const EVIDENCE_ORIGIN_LABELS: Record<EvidenceOrigin, string> = {
  USER_CAPTURED: "Captured manually",
  INTERVIEW: "Interview notes",
  RESEARCH_PROVIDER: "Research provider",
  DEMO: "Demo data",
  EXPERIMENT_RESULT: "Experiment result",
};

export const SENTIMENT_LABELS: Record<EvidenceSentiment, string> = {
  POSITIVE: "Supports",
  NEGATIVE: "Contradicts",
  NEUTRAL: "Neutral",
};

export const VARIABLE_CATEGORY_LABELS: Record<VariableCategory, string> = {
  REVENUE: "Revenue",
  COST: "Cost",
  TIME: "Time",
  RISK: "Risk",
  CAPACITY: "Capacity",
  QUALITY: "Quality",
  RETENTION: "Retention",
  CONVERSION: "Conversion",
  PRODUCTIVITY: "Productivity",
  AVAILABILITY: "Availability",
  COMPLIANCE: "Compliance",
  FRAUD: "Fraud",
  DOWNTIME: "Downtime",
  INVENTORY: "Inventory",
  MARGIN: "Margin",
  CASH: "Cash",
  COMPLEXITY: "Complexity",
  RELIABILITY: "Reliability",
  PERFORMANCE: "Performance",
  VISIBILITY: "Visibility",
  PREDICTABILITY: "Predictability",
  UTILIZATION: "Utilization",
  OTHER: "Other",
};

export const DIRECTION_LABELS: Record<DesiredDirection, string> = {
  INCREASE: "Increase",
  DECREASE: "Reduce",
  ACCELERATE: "Accelerate",
  IMPROVE: "Improve",
  SIMPLIFY: "Simplify",
  PREVENT: "Prevent",
  AUTOMATE: "Automate",
  OPTIMIZE: "Optimize",
  DETECT: "Detect",
  PROTECT: "Protect",
  RECOVER: "Recover",
  STABILIZE: "Stabilize",
  MAINTAIN: "Maintain",
  EXPAND: "Expand",
  RELEASE: "Release",
  MEASURE: "Measure",
  TRACE: "Trace",
};

export const EPISTEMIC_LABELS: Record<EpistemicStatus, string> = {
  PROVEN: "PROVEN",
  SUPPORTED: "SUPPORTED",
  HYPOTHESIS: "HYPOTHESIS",
  UNPROVEN: "UNPROVEN",
  CONTRADICTED: "CONTRADICTED",
  UNKNOWN: "UNKNOWN",
};

export const EPISTEMIC_DESCRIPTIONS: Record<EpistemicStatus, string> = {
  PROVEN: "Linked evidence reaches the proven threshold (≥ 75) with no unresolved contradiction.",
  SUPPORTED: "Linked evidence reaches the supported threshold (≥ 40).",
  HYPOTHESIS: "Proposed by the analyst; no linked evidence.",
  UNPROVEN: "Stated but not yet supported by sufficient evidence.",
  CONTRADICTED:
    "Contradicting evidence outweighs supporting evidence, or a critical assumption is contradicted.",
  UNKNOWN: "Not stated.",
};

export const EPISTEMIC_TONE: Record<
  EpistemicStatus,
  "positive" | "info" | "warning" | "negative" | "muted" | "outline"
> = {
  PROVEN: "positive",
  SUPPORTED: "info",
  HYPOTHESIS: "warning",
  UNPROVEN: "outline",
  CONTRADICTED: "negative",
  UNKNOWN: "muted",
};

export const VALUE_CHAIN_LEVEL_LABELS: Record<ValueChainLevel, string> = {
  MECHANISM: "Mechanism",
  CAPABILITY: "Capability",
  TRANSFORMATION: "Transformation",
  OPERATIONAL_VALUE: "Operational value",
  ECONOMIC_VALUE: "Economic value",
  STRATEGIC_OUTCOME: "Strategic outcome",
  BUSINESS_OUTCOME: "Business outcome",
};

export const VALUE_CHAIN_LEVEL_HELP: Record<ValueChainLevel, string> = {
  MECHANISM: "What the product does or contains.",
  CAPABILITY: "What the customer can do that they could not do before.",
  TRANSFORMATION: "What changes in the operation because of that capability.",
  OPERATIONAL_VALUE: "The operational result of that change.",
  ECONOMIC_VALUE: "The financial consequence.",
  STRATEGIC_OUTCOME: "The company-level consequence.",
  BUSINESS_OUTCOME: "Downstream business outcome (optional; hardest to attribute).",
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  ICP: "ICP",
  VARIABLE: "Variable",
  CURRENT_STATE: "Current state",
  PAIN: "Pain",
  MAGNITUDE: "Magnitude",
  FREQUENCY: "Frequency",
  ECONOMIC_IMPACT: "Economic impact",
  CAUSAL_LINK: "Causal link",
  MECHANISM: "Mechanism",
  WILLINGNESS_TO_PAY: "Willingness to pay",
  VALUE_CHAIN_NODE: "Value chain node",
  ALTERNATIVE: "Alternative",
  TRIGGER: "Trigger",
};

export const ASSUMPTION_KIND_LABELS: Record<AssumptionKind, string> = {
  GENERIC: "Assumption",
  CAUSAL: "Causal assumption",
  VALUE: "Value assumption",
  FEASIBILITY: "Feasibility assumption",
  WTP: "WTP assumption",
  ACCESS: "Access assumption",
};

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  CRITICAL: "Critical",
  IMPORTANT: "Important",
  MINOR: "Minor",
};

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  PLANNED: "Planned",
  RUNNING: "Running",
  COMPLETED: "Completed",
  ABANDONED: "Cancelled",
  CANCELLED: "Cancelled",
  INVALID: "Invalid",
};

export const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  CUSTOMER_INTERVIEW: "Customer interview",
  PRICING_TEST: "Pricing test",
  LANDING_PAGE_TEST: "Landing page test",
  CONCIERGE_TEST: "Concierge test",
  PROTOTYPE_TEST: "Prototype test",
  DATA_FEASIBILITY_TEST: "Data feasibility test",
  AB_TEST: "A/B test",
  MANUAL_WORKFLOW_TEST: "Manual workflow test",
  COHORT_OBSERVATION: "Cohort observation",
  TECHNICAL_SPIKE: "Technical spike",
  RETROSPECTIVE_DATA_ANALYSIS: "Retrospective data analysis",
  OTHER: "Other",
};

export const EXPERIMENT_OUTCOME_LABELS: Record<ExperimentOutcome, string> = {
  SUPPORTED: "Supported",
  CONTRADICTED: "Contradicted",
  INCONCLUSIVE: "Inconclusive",
  INVALID: "Invalid",
};

export const EXPERIMENT_OUTCOME_TONE: Record<
  ExperimentOutcome,
  "positive" | "negative" | "muted" | "warning"
> = {
  SUPPORTED: "positive",
  CONTRADICTED: "negative",
  INCONCLUSIVE: "muted",
  INVALID: "warning",
};

export const OUTCOME_SOURCE_LABELS: Record<OutcomeSource, string> = {
  THRESHOLD: "decided by the configured thresholds",
  USER: "classified by you (no deterministic threshold)",
};

export const KNOWLEDGE_TRIGGER_LABELS: Record<KnowledgeTrigger, string> = {
  EXPERIMENT_RESULT: "Experiment result",
  EVIDENCE_ADDED: "Evidence added",
  EVIDENCE_LINKED: "Evidence linked to a claim",
  ASSUMPTION_UPDATED: "Assumption updated",
  RECOMPUTE: "Recompute",
};

export const VARIABLE_POLARITY_LABELS: Record<VariablePolarity, string> = {
  POSITIVE: "More is better",
  NEGATIVE: "Less is better",
  NEUTRAL: "Context-dependent",
};

export const ALTERNATIVE_CATEGORY_LABELS: Record<AlternativeCategory, string> = {
  SPREADSHEET: "Spreadsheet",
  MANUAL_PROCESS: "Manual process",
  INTERNAL_EMPLOYEE: "Internal employee",
  OUTSOURCING: "Outsourcing",
  COMPETITOR_SOFTWARE: "Competitor software",
  MESSAGING: "Messaging",
  EMAIL: "Email",
  PHONE: "Phone",
  CUSTOM_SOFTWARE: "Custom software",
  NO_SOLUTION: "No solution",
  OTHER: "Other",
};

export const MECHANISM_CATEGORY_LABELS: Record<MechanismCategory, string> = {
  AUTOMATION: "Automation",
  AI_AGENT: "AI agent",
  PREDICTION: "Prediction",
  MONITORING: "Monitoring",
  MARKETPLACE: "Marketplace",
  WORKFLOW: "Workflow",
  FINTECH: "Fintech",
  COMPUTER_VISION: "Computer vision",
  HARDWARE: "Hardware",
  ROBOTICS: "Robotics",
  OPTIMIZATION: "Optimization",
  API: "API",
  DATA_AGGREGATION: "Data aggregation",
  VERTICAL_SAAS: "Vertical SaaS",
  INFRASTRUCTURE: "Infrastructure",
  OTHER: "Other",
};

export const ASSUMPTION_STATUS_LABELS: Record<AssumptionStatus, string> = {
  UNKNOWN: "Unknown",
  SUPPORTED: "Supported",
  CONTRADICTED: "Contradicted",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function enumValues<T extends Record<string, string>>(e: T): T[keyof T][] {
  return Object.values(e) as T[keyof T][];
}
