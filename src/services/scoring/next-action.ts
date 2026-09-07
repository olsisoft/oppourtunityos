/**
 * Next-best-action engine.
 *
 * Deterministic, ranked recommendations derived from the verdict, evidence
 * gaps, the riskiest untested assumptions and kill warnings. It never
 * recommends "build software" as the default.
 */
import type { Verdict } from "@/generated/prisma/enums";
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
  title: string;
  rationale: string;
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
  const icp = input.icpName?.trim() || "target customers";
  const pain = input.painDescription?.trim() || "this problem";

  if (input.verdict === "KILL") {
    actions.push({
      type: "KILL",
      title: "Write down why this opportunity is dead and archive it",
      rationale: `Evidence Confidence is ${input.evidenceScore}/100 while Opportunity Potential is only ${input.opportunityScore}/100: the evidence says the structure is weak.`,
      effort: "low",
    });
    return actions;
  }

  if (input.verdict === "IGNORE") {
    actions.push({
      type: "IGNORE",
      title: "Park this opportunity; revisit only if new evidence appears",
      rationale:
        "Both potential and evidence are low. Spending research time here has poor expected value.",
      effort: "low",
    });
    return actions;
  }

  const critical = input.killWarnings.filter((w) => w.severity === "critical");
  for (const w of critical.slice(0, 2)) {
    actions.push({
      type: "RESOLVE_WARNING",
      title: w.suggestion,
      rationale: w.message,
      effort: "medium",
    });
  }

  const riskiest = [...input.assumptions]
    .filter((a) => a.status === "UNKNOWN")
    .sort((a, b) => b.importance - a.importance || a.evidenceCount - b.evidenceCount)[0];
  if (riskiest && riskiest.importance >= 7) {
    actions.push({
      type: "VALIDATE_ASSUMPTION",
      title: `Validate the riskiest assumption: "${riskiest.statement}"`,
      rationale: `Importance ${riskiest.importance}/10 with ${riskiest.evidenceCount} linked evidence item${riskiest.evidenceCount === 1 ? "" : "s"}. If this is false the opportunity collapses.`,
      effort: "medium",
    });
  }

  const component = (key: string) => input.evidence.components.find((c) => c.key === key);
  if ((component("economicImpact")?.itemCount ?? 0) === 0) {
    actions.push({
      type: "RESEARCH",
      title: `Determine the economic impact of ${pain}`,
      rationale:
        "No evidence quantifies what the problem costs. Scores stay hypothetical until it does.",
      effort: "medium",
    });
  }
  if ((component("directCustomer")?.itemCount ?? 0) === 0) {
    actions.push({
      type: "INTERVIEW",
      title: `Talk to 3 ${icp} and capture what they say as evidence`,
      rationale: "There is no direct customer evidence yet. Everything rests on reasoning.",
      effort: "medium",
    });
  }
  if (input.frequency >= 5 && (component("explicitPain")?.itemCount ?? 0) === 0) {
    actions.push({
      type: "RESEARCH",
      title: "Find evidence that this pain occurs at least weekly",
      rationale: "Frequency is assumed high but no source states the pain explicitly.",
      effort: "low",
    });
  }

  if (input.alternativeCount === 0) {
    actions.push({
      type: "COMPARE_ALTERNATIVES",
      title: `Map what ${icp} do today and where it fails`,
      rationale: "No current alternative is documented. Alternative weakness cannot be trusted.",
      effort: "low",
    });
  }

  if (!input.hasTrigger) {
    actions.push({
      type: "DEFINE",
      title: "Identify the trigger that makes the problem urgent",
      rationale: "Without a trigger there is no buying moment.",
      effort: "low",
    });
  }

  switch (input.verdict) {
    case "RESEARCH":
      actions.push({
        type: "RESEARCH",
        title: "Capture at least 5 external evidence items before thinking about solutions",
        rationale: `Opportunity Potential ${input.opportunityScore}/100 with Evidence Confidence ${input.evidenceScore}/100: promising but unproven.`,
        effort: "medium",
      });
      break;
    case "INVESTIGATE":
      actions.push({
        type: "RESEARCH",
        title: "Sharpen the ICP and variable, then add direct evidence",
        rationale:
          "Moderate potential with partial evidence. A narrower ICP often raises both scores.",
        effort: "medium",
      });
      break;
    case "INTERVIEW":
      if (input.mechanismCount < 3) {
        actions.push({
          type: "EXPLORE_MECHANISMS",
          title: "Explore at least 3 mechanisms before selecting a product hypothesis",
          rationale: `${input.mechanismCount} mechanism${input.mechanismCount === 1 ? "" : "s"} documented. Problem ≠ product.`,
          effort: "low",
        });
      }
      actions.push({
        type: "INTERVIEW",
        title: `Interview 5 ${icp} about the last time ${pain} happened`,
        rationale:
          "Scores justify customer discovery. Use the generated interview guide and save notes as evidence.",
        effort: "high",
      });
      break;
    case "TEST":
      actions.push({
        type: "TEST",
        title: "Run a concierge test or landing page before writing software",
        rationale: "Both scores are strong. A lightweight test validates demand cheaper than code.",
        effort: "high",
      });
      break;
    default:
      break;
  }

  // De-duplicate by title, keep order.
  const seen = new Set<string>();
  return actions.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
}

export function primaryNextAction(input: NextActionInput): NextAction {
  const actions = computeNextActions(input);
  return (
    actions[0] ?? {
      type: "DEFINE",
      title: "Define the ICP, variable and pain before anything else",
      rationale: "The opportunity is not yet structured enough to recommend an action.",
      effort: "low",
    }
  );
}
