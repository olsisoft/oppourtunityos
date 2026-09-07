/**
 * Next Best Action, value-engineering edition. Identifies the single most
 * decision-relevant uncertainty in a fixed priority order and explains what
 * must be learned, why, which link it affects, what happens if the hypothesis
 * is false and what evidence would move the Proof Frontier.
 */
import type {
  AssumptionKind,
  AssumptionStatus,
  Criticality,
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

export interface ValueAction {
  priority: number;
  type: ValueActionType;
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

export function computeValueActions(input: ValueActionInput): ValueAction[] {
  const actions: ValueAction[] = [];
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
      priority: 1,
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
        priority: 2,
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
      priority: 3,
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
      priority: 4,
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
      priority: 5,
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
      priority: 6,
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
      priority: 7,
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
      priority: 7,
      type: "SECONDARY",
      what: `Strengthen the weakest causal link: "${input.causal.weakest.statement}"`,
      why: `Causal Confidence equals its weakest critical link (${input.causal.weakest.effective}/100).`,
      affects: `${input.causal.weakest.from} → ${input.causal.weakest.to}`,
      ifFalse: "Causal Confidence stays capped by this link.",
      evidenceToMove: "Additional controlled evidence on this link.",
      experiment: EXPERIMENT_BY_KIND.CAUSAL,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

export function primaryValueAction(input: ValueActionInput): ValueAction | null {
  return computeValueActions(input)[0] ?? null;
}
