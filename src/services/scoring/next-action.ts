/**
 * Next-best-action engine.
 *
 * Deterministic, ranked recommendations derived from the verdict, evidence
 * gaps, the riskiest untested assumptions and kill warnings. It never
 * recommends "build software" as the default.
 */
import type { Verdict } from "@/generated/prisma/enums";
import { msg, type MessageParam, type SystemMessage } from "@/i18n/messages";
import type { EvidenceScoreResult } from "./evidence-score";
import type { KillWarning } from "./kill-criteria";

export type NextActionType =
  | "KILL"
  | "IGNORE"
  | "RESOLVE_WARNING"
  | "VALIDATE_ASSUMPTION"
  | "RESEARCH"
  | "COMPARE_ALTERNATIVES"
  | "EXPLORE_MECHANISMS"
  | "INTERVIEW"
  | "TEST"
  | "DEFINE";

export interface NextAction {
  type: NextActionType;
  title: SystemMessage;
  rationale: SystemMessage;
  effort: "low" | "medium" | "high";
}

export interface AssumptionSummary {
  statement: string;
  status: "UNKNOWN" | "SUPPORTED" | "CONTRADICTED";
  importance: number;
  evidenceCount: number;
}

export interface NextActionInput {
  verdict: Verdict;
  opportunityScore: number;
  evidenceScore: number;
  evidence: Pick<EvidenceScoreResult, "gaps" | "counts" | "components">;
  assumptions: AssumptionSummary[];
  killWarnings: KillWarning[];
  hasTrigger: boolean;
  alternativeCount: number;
  mechanismCount: number;
  icpName?: string | null;
  painDescription?: string | null;
  frequency: number;
}

export function computeNextActions(input: NextActionInput): NextAction[] {
  const actions: NextAction[] = [];
  const icp: MessageParam = input.icpName?.trim() || msg("nextAction.fallback.icp");
  const pain: MessageParam = input.painDescription?.trim() || msg("nextAction.fallback.problem");

  if (input.verdict === "KILL") {
    actions.push({
      type: "KILL",
      title: msg("nextAction.mvp.KILL.title"),
      rationale: msg("nextAction.mvp.KILL.rationale", {
        evidenceScore: input.evidenceScore,
        opportunityScore: input.opportunityScore,
      }),
      effort: "low",
    });
    return actions;
  }

  if (input.verdict === "IGNORE") {
    actions.push({
      type: "IGNORE",
      title: msg("nextAction.mvp.IGNORE.title"),
      rationale: msg("nextAction.mvp.IGNORE.rationale"),
      effort: "low",
    });
    return actions;
  }

  const critical = input.killWarnings.filter((w) => w.severity === "critical");
  for (const w of critical.slice(0, 2)) {
    actions.push({
      type: "RESOLVE_WARNING",
      title: msg("nextAction.mvp.RESOLVE_WARNING.title", { suggestion: w.suggestion }),
      rationale: msg("nextAction.mvp.RESOLVE_WARNING.rationale", { message: w.message }),
      effort: "medium",
    });
  }

  const riskiest = [...input.assumptions]
    .filter((a) => a.status === "UNKNOWN")
    .sort((a, b) => b.importance - a.importance || a.evidenceCount - b.evidenceCount)[0];
  if (riskiest && riskiest.importance >= 7) {
    actions.push({
      type: "VALIDATE_ASSUMPTION",
      title: msg("nextAction.mvp.VALIDATE_ASSUMPTION.title", { statement: riskiest.statement }),
      rationale: msg("nextAction.mvp.VALIDATE_ASSUMPTION.rationale", {
        importance: riskiest.importance,
        count: riskiest.evidenceCount,
      }),
      effort: "medium",
    });
  }

  const component = (key: string) => input.evidence.components.find((c) => c.key === key);
  if ((component("economicImpact")?.itemCount ?? 0) === 0) {
    actions.push({
      type: "RESEARCH",
      title: msg("nextAction.mvp.ECONOMIC_IMPACT.title", { pain }),
      rationale: msg("nextAction.mvp.ECONOMIC_IMPACT.rationale"),
      effort: "medium",
    });
  }
  if ((component("directCustomer")?.itemCount ?? 0) === 0) {
    actions.push({
      type: "INTERVIEW",
      title: msg("nextAction.mvp.DIRECT_CUSTOMER.title", { icp }),
      rationale: msg("nextAction.mvp.DIRECT_CUSTOMER.rationale"),
      effort: "medium",
    });
  }
  if (input.frequency >= 5 && (component("explicitPain")?.itemCount ?? 0) === 0) {
    actions.push({
      type: "RESEARCH",
      title: msg("nextAction.mvp.EXPLICIT_PAIN.title"),
      rationale: msg("nextAction.mvp.EXPLICIT_PAIN.rationale"),
      effort: "low",
    });
  }

  if (input.alternativeCount === 0) {
    actions.push({
      type: "COMPARE_ALTERNATIVES",
      title: msg("nextAction.mvp.ALTERNATIVES.title", { icp }),
      rationale: msg("nextAction.mvp.ALTERNATIVES.rationale"),
      effort: "low",
    });
  }

  if (!input.hasTrigger) {
    actions.push({
      type: "DEFINE",
      title: msg("nextAction.mvp.TRIGGER.title"),
      rationale: msg("nextAction.mvp.TRIGGER.rationale"),
      effort: "low",
    });
  }

  switch (input.verdict) {
    case "RESEARCH":
      actions.push({
        type: "RESEARCH",
        title: msg("nextAction.mvp.RESEARCH.title"),
        rationale: msg("nextAction.mvp.RESEARCH.rationale", {
          opportunityScore: input.opportunityScore,
          evidenceScore: input.evidenceScore,
        }),
        effort: "medium",
      });
      break;
    case "INVESTIGATE":
      actions.push({
        type: "RESEARCH",
        title: msg("nextAction.mvp.INVESTIGATE.title"),
        rationale: msg("nextAction.mvp.INVESTIGATE.rationale"),
        effort: "medium",
      });
      break;
    case "INTERVIEW":
      if (input.mechanismCount < 3) {
        actions.push({
          type: "EXPLORE_MECHANISMS",
          title: msg("nextAction.mvp.EXPLORE_MECHANISMS.title"),
          rationale: msg("nextAction.mvp.EXPLORE_MECHANISMS.rationale", {
            count: input.mechanismCount,
          }),
          effort: "low",
        });
      }
      actions.push({
        type: "INTERVIEW",
        title: msg("nextAction.mvp.INTERVIEW.title", { icp, pain }),
        rationale: msg("nextAction.mvp.INTERVIEW.rationale"),
        effort: "high",
      });
      break;
    case "TEST":
      actions.push({
        type: "TEST",
        title: msg("nextAction.mvp.TEST.title"),
        rationale: msg("nextAction.mvp.TEST.rationale"),
        effort: "high",
      });
      break;
    default:
      break;
  }

  // De-duplicate by title, keep order.
  const seen = new Set<string>();
  return actions.filter((a) => {
    if (seen.has(a.title.text)) return false;
    seen.add(a.title.text);
    return true;
  });
}

export function primaryNextAction(input: NextActionInput): NextAction {
  const actions = computeNextActions(input);
  return (
    actions[0] ?? {
      type: "DEFINE",
      title: msg("nextAction.mvp.DEFINE.title"),
      rationale: msg("nextAction.mvp.DEFINE.rationale"),
      effort: "low",
    }
  );
}
