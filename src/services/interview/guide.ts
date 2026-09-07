/**
 * Interview guide generation. The deterministic template is always available;
 * the AI provider may enrich it. Questions are about past behavior, never
 * hypothetical willingness to pay.
 */
import type { InterviewGuide } from "@/services/ai/schemas";

export interface GuideInputs {
  opportunityTitle: string;
  icp: string;
  variable: string;
  pain: string;
  trigger: string | null;
  alternatives: string[];
}

export function buildTemplateInterviewGuide(i: GuideInputs): InterviewGuide {
  const pain = i.pain.replace(/\.$/, "");
  return {
    title: `Discovery interviews — ${i.opportunityTitle}`,
    targetProfile: `${i.icp} who has dealt with "${pain}" in the last 90 days. Aim for 5 interviews; stop pitching, start listening.`,
    sections: [
      {
        name: "Context",
        questions: [
          "Walk me through a normal week. Where does most of your time go?",
          `How do you currently keep track of ${i.variable.toLowerCase()}?`,
          "Who else is involved when something goes wrong with it?",
        ],
      },
      {
        name: "Last occurrence",
        questions: [
          `Tell me about the last time ${pain.toLowerCase()} happened.`,
          "What did you do, step by step?",
          "How much time did it take you and your team?",
          i.trigger
            ? `You mentioned situations like "${i.trigger}". When was the last one?`
            : "What made it impossible to ignore that time?",
        ],
      },
      {
        name: "Cost and impact",
        questions: [
          "What did it cost you — in money, capacity or customers?",
          "What happened when the problem was not solved?",
          "How often does something like this happen per month?",
        ],
      },
      {
        name: "Current alternatives",
        questions: [
          i.alternatives.length
            ? `You use ${i.alternatives.join(" / ")} today. What is frustrating about that?`
            : "What do you use today to deal with it? What is frustrating about that?",
          "What have you tried that did not work?",
        ],
      },
      {
        name: "Buying behavior",
        questions: [
          "Have you purchased anything to solve this? What?",
          "What triggered that purchase?",
          "Who signed off on it, and how long did it take?",
        ],
      },
    ],
    listenFor: [
      "Specific numbers, dates and names — vagueness means low pain.",
      "Workarounds they built themselves (strong evidence of pain).",
      "Who actually controls the budget versus who feels the pain.",
    ],
    avoid: [
      "Would you pay for this?",
      "Would you use a product that…?",
      "Describing your solution before the last question.",
    ],
  };
}
