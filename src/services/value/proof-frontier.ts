/**
 * Proof Frontier — the highest point of the value argument that linked
 * evidence currently supports. Deterministic: computed from claim assessments
 * and causal-link assessments only. Proof must be contiguous: a rung cannot
 * be reached over an unsupported critical link, an unresolved contradiction
 * or a completely untested critical assumption.
 *
 * Downstream economic claims require stronger proof than direct product
 * claims (FRONTIER_THRESHOLDS). The frontier is never a black box: the
 * result names the exact blocker (what, confidence, required threshold).
 */
import type { Criticality, ValueChainLevel } from "@/generated/prisma/enums";
import { isEvidenceBacked, type ClaimAssessment } from "./epistemic";

export const PROOF_RUNGS = [
  "VARIABLE_IMPORTANCE",
  "PAIN",
  "ECONOMIC_PAIN",
  "MECHANISM",
  "CAPABILITY",
  "TRANSFORMATION",
  "OPERATIONAL_VALUE",
  "ECONOMIC_VALUE",
  "STRATEGIC_OUTCOME",
  "BUSINESS_OUTCOME",
] as const;

export type ProofRung = (typeof PROOF_RUNGS)[number];
export type FrontierPosition = ProofRung | "NONE";

export const PROOF_RUNG_LABELS: Record<FrontierPosition, string> = {
  NONE: "Nothing supported yet",
  VARIABLE_IMPORTANCE: "Variable importance",
  PAIN: "Pain",
  ECONOMIC_PAIN: "Economic pain",
  MECHANISM: "Mechanism",
  CAPABILITY: "Capability",
  TRANSFORMATION: "Transformation",
  OPERATIONAL_VALUE: "Operational value",
  ECONOMIC_VALUE: "Economic value",
  STRATEGIC_OUTCOME: "Strategic outcome",
  BUSINESS_OUTCOME: "Business outcome",
};

/**
 * Minimum claim confidence (0–100) required at each rung. Problem and
 * direct product claims need SUPPORTED (40); operational consequences need
 * 50; economic and strategic consequences need 60 — the farther the claim
 * is from the product, the stronger the proof must be.
 */
export const FRONTIER_THRESHOLDS: Record<ProofRung, number> = {
  VARIABLE_IMPORTANCE: 40,
  PAIN: 40,
  ECONOMIC_PAIN: 40,
  MECHANISM: 40,
  CAPABILITY: 40,
  TRANSFORMATION: 50,
  OPERATIONAL_VALUE: 50,
  ECONOMIC_VALUE: 60,
  STRATEGIC_OUTCOME: 60,
  BUSINESS_OUTCOME: 60,
};

const LADDER_RUNGS: ReadonlySet<ProofRung> = new Set<ProofRung>([
  "MECHANISM",
  "CAPABILITY",
  "TRANSFORMATION",
  "OPERATIONAL_VALUE",
  "ECONOMIC_VALUE",
  "STRATEGIC_OUTCOME",
  "BUSINESS_OUTCOME",
]);

export function rungForLevel(level: ValueChainLevel): ProofRung {
  return level as ProofRung;
}

export function isLadderRung(rung: ProofRung): boolean {
  return LADDER_RUNGS.has(rung);
}

export function rungIndex(rung: FrontierPosition): number {
  return rung === "NONE" ? -1 : PROOF_RUNGS.indexOf(rung);
}

export type FrontierMovement = "FORWARD" | "BACKWARD" | "NONE";

export function frontierMovement(
  previous: FrontierPosition | null | undefined,
  next: FrontierPosition | null | undefined,
): FrontierMovement {
  const a = rungIndex(previous ?? "NONE");
  const b = rungIndex(next ?? "NONE");
  return b > a ? "FORWARD" : b < a ? "BACKWARD" : "NONE";
}

export interface FrontierRungInput {
  rung: ProofRung;
  /** null when the claim does not exist (e.g. no ladder node at this level). */
  assessment: ClaimAssessment | null;
}

export interface FrontierLinkInput {
  from: ProofRung;
  to: ProofRung;
  statement: string;
  criticality: Criticality;
  assessment: ClaimAssessment;
}

export type FrontierBlockerKind =
  | "NOT_STATED"
  | "MISSING_LINK"
  | "NO_EVIDENCE"
  | "BELOW_THRESHOLD"
  | "CONTRADICTION"
  | "UNTESTED_ASSUMPTION";

/** A structured reason the frontier stops — never a black box. */
export interface FrontierBlocker {
  kind: FrontierBlockerKind;
  subject: "RUNG" | "LINK";
  /** Rung or "From → To" label. */
  label: string;
  statement?: string;
  confidence?: number;
  required?: number;
  assumption?: string;
  message: string;
}

export interface FrontierLinkState {
  statement: string;
  status: ClaimAssessment["status"];
  confidence: number;
  required: number;
  criticality: Criticality;
  eligible: boolean;
  reasons: string[];
  blockers: FrontierBlocker[];
}

export interface FrontierRungState {
  rung: ProofRung;
  label: string;
  present: boolean;
  status: ClaimAssessment["status"];
  confidence: number;
  required: number;
  eligible: boolean;
  reasons: string[];
  blockers: FrontierBlocker[];
  linkFromPrevious: FrontierLinkState | null;
}

export interface ProofFrontierResult {
  frontier: FrontierPosition;
  frontierLabel: string;
  rungs: FrontierRungState[];
  /** The first rung that could not be reached, with the reasons. */
  blockedAt: {
    rung: ProofRung;
    label: string;
    reasons: string[];
    blockers: FrontierBlocker[];
  } | null;
  /** One sentence: why the frontier stops here. */
  whyStops: string;
  explanation: string[];
}

function assessLink(link: FrontierLinkInput): FrontierLinkState {
  const a = link.assessment;
  const required = FRONTIER_THRESHOLDS[link.to];
  const label = `${PROOF_RUNG_LABELS[link.from]} → ${PROOF_RUNG_LABELS[link.to]}`;
  const blockers: FrontierBlocker[] = [];
  if (a.evidence.counts.total === 0) {
    blockers.push({
      kind: "NO_EVIDENCE",
      subject: "LINK",
      label,
      statement: link.statement,
      confidence: a.confidence,
      required,
      message: `${label}: causal link "${link.statement}" has no linked evidence (${a.status}).`,
    });
  } else if (!isEvidenceBacked(a.status) || a.confidence < required) {
    blockers.push({
      kind: "BELOW_THRESHOLD",
      subject: "LINK",
      label,
      statement: link.statement,
      confidence: a.confidence,
      required,
      message: `${label}: confidence ${a.confidence}, required threshold ${required} (${a.status}).`,
    });
  }
  if (a.unresolvedContradiction) {
    blockers.push({
      kind: "CONTRADICTION",
      subject: "LINK",
      label,
      statement: link.statement,
      confidence: a.confidence,
      required,
      message: `${label}: contradictory evidence blocks advancement.`,
    });
  }
  for (const s of a.untestedCriticalAssumptions) {
    blockers.push({
      kind: "UNTESTED_ASSUMPTION",
      subject: "LINK",
      label,
      statement: link.statement,
      assumption: s,
      message: `${label}: critical causal assumption remains untested: "${s}".`,
    });
  }
  const gating = link.criticality === "CRITICAL";
  const reasons = blockers.map((b) => b.message);
  return {
    statement: link.statement,
    status: a.status,
    confidence: a.confidence,
    required,
    criticality: link.criticality,
    eligible: gating ? blockers.length === 0 : true,
    reasons: gating
      ? reasons
      : reasons.map((r) => `${r} (non-critical link, does not gate the frontier)`),
    blockers: gating ? blockers : [],
  };
}

export function computeProofFrontier(
  rungInputs: FrontierRungInput[],
  links: FrontierLinkInput[],
): ProofFrontierResult {
  const byRung = new Map(rungInputs.map((r) => [r.rung, r.assessment]));
  const states: FrontierRungState[] = [];
  let frontier: FrontierPosition = "NONE";
  let blockedAt: ProofFrontierResult["blockedAt"] = null;
  let previousPresent: ProofRung | null = null;
  let chainBroken = false;

  for (const rung of PROOF_RUNGS) {
    const assessment = byRung.get(rung) ?? null;
    const present = assessment !== null;
    const label = PROOF_RUNG_LABELS[rung];
    const required = FRONTIER_THRESHOLDS[rung];
    const blockers: FrontierBlocker[] = [];

    if (!present) {
      // Business outcome is optional; other missing rungs simply end the ladder.
      const notStated: FrontierBlocker = {
        kind: "NOT_STATED",
        subject: "RUNG",
        label,
        required,
        message:
          rung === "BUSINESS_OUTCOME"
            ? "Optional level, not stated."
            : `${label}: this level of the value argument has not been stated.`,
      };
      states.push({
        rung,
        label,
        present: false,
        status: "UNKNOWN",
        confidence: 0,
        required,
        eligible: false,
        reasons: [notStated.message],
        blockers: [notStated],
        linkFromPrevious: null,
      });
      if (!chainBroken && !blockedAt && rung !== "BUSINESS_OUTCOME") {
        blockedAt = { rung, label, reasons: [notStated.message], blockers: [notStated] };
      }
      chainBroken = true;
      continue;
    }

    let linkState: FrontierLinkState | null = null;
    if (isLadderRung(rung) && previousPresent && isLadderRung(previousPresent)) {
      const link = links.find((l) => l.from === previousPresent && l.to === rung);
      if (link) {
        linkState = assessLink(link);
        if (!linkState.eligible) blockers.push(...linkState.blockers);
      } else {
        blockers.push({
          kind: "MISSING_LINK",
          subject: "LINK",
          label: `${PROOF_RUNG_LABELS[previousPresent]} → ${label}`,
          required,
          message: `No causal link stated from ${PROOF_RUNG_LABELS[previousPresent]} to ${label}.`,
        });
      }
    }

    if (assessment.evidence.counts.total === 0) {
      blockers.push({
        kind: "NO_EVIDENCE",
        subject: "RUNG",
        label,
        confidence: assessment.confidence,
        required,
        message: `${label} has no linked evidence (${assessment.status}).`,
      });
    } else if (!isEvidenceBacked(assessment.status) || assessment.confidence < required) {
      blockers.push({
        kind: "BELOW_THRESHOLD",
        subject: "RUNG",
        label,
        confidence: assessment.confidence,
        required,
        message: `${label}: confidence ${assessment.confidence}, required threshold ${required} (${assessment.status}).`,
      });
    }
    if (assessment.unresolvedContradiction) {
      blockers.push({
        kind: "CONTRADICTION",
        subject: "RUNG",
        label,
        confidence: assessment.confidence,
        required,
        message: `${label}: contradictory evidence blocks advancement.`,
      });
    }
    for (const s of assessment.untestedCriticalAssumptions) {
      blockers.push({
        kind: "UNTESTED_ASSUMPTION",
        subject: "RUNG",
        label,
        assumption: s,
        message: `${label}: critical assumption is completely untested: "${s}".`,
      });
    }

    const reasons = blockers.map((b) => b.message);
    const eligible = !chainBroken && blockers.length === 0;
    states.push({
      rung,
      label,
      present: true,
      status: assessment.status,
      confidence: assessment.confidence,
      required,
      eligible,
      reasons:
        chainBroken && reasons.length === 0
          ? ["Reachable only once the earlier gap is closed."]
          : reasons,
      blockers,
      linkFromPrevious: linkState,
    });

    if (eligible) {
      frontier = rung;
    } else if (!chainBroken) {
      chainBroken = true;
      blockedAt = { rung, label, reasons, blockers };
    }
    previousPresent = rung;
  }

  const whyStops = blockedAt
    ? (blockedAt.blockers[0]?.message ?? blockedAt.reasons[0] ?? "Unknown blocker.")
    : frontier === "NONE"
      ? "No claim is supported by evidence yet."
      : "Every stated level is supported; state the next level to go further.";

  const explanation: string[] = [
    frontier === "NONE"
      ? "No claim is supported by evidence yet. Everything is a hypothesis."
      : `Current Proof Frontier: ${PROOF_RUNG_LABELS[frontier]}. Everything beyond this point remains a product or causal hypothesis.`,
    `Why the frontier stops here: ${whyStops}`,
  ];
  if (blockedAt && blockedAt.blockers.length > 1) {
    for (const b of blockedAt.blockers.slice(1)) explanation.push(`Also: ${b.message}`);
  }

  return {
    frontier,
    frontierLabel: PROOF_RUNG_LABELS[frontier],
    rungs: states,
    blockedAt,
    whyStops,
    explanation,
  };
}
