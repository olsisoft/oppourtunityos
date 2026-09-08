/**
 * Experiment outcomes. When success and failure thresholds are configured,
 * the observed value decides the outcome deterministically; the model never
 * chooses. Without thresholds, the user classifies explicitly or the result
 * stays INCONCLUSIVE. INVALID results never produce evidence.
 */
import type {
  EvidenceLinkDirection,
  EvidenceSentiment,
  ExperimentOutcome,
} from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";

export interface OutcomeInputs {
  observedValue: number | null | undefined;
  successThreshold: number | null | undefined;
  failureThreshold: number | null | undefined;
}

export interface ThresholdOutcome {
  outcome: ExperimentOutcome;
  source: "THRESHOLD";
  higherIsBetter: boolean;
  explanation: SystemMessage;
}

/**
 * Returns the outcome decided by the thresholds, or null when they cannot
 * decide (no observation, or fewer than two thresholds — a single threshold
 * does not say which direction is "better").
 */
export function classifyOutcome(input: OutcomeInputs): ThresholdOutcome | null {
  const { observedValue, successThreshold, failureThreshold } = input;
  if (
    observedValue === null ||
    observedValue === undefined ||
    !Number.isFinite(observedValue) ||
    successThreshold === null ||
    successThreshold === undefined ||
    failureThreshold === null ||
    failureThreshold === undefined ||
    successThreshold === failureThreshold
  ) {
    return null;
  }
  const higherIsBetter = successThreshold > failureThreshold;
  const supported = higherIsBetter
    ? observedValue >= successThreshold
    : observedValue <= successThreshold;
  const contradicted = higherIsBetter
    ? observedValue <= failureThreshold
    : observedValue >= failureThreshold;
  if (supported) {
    return {
      outcome: "SUPPORTED",
      source: "THRESHOLD",
      higherIsBetter,
      explanation: msg("nextAction.outcome.supported", {
        observed: observedValue,
        higherIsBetter,
        threshold: successThreshold,
      }),
    };
  }
  if (contradicted) {
    return {
      outcome: "CONTRADICTED",
      source: "THRESHOLD",
      higherIsBetter,
      explanation: msg("nextAction.outcome.contradicted", {
        observed: observedValue,
        higherIsBetter,
        threshold: failureThreshold,
      }),
    };
  }
  return {
    outcome: "INCONCLUSIVE",
    source: "THRESHOLD",
    higherIsBetter,
    explanation: msg("nextAction.outcome.inconclusive", {
      observed: observedValue,
      failure: failureThreshold,
      success: successThreshold,
    }),
  };
}

/** Direction of the resulting evidence on the tested claims; null = no evidence (INVALID). */
export function outcomeToDirection(outcome: ExperimentOutcome): EvidenceLinkDirection | null {
  switch (outcome) {
    case "SUPPORTED":
      return "SUPPORTS";
    case "CONTRADICTED":
      return "CONTRADICTS";
    case "INCONCLUSIVE":
      return "NEUTRAL";
    default:
      return null;
  }
}

export function outcomeToSentiment(outcome: ExperimentOutcome): EvidenceSentiment {
  switch (outcome) {
    case "SUPPORTED":
      return "POSITIVE";
    case "CONTRADICTED":
      return "NEGATIVE";
    default:
      return "NEUTRAL";
  }
}

export interface ExperimentPlanLike {
  decisionQuestion?: string | null;
  assumptionId?: string | null;
  causalLinkId?: string | null;
  valueChainNodeId?: string | null;
  successThreshold?: number | null;
  failureThreshold?: number | null;
  unit?: string | null;
  successMetric?: string | null;
}

export interface ExperimentWarning {
  level: "warning" | "info";
  message: SystemMessage;
}

/** Advisory checks on an experiment plan (Part 3.2). */
export function experimentWarnings(plan: ExperimentPlanLike): ExperimentWarning[] {
  const out: ExperimentWarning[] = [];
  if (!plan.decisionQuestion?.trim()) {
    out.push({ level: "warning", message: msg("nextAction.outcome.warning.noDecisionQuestion") });
  }
  if (!plan.assumptionId && !plan.causalLinkId && !plan.valueChainNodeId) {
    out.push({ level: "warning", message: msg("nextAction.outcome.warning.noTarget") });
  }
  const hasSuccess = plan.successThreshold !== null && plan.successThreshold !== undefined;
  const hasFailure = plan.failureThreshold !== null && plan.failureThreshold !== undefined;
  if (hasSuccess !== hasFailure) {
    out.push({ level: "info", message: msg("nextAction.outcome.warning.singleThreshold") });
  }
  if (!hasSuccess && !hasFailure) {
    out.push({ level: "info", message: msg("nextAction.outcome.warning.noThresholds") });
  }
  if ((hasSuccess || hasFailure) && !plan.unit?.trim()) {
    out.push({ level: "info", message: msg("nextAction.outcome.warning.noUnit") });
  }
  return out;
}
