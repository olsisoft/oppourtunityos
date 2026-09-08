/**
 * Interview guide generation. The deterministic template is always available;
 * the AI provider may enrich it. Questions are about past behavior, never
 * hypothetical willingness to pay. The template speaks the user's locale: the
 * sentences live under "mock.interview" in the dictionaries.
 */
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { renderKey, type MessageParams } from "@/i18n/messages";
import type { InterviewGuide } from "@/services/ai/schemas";

export interface GuideInputs {
  opportunityTitle: string;
  icp: string;
  variable: string;
  pain: string;
  trigger: string | null;
  alternatives: string[];
}

export function buildTemplateInterviewGuide(
  i: GuideInputs,
  locale: Locale = DEFAULT_LOCALE,
): InterviewGuide {
  const pain = i.pain.replace(/\.$/, "");
  const t = (key: string, params?: MessageParams) =>
    renderKey(locale, `mock.interview.${key}`, params);
  return {
    title: t("title", { title: i.opportunityTitle }),
    targetProfile: t("targetProfile", { icp: i.icp, pain }),
    sections: [
      {
        name: t("context.name"),
        questions: [
          t("context.week"),
          t("context.tracking", { variable: i.variable.toLowerCase() }),
          t("context.involved"),
        ],
      },
      {
        name: t("lastOccurrence.name"),
        questions: [
          t("lastOccurrence.lastTime", { pain: pain.toLowerCase() }),
          t("lastOccurrence.steps"),
          t("lastOccurrence.duration"),
          i.trigger
            ? t("lastOccurrence.trigger", { trigger: i.trigger })
            : t("lastOccurrence.unignorable"),
        ],
      },
      {
        name: t("cost.name"),
        questions: [t("cost.cost"), t("cost.unsolved"), t("cost.frequency")],
      },
      {
        name: t("alternatives.name"),
        questions: [
          i.alternatives.length
            ? t("alternatives.known", { alternatives: i.alternatives.join(" / ") })
            : t("alternatives.unknown"),
          t("alternatives.tried"),
        ],
      },
      {
        name: t("buying.name"),
        questions: [t("buying.purchased"), t("buying.trigger"), t("buying.signoff")],
      },
    ],
    listenFor: [t("listenFor.numbers"), t("listenFor.workarounds"), t("listenFor.budget")],
    avoid: [t("avoid.wouldPay"), t("avoid.wouldUse"), t("avoid.pitching")],
  };
}
