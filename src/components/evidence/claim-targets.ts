import type { WorkspaceGraph } from "@/db/workspaces";
import { CLAIM_TYPE_LABELS, VALUE_CHAIN_LEVEL_LABELS } from "@/domain/enums";
import type { ClaimType } from "@/generated/prisma/enums";
import { truncate } from "@/lib/utils";

/**
 * "What claim does this evidence affect?" — the selectable targets for one
 * opportunity. Problem-side claims are typed claims on the opportunity itself;
 * ladder claims point at a value chain node or a causal link.
 */
export interface ClaimTarget {
  key: string;
  claimType: ClaimType;
  label: string;
  detail?: string;
  valueChainNodeId?: string;
  causalLinkId?: string;
  group: "Problem" | "Value chain" | "Causal links";
}

const PROBLEM_CLAIMS: ClaimType[] = [
  "ICP",
  "VARIABLE",
  "CURRENT_STATE",
  "PAIN",
  "MAGNITUDE",
  "FREQUENCY",
  "ECONOMIC_IMPACT",
  "TRIGGER",
  "ALTERNATIVE",
  "MECHANISM",
  "WILLINGNESS_TO_PAY",
];

export function claimTargetsFor(
  graph: WorkspaceGraph,
  opportunityId: string | null | undefined,
): ClaimTarget[] {
  const o = graph.opportunities.find((x) => x.id === opportunityId);
  if (!o) return [];
  const targets: ClaimTarget[] = PROBLEM_CLAIMS.map((claimType) => ({
    key: `problem:${claimType}`,
    claimType,
    label: CLAIM_TYPE_LABELS[claimType],
    detail: problemDetail(o, claimType),
    group: "Problem",
  }));
  for (const node of o.valueChainNodes) {
    targets.push({
      key: `node:${node.id}`,
      claimType: "VALUE_CHAIN_NODE",
      label: VALUE_CHAIN_LEVEL_LABELS[node.level],
      detail: truncate(node.statement, 90),
      valueChainNodeId: node.id,
      group: "Value chain",
    });
  }
  for (const link of o.causalLinks) {
    targets.push({
      key: `link:${link.id}`,
      claimType: "CAUSAL_LINK",
      label: `${VALUE_CHAIN_LEVEL_LABELS[link.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[link.toNode.level]}`,
      detail: truncate(link.statement, 90),
      causalLinkId: link.id,
      group: "Causal links",
    });
  }
  return targets;
}

function problemDetail(
  o: WorkspaceGraph["opportunities"][number],
  claimType: ClaimType,
): string | undefined {
  switch (claimType) {
    case "ICP":
      return o.icp?.name;
    case "VARIABLE":
      return o.variable?.name;
    case "CURRENT_STATE":
      return o.variable?.currentState ?? o.pain?.currentState ?? "UNKNOWN";
    case "PAIN":
      return o.pain ? truncate(o.pain.description, 90) : undefined;
    case "ECONOMIC_IMPACT":
      return o.problemStatement ? truncate(o.problemStatement, 90) : undefined;
    case "MECHANISM":
      return o.mechanism ?? undefined;
    case "TRIGGER":
      return o.pain?.triggers[0]?.description;
    case "ALTERNATIVE":
      return o.pain?.alternatives[0]?.name;
    default:
      return undefined;
  }
}
