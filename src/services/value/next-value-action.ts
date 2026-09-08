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
import { EVIDENCE_SOURCE_TYPE_LABELS } from "@/domain/enums";
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
import { GENERALIZATION_LABELS } from "./language-gate";
import {
  isLadderRung,
  PROOF_RUNG_LABELS,
  type ProofFrontierResult,
  type ProofRung,
} from "./proof-frontier";
import { VALUE_DIMENSION_LABELS, type ValueStrengthResult } from "./value-strength";

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
  whyNow: string;
  uncertainty: UncertaintyClass;
  /** "What this could change": the decision consequence if supported / contradicted. */
  whatThisCouldChange: string;
  what: string;
  why: string;
  affects: string;
  ifFalse: string;
  evidenceToMove: string;
  experiment: string | null;
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
  linkedTo: string | null;
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

const EVIDENCE_BY_KIND: Record<AssumptionKind, string> = {
  CAUSAL:
    "A controlled comparison (with vs without the intervention) on comparable cases, with the variable measured before and after.",
  VALUE:
    "Quantified before/after numbers from real operations: how much the variable moved and what that was worth.",
  FEASIBILITY:
    "A technical spike or data audit proving the required inputs exist and can be obtained.",
  WTP: "Observed purchase behaviour: paid pilots, deposits, signed letters of intent or existing spend on partial solutions.",
  ACCESS:
    "An outreach test: how many target buyers could actually be reached and would talk within two weeks.",
  GENERIC: "Direct customer evidence (interviews, quotes, surveys) that speaks to the statement.",
};

const EXPERIMENT_BY_KIND: Record<AssumptionKind, string> = {
  CAUSAL:
    "Run a controlled pilot: apply the intervention to half of comparable cases and compare the variable across both groups.",
  VALUE:
    "Instrument five customers for one month; measure the variable and translate the movement into money or hours.",
  FEASIBILITY:
    "Build the thinnest possible prototype of the data path and check the inputs on real customer data.",
  WTP: "Offer a paid concierge version (or a deposit-backed waitlist) to ten target customers and count who pays.",
  ACCESS:
    "Contact twenty target buyers through the intended channel and measure reply and meeting rates.",
  GENERIC:
    "Interview five target customers about the last time this happened and capture their statements as evidence.",
};

function collapseText(kind: AssumptionKind): string {
  switch (kind) {
    case "CAUSAL":
      return "The product hypothesis collapses: the mechanism would not move the variable.";
    case "VALUE":
      return "The opportunity collapses: moving the variable would not create enough value to justify a product.";
    case "FEASIBILITY":
      return "The mechanism cannot be built as imagined; a different mechanism is needed.";
    case "WTP":
      return "The problem may be real but nobody pays to remove it; the business case collapses.";
    case "ACCESS":
      return "The buyers cannot be reached efficiently; go-to-market collapses even if the product works.";
    default:
      return "A load-bearing belief is false and the opportunity must be re-examined.";
  }
}

type ActionDraft = Omit<
  ValueAction,
  "priority" | "priorityScore" | "scoring" | "whyNow" | "uncertainty" | "whatThisCouldChange"
> & {
  uncertaintyClass?: UncertaintyClass;
  whatThisCouldChange?: string;
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
      ? `This is the ${cheap ? "cheapest" : "most tractable"} test capable of resolving the highest-impact uncertainty: if this assumption is false the opportunity collapses, so nothing else is worth testing first.`
      : draft.type === "CAUSAL_LINK"
        ? `This is the ${cheap ? "cheapest" : "most tractable"} test that can move the Proof Frontier: it targets the first unproven critical link, and everything downstream depends on it.`
        : draft.type === "WTP_EVIDENCE"
          ? "Willingness to pay stays an independent assumption until tested; a strong problem and a working mechanism do not prove anyone pays."
          : draft.type === "ECONOMIC_MAGNITUDE"
            ? "Without the economic magnitude, Value Strength stays INCOMPLETE and the business case cannot be sized."
            : draft.type === "MECHANISM_FEASIBILITY"
              ? "If the mechanism cannot be built, every downstream claim is moot; this is the cheapest way to find out."
              : `Resolves the highest-impact uncertainty currently reachable at ${cheap ? "low" : "moderate"} cost.`;
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

function defaultChange(type: ValueActionType): string {
  switch (type) {
    case "CAUSAL_LINK":
      return "If supported, the Proof Frontier moves one level and Causal Confidence gains a validated link; if contradicted, the value argument breaks here and everything downstream stays a hypothesis.";
    case "WTP_EVIDENCE":
      return "If supported, the commercial ladder moves one rung and the business case gains an evidence-backed price signal; if contradicted, the problem may be real but not worth money to the buyer.";
    case "ECONOMIC_MAGNITUDE":
      return "If measured, Value Strength stops being INCOMPLETE and the verdict can size the business case; if small, the opportunity may not justify a product.";
    case "MECHANISM_FEASIBILITY":
      return "If feasible, the mechanism becomes OBSERVED within the tested scope; if not, the mechanism must change before anything else is tested.";
    case "EVIDENCE_GAP":
      return "Closing the gap raises Evidence Confidence; failing to close it means the problem is weaker than believed.";
    default:
      return "Resolves one open dimension of the value argument without moving the Proof Frontier by itself.";
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
  const icp = input.icpName?.trim() || "target customers";
  const variable = input.variableName?.trim() || "the variable";
  const frontierLabel = PROOF_RUNG_LABELS[input.frontier.frontier];

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
      whatThisCouldChange: `If supported, the highest-importance untested belief becomes evidence-backed; if false: ${collapseText(collapse.kind).replace(/^The /, "the ")}`,
      what: `Validate the ${collapse.kind === "GENERIC" ? "" : `${collapse.kind.toLowerCase()} `}assumption: "${collapse.statement}"`,
      why: `Importance ${collapse.importance}/10 with ${collapse.evidenceCount} linked evidence item${collapse.evidenceCount === 1 ? "" : "s"}. It is the highest-importance untested belief. Current Proof Frontier: ${frontierLabel}.`,
      affects: collapse.linkedTo ?? "The whole opportunity",
      ifFalse: collapseText(collapse.kind),
      evidenceToMove: EVIDENCE_BY_KIND[collapse.kind],
      experiment: EXPERIMENT_BY_KIND[collapse.kind],
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
        whatThisCouldChange: `If supported, the Proof Frontier moves from ${frontierLabel} to ${blocked.label}; if contradicted, the value argument breaks at ${PROOF_RUNG_LABELS[link.from]} → ${PROOF_RUNG_LABELS[link.to]} and the verdict is re-examined.`,
        what: `Test the causal link: "${link.statement}"`,
        why: `${blocked.label} is the first level beyond the Proof Frontier (${frontierLabel}); this link into it is ${link.assessment.status.toLowerCase()} with ${link.assessment.evidence.counts.total} evidence item${link.assessment.evidence.counts.total === 1 ? "" : "s"}.`,
        affects: `${PROOF_RUNG_LABELS[link.from]} → ${PROOF_RUNG_LABELS[link.to]}`,
        ifFalse:
          "The value argument breaks at this link: everything downstream, including the economic value, stays a hypothesis.",
        evidenceToMove: `Evidence that ${link.statement.charAt(0).toLowerCase()}${link.statement.slice(1)} in real conditions, ideally a before/after or with/without comparison; enough to reach the supported threshold (40/100) with no unresolved contradiction.`,
        experiment: `Run a controlled pilot with ${icp}: compare comparable cases with and without ${input.mechanism ?? "the intervention"} and measure ${variable}.`,
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
      const sources = highAdmissibilitySources(claimType)
        .slice(0, 4)
        .map((s) => EVIDENCE_SOURCE_TYPE_LABELS[s].toLowerCase());
      const link =
        fitBlocker.subject === "LINK" ? input.links.find((x) => x.to === blocked.rung) : null;
      actions.push({
        tier: 2,
        impact: 8,
        uncertainty: 8,
        frontier: 9,
        criticality: 7,
        targetLinkId: link?.id,
        type: "EVIDENCE_FITNESS",
        uncertaintyClass: uncertaintyForClaim(claimType),
        whatThisCouldChange: `If fitting evidence supports it, ${blocked.label} becomes evidence-backed and the Proof Frontier can move; the existing evidence stays as context, it never becomes proof by accumulation.`,
        what:
          fitBlocker.kind === "WEAK_DESIGN"
            ? `Get evidence of a stronger design for ${blocked.label}: ${fitBlocker.message.replace(/^[^:]+: /, "")}`
            : `Get evidence that fits ${blocked.label}: ${sources.length ? sources.join(", ") : "a high-admissibility source for this claim"}`,
        why:
          fitBlocker.kind === "NOT_ADMISSIBLE"
            ? `The evidence linked to ${blocked.label} is not admissible for this claim: it exists, but it cannot establish it.`
            : fitBlocker.kind === "WEAK_DESIGN"
              ? `The linked evidence is admissible but its design is too weak to attribute ${blocked.label.toLowerCase()}.`
              : `The best evidence fit for ${blocked.label} is ${fitBlocker.fit ?? 0}/100; the frontier requires ${fitBlocker.requiredFit ?? 40}. More of the same evidence will not help.`,
        affects: blocked.label,
        ifFalse:
          "The claim stays unproven whatever the volume of low-fit evidence; the frontier does not move.",
        evidenceToMove: sources.length
          ? `High-admissibility evidence for this claim: ${sources.join(", ")}.`
          : "Evidence whose source type is admissible for this claim.",
        experiment: link
          ? `Design a test whose result is admissible for "${link.statement}" at the required design level.`
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
    actions.push({
      tier: 4,
      impact: 6,
      uncertainty: 6,
      frontier: 3,
      criticality: 5,
      type: "GENERALIZATION",
      uncertaintyClass: "GENERALIZATION",
      whatThisCouldChange: `If it holds in other contexts, ${frontierState.label} moves from ${GENERALIZATION_LABELS[gen]} towards segment support and the verdict can rely on it for ${icp}; if it does not, the observation stays a case and the target scope narrows.`,
      what:
        question ??
        `Test whether ${frontierState.label.toLowerCase()} holds beyond ${frontierState.summary.scopeText ?? "the observed scope"}`,
      why: `${frontierState.label} is ${GENERALIZATION_LABELS[gen].toLowerCase()} (${frontierState.summary.independentOrigins} independent origin${frontierState.summary.independentOrigins === 1 ? "" : "s"}, scope: ${frontierState.summary.scopeText ?? "not recorded"}). Observed in a sample does not mean proven for the market.`,
      affects: `${frontierState.label} — scope of generalization`,
      ifFalse:
        "The claim holds only in the observed context; the target scope must narrow or the mechanism must adapt.",
      evidenceToMove:
        "The same observation repeated in other organizations and configurations (different systems, sizes or conditions) with the scope recorded.",
      experiment: `Repeat the observation in ${gen === "CASE_ONLY" ? "two more" : "five"} organizations with different configurations and record the scope of each run.`,
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
      ? ladder.rungs
          .map(
            (r) => `${r.label.toLowerCase()} ${r.supported ? "supported" : r.status.toLowerCase()}`,
          )
          .join(" · ")
      : null;
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
        ? `${ladderNext.question.replace(/\?$/, "")} — establish ${ladderNext.label.toLowerCase()} with ${icp}`
        : `Find willingness-to-pay evidence from ${icp}`,
      why: ladderText
        ? `Commercial ladder: ${ladderText}. ${ladder?.highestSupported === "EXISTING_SPEND" ? "Existing spend on an alternative is not willingness to pay for this." : ladder?.highestSupported === "PURCHASE_INTENT" ? "Stated intent is not a stated price, and neither is a purchase." : "No rung of the commercial ladder is evidence-backed yet."}`
        : "No evidence shows anyone paying, or intending to pay, to move this variable.",
      affects: "Commercial ladder → business case",
      ifFalse: "The problem may be real but not worth money to the buyer.",
      evidenceToMove: ladderNext?.evidenceToMove ?? EVIDENCE_BY_KIND.WTP,
      experiment: EXPERIMENT_BY_KIND.WTP,
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
      what: `Quantify the economic magnitude of ${input.painDescription?.trim() || "the problem"}`,
      why: input.valueStrength.missing.includes("magnitude")
        ? "The Magnitude dimension of Value Strength is UNKNOWN, so Value Strength is INCOMPLETE."
        : "No evidence quantifies what the problem costs.",
      affects: "Economic pain and Value Strength (magnitude)",
      ifFalse: "The value may be too small to matter even if the mechanism works.",
      evidenceToMove:
        "Customer statements or records with numbers: money, hours or capacity lost per week or month.",
      experiment:
        "Ask five customers what the last occurrence cost them and collect one month of their own records.",
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
      what: `Establish whether the mechanism is feasible: ${mechanismNode?.statement ?? input.mechanism ?? "the proposed mechanism"}`,
      why: "Nothing shows the required data, integrations or behaviours exist.",
      affects: "Mechanism → Capability",
      ifFalse: "The mechanism must change before anything else is worth testing.",
      evidenceToMove: EVIDENCE_BY_KIND.FEASIBILITY,
      experiment: EXPERIMENT_BY_KIND.FEASIBILITY,
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
      what: input.evidence.gaps[0].replace(/\.$/, ""),
      why: "This gap keeps Evidence Confidence low.",
      affects: "Problem evidence",
      ifFalse: "The problem itself may be weaker than believed.",
      evidenceToMove: "Direct customer evidence that closes the gap.",
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
      what: `Validate the ${VALUE_DIMENSION_LABELS[dim].toLowerCase()} dimension of Value Strength`,
      why: `${VALUE_DIMENSION_LABELS[dim]} is UNKNOWN; Value Strength stays INCOMPLETE until it is validated, never estimated silently.`,
      affects: "Value Strength",
      ifFalse: "Value Strength may be lower than hoped.",
      evidenceToMove: "Customer or operational data that establishes this dimension.",
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
      what: `Strengthen the weakest causal link: "${input.causal.weakest.statement}"`,
      why: `Causal Confidence equals its weakest critical link (${input.causal.weakest.effective}/100).`,
      affects: `${input.causal.weakest.from} → ${input.causal.weakest.to}`,
      ifFalse: "Causal Confidence stays capped by this link.",
      evidenceToMove: "Additional controlled evidence on this link.",
      experiment: EXPERIMENT_BY_KIND.CAUSAL,
    });
  }

  const scored = actions
    .map((d) => scoreAction(d, input.experiments ?? []))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.tier - b.tier);
  return scored.map((a, i) => ({ ...a, priority: i + 1 }));
}

export function primaryValueAction(input: ValueActionInput): ValueAction | null {
  return computeValueActions(input)[0] ?? null;
}
