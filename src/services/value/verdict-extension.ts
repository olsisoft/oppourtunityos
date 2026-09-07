/**
 * Extends the base deterministic verdict with the value-engineering
 * dimensions. Base rules are never replaced; documented extension rules may
 * change the verdict, and every change is explained. INCOMPLETE dimensions
 * (null) never fire a rule, so existing opportunities keep their verdicts.
 */
import type { Verdict } from "@/generated/prisma/enums";
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

export const EXTENSION_RULES = {
  LOW_VALUE_KILL:
    "Value Strength < 40 with Evidence ≥ 60 → KILL (the problem is real but moving the variable is not worth much).",
  CRITICAL_CONTRADICTION:
    "Critical contradiction with a TEST/INTERVIEW base verdict → INVESTIGATE.",
  TEST_MECHANISM:
    "Problem validated (Evidence ≥ 60) and Causal Confidence < 40 → TEST, focused on the mechanism.",
  CRITICAL_CUSTOMER_QUESTION:
    "INTERVIEW with an untested critical customer assumption → INTERVIEW, focused on that question.",
} as const;

export function extendVerdict(
  base: VerdictResult,
  ctx: VerdictExtensionContext,
): ExtendedVerdictResult {
  const reasons = [...base.reasons];
  let verdict: Verdict = base.verdict;
  let ruleId: string | null = null;
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
      `Value Strength is ${ctx.valueStrength}/100 while Evidence Confidence is ${ctx.evidenceScore}/100: evidence supports the problem, but even a successful movement of the variable creates little value. Deprioritize.`,
    );
  } else if (ctx.criticalContradiction && (verdict === "TEST" || verdict === "INTERVIEW")) {
    verdict = "INVESTIGATE";
    ruleId = "CRITICAL_CONTRADICTION";
    focus = "RESOLVE_CONTRADICTION";
    reasons.push(
      "A critical claim is contradicted by evidence. Resolve the contradiction before customer discovery or testing.",
    );
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
      `The problem is validated (Evidence ${ctx.evidenceScore}/100) but the mechanism is not (Causal Confidence ${ctx.causalConfidence}/100). Test the mechanism, not the problem.`,
    );
  } else if (verdict === "INTERVIEW" && ctx.openCriticalCustomerQuestion) {
    ruleId = "CRITICAL_CUSTOMER_QUESTION";
    focus = "CRITICAL_CUSTOMER_QUESTION";
    reasons.push(
      "A critical customer question (willingness to pay, access or value) remains untested: make it the centre of the interviews.",
    );
  }

  if (ctx.causalConfidence === null) {
    reasons.push(
      "Causal Confidence is INCOMPLETE: the mechanism → value chain has untested links. Verdict rules that depend on it did not fire.",
    );
  }
  if (ctx.valueStrength === null) {
    reasons.push(
      "Value Strength is INCOMPLETE: some value dimensions are UNKNOWN. Verdict rules that depend on it did not fire.",
    );
  }

  return {
    ...base,
    verdict,
    reasons,
    baseVerdict: base.verdict,
    extension: { ruleId, focus, changed: verdict !== base.verdict },
  };
}
