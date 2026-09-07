/**
 * Kill criteria — explicit warning signals surfaced on every opportunity.
 * Deterministic and explainable. "critical" warnings should block a positive
 * verdict from being trusted until resolved; "warning" ones are advisory.
 */
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

export interface KillWarning {
  code: string;
  severity: KillSeverity;
  message: string;
  suggestion: string;
}

const HARD_REACH = /(hard|difficult|unknown|no access|cannot|can't|impossible|unclear)/i;

export function evaluateKillCriteria(input: KillCriteriaInput): KillWarning[] {
  const warnings: KillWarning[] = [];
  const { inputs } = input;

  if (inputs.painIntensity < 5) {
    warnings.push({
      code: "LOW_PAIN",
      severity: "critical",
      message: `Pain intensity is ${inputs.painIntensity}/10. Below 5 the problem is a nuisance, not a priority.`,
      suggestion:
        "Find evidence that the gap actually hurts (lost money, time, customers) or move on.",
    });
  }

  if (inputs.willingnessToPay < 5) {
    warnings.push({
      code: "LOW_WTP",
      severity: "critical",
      message: `Willingness to pay is ${inputs.willingnessToPay}/10. Nobody has shown they would spend money on this.`,
      suggestion:
        "Look for existing spend: tools, staff, consultants or workarounds the ICP already pays for.",
    });
  }

  if (!input.hasTrigger) {
    warnings.push({
      code: "NO_TRIGGER",
      severity: "warning",
      message: "No identifiable trigger. Without a trigger there is no urgency to act.",
      suggestion:
        "Ask: when does this problem become impossible to ignore? What event forces a decision?",
    });
  }

  if (inputs.frequency < 4) {
    warnings.push({
      code: "RARE",
      severity: "warning",
      message: `The problem occurs rarely (frequency ${inputs.frequency}/10). Rare problems are hard to sell and easy to tolerate.`,
      suggestion: "Confirm how often it happens per week or month with real customers.",
    });
  }

  if (input.alternativeCount > 0 && inputs.alternativeWeakness <= 3) {
    warnings.push({
      code: "ALTERNATIVE_ADEQUATE",
      severity: "critical",
      message: `Current alternatives already solve the problem adequately (weakness ${inputs.alternativeWeakness}/10).`,
      suggestion:
        "Identify a specific failure of the alternative that costs money, or pick a different variable.",
    });
  }

  if (inputs.importance < 4) {
    warnings.push({
      code: "NOT_ECONOMIC",
      severity: "critical",
      message: `The variable is not economically meaningful to the ICP (importance ${inputs.importance}/10).`,
      suggestion:
        "Trace the variable to revenue, cost, risk or capacity. If you cannot, choose another variable.",
    });
  }

  if (!input.hasMetric) {
    warnings.push({
      code: "NO_METRIC",
      severity: "warning",
      message: "No measurable outcome defined. Without a metric you cannot prove value.",
      suggestion: "Define the metric the product moves (e.g. no-show rate, minutes per ticket).",
    });
  }

  if (!input.icpReachability || HARD_REACH.test(input.icpReachability)) {
    warnings.push({
      code: "ICP_UNREACHABLE",
      severity: "warning",
      message: input.icpReachability
        ? `Reaching the ICP looks difficult: "${input.icpReachability}".`
        : "It is unknown whether you can reach the ICP to interview or sell.",
      suggestion:
        "List 5 concrete people or channels through which you can reach the ICP this month.",
    });
  }

  if (!input.economicBuyerKnown) {
    warnings.push({
      code: "BUYER_UNKNOWN",
      severity: "warning",
      message:
        "The economic buyer is not identified. Users who feel the pain may not control the budget.",
      suggestion: "Validate whether the owner, a manager or someone else controls purchasing.",
    });
  }

  if (input.isPersonalCuriosity) {
    warnings.push({
      code: "PERSONAL_CURIOSITY",
      severity: "warning",
      message:
        "This looks like personal curiosity rather than a business pain someone pays to remove.",
      suggestion:
        "Name the ICP who loses money because of this problem. If nobody does, treat it as a hobby.",
    });
  }

  if (
    typeof input.solutionComplexity === "number" &&
    input.solutionComplexity - inputs.importance >= 4
  ) {
    warnings.push({
      code: "SOLUTION_TOO_BIG",
      severity: "warning",
      message: `The solution dependency (complexity ${input.solutionComplexity}/10) is much larger than the perceived value (importance ${inputs.importance}/10).`,
      suggestion:
        "Look for a smaller mechanism (service, script, spreadsheet) that moves the variable first.",
    });
  }

  if (input.evidenceScore >= 40 && !input.hasEconomicImpactEvidence) {
    warnings.push({
      code: "NO_ECONOMIC_EVIDENCE",
      severity: "warning",
      message: "Evidence exists but none of it quantifies economic impact.",
      suggestion: "Ask customers what the problem cost them the last time it happened.",
    });
  }

  return warnings;
}

export function countCritical(warnings: KillWarning[]): number {
  return warnings.filter((w) => w.severity === "critical").length;
}
