/**
 * Discovery progress — how much of the pipeline artifact exists.
 * Pure function over counts so the UI and the state machine share one truth.
 *
 * Step labels and details are SystemMessages (see src/i18n/messages.ts) so
 * they render in the reader's language; `text` holds the canonical English.
 */
import type { DiscoveryStage } from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";

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
  /** Value causality ladder nodes across the workspace's opportunities. */
  valueChainNodes?: number;
  experiments?: number;
}

export type ProgressStatus = "done" | "partial" | "pending";

export interface ProgressStep {
  stage: DiscoveryStage;
  label: SystemMessage;
  status: ProgressStatus;
  percent: number;
  detail: SystemMessage;
}

export interface DiscoveryProgress {
  steps: ProgressStep[];
  overallPercent: number;
  /** The first stage that is not complete — where the conversation should be. */
  nextIncompleteStage: DiscoveryStage;
}

const EVIDENCE_TARGET = 6;
const MECHANISM_TARGET = 3;
/** Mechanism → Capability → Transformation → Operational → Economic → Strategic. */
const VALUE_CHAIN_TARGET = 6;

function step(stage: DiscoveryStage, percent: number, detail: SystemMessage): ProgressStep {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return {
    stage,
    label: msg(`scoring.progress.step.${stage}`),
    percent: p,
    status: p >= 100 ? "done" : p > 0 ? "partial" : "pending",
    detail,
  };
}

export function computeDiscoveryProgress(c: ProgressCounts): DiscoveryProgress {
  const valueChainNodes = c.valueChainNodes ?? 0;
  const experiments = c.experiments ?? 0;
  const steps: ProgressStep[] = [
    step(
      "MARKET_SELECTION",
      c.markets >= 1 ? 100 : 0,
      msg("scoring.progress.detail.markets", { count: c.markets }),
    ),
    step(
      "ICP_DISCOVERY",
      c.icps >= 1 ? 100 : 0,
      msg("scoring.progress.detail.icps", { count: c.icps }),
    ),
    step(
      "VARIABLE_DISCOVERY",
      c.variables >= 2 ? 100 : c.variables === 1 ? 50 : 0,
      msg("scoring.progress.detail.variables", { count: c.variables }),
    ),
    step(
      "PAIN_DISCOVERY",
      c.pains >= 1 ? 100 : 0,
      msg("scoring.progress.detail.pains", { count: c.pains }),
    ),
    step(
      "TRIGGER_DISCOVERY",
      c.triggers >= 1 ? 100 : 0,
      msg("scoring.progress.detail.triggers", { count: c.triggers }),
    ),
    step(
      "ALTERNATIVE_DISCOVERY",
      c.alternatives >= 1 ? 100 : 0,
      msg("scoring.progress.detail.alternatives", { count: c.alternatives }),
    ),
    step(
      "EVIDENCE_DISCOVERY",
      (c.evidence / EVIDENCE_TARGET) * 100,
      msg("scoring.progress.detail.evidence", { count: c.evidence, target: EVIDENCE_TARGET }),
    ),
    step(
      "MECHANISM_DISCOVERY",
      (c.mechanisms / MECHANISM_TARGET) * 100,
      msg("scoring.progress.detail.mechanisms", {
        count: c.mechanisms,
        target: MECHANISM_TARGET,
      }),
    ),
    step(
      "OPPORTUNITY_FORMATION",
      c.opportunities >= 1 ? 100 : 0,
      msg("scoring.progress.detail.opportunities", { count: c.opportunities }),
    ),
    step(
      "VALUE_CAUSALITY",
      Math.min(100, (valueChainNodes / VALUE_CHAIN_TARGET) * 100),
      msg("scoring.progress.detail.valueChain", {
        count: valueChainNodes,
        target: VALUE_CHAIN_TARGET,
      }),
    ),
    step(
      "EXPERIMENT_DESIGN",
      experiments >= 1 ? 100 : 0,
      msg("scoring.progress.detail.experiments", { count: experiments }),
    ),
    step(
      "RECOMMENDATION",
      c.scoredOpportunities >= 1 ? 100 : 0,
      c.scoredOpportunities >= 1
        ? msg("scoring.progress.detail.verdictComputed")
        : msg("scoring.progress.detail.noVerdict"),
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
