/**
 * Verdict engine — deterministic rules over the two independent scores.
 *
 * Rules are evaluated in priority order. The first matching rule wins. The
 * fallback grid guarantees a total function (every score pair has a verdict)
 * and is documented so the UI can explain "why".
 */
import type { Confidence, Verdict } from "@/generated/prisma/enums";

export interface VerdictRule {
  verdict: Verdict;
  id: string;
  /** Human-readable rule condition. */
  condition: string;
  meaning: string;
  test: (opportunity: number, evidence: number) => boolean;
}

export const VERDICT_RULES: VerdictRule[] = [
  {
    id: "TEST",
    verdict: "TEST",
    condition: "Opportunity ≥ 75 and Evidence ≥ 75",
    meaning: "Strong structure and strong proof: run a lightweight market test before building.",
    test: (o, e) => o >= 75 && e >= 75,
  },
  {
    id: "INTERVIEW",
    verdict: "INTERVIEW",
    condition: "Opportunity ≥ 70 and Evidence ≥ 60",
    meaning: "Strong enough to justify customer discovery interviews.",
    test: (o, e) => o >= 70 && e >= 60,
  },
  {
    id: "RESEARCH",
    verdict: "RESEARCH",
    condition: "Opportunity ≥ 70 and Evidence < 50",
    meaning: "Promising hypothesis, insufficient proof. Research before anything else.",
    test: (o, e) => o >= 70 && e < 50,
  },
  {
    id: "INVESTIGATE",
    verdict: "INVESTIGATE",
    condition: "Opportunity 60–79 and Evidence 40–69",
    meaning: "Moderate potential with partial evidence. Deepen the analysis.",
    test: (o, e) => o >= 60 && o <= 79 && e >= 40 && e <= 69,
  },
  {
    id: "KILL",
    verdict: "KILL",
    condition: "Opportunity < 50 and Evidence ≥ 60",
    meaning: "We have evidence that the opportunity is structurally weak.",
    test: (o, e) => o < 50 && e >= 60,
  },
  {
    id: "IGNORE",
    verdict: "IGNORE",
    condition: "Opportunity < 40 and Evidence < 40",
    meaning: "Weak and unproven. Not worth time.",
    test: (o, e) => o < 40 && e < 40,
  },
];

/** Fallback grid for score pairs not covered by the primary rules. */
export const FALLBACK_RULES: VerdictRule[] = [
  {
    id: "FALLBACK_RESEARCH_GAP",
    verdict: "RESEARCH",
    condition: "Opportunity ≥ 70 and Evidence 50–59",
    meaning: "Attractive but proof is still thin. Close the evidence gap.",
    test: (o, e) => o >= 70 && e >= 50 && e < 60,
  },
  {
    id: "FALLBACK_RESEARCH_MID",
    verdict: "RESEARCH",
    condition: "Opportunity 50–69 and Evidence < 40",
    meaning: "Moderate potential and almost no evidence. Cheap research first.",
    test: (o, e) => o >= 50 && o < 70 && e < 40,
  },
  {
    id: "FALLBACK_INVESTIGATE_PROVEN",
    verdict: "INVESTIGATE",
    condition: "Opportunity 60–69 and Evidence ≥ 70",
    meaning: "Well evidenced but only moderately attractive. Look for a sharper ICP or variable.",
    test: (o, e) => o >= 60 && o < 70 && e >= 70,
  },
  {
    id: "FALLBACK_INVESTIGATE_MID",
    verdict: "INVESTIGATE",
    condition: "Opportunity 50–59 and Evidence ≥ 40",
    meaning: "Borderline structure with some evidence. Sharpen before investing more.",
    test: (o, e) => o >= 50 && o < 60 && e >= 40,
  },
  {
    id: "FALLBACK_IGNORE_WEAK",
    verdict: "IGNORE",
    condition: "Opportunity < 50 and Evidence < 60",
    meaning: "Structurally weak with little proof either way. Park it.",
    test: (o, e) => o < 50 && e < 60,
  },
];

export interface VerdictResult {
  verdict: Verdict;
  ruleId: string;
  condition: string;
  meaning: string;
  reasons: string[];
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
      condition: "No rule matched",
      meaning: "Defaulting to research.",
      reasons: [`Opportunity ${o}/100, Evidence ${e}/100 matched no rule.`],
      confidence: confidenceFromEvidence(e),
      isFallback: true,
    };
  }

  const reasons = [
    `Opportunity Potential is ${o}/100.`,
    `Evidence Confidence is ${e}/100.`,
    `Rule "${rule.condition}" applies → ${rule.verdict}.`,
    rule.meaning,
  ];

  if (o >= 70 && e < 50) {
    reasons.push("High potential with low evidence means RESEARCH, never BUILD.");
  }

  return {
    verdict: rule.verdict,
    ruleId: rule.id,
    condition: rule.condition,
    meaning: rule.meaning,
    reasons,
    confidence: confidenceFromEvidence(e),
    isFallback: !primary,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}
