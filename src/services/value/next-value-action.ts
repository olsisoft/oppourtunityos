/**
 * Next Best Action, value-engineering edition. Identifies the decision-relevant
 * uncertainties, explains what must be learned, why, which link it affects,
 * what happens if the hypothesis is false and what evidence would move the
 * Proof Frontier — then ranks them with a deterministic ordinal score:
 *
 *   benefit = decision impact × 2 + uncertainty reduction + frontier movement + criticality  (0–10 each)
 *   burden  = effort + time + cost                                                            (0–10 each)
 *   priorityScore = benefit / 5 × (12 − burden / 3) / 12 × 100
 *
 * Inputs are qualitative; the score is an ordering aid, never a measurement.
 * Effort, time and cost come from a planned experiment when one targets the
 * same claim; otherwise a middle value is assumed and flagged as assumed.
 */
import type {
  AssumptionKind,
  AssumptionStatus,
  Criticality,
  ExperimentStatus,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import type { ClaimType } from "@/generated/prisma/enums";
import {
  isSystemMessage,
  msg,
  type LocalizedText,
  type MessageParam,
  type SystemMessage,
} from "@/i18n/messages";
import type { EvidenceScoreResult } from "@/services/scoring/evidence-score";
import { highAdmissibilitySources } from "./admissibility";
import type { CausalConfidenceResult } from "./causal-confidence";
import {
  claimGroup,
  claimTypeForLevel,
  claimTypeForLink,
  RUNG_PRIMARY_CLAIM,
} from "./claim-taxonomy";
import type { CommercialLadderResult } from "./commercial-ladder";
import type { ClaimAssessment } from "./epistemic";
import {
  isLadderRung,
  type FrontierPosition,
  type ProofFrontierResult,
  type ProofRung,
} from "./proof-frontier";
import type { ValueStrengthResult } from "./value-strength";

export type ValueActionType =
  | "COLLAPSE_ASSUMPTION"
  | "CAUSAL_LINK"
  | "EVIDENCE_FITNESS"
  | "GENERALIZATION"
  | "WTP_EVIDENCE"
  | "ECONOMIC_MAGNITUDE"
  | "MECHANISM_FEASIBILITY"
  | "EVIDENCE_GAP"
  | "SECONDARY";

/** Which kind of uncertainty the action resolves. */
export type UncertaintyClass = "PROBLEM" | "VALUE" | "MECHANISM" | "GENERALIZATION" | "COMMERCIAL";

export const UNCERTAINTY_LABELS: Record<UncertaintyClass, string> = {
  PROBLEM: "Problem uncertainty",
  VALUE: "Value uncertainty",
  MECHANISM: "Mechanism uncertainty",
  GENERALIZATION: "Generalization uncertainty",
  COMMERCIAL: "Commercial uncertainty",
};

export interface ActionScoring {
  decisionImpact: number;
  uncertaintyReduction: number;
  frontierMovement: number;
  criticality: number;
  effort: number;
  time: number;
  cost: number;
  /** Dimensions that were assumed (no planned experiment supplied them). */
  assumed: string[];
}

export interface ValueAction {
  /** Rank after ordinal scoring (1 = do this now). */
  priority: number;
  /** Fixed priority band the action belongs to (1 collapse … 7 secondary). */
  tier: number;
  type: ValueActionType;
  /** 0–100 ordinal priority (see module doc). */
  priorityScore: number;
  scoring: ActionScoring;
  /** "Why this test now?" */
  whyNow: SystemMessage;
  uncertainty: UncertaintyClass;
  /** "What this could change": the decision consequence if supported / contradicted. */
  whatThisCouldChange: SystemMessage;
  what: SystemMessage;
  why: SystemMessage;
  affects: SystemMessage;
  ifFalse: SystemMessage;
  evidenceToMove: SystemMessage;
  experiment: SystemMessage | null;
  /** Ids that let the UI deep-link the action. */
  assumptionId?: string;
  causalLinkId?: string;
}

export interface ValueActionAssumption {
  id: string;
  statement: string;
  kind: AssumptionKind;
  status: AssumptionStatus;
  importance: number;
  evidenceCount: number;
  /** Label of the link or level the assumption is attached to (another engine's text). */
  linkedTo: LocalizedText | null;
}

export interface ValueActionLink {
  id: string;
  statement: string;
  from: ValueChainLevel;
  to: ValueChainLevel;
  criticality: Criticality;
  assessment: ClaimAssessment;
}

export interface ValueActionNode {
  level: ValueChainLevel;
  statement: string;
  assessment: ClaimAssessment;
}

export interface ValueActionExperiment {
  id: string;
  status: ExperimentStatus;
  assumptionId: string | null;
  causalLinkId: string | null;
  valueChainNodeId: string | null;
  decisionImpact: number | null;
  expectedInformationGain: number | null;
  effort: number | null;
  timeEstimate: string | null;
  costEstimate: string | null;
}

export interface ValueActionInput {
  frontier: ProofFrontierResult;
  causal: CausalConfidenceResult | null;
  valueStrength: ValueStrengthResult;
  evidence: Pick<EvidenceScoreResult, "components" | "gaps" | "counts">;
  assumptions: ValueActionAssumption[];
  links: ValueActionLink[];
  nodes: ValueActionNode[];
  icpName?: string | null;
  variableName?: string | null;
  painDescription?: string | null;
  mechanism?: string | null;
  /** Planned experiments supply effort / time / cost for the ranking. */
  experiments?: ValueActionExperiment[];
  /** The commercial ladder (existing spend → … → actual purchase). */
  commercial?: CommercialLadderResult | null;
}

/** Wrap another engine's sentence (or a legacy string) so every field is a SystemMessage. */
function asMessage(text: LocalizedText): SystemMessage {
  return isSystemMessage(text) ? text : msg("nextAction.verbatim", { text });
}

const rungLabel = (rung: FrontierPosition) => msg(`labels.proofRung.${rung}`);
const rungLower = (rung: FrontierPosition) => msg(`nextAction.lower.rung.${rung}`);
const linkLabel = (from: FrontierPosition, to: FrontierPosition) =>
  msg("nextAction.link", { from: rungLabel(from), to: rungLabel(to) });
const evidenceByKind = (kind: AssumptionKind) => msg(`nextAction.evidence.${kind}`);
const experimentByKind = (kind: AssumptionKind) => msg(`nextAction.experiment.${kind}`);
const collapseText = (kind: AssumptionKind) => msg(`nextAction.collapse.ifFalse.${kind}`);

/** Up to four items as one comma-separated list message. */
function listMessage(items: SystemMessage[]): SystemMessage {
  const [a, b, c, d] = items;
  return msg("nextAction.list", { count: items.length, a, b, c, d });
}

type ActionDraft = Omit<
  ValueAction,
  "priority" | "priorityScore" | "scoring" | "whyNow" | "uncertainty" | "whatThisCouldChange"
> & {
  uncertaintyClass?: UncertaintyClass;
  whatThisCouldChange?: SystemMessage;
  /** Ordinal hints set by the drafting step. */
  impact: number;
  uncertainty: number;
  frontier: number;
  criticality: number;
  targetAssumptionId?: string;
  targetLinkId?: string;
};

const clamp10 = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

/** Qualitative estimate strings → ordinal 0–10 ("2 days" → 2, "3 weeks" → 6, "€500" → 3). */
export function ordinalFromEstimate(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const num = Number((t.match(/\d+(?:[.,]\d+)?/)?.[0] ?? "").replace(",", "."));
  if (/hour/.test(t)) return 1;
  if (/day/.test(t)) return clamp10(Number.isFinite(num) ? Math.min(10, 1 + num / 2) : 2);
  if (/week/.test(t)) return clamp10(Number.isFinite(num) ? Math.min(10, 3 + num * 1.5) : 4);
  if (/month/.test(t)) return clamp10(Number.isFinite(num) ? Math.min(10, 7 + num) : 8);
  if (/[€$£]/.test(t) || /eur|usd|k\b/.test(t)) {
    const amount = /k\b/.test(t) && Number.isFinite(num) ? num * 1000 : num;
    if (!Number.isFinite(amount)) return 5;
    if (amount <= 100) return 1;
    if (amount <= 500) return 2;
    if (amount <= 2000) return 4;
    if (amount <= 10000) return 6;
    return 9;
  }
  if (/low|cheap|small|free|trivial/.test(t)) return 2;
  if (/medium|moderate/.test(t)) return 5;
  if (/high|expensive|large|heavy/.test(t)) return 8;
  return null;
}

function scoreAction(draft: ActionDraft, experiments: ValueActionExperiment[]): ValueAction {
  const exp = experiments.find(
    (e) =>
      (e.status === "PLANNED" || e.status === "RUNNING") &&
      ((draft.targetAssumptionId && e.assumptionId === draft.targetAssumptionId) ||
        (draft.targetLinkId && e.causalLinkId === draft.targetLinkId)),
  );
  const assumed: string[] = [];
  const pick = (value: number | null | undefined, label: string, fallback: number) => {
    if (value === null || value === undefined) {
      assumed.push(label);
      return fallback;
    }
    return clamp10(value);
  };
  const scoring: ActionScoring = {
    decisionImpact:
      exp?.decisionImpact != null ? clamp10(exp.decisionImpact) : clamp10(draft.impact),
    uncertaintyReduction:
      exp?.expectedInformationGain != null
        ? clamp10(exp.expectedInformationGain)
        : clamp10(draft.uncertainty),
    frontierMovement: clamp10(draft.frontier),
    criticality: clamp10(draft.criticality),
    effort: pick(exp?.effort, "effort", 5),
    time: pick(ordinalFromEstimate(exp?.timeEstimate), "time", 5),
    cost: pick(ordinalFromEstimate(exp?.costEstimate), "cost", 4),
    assumed,
  };
  const benefit =
    (scoring.decisionImpact * 2 +
      scoring.uncertaintyReduction +
      scoring.frontierMovement +
      scoring.criticality) /
    5;
  const burden = (scoring.effort + scoring.time + scoring.cost) / 3;
  const priorityScore = Math.round((benefit / 10) * ((12 - burden) / 12) * 100);
  const cheap = burden <= 4;
  const whyNow =
    draft.type === "COLLAPSE_ASSUMPTION"
      ? msg("nextAction.whyNow.collapse", { cheap })
      : draft.type === "CAUSAL_LINK"
        ? msg("nextAction.whyNow.causalLink", { cheap })
        : draft.type === "WTP_EVIDENCE"
          ? msg("nextAction.whyNow.wtp")
          : draft.type === "ECONOMIC_MAGNITUDE"
            ? msg("nextAction.whyNow.economicMagnitude")
            : draft.type === "MECHANISM_FEASIBILITY"
              ? msg("nextAction.whyNow.mechanismFeasibility")
              : msg("nextAction.whyNow.other", { cheap });
  const { impact, uncertainty, frontier, criticality, targetAssumptionId, targetLinkId, ...rest } =
    draft;
  void impact;
  void uncertainty;
  void frontier;
  void criticality;
  void targetAssumptionId;
  void targetLinkId;
  return {
    ...rest,
    uncertainty: draft.uncertaintyClass ?? defaultUncertainty(draft.type),
    whatThisCouldChange: draft.whatThisCouldChange ?? defaultChange(draft.type),
    priority: 0,
    priorityScore,
    scoring,
    whyNow,
  };
}

function defaultUncertainty(type: ValueActionType): UncertaintyClass {
  switch (type) {
    case "CAUSAL_LINK":
    case "MECHANISM_FEASIBILITY":
      return "MECHANISM";
    case "WTP_EVIDENCE":
      return "COMMERCIAL";
    case "GENERALIZATION":
      return "GENERALIZATION";
    case "EVIDENCE_GAP":
      return "PROBLEM";
    default:
      return "VALUE";
  }
}

function defaultChange(type: ValueActionType): SystemMessage {
  switch (type) {
    case "CAUSAL_LINK":
    case "WTP_EVIDENCE":
    case "ECONOMIC_MAGNITUDE":
    case "MECHANISM_FEASIBILITY":
    case "EVIDENCE_GAP":
      return msg(`nextAction.change.${type}`);
    default:
      return msg("nextAction.change.other");
  }
}

function uncertaintyForKind(kind: AssumptionKind): UncertaintyClass {
  switch (kind) {
    case "CAUSAL":
    case "FEASIBILITY":
      return "MECHANISM";
    case "WTP":
    case "ACCESS":
      return "COMMERCIAL";
    case "VALUE":
      return "VALUE";
    default:
      return "PROBLEM";
  }
}

function uncertaintyForClaim(claimType: ClaimType): UncertaintyClass {
  switch (claimGroup(claimType)) {
    case "PROBLEM":
    case "MARKET":
      return "PROBLEM";
    case "PRODUCT":
    case "CAUSAL":
      return "MECHANISM";
    case "COMMERCIAL":
    case "ACCESS":
      return "COMMERCIAL";
    default:
      return "VALUE";
  }
}

function claimTypeForRung(rung: ProofRung, links: ValueActionLink[]): ClaimType {
  if (rung === "VARIABLE_IMPORTANCE" || rung === "PAIN" || rung === "ECONOMIC_PAIN")
    return RUNG_PRIMARY_CLAIM[rung];
  const link = links.find((l) => l.to === rung);
  void link;
  return claimTypeForLevel(rung);
}

export function computeValueActions(input: ValueActionInput): ValueAction[] {
  const actions: ActionDraft[] = [];
  const icp: MessageParam = input.icpName?.trim() || msg("nextAction.fallback.icp");
  const variable: MessageParam = input.variableName?.trim() || msg("nextAction.fallback.variable");
  const frontierLabel = rungLabel(input.frontier.frontier);

  // 1. Assumption that could collapse the opportunity (untested, critical).
  const collapse = [...input.assumptions]
    .filter((a) => a.status === "UNKNOWN" && a.importance >= 8)
    .sort((a, b) => {
      const kindRank = (k: AssumptionKind) =>
        k === "CAUSAL" || k === "VALUE" ? 0 : k === "WTP" || k === "FEASIBILITY" ? 1 : 2;
      return (
        kindRank(a.kind) - kindRank(b.kind) ||
        b.importance - a.importance ||
        a.evidenceCount - b.evidenceCount
      );
    })[0];
  if (collapse) {
    actions.push({
      tier: 1,
      impact: collapse.importance,
      uncertainty: 9,
      frontier: collapse.linkedTo ? 8 : 4,
      criticality: collapse.importance,
      targetAssumptionId: collapse.id,
      type: "COLLAPSE_ASSUMPTION",
      uncertaintyClass: uncertaintyForKind(collapse.kind),
      whatThisCouldChange: msg("nextAction.draft.COLLAPSE_ASSUMPTION.change", {
        consequence: msg(`nextAction.collapse.consequence.${collapse.kind}`),
      }),
      what: msg("nextAction.draft.COLLAPSE_ASSUMPTION.what", {
        kind: collapse.kind,
        statement: collapse.statement,
      }),
      why: msg("nextAction.draft.COLLAPSE_ASSUMPTION.why", {
        importance: collapse.importance,
        count: collapse.evidenceCount,
        frontier: frontierLabel,
      }),
      affects: collapse.linkedTo
        ? asMessage(collapse.linkedTo)
        : msg("nextAction.fallback.wholeOpportunity"),
      ifFalse: collapseText(collapse.kind),
      evidenceToMove: evidenceByKind(collapse.kind),
      experiment: experimentByKind(collapse.kind),
      assumptionId: collapse.id,
    });
  }

  // 2. Unproven causal link blocking the Proof Frontier.
  const blocked = input.frontier.blockedAt;
  if (blocked) {
    const link =
      input.links.find(
        (l) =>
          l.to === blocked.rung &&
          l.criticality === "CRITICAL" &&
          l.assessment.status !== "OBSERVED" &&
          l.assessment.status !== "STRONGLY_SUPPORTED" &&
          l.assessment.status !== "SUPPORTED",
      ) ?? input.links.find((l) => l.to === blocked.rung);
    if (link) {
      const target = rungLabel(blocked.rung);
      actions.push({
        tier: 2,
        impact: 8,
        uncertainty:
          link.assessment.status === "UNKNOWN" || link.assessment.status === "HYPOTHESIS" ? 9 : 6,
        frontier: 10,
        criticality: link.criticality === "CRITICAL" ? 9 : 5,
        targetLinkId: link.id,
        type: "CAUSAL_LINK",
        uncertaintyClass:
          link.to === "ECONOMIC_VALUE" ||
          link.to === "STRATEGIC_OUTCOME" ||
          link.to === "BUSINESS_OUTCOME"
            ? "VALUE"
            : "MECHANISM",
        whatThisCouldChange: msg("nextAction.draft.CAUSAL_LINK.change", {
          frontier: frontierLabel,
          target,
          from: rungLabel(link.from),
          to: rungLabel(link.to),
        }),
        what: msg("nextAction.draft.CAUSAL_LINK.what", { statement: link.statement }),
        why: msg("nextAction.draft.CAUSAL_LINK.why", {
          target,
          frontier: frontierLabel,
          status: msg(`nextAction.lower.status.${link.assessment.status}`),
          count: link.assessment.evidence.counts.total,
        }),
        affects: linkLabel(link.from, link.to),
        ifFalse: msg("nextAction.draft.CAUSAL_LINK.ifFalse"),
        evidenceToMove: msg("nextAction.draft.CAUSAL_LINK.evidenceToMove", {
          statement: `${link.statement.charAt(0).toLowerCase()}${link.statement.slice(1)}`,
        }),
        experiment: msg("nextAction.draft.CAUSAL_LINK.experiment", {
          icp,
          mechanism: input.mechanism ?? msg("nextAction.fallback.intervention"),
          variable,
        }),
        causalLinkId: link.id,
      });
    }
  }

  // 2b. Evidence exists at the blocked rung but does not fit the claim
  //     (not admissible, low fit, or a causal design that is too weak).
  if (blocked) {
    const fitBlocker = blocked.blockers.find(
      (b) => b.kind === "LOW_FIT" || b.kind === "NOT_ADMISSIBLE" || b.kind === "WEAK_DESIGN",
    );
    if (fitBlocker) {
      const claimType =
        fitBlocker.subject === "LINK"
          ? (() => {
              const l = input.links.find((x) => x.to === blocked.rung);
              return l
                ? claimTypeForLink(l.from, l.to)
                : claimTypeForRung(blocked.rung, input.links);
            })()
          : claimTypeForRung(blocked.rung, input.links);
      const sourceTypes = highAdmissibilitySources(claimType).slice(0, 4);
      const sources = sourceTypes.length
        ? listMessage(sourceTypes.map((s) => msg(`nextAction.lower.sourceType.${s}`)))
        : null;
      const link =
        fitBlocker.subject === "LINK" ? input.links.find((x) => x.to === blocked.rung) : null;
      const level = rungLabel(blocked.rung);
      const levelLower = rungLower(blocked.rung);
      actions.push({
        tier: 2,
        impact: 8,
        uncertainty: 8,
        frontier: 9,
        criticality: 7,
        targetLinkId: link?.id,
        type: "EVIDENCE_FITNESS",
        uncertaintyClass: uncertaintyForClaim(claimType),
        whatThisCouldChange: msg("nextAction.draft.EVIDENCE_FITNESS.change", { level }),
        what:
          fitBlocker.kind === "WEAK_DESIGN"
            ? fitBlocker.requiredDesign
              ? msg("nextAction.draft.EVIDENCE_FITNESS.whatWeakDesign", {
                  level,
                  design: fitBlocker.designLevel
                    ? msg(`nextAction.lower.design.${fitBlocker.designLevel}`)
                    : msg("nextAction.fallback.designNone"),
                  levelLower,
                  required: msg(`nextAction.lower.design.${fitBlocker.requiredDesign}`),
                })
              : msg("nextAction.draft.EVIDENCE_FITNESS.whatWeakDesignDetail", {
                  level,
                  detail: withoutLabelPrefix(fitBlocker.message),
                })
            : msg("nextAction.draft.EVIDENCE_FITNESS.whatSources", {
                level,
                sources: sources ?? msg("nextAction.fallback.admissibleSource"),
              }),
        why:
          fitBlocker.kind === "NOT_ADMISSIBLE"
            ? msg("nextAction.draft.EVIDENCE_FITNESS.whyNotAdmissible", { level })
            : fitBlocker.kind === "WEAK_DESIGN"
              ? msg("nextAction.draft.EVIDENCE_FITNESS.whyWeakDesign", { levelLower })
              : msg("nextAction.draft.EVIDENCE_FITNESS.whyLowFit", {
                  level,
                  fit: fitBlocker.fit ?? 0,
                  required: fitBlocker.requiredFit ?? 40,
                }),
        affects: level,
        ifFalse: msg("nextAction.draft.EVIDENCE_FITNESS.ifFalse"),
        evidenceToMove: sources
          ? msg("nextAction.draft.EVIDENCE_FITNESS.evidenceToMoveSources", { sources })
          : msg("nextAction.draft.EVIDENCE_FITNESS.evidenceToMoveGeneric"),
        experiment: link
          ? msg("nextAction.draft.EVIDENCE_FITNESS.experiment", { statement: link.statement })
          : null,
        causalLinkId: link?.id,
      });
    }
  }

  // 2c. Generalization gap at the frontier: observed in a case or a sample, not the segment.
  const frontierState = input.frontier.rungs.find((r) => r.rung === input.frontier.frontier);
  const gen = frontierState?.summary?.generalization ?? null;
  if (
    frontierState &&
    frontierState.summary &&
    isLadderRung(frontierState.rung) &&
    (gen === "CASE_ONLY" || gen === "SAMPLE_SUPPORTED" || gen === "BROADER_HYPOTHESIS")
  ) {
    const question = frontierState.summary.nextGeneralizationQuestion;
    const level = rungLabel(frontierState.rung);
    const scope: LocalizedText | null = frontierState.summary.scopeText ?? null;
    actions.push({
      tier: 4,
      impact: 6,
      uncertainty: 6,
      frontier: 3,
      criticality: 5,
      type: "GENERALIZATION",
      uncertaintyClass: "GENERALIZATION",
      whatThisCouldChange: msg("nextAction.draft.GENERALIZATION.change", {
        level,
        generalization: msg(`labels.generalization.${gen}`),
        icp,
      }),
      what: question
        ? asMessage(question)
        : msg("nextAction.draft.GENERALIZATION.what", {
            levelLower: rungLower(frontierState.rung),
            scope: scope ?? msg("nextAction.fallback.observedScope"),
          }),
      why: msg("nextAction.draft.GENERALIZATION.why", {
        level,
        generalization: msg(`nextAction.lower.generalization.${gen}`),
        count: frontierState.summary.independentOrigins,
        scope: scope ?? msg("common.notRecorded"),
      }),
      affects: msg("nextAction.draft.GENERALIZATION.affects", { level }),
      ifFalse: msg("nextAction.draft.GENERALIZATION.ifFalse"),
      evidenceToMove: msg("nextAction.draft.GENERALIZATION.evidenceToMove"),
      experiment: msg("nextAction.draft.GENERALIZATION.experiment", { generalization: gen }),
    });
  }

  // 3. Missing willingness-to-pay evidence.
  const component = (key: string) => input.evidence.components.find((c) => c.key === key);
  const wtpUntested = input.assumptions.some((a) => a.kind === "WTP" && a.status === "UNKNOWN");
  const ladder = input.commercial ?? null;
  const ladderNext = ladder?.next ?? null;
  const wtpReached =
    ladder?.highestSupported === "WILLINGNESS_TO_PAY" ||
    ladder?.highestSupported === "PRICE_ACCEPTANCE" ||
    ladder?.highestSupported === "ACTUAL_PURCHASE";
  if ((ladder ? !wtpReached : (component("purchaseIntent")?.itemCount ?? 0) === 0) || wtpUntested) {
    const ladderText = ladder
      ? msg(
          "nextAction.draft.WTP_EVIDENCE.ladder",
          Object.fromEntries(
            ladder.rungs.map((r) => [
              r.claimType,
              msg("nextAction.draft.WTP_EVIDENCE.rung", {
                label: msg(`nextAction.lower.commercialRung.${r.claimType}`),
                state: r.supported
                  ? msg("nextAction.lower.status.SUPPORTED")
                  : msg(`nextAction.lower.status.${r.status}`),
              }),
            ]),
          ),
        )
      : null;
    const note =
      ladder?.highestSupported === "EXISTING_SPEND"
        ? "EXISTING_SPEND"
        : ladder?.highestSupported === "PURCHASE_INTENT"
          ? "PURCHASE_INTENT"
          : "other";
    actions.push({
      tier: 3,
      impact: 8,
      uncertainty: 7,
      frontier: 2,
      criticality: 8,
      targetAssumptionId: input.assumptions.find((a) => a.kind === "WTP" && a.status === "UNKNOWN")
        ?.id,
      type: "WTP_EVIDENCE",
      uncertaintyClass: "COMMERCIAL",
      what: ladderNext
        ? msg("nextAction.draft.WTP_EVIDENCE.whatNext", {
            question: withoutQuestionMark(ladderNext.question),
            rung: msg(`nextAction.lower.commercialRung.${ladderNext.claimType}`),
            icp,
          })
        : msg("nextAction.draft.WTP_EVIDENCE.what", { icp }),
      why: ladderText
        ? msg("nextAction.draft.WTP_EVIDENCE.whyLadder", {
            ladder: ladderText,
            note: msg(`nextAction.draft.WTP_EVIDENCE.note.${note}`),
          })
        : msg("nextAction.draft.WTP_EVIDENCE.why"),
      affects: msg("nextAction.draft.WTP_EVIDENCE.affects"),
      ifFalse: msg("nextAction.draft.WTP_EVIDENCE.ifFalse"),
      evidenceToMove: ladderNext?.evidenceToMove
        ? asMessage(ladderNext.evidenceToMove)
        : evidenceByKind("WTP"),
      experiment: experimentByKind("WTP"),
    });
  }

  // 4. Missing economic magnitude.
  if (
    (component("economicImpact")?.itemCount ?? 0) === 0 ||
    input.valueStrength.missing.includes("magnitude")
  ) {
    actions.push({
      tier: 4,
      impact: 7,
      uncertainty: 7,
      frontier: 3,
      criticality: 6,
      type: "ECONOMIC_MAGNITUDE",
      what: msg("nextAction.draft.ECONOMIC_MAGNITUDE.what", {
        pain: input.painDescription?.trim() || msg("nextAction.fallback.problemOf"),
      }),
      why: input.valueStrength.missing.includes("magnitude")
        ? msg("nextAction.draft.ECONOMIC_MAGNITUDE.whyMissing")
        : msg("nextAction.draft.ECONOMIC_MAGNITUDE.why"),
      affects: msg("nextAction.draft.ECONOMIC_MAGNITUDE.affects"),
      ifFalse: msg("nextAction.draft.ECONOMIC_MAGNITUDE.ifFalse"),
      evidenceToMove: msg("nextAction.draft.ECONOMIC_MAGNITUDE.evidenceToMove"),
      experiment: msg("nextAction.draft.ECONOMIC_MAGNITUDE.experiment"),
    });
  }

  // 5. Unknown mechanism feasibility.
  const mechanismNode = input.nodes.find((n) => n.level === "MECHANISM");
  const feasibilityUntested = input.assumptions.some(
    (a) => a.kind === "FEASIBILITY" && a.status === "UNKNOWN",
  );
  if (
    feasibilityUntested ||
    (mechanismNode && mechanismNode.assessment.evidence.counts.total === 0)
  ) {
    actions.push({
      tier: 5,
      impact: 7,
      uncertainty: 8,
      frontier: 6,
      criticality: 7,
      targetAssumptionId: input.assumptions.find(
        (a) => a.kind === "FEASIBILITY" && a.status === "UNKNOWN",
      )?.id,
      type: "MECHANISM_FEASIBILITY",
      what: msg("nextAction.draft.MECHANISM_FEASIBILITY.what", {
        mechanism:
          mechanismNode?.statement ??
          input.mechanism ??
          msg("nextAction.fallback.proposedMechanism"),
      }),
      why: msg("nextAction.draft.MECHANISM_FEASIBILITY.why"),
      affects: msg("nextAction.draft.MECHANISM_FEASIBILITY.affects"),
      ifFalse: msg("nextAction.draft.MECHANISM_FEASIBILITY.ifFalse"),
      evidenceToMove: evidenceByKind("FEASIBILITY"),
      experiment: experimentByKind("FEASIBILITY"),
    });
  }

  // 6. Low-confidence evidence gap.
  if (input.evidence.gaps.length > 0) {
    actions.push({
      tier: 6,
      impact: 5,
      uncertainty: 5,
      frontier: 3,
      criticality: 5,
      type: "EVIDENCE_GAP",
      what: asMessage(withoutTrailingPeriod(input.evidence.gaps[0])),
      why: msg("nextAction.draft.EVIDENCE_GAP.why"),
      affects: msg("nextAction.draft.EVIDENCE_GAP.affects"),
      ifFalse: msg("nextAction.draft.EVIDENCE_GAP.ifFalse"),
      evidenceToMove: msg("nextAction.draft.EVIDENCE_GAP.evidenceToMove"),
      experiment: null,
    });
  }

  // 7. Secondary optimization questions (remaining unknown value dimensions).
  for (const dim of input.valueStrength.missing.filter((m) => m !== "magnitude")) {
    actions.push({
      tier: 7,
      impact: 4,
      uncertainty: 5,
      frontier: 1,
      criticality: 3,
      type: "SECONDARY",
      what: msg("nextAction.draft.SECONDARY.what", {
        dimension: msg(`nextAction.lower.dimension.${dim}`),
      }),
      why: msg("nextAction.draft.SECONDARY.why", {
        dimension: msg(`labels.valueDimension.${dim}`),
      }),
      affects: msg("nextAction.draft.SECONDARY.affects"),
      ifFalse: msg("nextAction.draft.SECONDARY.ifFalse"),
      evidenceToMove: msg("nextAction.draft.SECONDARY.evidenceToMove"),
      experiment: null,
    });
  }

  if (
    input.causal &&
    input.causal.status === "COMPLETE" &&
    input.causal.weakest &&
    actions.every((a) => a.type !== "CAUSAL_LINK")
  ) {
    actions.push({
      tier: 7,
      impact: 5,
      uncertainty: 4,
      frontier: 4,
      criticality: 5,
      targetLinkId: input.links.find((l) => l.statement === input.causal?.weakest?.statement)?.id,
      type: "SECONDARY",
      what: msg("nextAction.draft.WEAKEST_LINK.what", {
        statement: input.causal.weakest.statement,
      }),
      why: msg("nextAction.draft.WEAKEST_LINK.why", { score: input.causal.weakest.effective }),
      affects: msg("nextAction.link", {
        from: input.causal.weakest.from,
        to: input.causal.weakest.to,
      }),
      ifFalse: msg("nextAction.draft.WEAKEST_LINK.ifFalse"),
      evidenceToMove: msg("nextAction.draft.WEAKEST_LINK.evidenceToMove"),
      experiment: experimentByKind("CAUSAL"),
    });
  }

  const scored = actions
    .map((d) => scoreAction(d, input.experiments ?? []))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.tier - b.tier);
  return scored.map((a, i) => ({ ...a, priority: i + 1 }));
}

/** Another engine's sentence with its "Label: " prefix removed — only possible on a plain string. */
function withoutLabelPrefix(text: LocalizedText): LocalizedText {
  return typeof text === "string" ? text.replace(/^[^:]+: /, "") : text;
}

function withoutQuestionMark(text: LocalizedText): LocalizedText {
  return typeof text === "string" ? text.replace(/\?$/, "") : text;
}

function withoutTrailingPeriod(text: LocalizedText): LocalizedText {
  return typeof text === "string" ? text.replace(/\.$/, "") : text;
}

export function primaryValueAction(input: ValueActionInput): ValueAction | null {
  return computeValueActions(input)[0] ?? null;
}
