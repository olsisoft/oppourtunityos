import type { WorkspaceGraph } from "@/db/workspaces";
import { CLAIM_TYPE_LABELS, VALUE_CHAIN_LEVEL_LABELS } from "@/domain/enums";
import type { ClaimType } from "@/generated/prisma/enums";
import { truncate } from "@/lib/utils";
import {
  CLAIM_GROUP,
  CLAIM_GROUP_LABELS,
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
 */
export interface ClaimTarget {
  key: string;
  claimType: ClaimType;
  label: string;
  detail?: string;
  valueChainNodeId?: string;
  causalLinkId?: string;
  group: "Problem" | "Commercial" | "Access" | "Value chain" | "Causal links" | "Other";
}

const GROUP_OF: Record<ClaimGroup, ClaimTarget["group"]> = {
  MARKET: "Problem",
  PROBLEM: "Problem",
  VALUE: "Problem",
  PRODUCT: "Value chain",
  CAUSAL: "Causal links",
  COMMERCIAL: "Commercial",
  ACCESS: "Access",
  OTHER: "Other",
};

export function claimTargetsFor(
  graph: WorkspaceGraph,
  opportunityId: string | null | undefined,
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
      label: CLAIM_TYPE_LABELS[claimType],
      detail: problemDetail(o, claimType),
      group: GROUP_OF[CLAIM_GROUP[claimType]],
    });
  }
  for (const node of o.valueChainNodes) {
    targets.push({
      key: `node:${node.id}`,
      claimType: claimTypeForLevel(node.level),
      label: VALUE_CHAIN_LEVEL_LABELS[node.level],
      detail: truncate(node.statement, 90),
      valueChainNodeId: node.id,
      group: "Value chain",
    });
  }
  for (const link of o.causalLinks) {
    targets.push({
      key: `link:${link.id}`,
      claimType: claimTypeForLink(link.fromNode.level, link.toNode.level),
      label: `${VALUE_CHAIN_LEVEL_LABELS[link.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[link.toNode.level]}`,
      detail: truncate(link.statement, 90),
      causalLinkId: link.id,
      group: "Causal links",
    });
  }
  return targets;
}

export const CLAIM_TARGET_GROUP_ORDER: ClaimTarget["group"][] = [
  "Problem",
  "Value chain",
  "Causal links",
  "Commercial",
  "Access",
  "Other",
];

export function claimGroupLabel(claimType: ClaimType): string {
  return CLAIM_GROUP_LABELS[CLAIM_GROUP[claimType]];
}

function problemDetail(
  o: WorkspaceGraph["opportunities"][number],
  claimType: ClaimType,
): string | undefined {
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
    case "EXISTING_SPEND":
      return "What buyers already pay to deal with this (not WTP for something new)";
    case "PURCHASE_INTENT":
      return "Buyers say they would buy";
    case "WILLINGNESS_TO_PAY":
      return "Buyers state a price they would pay (stated, not observed)";
    case "PRICE_ACCEPTANCE":
      return "Buyers accept a real price put in front of them";
    case "ACTUAL_PURCHASE":
      return "Money actually changed hands";
    default:
      return undefined;
  }
}
