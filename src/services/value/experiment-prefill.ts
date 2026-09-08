/**
 * Turn a value action into a prefilled experiment plan. Pure: usable from
 * server components and client components alike. The user still edits it —
 * the decision question in particular. Text fields are localized values:
 * the form renders them with t() in the current language.
 */
import type { ExperimentType } from "@/generated/prisma/enums";
import { msg, type LocalizedText } from "@/i18n/messages";
import type { ValueAction } from "./next-value-action";

export interface PlanPrefill {
  title?: LocalizedText;
  hypothesis?: LocalizedText;
  decisionQuestion?: LocalizedText;
  design?: LocalizedText;
  successMetric?: LocalizedText;
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
    title: action.what,
    hypothesis: action.what,
    decisionQuestion: msg("nextAction.prefill.decisionQuestion", {
      title: opportunityTitle,
      affects: action.affects,
      ifFalse: action.ifFalse,
    }),
    design: action.experiment ?? undefined,
    successMetric: undefined,
    experimentType: type,
    causalLinkId: action.causalLinkId ?? null,
    assumptionId: action.assumptionId ?? null,
  };
}
