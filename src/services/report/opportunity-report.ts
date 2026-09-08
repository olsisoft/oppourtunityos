/**
 * Opportunity Report — the artifact produced at the end of discovery.
 * Pure transformation of the persisted state into a report object plus a
 * Markdown rendering. Provenance is preserved so hypotheses are never shown
 * as facts. Sections follow the value-engineering order A–N:
 * ICP · Valuable variable · Pain · Trigger · Alternatives · Mechanisms ·
 * Product hypothesis · Value proposition · Value causality ladder ·
 * Proof frontier · Scorecard · Riskiest assumption · Next best action ·
 * Kill criteria.
 */
import type { OpportunityWithRelations } from "@/db/workspaces";
import {
  ASSUMPTION_KIND_LABELS,
  CRITICALITY_LABELS,
  DIRECTION_LABELS,
  EPISTEMIC_LABELS,
  PROVENANCE_LABELS,
  VALUE_CHAIN_LEVEL_LABELS,
  VERDICT_LABELS,
} from "@/domain/enums";
import type { KillWarning } from "@/services/scoring/kill-criteria";
import type { NextAction } from "@/services/scoring/next-action";
import type { VerdictResult } from "@/services/scoring/verdict";
import { CAUSAL_DISTANCE_LABELS } from "@/services/value/epistemic";
import type { ValueAction } from "@/services/value/next-value-action";
import {
  PROOF_RUNG_LABELS,
  type FrontierPosition,
  type ProofFrontierResult,
} from "@/services/value/proof-frontier";
import { GENERALIZATION_LABELS } from "@/services/value/language-gate";
import {
  DESIGN_LEVEL_LABELS,
  INTERNAL_VALIDITY_LABELS,
} from "@/services/value/experimental-validity";
import { describeScope, parseScope } from "@/services/value/scope";
import { FIELD_STATUS_LABELS, fieldStatus } from "@/services/value/variable-semantics";

export interface ReportEvidenceItem {
  title: string;
  type: string;
  sentiment: string;
  strength: number;
  relevance: number;
  isDemo: boolean;
  isMocked: boolean;
}

export interface ReportField {
  value: string;
  status: string;
}

export interface ReportLadderNode {
  level: string;
  statement: string;
  status: string;
  confidence: number;
  causalDistance: string;
  evidenceCount: number;
  assumptionCount: number;
  /** Evidence fitness and scope of generalization (computed). */
  bestFit: number | null;
  admissible: number;
  scope: string | null;
  generalization: string;
  inference: string | null;
}

export interface ReportCausalLink {
  from: string;
  to: string;
  statement: string;
  status: string;
  criticality: string;
  bestFit: number | null;
  designLevel: string | null;
  generalization: string;
  inference: string | null;
}

export interface ReportExperimentValidity {
  title: string;
  outcome: string;
  design: string;
  internalValidity: string;
  scope: string;
  interpretation: string;
  threats: string[];
}

export interface ReportCommercialRung {
  label: string;
  status: string;
  evidenceCount: number;
  bestFit: number;
}

export interface OpportunityReport {
  title: string;
  generatedAt: string;
  icp: { name: string; description: string; provenance: string } | null;
  variable: { name: string; direction: string; category: string; provenance: string } | null;
  /** B. Valuable variable, field by field with its own status. */
  variableDetail: {
    variableType: ReportField;
    target: ReportField;
    scope: ReportField;
    currentState: ReportField;
    desiredState: ReportField;
    unit: ReportField;
    importance: ReportField;
    parentVariable: ReportField;
    whoValuesIt: ReportField;
    whyItMatters: ReportField;
  } | null;
  currentState: string;
  desiredState: string;
  economicPain: string;
  trigger: string;
  alternatives: Array<{ name: string; failure: string; weakness: number }>;
  mechanisms: string[];
  productHypothesis: string;
  valueProposition: string;
  metric: string;
  /** I. Value causality ladder. */
  ladder: ReportLadderNode[];
  causalLinks: ReportCausalLink[];
  /** J. Proof frontier — level and scope. */
  frontier: {
    position: FrontierPosition;
    label: string;
    text: string;
    whyStops: string;
    scope: string;
    generalization: string | null;
  };
  /** Commercial ladder: each rung is its own claim. */
  commercial: ReportCommercialRung[];
  /** Experimental validity of completed experiments. */
  experimentValidity: ReportExperimentValidity[];
  /** K. Scorecard. null = INCOMPLETE. */
  scorecard: {
    opportunityPotential: number;
    evidenceConfidence: number;
    valueStrength: number | null;
    valueCompleteness: string | null;
    valueMissing: string[];
    causalConfidence: number | null;
    causalCompleteness: string | null;
    causalBlocking: string | null;
  };
  opportunityScore: number;
  evidenceScore: number;
  verdict: string;
  verdictLabel: string;
  verdictReasons: string[];
  confidence: string;
  killWarnings: KillWarning[];
  assumptions: Array<{ statement: string; kind: string; status: string; importance: number }>;
  /** L. Riskiest assumption. */
  riskiestAssumption: { statement: string; kind: string; importance: number } | null;
  evidence: ReportEvidenceItem[];
  risks: string[];
  nextAction: NextAction | null;
  /** M. Next best action in value-engineering form. */
  valueAction: ValueAction | null;
}

export function frontierSentence(position: FrontierPosition): string {
  const label = PROOF_RUNG_LABELS[position];
  if (position === "NONE") {
    return "Current Proof Frontier: nothing is supported yet. Every claim, including the problem itself, remains a hypothesis.";
  }
  return `Current Proof Frontier: ${label}. Everything beyond this line remains a product or causal hypothesis.`;
}

function field(
  v: NonNullable<OpportunityWithRelations["variable"]>,
  key: Parameters<typeof fieldStatus>[1],
  value: string | number | null | undefined,
): ReportField {
  const text =
    value === null || value === undefined || String(value).trim() === ""
      ? "UNKNOWN"
      : String(value);
  return { value: text, status: FIELD_STATUS_LABELS[fieldStatus(v, key)] };
}

export function buildOpportunityReport(
  o: OpportunityWithRelations,
  mechanisms: string[],
  nextAction: NextAction | null,
  valueAction: ValueAction | null = null,
): OpportunityReport {
  const verdictResult = (o.verdictReasons as unknown as VerdictResult | null) ?? null;
  const killWarnings = (o.killWarnings as unknown as KillWarning[] | null) ?? [];
  const v = o.variable;
  const frontierPosition = (o.proofFrontierRung as FrontierPosition | null) ?? "NONE";
  const storedFrontier = o.proofFrontier as unknown as ProofFrontierResult | null;
  const rungOf = (rung: string) => storedFrontier?.rungs?.find((r) => r.rung === rung) ?? null;
  const valueBreakdown = o.valueStrengthBreakdown as unknown as {
    completeness?: string;
    missing?: string[];
  } | null;
  const causalBreakdown = o.causalBreakdown as unknown as {
    completeness?: string;
    blocking?: { label: string } | null;
  } | null;
  const riskiest =
    [...o.assumptions]
      .filter((a) => a.status !== "SUPPORTED")
      .sort((a, b) => {
        const rank = (x: typeof a) =>
          (x.status === "UNKNOWN" ? 0 : 1) * 1000 -
          x.importance * 10 +
          (x.kind === "CAUSAL" ? 0 : x.kind === "VALUE" ? 1 : 2);
        return rank(a) - rank(b);
      })[0] ?? null;

  return {
    title: o.title,
    generatedAt: new Date().toISOString(),
    icp: o.icp
      ? {
          name: o.icp.name,
          description: [o.icp.role, o.icp.companyType, o.icp.companySize]
            .filter(Boolean)
            .join(" · "),
          provenance: PROVENANCE_LABELS[o.icp.provenance],
        }
      : null,
    variable: v
      ? {
          name: v.name,
          direction: DIRECTION_LABELS[v.desiredDirection],
          category: v.category,
          provenance: PROVENANCE_LABELS[v.provenance],
        }
      : null,
    variableDetail: v
      ? {
          variableType: field(v, "variableType", v.variableType),
          target: field(v, "target", v.target),
          scope: field(v, "scope", v.scope),
          currentState: field(v, "currentState", v.currentState ?? o.pain?.currentState),
          desiredState: field(v, "desiredState", v.desiredState ?? o.pain?.desiredState),
          unit: field(v, "unit", v.unit),
          importance: field(v, "importanceScore", `${v.importanceScore}/10`),
          parentVariable: field(v, "parentVariableId", v.parent?.name),
          whoValuesIt: field(v, "whoValuesIt", v.whoValuesIt),
          whyItMatters: field(v, "whyItMatters", v.whyItMatters),
        }
      : null,
    currentState: v?.currentState ?? o.pain?.currentState ?? "UNKNOWN",
    desiredState: v?.desiredState ?? o.pain?.desiredState ?? "UNKNOWN",
    economicPain: o.problemStatement ?? o.pain?.description ?? "UNKNOWN",
    trigger: o.pain?.triggers[0]?.description ?? "UNKNOWN — no trigger identified",
    alternatives: (o.pain?.alternatives ?? []).map((a) => ({
      name: a.name,
      failure: a.weaknessDescription ?? "Failure UNKNOWN",
      weakness: a.weaknessScore,
    })),
    mechanisms,
    productHypothesis: o.productHypothesis ?? "Not yet formed",
    valueProposition: o.valueProposition ?? "Not yet formed",
    metric: o.metric ?? "UNKNOWN — no measurable outcome defined",
    ladder: o.valueChainNodes.map((n) => {
      const summary = rungOf(n.level)?.summary ?? null;
      return {
        level: VALUE_CHAIN_LEVEL_LABELS[n.level],
        statement: n.statement,
        status: EPISTEMIC_LABELS[n.status],
        confidence: n.confidence,
        causalDistance: CAUSAL_DISTANCE_LABELS[n.causalDistance]?.code ?? `CD${n.causalDistance}`,
        evidenceCount: n.evidenceLinks.length,
        assumptionCount: n.assumptions.length,
        bestFit: summary && summary.total > 0 ? summary.bestFit : null,
        admissible: summary?.admissible ?? 0,
        scope: n.observedScope ? describeScope(parseScope(n.observedScope)) : null,
        generalization: GENERALIZATION_LABELS[n.generalization],
        inference: n.inference,
      };
    }),
    causalLinks: o.causalLinks.map((l) => {
      const summary = rungOf(l.toNode.level)?.linkFromPrevious?.summary ?? null;
      return {
        from: VALUE_CHAIN_LEVEL_LABELS[l.fromNode.level],
        to: VALUE_CHAIN_LEVEL_LABELS[l.toNode.level],
        statement: l.statement,
        status: EPISTEMIC_LABELS[l.status],
        criticality: CRITICALITY_LABELS[l.criticality],
        bestFit: summary && summary.total > 0 ? summary.bestFit : null,
        designLevel: summary?.designLevel ? DESIGN_LEVEL_LABELS[summary.designLevel] : null,
        generalization: GENERALIZATION_LABELS[l.generalization],
        inference: l.inference,
      };
    }),
    frontier: {
      position: frontierPosition,
      label: PROOF_RUNG_LABELS[frontierPosition],
      text: frontierSentence(frontierPosition),
      whyStops: storedFrontier?.whyStops ?? "Not computed yet.",
      scope: storedFrontier?.frontierScope?.text ?? "not computed",
      generalization: storedFrontier?.frontierScope?.generalizationLabel ?? null,
    },
    commercial: (storedFrontier?.commercial?.rungs ?? []).map((r) => ({
      label: r.label,
      status: EPISTEMIC_LABELS[r.status],
      evidenceCount: r.evidenceCount,
      bestFit: r.bestFit,
    })),
    experimentValidity: o.experiments
      .filter((e) => e.resultRecord)
      .map((e) => {
        const r = e.resultRecord!;
        const assessment = (r.validityAssessment ?? null) as { threats?: string[] } | null;
        return {
          title: e.title,
          outcome: r.outcome,
          design: r.designLevel ? DESIGN_LEVEL_LABELS[r.designLevel] : "not recorded",
          internalValidity: r.internalValidity
            ? INTERNAL_VALIDITY_LABELS[r.internalValidity]
            : "not assessed",
          scope: describeScope(parseScope(r.scope)),
          interpretation: r.interpretation ?? "",
          threats: assessment?.threats ?? [],
        };
      }),
    scorecard: {
      opportunityPotential: o.opportunityScore,
      evidenceConfidence: o.evidenceScore,
      valueStrength: o.valueStrength,
      valueCompleteness: valueBreakdown?.completeness ?? null,
      valueMissing: valueBreakdown?.missing ?? [],
      causalConfidence: o.causalConfidence,
      causalCompleteness: causalBreakdown?.completeness ?? null,
      causalBlocking: causalBreakdown?.blocking?.label ?? null,
    },
    opportunityScore: o.opportunityScore,
    evidenceScore: o.evidenceScore,
    verdict: o.verdict,
    verdictLabel: VERDICT_LABELS[o.verdict],
    verdictReasons: verdictResult?.reasons ?? [],
    confidence: o.confidence,
    killWarnings,
    assumptions: o.assumptions.map((a) => ({
      statement: a.statement,
      kind: ASSUMPTION_KIND_LABELS[a.kind],
      status: a.status,
      importance: a.importance,
    })),
    riskiestAssumption: riskiest
      ? {
          statement: riskiest.statement,
          kind: ASSUMPTION_KIND_LABELS[riskiest.kind],
          importance: riskiest.importance,
        }
      : null,
    evidence: o.evidence.map((e) => ({
      title: e.sourceTitle,
      type: e.type,
      sentiment: e.sentiment,
      strength: e.strengthScore,
      relevance: e.relevanceScore,
      isDemo: e.isDemo,
      isMocked: e.isMocked,
    })),
    risks: o.risks,
    nextAction,
    valueAction,
  };
}

const score = (n: number | null) => (n === null ? "INCOMPLETE" : `${n}/100`);

export function reportToMarkdown(r: OpportunityReport): string {
  const lines: string[] = [];
  lines.push(`# Opportunity Report — ${r.title}`);
  lines.push("");
  lines.push(
    `Generated ${r.generatedAt.slice(0, 10)} by OpportunityOS. Hypotheses are labelled; nothing below is validated unless backed by evidence. Scores, statuses and the Proof Frontier are computed deterministically.`,
  );
  lines.push("");
  lines.push(
    `## A. ICP\n${r.icp ? `${r.icp.name} — ${r.icp.description || "details UNKNOWN"} _(${r.icp.provenance})_` : "UNKNOWN"}`,
  );
  const vd = r.variableDetail;
  lines.push(
    `## B. Valuable variable\n${
      r.variable
        ? [
            `- Variable: ${r.variable.name} _(${r.variable.provenance})_`,
            `- Direction: ${r.variable.direction}`,
            vd
              ? `- Type (what is moved): ${vd.variableType.value} _(${vd.variableType.status})_`
              : null,
            vd ? `- Target: ${vd.target.value} _(${vd.target.status})_` : null,
            vd ? `- Scope: ${vd.scope.value} _(${vd.scope.status})_` : null,
            vd ? `- Current state: ${vd.currentState.value} _(${vd.currentState.status})_` : null,
            vd ? `- Desired state: ${vd.desiredState.value} _(${vd.desiredState.status})_` : null,
            vd ? `- Unit: ${vd.unit.value} _(${vd.unit.status})_` : null,
            vd ? `- Importance: ${vd.importance.value} _(${vd.importance.status})_` : null,
            vd
              ? `- Parent economic variable: ${vd.parentVariable.value} _(${vd.parentVariable.status})_`
              : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "UNKNOWN"
    }`,
  );
  lines.push(`## C. Pain / economic consequence\n${r.economicPain}`);
  lines.push(`## D. Trigger\n${r.trigger}`);
  lines.push(
    `## E. Current alternatives\n${r.alternatives.length ? r.alternatives.map((a) => `- ${a.name} (weakness ${a.weakness}/10): ${a.failure}`).join("\n") : "UNKNOWN"}`,
  );
  lines.push(
    `## F. Mechanisms explored\n${r.mechanisms.length ? r.mechanisms.map((m) => `- ${m}`).join("\n") : "None explored yet"}`,
  );
  lines.push(`## G. Product hypothesis\n${r.productHypothesis}`);
  lines.push(
    `## H. Value proposition\n${r.valueProposition}\n\nMetric that proves value: ${r.metric}`,
  );
  lines.push(
    `## I. Value causality ladder\n${
      r.ladder.length
        ? r.ladder
            .map(
              (n, i) =>
                `${i === 0 ? "" : "↓\n"}**${n.level}** [${n.status}${n.confidence ? ` ${n.confidence}` : ""} · ${n.causalDistance}] — ${n.statement}` +
                (n.evidenceCount || n.assumptionCount
                  ? ` _(${n.evidenceCount} evidence, ${n.admissible} admissible${n.bestFit !== null ? `, best fit ${n.bestFit}` : ""}, ${n.assumptionCount} assumptions)_`
                  : "") +
                (n.scope ? `\n  Scope: ${n.scope} · ${n.generalization}` : "") +
                (n.inference ? `\n  Inference: ${n.inference}` : ""),
            )
            .join("\n")
        : "No value chain stated yet."
    }${
      r.causalLinks.length
        ? `\n\nCausal links (testable assumptions):\n${r.causalLinks.map((l) => `- ${l.from} → ${l.to} [${l.status}, ${l.criticality}${l.bestFit !== null ? `, best fit ${l.bestFit}` : ""}${l.designLevel ? `, ${l.designLevel.toLowerCase()} design` : ""}]: ${l.statement}${l.inference ? ` — ${l.inference}` : ""}`).join("\n")}`
        : ""
    }`,
  );
  lines.push(
    `## J. Proof frontier\n${r.frontier.text}\n\nScope: ${r.frontier.scope}${r.frontier.generalization ? ` (${r.frontier.generalization})` : ""}. Observed in a sample does not mean proven for the market.\n\nWhy the frontier stops here: ${r.frontier.whyStops}`,
  );
  if (r.commercial.length) {
    lines.push(
      `## Commercial ladder\n${r.commercial.map((c) => `- ${c.label}: ${c.status}${c.evidenceCount ? ` (${c.evidenceCount} admissible, best fit ${c.bestFit})` : ""}`).join("\n")}\n\nEach rung is its own claim: existing spend is not willingness to pay; stated willingness is not a purchase.`,
    );
  }
  if (r.experimentValidity.length) {
    lines.push(
      `## Experimental validity\n${r.experimentValidity.map((e) => `- **${e.title}** — ${e.outcome}; design ${e.design}; internal validity ${e.internalValidity}; scope ${e.scope}.\n  ${e.interpretation}${e.threats.length ? `\n  Threats: ${e.threats.join(" ")}` : ""}`).join("\n")}`,
    );
  }
  const vs =
    r.scorecard.valueStrength === null
      ? `INCOMPLETE · ${r.scorecard.valueCompleteness ?? "?"}${r.scorecard.valueMissing.length ? ` (missing: ${r.scorecard.valueMissing.join(", ")})` : ""}`
      : `${r.scorecard.valueStrength}/100`;
  const cc =
    r.scorecard.causalConfidence === null
      ? `INCOMPLETE · ${r.scorecard.causalCompleteness ?? "?"} links validated${r.scorecard.causalBlocking ? ` (blocked by ${r.scorecard.causalBlocking})` : ""}`
      : `${r.scorecard.causalConfidence}/100`;
  lines.push(
    `## K. Scorecard\n- Opportunity Potential: **${score(r.scorecard.opportunityPotential)}** — is the problem structurally attractive?\n- Evidence Confidence: **${score(r.scorecard.evidenceConfidence)}** (${r.confidence.toLowerCase()} confidence) — is the problem real?\n- Value Strength: **${vs}** — if the variable moves, how much value?\n- Causal Confidence: **${cc}** — can the mechanism move it?\n- Verdict: **${r.verdictLabel.toUpperCase()}**`,
  );
  if (r.verdictReasons.length) lines.push(r.verdictReasons.map((x) => `  - ${x}`).join("\n"));
  lines.push(
    `## L. Riskiest assumption\n${r.riskiestAssumption ? `[${r.riskiestAssumption.kind}, importance ${r.riskiestAssumption.importance}/10] ${r.riskiestAssumption.statement}\n\nIf this assumption is false, the opportunity collapses.` : "No untested assumption recorded."}`,
  );
  lines.push(
    `## M. Next best action\n${
      r.valueAction
        ? `**${r.valueAction.what}**\n- Why: ${r.valueAction.why}\n- Affects: ${r.valueAction.affects}\n- If false: ${r.valueAction.ifFalse}\n- Evidence that would move the frontier: ${r.valueAction.evidenceToMove}${r.valueAction.experiment ? `\n- Experiment: ${r.valueAction.experiment}` : ""}`
        : r.nextAction
          ? `**${r.nextAction.title}**\n${r.nextAction.rationale}`
          : "UNKNOWN"
    }`,
  );
  lines.push(
    `## N. Kill criteria\n${r.killWarnings.length ? r.killWarnings.map((w) => `- [${w.severity}] ${w.message}`).join("\n") : "No warnings triggered."}`,
  );
  lines.push(
    `## Assumptions\n${r.assumptions.length ? r.assumptions.map((a, i) => `${i + 1}. [${a.kind} · ${a.status}] ${a.statement} (importance ${a.importance}/10)`).join("\n") : "No assumptions recorded."}`,
  );
  lines.push(
    `## Evidence (${r.evidence.length})\n${r.evidence.length ? r.evidence.map((e) => `- ${e.title} — ${e.type}, ${e.sentiment}, strength ${e.strength}, relevance ${e.relevance}${e.isDemo ? " [DEMO DATA]" : ""}${e.isMocked ? " [MOCKED]" : ""}`).join("\n") : "No evidence captured. Everything above is a hypothesis."}`,
  );
  lines.push(
    `## Risks\n${r.risks.length ? r.risks.map((x) => `- ${x}`).join("\n") : "None recorded."}`,
  );
  return lines.join("\n\n");
}
