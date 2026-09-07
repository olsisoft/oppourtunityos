/**
 * Discovery stage machine.
 *
 * A stage is "satisfied" when the workspace holds the artifact that stage is
 * meant to produce. The conversation can only advance to a stage whose
 * prerequisites are satisfied — but because extraction runs before the
 * transition, a user who supplies a lot of information in one message
 * legitimately jumps ahead (the "intelligent exception").
 */
import type { DiscoveryStage, EntryMode } from "@/generated/prisma/enums";
import { STAGE_ORDER } from "@/domain/enums";
import type { ProgressCounts } from "@/services/scoring/discovery-progress";

export const STAGE_INDEX: Record<DiscoveryStage, number> = Object.fromEntries(
  STAGE_ORDER.map((s, i) => [s, i]),
) as Record<DiscoveryStage, number>;

export function compareStages(a: DiscoveryStage, b: DiscoveryStage): number {
  return STAGE_INDEX[a] - STAGE_INDEX[b];
}

export interface StageContext {
  counts: ProgressCounts;
  entryMode: EntryMode | null;
  /** The AI declared the current stage complete even if counts are thin. */
  aiReady: boolean;
}

export function stageSatisfied(stage: DiscoveryStage, ctx: StageContext): boolean {
  const c = ctx.counts;
  switch (stage) {
    case "START":
      return ctx.entryMode !== null;
    case "USER_CONTEXT":
      return ctx.entryMode === "HAS_IDEA" || c.userContextCaptured || c.markets > 0;
    case "MARKET_SELECTION":
      return c.markets > 0;
    case "ICP_DISCOVERY":
      return c.icps > 0;
    case "VARIABLE_DISCOVERY":
      return c.variables >= 2 || (c.variables >= 1 && ctx.aiReady);
    case "PAIN_DISCOVERY":
      return c.pains > 0;
    case "TRIGGER_DISCOVERY":
      return c.triggers > 0;
    case "ALTERNATIVE_DISCOVERY":
      return c.alternatives > 0;
    case "EVIDENCE_DISCOVERY":
      // Evidence can be added at any time; the user may knowingly continue
      // with hypotheses (the verdict will reflect the missing evidence).
      return c.evidence > 0 || ctx.aiReady;
    case "MECHANISM_DISCOVERY":
      return c.mechanisms >= 2 || (c.mechanisms >= 1 && ctx.aiReady);
    case "OPPORTUNITY_FORMATION":
      return c.opportunities > 0;
    case "SCORING":
      return c.scoredOpportunities > 0;
    case "RECOMMENDATION":
      return false; // terminal; never "completed"
    default:
      return false;
  }
}

/** The furthest stage whose prerequisites (all earlier stages) are satisfied. */
export function maxReachableStage(ctx: StageContext): DiscoveryStage {
  let reachable: DiscoveryStage = STAGE_ORDER[0];
  for (const stage of STAGE_ORDER) {
    reachable = stage;
    if (!stageSatisfied(stage, ctx)) break;
  }
  return reachable;
}

export interface StageResolution {
  stage: DiscoveryStage;
  reason: string;
  changed: boolean;
}

/**
 * Decide the stage after a turn.
 * - Backward moves suggested by the AI are honored (the user wants to revisit).
 * - Forward moves are capped at the furthest reachable stage.
 * - Without a suggestion, advance to the furthest reachable stage but never
 *   more than two stages at once unless the data is already there.
 */
export function resolveNextStage(
  current: DiscoveryStage,
  suggested: DiscoveryStage | null,
  ctx: StageContext,
): StageResolution {
  const reachable = maxReachableStage(ctx);

  if (suggested && compareStages(suggested, current) < 0) {
    return { stage: suggested, reason: "Revisiting an earlier stage as suggested.", changed: true };
  }

  let target = suggested ?? reachable;
  if (compareStages(target, reachable) > 0) {
    target = reachable;
  }
  if (compareStages(target, current) < 0) {
    target = current;
  }

  const changed = target !== current;
  const reason = changed
    ? suggested && suggested !== target
      ? `Suggested ${suggested} but prerequisites stop at ${target}.`
      : `Advanced to ${target}: prerequisites satisfied.`
    : `Staying in ${current}: ${stageSatisfied(current, ctx) ? "waiting for the next step" : "artifact for this stage not yet captured"}.`;

  return { stage: target, reason, changed };
}
