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
import type { EvidenceScoreResult } from "@/services/scoring/evidence-score";
import type { CausalConfidenceResult } from "./causal-confidence";
import type { ClaimAssessment } from "./epistemic";
import { PROOF_RUNG_LABELS, type ProofFrontierResult } from "./proof-frontier";
import { VALUE_DIMENSION_LABELS, type ValueStrengthResult } from "./value-strength";

export type ValueActionType =
  | "COLLAPSE_ASSUMPTION"
  | "CAUSAL_LINK"
  | "WTP_EVIDENCE"
  | "ECONOMIC_MAGNITUDE"
  | "MECHANISM_FEASIBILITY"
  | "EVIDENCE_GAP"
  | "SECONDARY";

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

type ActionDraft = Omit<ValueAction, "priority" | "priorityScore" | "scoring" | "whyNow"> & {
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
  return { ...rest, priority: 0, priorityScore, scoring, whyNow };
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
          l.assessment.status !== "PROVEN" &&
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

  // 3. Missing willingness-to-pay evidence.
  const component = (key: string) => input.evidence.components.find((c) => c.key === key);
  const wtpUntested = input.assumptions.some((a) => a.kind === "WTP" && a.status === "UNKNOWN");
  if ((component("purchaseIntent")?.itemCount ?? 0) === 0 || wtpUntested) {
    actions.push({
      tier: 3,
      impact: 8,
      uncertainty: 7,
      frontier: 2,
      criticality: 8,
      targetAssumptionId: input.assumptions.find((a) => a.kind === "WTP" && a.status === "UNKNOWN")
        ?.id,
      type: "WTP_EVIDENCE",
      what: `Find willingness-to-pay evidence from ${icp}`,
      why: "No evidence shows anyone paying, or intending to pay, to move this variable.",
      affects: "Economic value → business case",
      ifFalse: "The problem may be real but not worth money to the buyer.",
      evidenceToMove: EVIDENCE_BY_KIND.WTP,
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
