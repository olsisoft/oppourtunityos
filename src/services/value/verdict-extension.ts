/**
 * Extends the base deterministic verdict with the value-engineering
 * dimensions. Base rules are never replaced; documented extension rules may
 * change the verdict, and every change is explained. INCOMPLETE dimensions
 * (null) never fire a rule, so existing opportunities keep their verdicts.
 *
 * Every explanation is a SystemMessage (see src/i18n/messages.ts) so it
 * renders in the reader's language; `text` holds the canonical English.
 */
import type { Verdict } from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";
import type { VerdictResult } from "@/services/scoring/verdict";
import type { FrontierPosition } from "./proof-frontier";

export type VerdictFocus =
  "TEST_MECHANISM" | "CRITICAL_CUSTOMER_QUESTION" | "RESOLVE_CONTRADICTION" | "LOW_VALUE" | null;

export interface VerdictExtensionContext {
  evidenceScore: number;
  valueStrength: number | null;
  causalConfidence: number | null;
  /** A problem-side claim or a critical causal link is CONTRADICTED. */
  criticalContradiction: boolean;
  frontier: FrontierPosition;
  /** An untested critical WTP / ACCESS / VALUE assumption remains. */
  openCriticalCustomerQuestion: boolean;
}

export interface ExtendedVerdictResult extends VerdictResult {
  baseVerdict: Verdict;
  extension: { ruleId: string | null; focus: VerdictFocus; changed: boolean };
}

export const EXTENSION_RULE_IDS = [
  "LOW_VALUE_KILL",
  "CRITICAL_CONTRADICTION",
  "TEST_MECHANISM",
  "CRITICAL_CUSTOMER_QUESTION",
] as const;

export type ExtensionRuleId = (typeof EXTENSION_RULE_IDS)[number];

/** Documented wording of an extension rule. */
export function extensionRuleText(id: ExtensionRuleId): SystemMessage {
  return msg(`scoring.verdict.extension.rule.${id}`);
}

/** The documented extension rules (getters keep the dictionary lookup lazy). */
export const EXTENSION_RULES: Record<ExtensionRuleId, SystemMessage> = {
  get LOW_VALUE_KILL() {
    return extensionRuleText("LOW_VALUE_KILL");
  },
  get CRITICAL_CONTRADICTION() {
    return extensionRuleText("CRITICAL_CONTRADICTION");
  },
  get TEST_MECHANISM() {
    return extensionRuleText("TEST_MECHANISM");
  },
  get CRITICAL_CUSTOMER_QUESTION() {
    return extensionRuleText("CRITICAL_CUSTOMER_QUESTION");
  },
};

export function extendVerdict(
  base: VerdictResult,
  ctx: VerdictExtensionContext,
): ExtendedVerdictResult {
  const reasons = [...base.reasons];
  let verdict: Verdict = base.verdict;
  let ruleId: ExtensionRuleId | null = null;
  let focus: VerdictFocus = null;

  if (
    ctx.valueStrength !== null &&
    ctx.valueStrength < 40 &&
    ctx.evidenceScore >= 60 &&
    verdict !== "KILL" &&
    verdict !== "IGNORE"
  ) {
    verdict = "KILL";
    ruleId = "LOW_VALUE_KILL";
    focus = "LOW_VALUE";
    reasons.push(
      msg("scoring.verdict.extension.lowValueKill", {
        valueStrength: ctx.valueStrength,
        evidenceScore: ctx.evidenceScore,
      }),
    );
  } else if (ctx.criticalContradiction && (verdict === "TEST" || verdict === "INTERVIEW")) {
    verdict = "INVESTIGATE";
    ruleId = "CRITICAL_CONTRADICTION";
    focus = "RESOLVE_CONTRADICTION";
    reasons.push(msg("scoring.verdict.extension.criticalContradiction"));
  } else if (
    ctx.evidenceScore >= 60 &&
    ctx.causalConfidence !== null &&
    ctx.causalConfidence < 40 &&
    (verdict === "TEST" ||
      verdict === "INTERVIEW" ||
      (ctx.valueStrength !== null && ctx.valueStrength >= 70))
  ) {
    verdict = "TEST";
    ruleId = "TEST_MECHANISM";
    focus = "TEST_MECHANISM";
    reasons.push(
      msg("scoring.verdict.extension.testMechanism", {
        evidenceScore: ctx.evidenceScore,
        causalConfidence: ctx.causalConfidence,
      }),
    );
  } else if (verdict === "INTERVIEW" && ctx.openCriticalCustomerQuestion) {
    ruleId = "CRITICAL_CUSTOMER_QUESTION";
    focus = "CRITICAL_CUSTOMER_QUESTION";
    reasons.push(msg("scoring.verdict.extension.criticalCustomerQuestion"));
  }

  if (ctx.causalConfidence === null) {
    reasons.push(msg("scoring.verdict.extension.causalIncomplete"));
  }
  if (ctx.valueStrength === null) {
    reasons.push(msg("scoring.verdict.extension.valueIncomplete"));
  }

  return {
    ...base,
    verdict,
    reasons,
    baseVerdict: base.verdict,
    extension: { ruleId, focus, changed: verdict !== base.verdict },
  };
}
