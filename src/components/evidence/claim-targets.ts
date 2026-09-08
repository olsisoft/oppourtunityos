import type { WorkspaceGraph } from "@/db/workspaces";
import type { ClaimType } from "@/generated/prisma/enums";
import type { T } from "@/i18n/t";
import { truncate } from "@/lib/utils";
import {
  CLAIM_GROUP,
  claimTypeForLevel,
  claimTypeForLink,
  SELECTABLE_CLAIM_TYPES,
  type ClaimGroup,
} from "@/services/value/claim-taxonomy";

/**
 * "What claim does this evidence affect?" — the selectable targets for one
 * opportunity. Problem, commercial and access claims are typed claims on the
 * opportunity itself; ladder claims point at a value chain node or a causal
 * link and take the claim type of their level.
 *
 * Labels are rendered in the caller's locale: pass its `t`.
 */
export type ClaimTargetGroup =
  "PROBLEM" | "COMMERCIAL" | "ACCESS" | "VALUE_CHAIN" | "CAUSAL_LINKS" | "OTHER";

export interface ClaimTarget {
  key: string;
  claimType: ClaimType;
  label: string;
  detail?: string;
  valueChainNodeId?: string;
  causalLinkId?: string;
  /** Stable id; rendered with `evidence.claimTargets.group.<id>`. */
  group: ClaimTargetGroup;
}

const GROUP_OF: Record<ClaimGroup, ClaimTargetGroup> = {
  MARKET: "PROBLEM",
  PROBLEM: "PROBLEM",
  VALUE: "PROBLEM",
  PRODUCT: "VALUE_CHAIN",
  CAUSAL: "CAUSAL_LINKS",
  COMMERCIAL: "COMMERCIAL",
  ACCESS: "ACCESS",
  OTHER: "OTHER",
};

export function claimTargetsFor(
  graph: WorkspaceGraph,
  opportunityId: string | null | undefined,
  t: T,
): ClaimTarget[] {
  const o = graph.opportunities.find((x) => x.id === opportunityId);
  if (!o) return [];
  const targets: ClaimTarget[] = [];
  for (const claimType of SELECTABLE_CLAIM_TYPES) {
    // Mechanism feasibility is a ladder claim when the ladder exists.
    if (
      claimType === "MECHANISM_FEASIBLE" &&
      o.valueChainNodes.some((n) => n.level === "MECHANISM")
    )
      continue;
    targets.push({
      key: `problem:${claimType}`,
      claimType,
      label: t(`labels.claimType.${claimType}`),
      detail: problemDetail(o, claimType, t),
      group: GROUP_OF[CLAIM_GROUP[claimType]],
    });
  }
  for (const node of o.valueChainNodes) {
    targets.push({
      key: `node:${node.id}`,
      claimType: claimTypeForLevel(node.level),
      label: t(`labels.valueChainLevel.${node.level}`),
      detail: truncate(node.statement, 90),
      valueChainNodeId: node.id,
      group: "VALUE_CHAIN",
    });
  }
  for (const link of o.causalLinks) {
    targets.push({
      key: `link:${link.id}`,
      claimType: claimTypeForLink(link.fromNode.level, link.toNode.level),
      label: t("evidence.claimTargets.link", {
        from: t(`labels.valueChainLevel.${link.fromNode.level}`),
        to: t(`labels.valueChainLevel.${link.toNode.level}`),
      }),
      detail: truncate(link.statement, 90),
      causalLinkId: link.id,
      group: "CAUSAL_LINKS",
    });
  }
  return targets;
}

export const CLAIM_TARGET_GROUP_ORDER: ClaimTargetGroup[] = [
  "PROBLEM",
  "VALUE_CHAIN",
  "CAUSAL_LINKS",
  "COMMERCIAL",
  "ACCESS",
  "OTHER",
];

export function claimTargetGroupLabel(group: ClaimTargetGroup, t: T): string {
  return t(`evidence.claimTargets.group.${group}`);
}

export function claimGroupLabel(claimType: ClaimType, t: T): string {
  return t(`labels.claimGroup.${CLAIM_GROUP[claimType]}`);
}

/** Commercial claims whose detail is a fixed explanation rather than workspace content. */
const DETAIL_KEY: Partial<Record<ClaimType, string>> = {
  EXISTING_SPEND: "evidence.claimTargets.detail.EXISTING_SPEND",
  PURCHASE_INTENT: "evidence.claimTargets.detail.PURCHASE_INTENT",
  WILLINGNESS_TO_PAY: "evidence.claimTargets.detail.WILLINGNESS_TO_PAY",
  PRICE_ACCEPTANCE: "evidence.claimTargets.detail.PRICE_ACCEPTANCE",
  ACTUAL_PURCHASE: "evidence.claimTargets.detail.ACTUAL_PURCHASE",
};

function problemDetail(
  o: WorkspaceGraph["opportunities"][number],
  claimType: ClaimType,
  t: T,
): string | undefined {
  const fixed = DETAIL_KEY[claimType];
  if (fixed) return t(fixed);
  switch (claimType) {
    case "ICP_EXISTS":
    case "ICP_ACCESSIBLE":
      return o.icp?.name;
    case "MARKET_EXISTS":
      return undefined;
    case "VARIABLE_IMPORTANCE":
      return o.variable?.name;
    case "CURRENT_STATE":
      return o.variable?.currentState ?? o.pain?.currentState ?? "UNKNOWN";
    case "PAIN_EXISTS":
    case "PAIN_SEVERITY":
    case "PAIN_FREQUENCY":
      return o.pain ? truncate(o.pain.description, 90) : undefined;
    case "ECONOMIC_IMPACT":
    case "MAGNITUDE":
      return o.problemStatement ? truncate(o.problemStatement, 90) : undefined;
    case "MECHANISM_FEASIBLE":
      return o.mechanism ?? undefined;
    case "TRIGGER_EXISTS":
      return o.pain?.triggers[0]?.description;
    case "ALTERNATIVE_EXISTS":
      return o.pain?.alternatives[0]?.name;
    default:
      return undefined;
  }
}
