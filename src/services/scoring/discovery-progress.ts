/**
 * Discovery progress — how much of the pipeline artifact exists.
 * Pure function over counts so the UI and the state machine share one truth.
 */
import type { DiscoveryStage } from "@/generated/prisma/enums";

export interface ProgressCounts {
  userContextCaptured: boolean;
  markets: number;
  icps: number;
  variables: number;
  pains: number;
  triggers: number;
  alternatives: number;
  evidence: number;
  mechanisms: number;
  opportunities: number;
  scoredOpportunities: number;
}

export type ProgressStatus = "done" | "partial" | "pending";

export interface ProgressStep {
  stage: DiscoveryStage;
  label: string;
  status: ProgressStatus;
  percent: number;
  detail: string;
}

export interface DiscoveryProgress {
  steps: ProgressStep[];
  overallPercent: number;
  /** The first stage that is not complete — where the conversation should be. */
  nextIncompleteStage: DiscoveryStage;
}

const EVIDENCE_TARGET = 6;
const MECHANISM_TARGET = 3;

function step(stage: DiscoveryStage, label: string, percent: number, detail: string): ProgressStep {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return {
    stage,
    label,
    percent: p,
    status: p >= 100 ? "done" : p > 0 ? "partial" : "pending",
    detail,
  };
}

export function computeDiscoveryProgress(c: ProgressCounts): DiscoveryProgress {
  const steps: ProgressStep[] = [
    step(
      "MARKET_SELECTION",
      "Market",
      c.markets >= 1 ? 100 : 0,
      `${c.markets} market${c.markets === 1 ? "" : "s"}`,
    ),
    step("ICP_DISCOVERY", "ICP", c.icps >= 1 ? 100 : 0, `${c.icps} ICP${c.icps === 1 ? "" : "s"}`),
    step(
      "VARIABLE_DISCOVERY",
      "Variables",
      c.variables >= 2 ? 100 : c.variables === 1 ? 50 : 0,
      `${c.variables} variable${c.variables === 1 ? "" : "s"}`,
    ),
    step(
      "PAIN_DISCOVERY",
      "Pain",
      c.pains >= 1 ? 100 : 0,
      `${c.pains} pain${c.pains === 1 ? "" : "s"}`,
    ),
    step(
      "TRIGGER_DISCOVERY",
      "Trigger",
      c.triggers >= 1 ? 100 : 0,
      `${c.triggers} trigger${c.triggers === 1 ? "" : "s"}`,
    ),
    step(
      "ALTERNATIVE_DISCOVERY",
      "Alternative",
      c.alternatives >= 1 ? 100 : 0,
      `${c.alternatives} alternative${c.alternatives === 1 ? "" : "s"}`,
    ),
    step(
      "EVIDENCE_DISCOVERY",
      "Evidence",
      (c.evidence / EVIDENCE_TARGET) * 100,
      `${c.evidence} of ${EVIDENCE_TARGET} target items`,
    ),
    step(
      "MECHANISM_DISCOVERY",
      "Mechanisms",
      (c.mechanisms / MECHANISM_TARGET) * 100,
      `${c.mechanisms} of ${MECHANISM_TARGET} explored`,
    ),
    step(
      "OPPORTUNITY_FORMATION",
      "Opportunity",
      c.opportunities >= 1 ? 100 : 0,
      `${c.opportunities} formed`,
    ),
    step(
      "RECOMMENDATION",
      "Decision",
      c.scoredOpportunities >= 1 ? 100 : 0,
      c.scoredOpportunities >= 1 ? "Verdict computed" : "No verdict yet",
    ),
  ];

  const overallPercent = Math.round(steps.reduce((s, x) => s + x.percent, 0) / steps.length);
  const firstIncomplete = steps.find((s) => s.status !== "done");
  const nextIncompleteStage: DiscoveryStage =
    !c.userContextCaptured && c.markets === 0
      ? "USER_CONTEXT"
      : (firstIncomplete?.stage ?? "RECOMMENDATION");

  return { steps, overallPercent, nextIncompleteStage };
}
