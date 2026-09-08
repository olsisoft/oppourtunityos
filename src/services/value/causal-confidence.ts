/**
 * Causal Confidence — "Do we know our mechanism changes the variable?"
 * Computed from evidence attached to the causal links Mechanism → Capability
 * → Transformation → Operational Value → Economic Value. The chain is only as
 * strong as its weakest critical link; a strong mechanism cannot compensate
 * for one unvalidated critical causal assumption. If any expected critical
 * link is missing or has no evidence, the result is INCOMPLETE and reports
 * chain coverage (validated / total), the blocking link and the next causal
 * question. UNKNOWN never becomes zero.
 *
 * Every sentence is a SystemMessage (see src/i18n/messages.ts) so it renders
 * in the reader's language; `text` holds the canonical English.
 */
import type {
  Criticality,
  EpistemicStatus,
  ExperimentDesignLevel,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";
import { isEvidenceBacked, type ClaimAssessment } from "./epistemic";
import { DESIGN_CAUSAL_CEILING } from "./experimental-validity";

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

function levelLabel(level: ValueChainLevel): SystemMessage {
  return msg(`labels.valueChainLevel.${level}`);
}

/** "Mechanism → Capability" in the reader's language. */
function linkLabel(from: ValueChainLevel, to: ValueChainLevel): SystemMessage {
  return msg("scoring.causal.linkLabel", { from: levelLabel(from), to: levelLabel(to) });
}

function designWord(level: ExperimentDesignLevel): SystemMessage {
  return msg(`scoring.causal.designWord.${level}`);
}

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
  label: SystemMessage;
  statement: string;
  criticality: Criticality;
  status: EpistemicStatus;
  confidence: number;
  /** Confidence after contradiction and design capping — the value that enters the min. */
  effective: number;
  /** Why the effective value is below the confidence, if it is. */
  cappedBy: SystemMessage | null;
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
  missing: SystemMessage[];
  links: CausalLinkResult[];
  /** Validated links over chain links, e.g. "2/5". */
  validated: number;
  total: number;
  completeness: string;
  /** First chain link (in order) that is not validated. */
  blocking: CausalLinkResult | null;
  /** The question that would move the blocking link. */
  nextQuestion: SystemMessage | null;
  explanation: SystemMessage[];
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function causalQuestion(link: CausalLinkResult): SystemMessage {
  if (link.missingLink) {
    return msg("scoring.causal.question.missingLink", {
      from: levelLabel(link.from),
      to: levelLabel(link.to),
    });
  }
  const stmt = link.statement.trim().replace(/\.$/, "");
  return msg("scoring.causal.question.verify", { statement: lowerFirst(stmt) });
}

export function computeCausalConfidence(links: CausalLinkInput[]): CausalConfidenceResult {
  const results: CausalLinkResult[] = [];
  const missing: SystemMessage[] = [];
  const scoringKeys = new Set(CAUSAL_CHAIN_LINKS.map(([f, t]) => `${f}->${t}`));

  for (const [from, to] of DISPLAY_CHAIN_LINKS) {
    const link = links.find((l) => l.from === from && l.to === to);
    const label = linkLabel(from, to);
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
      if (inScoringChain) missing.push(msg("scoring.causal.missing.notStated", { from, to }));
      continue;
    }
    const a = link.assessment;
    // Status caps: a contradicted link is capped at 25, a mixed one at 45.
    // Design cap: interview-only (anecdotal) evidence cannot push a causal
    // link above 30, observational above 45, before/after above 60…
    let effective = a.confidence;
    let cappedBy: SystemMessage | null = null;
    if (a.status === "CONTRADICTED" && effective > CONTRADICTED_CAP) {
      effective = CONTRADICTED_CAP;
      cappedBy = msg("scoring.causal.cappedBy.contradicted");
    } else if (a.status === "MIXED" && effective > MIXED_CAP) {
      effective = MIXED_CAP;
      cappedBy = msg("scoring.causal.cappedBy.mixed");
    }
    if (a.designLevel && a.evidence.counts.total > 0) {
      const ceiling = DESIGN_CAUSAL_CEILING[a.designLevel];
      if (effective > ceiling) {
        effective = ceiling;
        cappedBy = msg("scoring.causal.cappedBy.design", {
          design: designWord(a.designLevel),
          ceiling,
        });
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
        msg(
          a.fitness.total === 0
            ? "scoring.causal.missing.noEvidence"
            : "scoring.causal.missing.noAdmissibleEvidence",
          { from, to, statement: link.statement },
        ),
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
  const coverageLines = results.map((r) =>
    r.missingLink
      ? msg("scoring.causal.coverageMissing", {
          label: r.label,
          informative: !r.inScoringChain,
        })
      : msg("scoring.causal.coverageLine", {
          label: r.label,
          status: msg(`labels.epistemic.${r.status}`),
          confidence: r.confidence,
          informative: !r.inScoringChain,
        }),
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
        msg("scoring.causal.incomplete", { validated, total }),
        ...coverageLines,
        ...(blocking ? [msg("scoring.causal.blockedBy", { label: blocking.label })] : []),
        ...(nextQuestion ? [msg("scoring.causal.nextQuestion", { question: nextQuestion })] : []),
        ...missing.map((reason) => msg("scoring.causal.missingLine", { reason })),
      ],
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
      msg("scoring.causal.validated", { validated, total }),
      ...results.map((r) =>
        msg("scoring.causal.linkLine", {
          label: r.label,
          status: msg(`labels.epistemic.${r.status}`),
          confidence: r.confidence,
          capped: r.cappedBy !== null,
          effective: r.effective,
          cappedBy: r.cappedBy,
          evidenceCount: r.evidenceCount,
          bestFit: r.bestFit,
          hasDesign: r.designLevel !== null,
          design: r.designLevel ? designWord(r.designLevel) : null,
          critical: r.criticality === "CRITICAL",
          criticality:
            r.criticality === "CRITICAL"
              ? null
              : msg(`scoring.causal.criticalityWord.${r.criticality}`),
          informative: !r.inScoringChain,
        }),
      ),
      weakest
        ? msg("scoring.causal.score", { label: weakest.label, score })
        : msg("scoring.causal.noLinks"),
      ...(nextQuestion ? [msg("scoring.causal.nextQuestion", { question: nextQuestion })] : []),
    ],
  };
}
