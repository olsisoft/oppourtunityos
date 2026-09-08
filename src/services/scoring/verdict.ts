/**
 * Verdict engine — deterministic rules over the two independent scores.
 *
 * Rules are evaluated in priority order. The first matching rule wins. The
 * fallback grid guarantees a total function (every score pair has a verdict)
 * and is documented so the UI can explain "why".
 *
 * Rule conditions, meanings and reasons are SystemMessages (see
 * src/i18n/messages.ts): the dictionary section "scoring.verdict" holds the
 * wording per rule id, and `text` carries the canonical English.
 */
import type { Confidence, Verdict } from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";

export interface VerdictRule {
  verdict: Verdict;
  id: string;
  /** Human-readable rule condition. */
  condition: SystemMessage;
  meaning: SystemMessage;
  test: (opportunity: number, evidence: number) => boolean;
}

/** Builds a rule whose wording is looked up lazily (no dictionary access at module load). */
function rule(
  id: string,
  verdict: Verdict,
  test: (opportunity: number, evidence: number) => boolean,
): VerdictRule {
  return {
    id,
    verdict,
    test,
    get condition() {
      return msg(`scoring.verdict.condition.${id}`);
    },
    get meaning() {
      return msg(`scoring.verdict.meaning.${id}`);
    },
  };
}

export const VERDICT_RULES: VerdictRule[] = [
  // Opportunity ≥ 75 and Evidence ≥ 75
  rule("TEST", "TEST", (o, e) => o >= 75 && e >= 75),
  // Opportunity ≥ 70 and Evidence ≥ 60
  rule("INTERVIEW", "INTERVIEW", (o, e) => o >= 70 && e >= 60),
  // Opportunity ≥ 70 and Evidence < 50
  rule("RESEARCH", "RESEARCH", (o, e) => o >= 70 && e < 50),
  // Opportunity 60–79 and Evidence 40–69
  rule("INVESTIGATE", "INVESTIGATE", (o, e) => o >= 60 && o <= 79 && e >= 40 && e <= 69),
  // Opportunity < 50 and Evidence ≥ 60
  rule("KILL", "KILL", (o, e) => o < 50 && e >= 60),
  // Opportunity < 40 and Evidence < 40
  rule("IGNORE", "IGNORE", (o, e) => o < 40 && e < 40),
];

/** Fallback grid for score pairs not covered by the primary rules. */
export const FALLBACK_RULES: VerdictRule[] = [
  // Opportunity ≥ 70 and Evidence 50–59
  rule("FALLBACK_RESEARCH_GAP", "RESEARCH", (o, e) => o >= 70 && e >= 50 && e < 60),
  // Opportunity 50–69 and Evidence < 40
  rule("FALLBACK_RESEARCH_MID", "RESEARCH", (o, e) => o >= 50 && o < 70 && e < 40),
  // Opportunity 60–69 and Evidence ≥ 70
  rule("FALLBACK_INVESTIGATE_PROVEN", "INVESTIGATE", (o, e) => o >= 60 && o < 70 && e >= 70),
  // Opportunity 50–59 and Evidence ≥ 40
  rule("FALLBACK_INVESTIGATE_MID", "INVESTIGATE", (o, e) => o >= 50 && o < 60 && e >= 40),
  // Opportunity < 50 and Evidence < 60
  rule("FALLBACK_IGNORE_WEAK", "IGNORE", (o, e) => o < 50 && e < 60),
];

export interface VerdictResult {
  verdict: Verdict;
  ruleId: string;
  condition: SystemMessage;
  meaning: SystemMessage;
  reasons: SystemMessage[];
  confidence: Confidence;
  isFallback: boolean;
}

export function confidenceFromEvidence(evidenceScore: number): Confidence {
  if (evidenceScore >= 75) return "HIGH";
  if (evidenceScore >= 50) return "MEDIUM";
  return "LOW";
}

export function computeVerdict(opportunityScore: number, evidenceScore: number): VerdictResult {
  const o = clampScore(opportunityScore);
  const e = clampScore(evidenceScore);

  const primary = VERDICT_RULES.find((r) => r.test(o, e));
  const rule = primary ?? FALLBACK_RULES.find((r) => r.test(o, e));

  if (!rule) {
    // Should be unreachable: the grids are exhaustive. Fail safe.
    return {
      verdict: "RESEARCH",
      ruleId: "UNMATCHED",
      condition: msg("scoring.verdict.condition.UNMATCHED"),
      meaning: msg("scoring.verdict.meaning.UNMATCHED"),
      reasons: [msg("scoring.verdict.reason.unmatched", { opportunity: o, evidence: e })],
      confidence: confidenceFromEvidence(e),
      isFallback: true,
    };
  }

  const condition = rule.condition;
  const meaning = rule.meaning;
  const reasons = [
    msg("scoring.verdict.reason.opportunity", { score: o }),
    msg("scoring.verdict.reason.evidence", { score: e }),
    msg("scoring.verdict.reason.ruleApplies", {
      condition,
      verdict: msg(`scoring.verdict.name.${rule.verdict}`),
    }),
    meaning,
  ];

  if (o >= 70 && e < 50) {
    reasons.push(msg("scoring.verdict.reason.neverBuild"));
  }

  return {
    verdict: rule.verdict,
    ruleId: rule.id,
    condition,
    meaning,
    reasons,
    confidence: confidenceFromEvidence(e),
    isFallback: !primary,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}
