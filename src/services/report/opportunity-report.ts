/**
 * Opportunity Report — the artifact produced at the end of discovery.
 * Pure transformation of the persisted state into a report object plus a
 * Markdown rendering. Provenance is preserved so hypotheses are never shown
 * as facts. Sections follow the value-engineering order A–N:
 * ICP · Valuable variable · Pain · Trigger · Alternatives · Mechanisms ·
 * Product hypothesis · Value proposition · Value causality ladder ·
 * Proof frontier · Scorecard · Riskiest assumption · Next best action ·
 * Kill criteria.
 *
 * Both the model and the Markdown are rendered with the caller's `t`, so the
 * report reads in the user's language: labels come from the dictionary and
 * engine sentences (persisted as text or SystemMessage) go through `t()`.
 */
import type { OpportunityWithRelations } from "@/db/workspaces";
import { formatDate } from "@/i18n/format";
import { isSystemMessage, type LocalizedText } from "@/i18n/messages";
import type { T } from "@/i18n/t";
import type { KillWarning } from "@/services/scoring/kill-criteria";
import type { NextAction } from "@/services/scoring/next-action";
import type { VerdictResult } from "@/services/scoring/verdict";
import { CAUSAL_DISTANCE_LABELS } from "@/services/value/epistemic";
import type { ValueAction } from "@/services/value/next-value-action";
import type { FrontierPosition, ProofFrontierResult } from "@/services/value/proof-frontier";
import { describeScope, parseScope } from "@/services/value/scope";
import { fieldStatus } from "@/services/value/variable-semantics";

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
  confidenceLabel: string;
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

export function frontierSentence(position: FrontierPosition, t: T): string {
  if (position === "NONE") return t("report.model.frontierNone");
  return t("report.model.frontierAt", { label: t(`labels.proofRung.${position}`) });
}

/** Prefer the structured message persisted next to a text column, when the row has one. */
function stored(message: unknown, text: string | null | undefined): LocalizedText | null {
  if (isSystemMessage(message)) return message;
  return text ?? null;
}

function field(
  v: NonNullable<OpportunityWithRelations["variable"]>,
  key: Parameters<typeof fieldStatus>[1],
  value: string | number | null | undefined,
  t: T,
): ReportField {
  const text =
    value === null || value === undefined || String(value).trim() === ""
      ? "UNKNOWN"
      : String(value);
  return { value: text, status: t(`labels.fieldStatus.${fieldStatus(v, key)}`) };
}

export function buildOpportunityReport(
  o: OpportunityWithRelations,
  mechanisms: string[],
  nextAction: NextAction | null,
  valueAction: ValueAction | null,
  t: T,
): OpportunityReport {
  const locale = t.locale;
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
    blocking?: { label: LocalizedText } | null;
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
          provenance: t(`labels.provenance.${o.icp.provenance}`),
        }
      : null,
    variable: v
      ? {
          name: v.name,
          direction: t(`labels.direction.${v.desiredDirection}`),
          category: v.category,
          provenance: t(`labels.provenance.${v.provenance}`),
        }
      : null,
    variableDetail: v
      ? {
          variableType: field(v, "variableType", v.variableType, t),
          target: field(v, "target", v.target, t),
          scope: field(v, "scope", v.scope, t),
          currentState: field(v, "currentState", v.currentState ?? o.pain?.currentState, t),
          desiredState: field(v, "desiredState", v.desiredState ?? o.pain?.desiredState, t),
          unit: field(v, "unit", v.unit, t),
          importance: field(v, "importanceScore", `${v.importanceScore}/10`, t),
          parentVariable: field(v, "parentVariableId", v.parent?.name, t),
          whoValuesIt: field(v, "whoValuesIt", v.whoValuesIt, t),
          whyItMatters: field(v, "whyItMatters", v.whyItMatters, t),
        }
      : null,
    currentState: v?.currentState ?? o.pain?.currentState ?? "UNKNOWN",
    desiredState: v?.desiredState ?? o.pain?.desiredState ?? "UNKNOWN",
    economicPain: o.problemStatement ?? o.pain?.description ?? "UNKNOWN",
    trigger: o.pain?.triggers[0]?.description ?? t("report.model.triggerUnknown"),
    alternatives: (o.pain?.alternatives ?? []).map((a) => ({
      name: a.name,
      failure: a.weaknessDescription ?? t("report.model.failureUnknown"),
      weakness: a.weaknessScore,
    })),
    mechanisms,
    productHypothesis: o.productHypothesis ?? t("report.model.notFormed"),
    valueProposition: o.valueProposition ?? t("report.model.notFormed"),
    metric: o.metric ?? t("report.model.metricUnknown"),
    ladder: o.valueChainNodes.map((n) => {
      const summary = rungOf(n.level)?.summary ?? null;
      const inference = stored(n.inferenceMessage, n.inference);
      return {
        level: t(`labels.valueChainLevel.${n.level}`),
        statement: n.statement,
        status: t(`labels.epistemic.${n.status}`),
        confidence: n.confidence,
        causalDistance: CAUSAL_DISTANCE_LABELS[n.causalDistance]?.code ?? `CD${n.causalDistance}`,
        evidenceCount: n.evidenceLinks.length,
        assumptionCount: n.assumptions.length,
        bestFit: summary && summary.total > 0 ? summary.bestFit : null,
        admissible: summary?.admissible ?? 0,
        scope: n.observedScope ? describeScope(parseScope(n.observedScope), locale) : null,
        generalization: t(`labels.generalization.${n.generalization}`),
        inference: inference ? t(inference) : null,
      };
    }),
    causalLinks: o.causalLinks.map((l) => {
      const summary = rungOf(l.toNode.level)?.linkFromPrevious?.summary ?? null;
      const inference = stored(l.inferenceMessage, l.inference);
      return {
        from: t(`labels.valueChainLevel.${l.fromNode.level}`),
        to: t(`labels.valueChainLevel.${l.toNode.level}`),
        statement: l.statement,
        status: t(`labels.epistemic.${l.status}`),
        criticality: t(`labels.criticality.${l.criticality}`),
        bestFit: summary && summary.total > 0 ? summary.bestFit : null,
        designLevel: summary?.designLevel ? t(`labels.designLevel.${summary.designLevel}`) : null,
        generalization: t(`labels.generalization.${l.generalization}`),
        inference: inference ? t(inference) : null,
      };
    }),
    frontier: {
      position: frontierPosition,
      label: t(`labels.proofRung.${frontierPosition}`),
      text: frontierSentence(frontierPosition, t),
      whyStops: storedFrontier?.whyStops
        ? t(storedFrontier.whyStops)
        : t("report.model.frontierNotComputed"),
      scope: storedFrontier?.frontierScope?.scope
        ? describeScope(storedFrontier.frontierScope.scope, locale)
        : storedFrontier?.frontierScope?.text
          ? t(storedFrontier.frontierScope.text)
          : t("report.model.scopeNotComputed"),
      generalization: storedFrontier?.frontierScope?.generalization
        ? t(`labels.generalization.${storedFrontier.frontierScope.generalization}`)
        : storedFrontier?.frontierScope?.generalizationLabel
          ? t(storedFrontier.frontierScope.generalizationLabel)
          : null,
    },
    commercial: (storedFrontier?.commercial?.rungs ?? []).map((r) => ({
      label: t.has(`labels.commercialRung.${r.claimType}`)
        ? t(`labels.commercialRung.${r.claimType}`)
        : t(r.label),
      status: t(`labels.epistemic.${r.status}`),
      evidenceCount: r.evidenceCount,
      bestFit: r.bestFit,
    })),
    experimentValidity: o.experiments
      .filter((e) => e.resultRecord)
      .map((e) => {
        const r = e.resultRecord!;
        const assessment = (r.validityAssessment ?? null) as {
          threats?: LocalizedText[];
        } | null;
        const interpretation = stored(r.interpretationMessage, r.interpretation);
        return {
          title: e.title,
          outcome: t(`labels.experimentOutcome.${r.outcome}`),
          design: r.designLevel
            ? t(`labels.designLevel.${r.designLevel}`)
            : t("common.notRecorded"),
          internalValidity: r.internalValidity
            ? t(`labels.internalValidity.${r.internalValidity}`)
            : t("report.model.validityNotAssessed"),
          scope: describeScope(parseScope(r.scope), locale),
          interpretation: interpretation ? t(interpretation) : "",
          threats: (assessment?.threats ?? []).map((x) => t(x)),
        };
      }),
    scorecard: {
      opportunityPotential: o.opportunityScore,
      evidenceConfidence: o.evidenceScore,
      valueStrength: o.valueStrength,
      valueCompleteness: valueBreakdown?.completeness ?? null,
      valueMissing: (valueBreakdown?.missing ?? []).map((d) =>
        t.has(`labels.valueDimension.${d}`) ? t(`labels.valueDimension.${d}`) : d,
      ),
      causalConfidence: o.causalConfidence,
      causalCompleteness: causalBreakdown?.completeness ?? null,
      causalBlocking: causalBreakdown?.blocking?.label ? t(causalBreakdown.blocking.label) : null,
    },
    opportunityScore: o.opportunityScore,
    evidenceScore: o.evidenceScore,
    verdict: o.verdict,
    verdictLabel: t(`labels.verdict.${o.verdict}`),
    verdictReasons: ((verdictResult?.reasons ?? []) as LocalizedText[]).map((x) => t(x)),
    confidence: o.confidence,
    confidenceLabel: t(`labels.confidence.${o.confidence}`),
    killWarnings,
    assumptions: o.assumptions.map((a) => ({
      statement: a.statement,
      kind: t(`labels.assumptionKind.${a.kind}`),
      status: t(`labels.assumptionStatus.${a.status}`),
      importance: a.importance,
    })),
    riskiestAssumption: riskiest
      ? {
          statement: riskiest.statement,
          kind: t(`labels.assumptionKind.${riskiest.kind}`),
          importance: riskiest.importance,
        }
      : null,
    evidence: o.evidence.map((e) => ({
      title: e.sourceTitle,
      type: t(`labels.evidenceType.${e.type}`),
      sentiment: t(`labels.sentiment.${e.sentiment}`),
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

export function reportToMarkdown(r: OpportunityReport, t: T): string {
  const locale = t.locale;
  const score = (n: number | null) =>
    n === null ? t("report.md.scorecard.incomplete") : t("report.md.scorecard.score", { score: n });
  const heading = (key: string, params?: Record<string, string | number>) =>
    `## ${t(`report.md.heading.${key}`, params)}`;
  const separator = t("report.md.listSeparator");
  const lines: string[] = [];
  lines.push(`# ${t("report.md.title", { title: r.title })}`);
  lines.push("");
  lines.push(t("report.md.generated", { date: formatDate(r.generatedAt, locale) }));
  lines.push("");
  lines.push(
    `${heading("icp")}\n${
      r.icp
        ? t("report.md.icp", {
            name: r.icp.name,
            description: r.icp.description || t("report.model.detailsUnknown"),
            provenance: r.icp.provenance,
          })
        : "UNKNOWN"
    }`,
  );
  const vd = r.variableDetail;
  const fieldLine = (key: string, f: ReportField) =>
    `- ${t(`report.md.variable.${key}`, { value: f.value, status: f.status })}`;
  lines.push(
    `${heading("variable")}\n${
      r.variable
        ? [
            `- ${t("report.md.variable.name", { name: r.variable.name, provenance: r.variable.provenance })}`,
            `- ${t("report.md.variable.direction", { direction: r.variable.direction })}`,
            vd ? fieldLine("type", vd.variableType) : null,
            vd ? fieldLine("target", vd.target) : null,
            vd ? fieldLine("scope", vd.scope) : null,
            vd ? fieldLine("currentState", vd.currentState) : null,
            vd ? fieldLine("desiredState", vd.desiredState) : null,
            vd ? fieldLine("unit", vd.unit) : null,
            vd ? fieldLine("importance", vd.importance) : null,
            vd ? fieldLine("parentVariable", vd.parentVariable) : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "UNKNOWN"
    }`,
  );
  lines.push(`${heading("pain")}\n${r.economicPain}`);
  lines.push(`${heading("trigger")}\n${r.trigger}`);
  lines.push(
    `${heading("alternatives")}\n${
      r.alternatives.length
        ? r.alternatives.map((a) => `- ${t("report.md.alternative", a)}`).join("\n")
        : "UNKNOWN"
    }`,
  );
  lines.push(
    `${heading("mechanisms")}\n${
      r.mechanisms.length
        ? r.mechanisms.map((m) => `- ${m}`).join("\n")
        : t("report.md.mechanismsEmpty")
    }`,
  );
  lines.push(`${heading("productHypothesis")}\n${r.productHypothesis}`);
  lines.push(
    `${heading("valueProposition")}\n${r.valueProposition}\n\n${t("report.md.metric", { metric: r.metric })}`,
  );
  lines.push(
    `${heading("ladder")}\n${
      r.ladder.length
        ? r.ladder
            .map(
              (n, i) =>
                `${i === 0 ? "" : "↓\n"}${t("report.md.ladder.node", {
                  level: n.level,
                  status: n.status,
                  hasConfidence: Boolean(n.confidence),
                  confidence: n.confidence,
                  distance: n.causalDistance,
                  statement: n.statement,
                })}` +
                (n.evidenceCount || n.assumptionCount
                  ? ` ${t("report.md.ladder.nodeCounts", {
                      evidence: n.evidenceCount,
                      admissible: n.admissible,
                      hasFit: n.bestFit !== null,
                      fit: n.bestFit,
                      assumptions: n.assumptionCount,
                    })}`
                  : "") +
                (n.scope
                  ? `\n  ${t("report.md.ladder.nodeScope", { scope: n.scope, generalization: n.generalization })}`
                  : "") +
                (n.inference
                  ? `\n  ${t("report.md.ladder.nodeInference", { inference: n.inference })}`
                  : ""),
            )
            .join("\n")
        : t("report.md.ladder.empty")
    }${
      r.causalLinks.length
        ? `\n\n${t("report.md.ladder.linksTitle")}\n${r.causalLinks
            .map(
              (l) =>
                `- ${t("report.md.ladder.link", {
                  from: l.from,
                  to: l.to,
                  status: l.status,
                  criticality: l.criticality,
                  hasFit: l.bestFit !== null,
                  fit: l.bestFit,
                  hasDesign: Boolean(l.designLevel),
                  design: l.designLevel?.toLowerCase(),
                  statement: l.statement,
                  hasInference: Boolean(l.inference),
                  inference: l.inference,
                })}`,
            )
            .join("\n")}`
        : ""
    }`,
  );
  lines.push(
    `${heading("frontier")}\n${r.frontier.text}\n\n${t("report.md.frontier.scope", {
      scope: r.frontier.scope,
      hasGeneralization: Boolean(r.frontier.generalization),
      generalization: r.frontier.generalization,
    })}\n\n${t("report.md.frontier.whyStops", { whyStops: r.frontier.whyStops })}`,
  );
  if (r.commercial.length) {
    lines.push(
      `${heading("commercial")}\n${r.commercial
        .map(
          (c) =>
            `- ${t("report.md.commercial.rung", {
              label: c.label,
              status: c.status,
              hasEvidence: Boolean(c.evidenceCount),
              count: c.evidenceCount,
              fit: c.bestFit,
            })}`,
        )
        .join("\n")}\n\n${t("report.md.commercial.note")}`,
    );
  }
  if (r.experimentValidity.length) {
    lines.push(
      `${heading("experimentalValidity")}\n${r.experimentValidity
        .map(
          (e) =>
            `- ${t("report.md.experimentValidity.line", {
              title: e.title,
              outcome: e.outcome,
              design: e.design,
              validity: e.internalValidity,
              scope: e.scope,
            })}\n  ${e.interpretation}${
              e.threats.length
                ? `\n  ${t("report.md.experimentValidity.threats", { threats: e.threats.join(" ") })}`
                : ""
            }`,
        )
        .join("\n")}`,
    );
  }
  const vs =
    r.scorecard.valueStrength === null
      ? t("report.md.scorecard.valueIncomplete", {
          completeness: r.scorecard.valueCompleteness ?? "?",
          hasMissing: r.scorecard.valueMissing.length > 0,
          missing: r.scorecard.valueMissing.join(separator),
        })
      : score(r.scorecard.valueStrength);
  const cc =
    r.scorecard.causalConfidence === null
      ? t("report.md.scorecard.causalIncomplete", {
          completeness: r.scorecard.causalCompleteness ?? "?",
          hasBlocking: Boolean(r.scorecard.causalBlocking),
          blocking: r.scorecard.causalBlocking,
        })
      : score(r.scorecard.causalConfidence);
  lines.push(
    `${heading("scorecard")}\n- ${t("report.md.scorecard.opportunityPotential", {
      score: score(r.scorecard.opportunityPotential),
    })}\n- ${t("report.md.scorecard.evidenceConfidence", {
      score: score(r.scorecard.evidenceConfidence),
      confidence: r.confidenceLabel.toLowerCase(),
    })}\n- ${t("report.md.scorecard.valueStrength", { score: vs })}\n- ${t(
      "report.md.scorecard.causalConfidence",
      { score: cc },
    )}\n- ${t("report.md.scorecard.verdict", { verdict: r.verdictLabel.toUpperCase() })}`,
  );
  if (r.verdictReasons.length) lines.push(r.verdictReasons.map((x) => `  - ${x}`).join("\n"));
  lines.push(
    `${heading("riskiest")}\n${
      r.riskiestAssumption
        ? `${t("report.md.riskiest.line", r.riskiestAssumption)}\n\n${t("report.md.riskiest.collapse")}`
        : t("report.md.riskiest.empty")
    }`,
  );
  lines.push(
    `${heading("nextAction")}\n${
      r.valueAction
        ? t("report.md.nextAction.value", {
            what: t(r.valueAction.what),
            why: t(r.valueAction.why),
            affects: t(r.valueAction.affects),
            ifFalse: t(r.valueAction.ifFalse),
            evidence: t(r.valueAction.evidenceToMove),
            hasExperiment: Boolean(r.valueAction.experiment),
            experiment: t(r.valueAction.experiment),
          })
        : r.nextAction
          ? t("report.md.nextAction.simple", {
              title: t(r.nextAction.title),
              rationale: t(r.nextAction.rationale),
            })
          : "UNKNOWN"
    }`,
  );
  lines.push(
    `${heading("killCriteria")}\n${
      r.killWarnings.length
        ? r.killWarnings
            .map(
              (w) =>
                `- ${t("report.md.kill.line", { severity: w.severity, message: t(w.message) })}`,
            )
            .join("\n")
        : t("report.md.kill.empty")
    }`,
  );
  lines.push(
    `${heading("assumptions")}\n${
      r.assumptions.length
        ? r.assumptions
            .map((a, i) => t("report.md.assumptions.line", { index: i + 1, ...a }))
            .join("\n")
        : t("report.md.assumptions.empty")
    }`,
  );
  lines.push(
    `${heading("evidence", { count: r.evidence.length })}\n${
      r.evidence.length
        ? r.evidence.map((e) => `- ${t("report.md.evidence.line", { ...e })}`).join("\n")
        : t("report.md.evidence.empty")
    }`,
  );
  lines.push(
    `${heading("risks")}\n${
      r.risks.length ? r.risks.map((x) => `- ${x}`).join("\n") : t("report.md.risksEmpty")
    }`,
  );
  return lines.join("\n\n");
}
