/**
 * Causal Confidence — "Do we know our mechanism changes the variable?"
 * Computed from evidence attached to the causal links Mechanism → Capability
 * → Transformation → Operational Value → Economic Value. The chain is only as
 * strong as its weakest critical link; a strong mechanism cannot compensate
 * for one unvalidated critical causal assumption. If any expected critical
 * link is missing or has no evidence, the result is INCOMPLETE.
 */
import type { Criticality, EpistemicStatus, ValueChainLevel } from "@/generated/prisma/enums";
import type { ClaimAssessment } from "./epistemic";

export const CAUSAL_CHAIN_LINKS: Array<[ValueChainLevel, ValueChainLevel]> = [
  ["MECHANISM", "CAPABILITY"],
  ["CAPABILITY", "TRANSFORMATION"],
  ["TRANSFORMATION", "OPERATIONAL_VALUE"],
  ["OPERATIONAL_VALUE", "ECONOMIC_VALUE"],
];

const CONTRADICTED_CAP = 25;

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
  statement: string;
  criticality: Criticality;
  status: EpistemicStatus;
  confidence: number;
  /** Confidence after contradiction capping — the value that enters the min. */
  effective: number;
  evidenceCount: number;
  untestedCriticalAssumptions: string[];
}

export interface CausalConfidenceResult {
  status: "COMPLETE" | "INCOMPLETE";
  score: number | null;
  weakest: CausalLinkResult | null;
  /** Human-readable names of the links that block a score. */
  missing: string[];
  links: CausalLinkResult[];
  explanation: string[];
}

export function computeCausalConfidence(links: CausalLinkInput[]): CausalConfidenceResult {
  const results: CausalLinkResult[] = [];
  const missing: string[] = [];

  for (const [from, to] of CAUSAL_CHAIN_LINKS) {
    const link = links.find((l) => l.from === from && l.to === to);
    const name = `${from} → ${to}`;
    if (!link) {
      missing.push(`${name}: causal link not stated`);
      continue;
    }
    const a = link.assessment;
    const effective =
      a.status === "CONTRADICTED" ? Math.min(a.confidence, CONTRADICTED_CAP) : a.confidence;
    results.push({
      from,
      to,
      statement: link.statement,
      criticality: link.criticality,
      status: a.status,
      confidence: a.confidence,
      effective,
      evidenceCount: a.evidence.counts.total,
      untestedCriticalAssumptions: a.untestedCriticalAssumptions,
    });
    if (link.criticality === "CRITICAL" && a.evidence.counts.total === 0) {
      missing.push(`${name}: no evidence on a critical link ("${link.statement}")`);
    }
  }

  if (missing.length > 0) {
    return {
      status: "INCOMPLETE",
      score: null,
      weakest: null,
      missing,
      links: results,
      explanation: [
        "Causal Confidence is INCOMPLETE: at least one critical causal link is UNKNOWN or has no evidence. A number is not fabricated.",
        ...missing.map((m) => `Missing: ${m}`),
      ],
    };
  }

  const critical = results.filter((r) => r.criticality === "CRITICAL");
  const pool = critical.length ? critical : results;
  const weakest = [...pool].sort((a, b) => a.effective - b.effective)[0] ?? null;
  const score = weakest ? Math.round(weakest.effective) : null;

  return {
    status: "COMPLETE",
    score,
    weakest,
    missing: [],
    links: results,
    explanation: [
      ...results.map(
        (r) =>
          `${r.from} → ${r.to}: ${r.status}, confidence ${r.confidence}/100 (${r.evidenceCount} evidence${r.criticality !== "CRITICAL" ? `, ${r.criticality.toLowerCase()}` : ""})`,
      ),
      weakest
        ? `Score = weakest critical link (${weakest.from} → ${weakest.to}) = ${score}/100.`
        : "No links.",
    ],
  };
}
