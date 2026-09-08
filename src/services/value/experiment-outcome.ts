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

export interface OutcomeInputs {
  observedValue: number | null | undefined;
  successThreshold: number | null | undefined;
  failureThreshold: number | null | undefined;
}

export interface ThresholdOutcome {
  outcome: ExperimentOutcome;
  source: "THRESHOLD";
  higherIsBetter: boolean;
  explanation: string;
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
      explanation: `Observed ${observedValue} ${higherIsBetter ? "≥" : "≤"} success threshold ${successThreshold}.`,
    };
  }
  if (contradicted) {
    return {
      outcome: "CONTRADICTED",
      source: "THRESHOLD",
      higherIsBetter,
      explanation: `Observed ${observedValue} ${higherIsBetter ? "≤" : "≥"} failure threshold ${failureThreshold}.`,
    };
  }
  return {
    outcome: "INCONCLUSIVE",
    source: "THRESHOLD",
    higherIsBetter,
    explanation: `Observed ${observedValue} lies between the failure threshold ${failureThreshold} and the success threshold ${successThreshold}.`,
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
  message: string;
}

/** Advisory checks on an experiment plan (Part 3.2). */
export function experimentWarnings(plan: ExperimentPlanLike): ExperimentWarning[] {
  const out: ExperimentWarning[] = [];
  if (!plan.decisionQuestion?.trim()) {
    out.push({
      level: "warning",
      message:
        "No decision question. Every experiment must say what decision becomes easier after it runs.",
    });
  }
  if (!plan.assumptionId && !plan.causalLinkId && !plan.valueChainNodeId) {
    out.push({
      level: "warning",
      message:
        "The experiment targets nothing: attach it to an assumption, a causal link or a value chain level so its result can move a claim.",
    });
  }
  const hasSuccess = plan.successThreshold !== null && plan.successThreshold !== undefined;
  const hasFailure = plan.failureThreshold !== null && plan.failureThreshold !== undefined;
  if (hasSuccess !== hasFailure) {
    out.push({
      level: "info",
      message:
        "Only one threshold is set. Both a success and a failure threshold are needed for the outcome to be decided deterministically; otherwise you will classify it yourself.",
    });
  }
  if (!hasSuccess && !hasFailure) {
    out.push({
      level: "info",
      message:
        "No thresholds: the outcome will have to be classified explicitly, or it stays INCONCLUSIVE.",
    });
  }
  if ((hasSuccess || hasFailure) && !plan.unit?.trim()) {
    out.push({ level: "info", message: "Thresholds without a unit are hard to interpret later." });
  }
  return out;
}
