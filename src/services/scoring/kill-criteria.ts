/**
 * Kill criteria — explicit warning signals surfaced on every opportunity.
 * Deterministic and explainable. "critical" warnings should block a positive
 * verdict from being trusted until resolved; "warning" ones are advisory.
 *
 * Messages and suggestions are SystemMessages (see src/i18n/messages.ts):
 * the dictionary section "scoring.kill.<CODE>" holds the wording per code,
 * and `text` carries the canonical English.
 */
import { msg, type MessageParams, type SystemMessage } from "@/i18n/messages";
import type { OpportunityScoreInputs } from "./opportunity-score";

export interface KillCriteriaInput {
  inputs: OpportunityScoreInputs;
  hasTrigger: boolean;
  hasMetric: boolean;
  economicBuyerKnown: boolean;
  /** Free text describing how reachable the ICP is. Empty = unknown. */
  icpReachability?: string | null;
  evidenceScore: number;
  hasEconomicImpactEvidence: boolean;
  alternativeCount: number;
  /** Optional 0–10 estimate of solution complexity vs perceived value. */
  solutionComplexity?: number | null;
  /** Set when the user's context suggests personal curiosity rather than a buyer's pain. */
  isPersonalCuriosity?: boolean;
}

export type KillSeverity = "critical" | "warning";

export type KillCode =
  | "LOW_PAIN"
  | "LOW_WTP"
  | "NO_TRIGGER"
  | "RARE"
  | "ALTERNATIVE_ADEQUATE"
  | "NOT_ECONOMIC"
  | "NO_METRIC"
  | "ICP_UNREACHABLE"
  | "BUYER_UNKNOWN"
  | "PERSONAL_CURIOSITY"
  | "SOLUTION_TOO_BIG"
  | "NO_ECONOMIC_EVIDENCE";

export interface KillWarning {
  code: string;
  severity: KillSeverity;
  message: SystemMessage;
  suggestion: SystemMessage;
}

const HARD_REACH = /(hard|difficult|unknown|no access|cannot|can't|impossible|unclear)/i;

function warning(code: KillCode, severity: KillSeverity, params?: MessageParams): KillWarning {
  return {
    code,
    severity,
    message: msg(`scoring.kill.${code}.message`, params),
    suggestion: msg(`scoring.kill.${code}.suggestion`),
  };
}

export function evaluateKillCriteria(input: KillCriteriaInput): KillWarning[] {
  const warnings: KillWarning[] = [];
  const { inputs } = input;

  if (inputs.painIntensity < 5) {
    warnings.push(warning("LOW_PAIN", "critical", { value: inputs.painIntensity }));
  }

  if (inputs.willingnessToPay < 5) {
    warnings.push(warning("LOW_WTP", "critical", { value: inputs.willingnessToPay }));
  }

  if (!input.hasTrigger) {
    warnings.push(warning("NO_TRIGGER", "warning"));
  }

  if (inputs.frequency < 4) {
    warnings.push(warning("RARE", "warning", { value: inputs.frequency }));
  }

  if (input.alternativeCount > 0 && inputs.alternativeWeakness <= 3) {
    warnings.push(
      warning("ALTERNATIVE_ADEQUATE", "critical", { value: inputs.alternativeWeakness }),
    );
  }

  if (inputs.importance < 4) {
    warnings.push(warning("NOT_ECONOMIC", "critical", { value: inputs.importance }));
  }

  if (!input.hasMetric) {
    warnings.push(warning("NO_METRIC", "warning"));
  }

  if (!input.icpReachability || HARD_REACH.test(input.icpReachability)) {
    warnings.push({
      code: "ICP_UNREACHABLE",
      severity: "warning",
      message: input.icpReachability
        ? msg("scoring.kill.ICP_UNREACHABLE.message", { reachability: input.icpReachability })
        : msg("scoring.kill.ICP_UNREACHABLE.messageUnknown"),
      suggestion: msg("scoring.kill.ICP_UNREACHABLE.suggestion"),
    });
  }

  if (!input.economicBuyerKnown) {
    warnings.push(warning("BUYER_UNKNOWN", "warning"));
  }

  if (input.isPersonalCuriosity) {
    warnings.push(warning("PERSONAL_CURIOSITY", "warning"));
  }

  if (
    typeof input.solutionComplexity === "number" &&
    input.solutionComplexity - inputs.importance >= 4
  ) {
    warnings.push(
      warning("SOLUTION_TOO_BIG", "warning", {
        complexity: input.solutionComplexity,
        importance: inputs.importance,
      }),
    );
  }

  if (input.evidenceScore >= 40 && !input.hasEconomicImpactEvidence) {
    warnings.push(warning("NO_ECONOMIC_EVIDENCE", "warning"));
  }

  return warnings;
}

export function countCritical(warnings: KillWarning[]): number {
  return warnings.filter((w) => w.severity === "critical").length;
}
