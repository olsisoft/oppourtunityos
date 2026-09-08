/**
 * Turn a value action into a prefilled experiment plan. Pure: usable from
 * server components and client components alike. The user still edits it —
 * the decision question in particular.
 */
import type { ExperimentType } from "@/generated/prisma/enums";
import type { ValueAction } from "./next-value-action";

export interface PlanPrefill {
  title?: string;
  hypothesis?: string;
  decisionQuestion?: string;
  design?: string;
  successMetric?: string;
  experimentType?: ExperimentType;
  causalLinkId?: string | null;
  assumptionId?: string | null;
  valueChainNodeId?: string | null;
}

export function prefillFromAction(action: ValueAction, opportunityTitle: string): PlanPrefill {
  const type: ExperimentType =
    action.type === "WTP_EVIDENCE"
      ? "PRICING_TEST"
      : action.type === "MECHANISM_FEASIBILITY"
        ? "DATA_FEASIBILITY_TEST"
        : action.type === "CAUSAL_LINK"
          ? "MANUAL_WORKFLOW_TEST"
          : action.type === "ECONOMIC_MAGNITUDE"
            ? "CUSTOMER_INTERVIEW"
            : "OTHER";
  return {
    title: action.what
      .replace(/^(Validate|Test|Find|Quantify|Establish|Strengthen)\s/, "")
      .slice(0, 120),
    hypothesis: action.what,
    decisionQuestion: `Should we keep investing in "${opportunityTitle}" given ${action.affects.toLowerCase()}? If false: ${action.ifFalse}`,
    design: action.experiment ?? undefined,
    successMetric: undefined,
    experimentType: type,
    causalLinkId: action.causalLinkId ?? null,
    assumptionId: action.assumptionId ?? null,
  };
}
