/**
 * Causal Confidence — "Do we know our mechanism changes the variable?"
 * Computed from evidence attached to the causal links Mechanism → Capability
 * → Transformation → Operational Value → Economic Value. The chain is only as
 * strong as its weakest critical link; a strong mechanism cannot compensate
 * for one unvalidated critical causal assumption. If any expected critical
 * link is missing or has no evidence, the result is INCOMPLETE and reports
 * chain coverage (validated / total), the blocking link and the next causal
 * question. UNKNOWN never becomes zero.
 */
import type {
  Criticality,
  EpistemicStatus,
  ExperimentDesignLevel,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import { isEvidenceBacked, type ClaimAssessment } from "./epistemic";
import { DESIGN_CAUSAL_CEILING, DESIGN_LEVEL_LABELS } from "./experimental-validity";

/** Links that enter the score (up to the economic consequence). */
export const CAUSAL_CHAIN_LINKS: Array<[ValueChainLevel, ValueChainLevel]> = [
  ["MECHANISM", "CAPABILITY"],
  ["CAPABILITY", "TRANSFORMATION"],
  ["TRANSFORMATION", "OPERATIONAL_VALUE"],
  ["OPERATIONAL_VALUE", "ECONOMIC_VALUE"],
];

/** Links displayed in the coverage (the strategic link is informative only). */
export const DISPLAY_CHAIN_LINKS: Array<[ValueChainLevel, ValueChainLevel]> = [
  ...CAUSAL_CHAIN_LINKS,
  ["ECONOMIC_VALUE", "STRATEGIC_OUTCOME"],
];

const CONTRADICTED_CAP = 25;
const MIXED_CAP = 45;

const LEVEL_LABEL: Record<ValueChainLevel, string> = {
  MECHANISM: "Mechanism",
  CAPABILITY: "Capability",
  TRANSFORMATION: "Transformation",
  OPERATIONAL_VALUE: "Operational value",
  ECONOMIC_VALUE: "Economic value",
  STRATEGIC_OUTCOME: "Strategic outcome",
  BUSINESS_OUTCOME: "Business outcome",
};

export interface CausalLinkInput {
  from: ValueChainLevel;
  to: ValueChainLevel;
  statement: string;
  criticality: Criticality;
  assessment: ClaimAssessment;
}

export interface CausalLinkResult {
  from: ValueChainLevel;
  to: ValueChainLevel;
  label: string;
  statement: string;
  criticality: Criticality;
  status: EpistemicStatus;
  confidence: number;
  /** Confidence after contradiction and design capping — the value that enters the min. */
  effective: number;
  /** Why the effective value is below the confidence, if it is. */
  cappedBy: string | null;
  /** Strongest design level among the link's admissible supporting evidence. */
  designLevel: ExperimentDesignLevel | null;
  /** Best evidence fit for this causal claim. */
  bestFit: number;
  evidenceCount: number;
  untestedCriticalAssumptions: string[];
  /** Evidence-backed (PROVEN or SUPPORTED). */
  validated: boolean;
  /** Whether this link enters the score (Mechanism … Economic value). */
  inScoringChain: boolean;
  /** true when the link is not stated at all. */
  missingLink: boolean;
}

export interface CausalConfidenceResult {
  status: "COMPLETE" | "INCOMPLETE";
  score: number | null;
  weakest: CausalLinkResult | null;
  /** Human-readable names of the links that block a score. */
  missing: string[];
  links: CausalLinkResult[];
  /** Validated links over chain links, e.g. "2/5". */
  validated: number;
  total: number;
  completeness: string;
  /** First chain link (in order) that is not validated. */
  blocking: CausalLinkResult | null;
  /** The question that would move the blocking link. */
  nextQuestion: string | null;
  explanation: string[];
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function causalQuestion(link: CausalLinkResult): string {
  if (link.missingLink) {
    return `What is the causal assumption that connects ${LEVEL_LABEL[link.from]} to ${LEVEL_LABEL[link.to]}?`;
  }
  const stmt = link.statement.trim().replace(/\.$/, "");
  return `Is it actually true that ${lowerFirst(stmt)}?`;
}

export function computeCausalConfidence(links: CausalLinkInput[]): CausalConfidenceResult {
  const results: CausalLinkResult[] = [];
  const missing: string[] = [];
  const scoringKeys = new Set(CAUSAL_CHAIN_LINKS.map(([f, t]) => `${f}->${t}`));

  for (const [from, to] of DISPLAY_CHAIN_LINKS) {
    const link = links.find((l) => l.from === from && l.to === to);
    const name = `${from} → ${to}`;
    const label = `${LEVEL_LABEL[from]} → ${LEVEL_LABEL[to]}`;
    const inScoringChain = scoringKeys.has(`${from}->${to}`);
    if (!link) {
      results.push({
        from,
        to,
        label,
        statement: "",
        criticality: "CRITICAL",
        status: "UNKNOWN",
        confidence: 0,
        effective: 0,
        cappedBy: null,
        designLevel: null,
        bestFit: 0,
        evidenceCount: 0,
        untestedCriticalAssumptions: [],
        validated: false,
        inScoringChain,
        missingLink: true,
      });
      if (inScoringChain) missing.push(`${name}: causal link not stated`);
      continue;
    }
    const a = link.assessment;
    // Status caps: a contradicted link is capped at 25, a mixed one at 45.
    // Design cap: interview-only (anecdotal) evidence cannot push a causal
    // link above 30, observational above 45, before/after above 60…
    let effective = a.confidence;
    let cappedBy: string | null = null;
    if (a.status === "CONTRADICTED" && effective > CONTRADICTED_CAP) {
      effective = CONTRADICTED_CAP;
      cappedBy = "contradicted";
    } else if (a.status === "MIXED" && effective > MIXED_CAP) {
      effective = MIXED_CAP;
      cappedBy = "mixed evidence";
    }
    if (a.designLevel && a.evidence.counts.total > 0) {
      const ceiling = DESIGN_CAUSAL_CEILING[a.designLevel];
      if (effective > ceiling) {
        effective = ceiling;
        cappedBy = `${DESIGN_LEVEL_LABELS[a.designLevel].toLowerCase()} design (ceiling ${ceiling})`;
      }
    }
    results.push({
      from,
      to,
      label,
      statement: link.statement,
      criticality: link.criticality,
      status: a.status,
      confidence: a.confidence,
      effective,
      cappedBy,
      designLevel: a.designLevel,
      bestFit: a.fitness.best,
      evidenceCount: a.fitness.admissible,
      untestedCriticalAssumptions: a.untestedCriticalAssumptions,
      validated: isEvidenceBacked(a.status),
      inScoringChain,
      missingLink: false,
    });
    if (inScoringChain && link.criticality === "CRITICAL" && a.fitness.admissible === 0) {
      missing.push(
        a.fitness.total === 0
          ? `${name}: no evidence on a critical link ("${link.statement}")`
          : `${name}: no admissible evidence on a critical link ("${link.statement}")`,
      );
    }
  }

  // Coverage counts every chain link that is stated (the strategic link included).
  const chain = results.filter((r) => !r.missingLink || r.inScoringChain);
  const total = chain.length;
  const validated = chain.filter((r) => r.validated).length;
  const completeness = `${validated}/${total}`;
  const blocking = results.find((r) => !r.validated) ?? null;
  const nextQuestion = blocking ? causalQuestion(blocking) : null;
  const coverageLines = results.map(
    (r) =>
      `${r.label}: ${r.missingLink ? "UNKNOWN (not stated)" : `${r.status}${r.confidence ? ` ${r.confidence}` : ""}`}${
        r.inScoringChain ? "" : " (informative, outside the score)"
      }`,
  );

  if (missing.length > 0) {
    return {
      status: "INCOMPLETE",
      score: null,
      weakest: null,
      missing,
      links: results,
      validated,
      total,
      completeness,
      blocking,
      nextQuestion,
      explanation: [
        `Causal Confidence is INCOMPLETE · ${completeness} critical links validated. A link without evidence is UNKNOWN, not zero; a number is not fabricated.`,
        ...coverageLines,
        blocking ? `Blocked by: ${blocking.label}.` : "",
        nextQuestion ? `Next causal question: ${nextQuestion}` : "",
        ...missing.map((m) => `Missing: ${m}`),
      ].filter(Boolean),
    };
  }

  const scoring = results.filter((r) => r.inScoringChain && !r.missingLink);
  const critical = scoring.filter((r) => r.criticality === "CRITICAL");
  const pool = critical.length ? critical : scoring;
  const weakest =
    [...pool].sort((a, b) => a.effective - b.effective || a.confidence - b.confidence)[0] ?? null;
  const score = weakest ? Math.round(weakest.effective) : null;

  return {
    status: "COMPLETE",
    score,
    weakest,
    missing: [],
    links: results,
    validated,
    total,
    completeness,
    blocking,
    nextQuestion,
    explanation: [
      `${completeness} chain links validated.`,
      ...results.map(
        (r) =>
          `${r.label}: ${r.status}, confidence ${r.confidence}/100${r.cappedBy ? ` → ${r.effective} capped by ${r.cappedBy}` : ""} (${r.evidenceCount} admissible evidence, best fit ${r.bestFit}${r.designLevel ? `, ${DESIGN_LEVEL_LABELS[r.designLevel].toLowerCase()}` : ""}${r.criticality !== "CRITICAL" ? `, ${r.criticality.toLowerCase()}` : ""}${r.inScoringChain ? "" : ", informative"})`,
      ),
      weakest ? `Score = weakest critical link (${weakest.label}) = ${score}/100.` : "No links.",
      nextQuestion ? `Next causal question: ${nextQuestion}` : "",
    ].filter(Boolean),
  };
}
