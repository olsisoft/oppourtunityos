/**
 * Proof Frontier — the highest point of the value argument that linked
 * evidence currently supports. Deterministic: computed from claim assessments
 * and causal-link assessments only. Proof must be contiguous: a rung cannot
 * be reached over an unsupported critical link, an unresolved contradiction
 * or a completely untested critical assumption.
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

export interface FrontierLinkState {
  statement: string;
  status: ClaimAssessment["status"];
  confidence: number;
  criticality: Criticality;
  eligible: boolean;
  reasons: string[];
}

export interface FrontierRungState {
  rung: ProofRung;
  label: string;
  present: boolean;
  status: ClaimAssessment["status"];
  confidence: number;
  eligible: boolean;
  reasons: string[];
  linkFromPrevious: FrontierLinkState | null;
}

export interface ProofFrontierResult {
  frontier: FrontierPosition;
  frontierLabel: string;
  rungs: FrontierRungState[];
  /** The first rung that could not be reached, with the reasons. */
  blockedAt: { rung: ProofRung; label: string; reasons: string[] } | null;
  explanation: string[];
}

function assessLink(link: FrontierLinkInput): FrontierLinkState {
  const reasons: string[] = [];
  const a = link.assessment;
  if (!isEvidenceBacked(a.status)) {
    reasons.push(
      a.evidence.counts.total === 0
        ? `Causal link "${link.statement}" has no linked evidence (${a.status}).`
        : `Causal link "${link.statement}" is ${a.status} (confidence ${a.confidence}/100, below ${a.status === "UNPROVEN" ? "the supported threshold" : "threshold"}).`,
    );
  }
  if (a.unresolvedContradiction) {
    reasons.push(`Causal link "${link.statement}" has unresolved contradictory evidence.`);
  }
  for (const s of a.untestedCriticalAssumptions) {
    reasons.push(`Critical assumption on this link is untested: "${s}".`);
  }
  const gating = link.criticality === "CRITICAL";
  return {
    statement: link.statement,
    status: a.status,
    confidence: a.confidence,
    criticality: link.criticality,
    eligible: gating ? reasons.length === 0 : true,
    reasons: gating
      ? reasons
      : reasons.map((r) => `${r} (non-critical link, does not gate the frontier)`),
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
    const reasons: string[] = [];

    if (!present) {
      // Business outcome is optional; other missing rungs simply end the ladder.
      states.push({
        rung,
        label: PROOF_RUNG_LABELS[rung],
        present: false,
        status: "UNKNOWN",
        confidence: 0,
        eligible: false,
        reasons:
          rung === "BUSINESS_OUTCOME" ? ["Optional level, not stated."] : ["Not stated yet."],
        linkFromPrevious: null,
      });
      if (!chainBroken && !blockedAt && rung !== "BUSINESS_OUTCOME") {
        blockedAt = {
          rung,
          label: PROOF_RUNG_LABELS[rung],
          reasons: ["This level of the value argument has not been stated."],
        };
      }
      chainBroken = true;
      continue;
    }

    let linkState: FrontierLinkState | null = null;
    if (isLadderRung(rung) && previousPresent && isLadderRung(previousPresent)) {
      const link = links.find((l) => l.from === previousPresent && l.to === rung);
      if (link) {
        linkState = assessLink(link);
        if (!linkState.eligible) reasons.push(...linkState.reasons);
      } else {
        reasons.push(
          `No causal link stated from ${PROOF_RUNG_LABELS[previousPresent]} to ${PROOF_RUNG_LABELS[rung]}.`,
        );
      }
    }

    if (!isEvidenceBacked(assessment.status)) {
      reasons.push(
        assessment.evidence.counts.total === 0
          ? `${PROOF_RUNG_LABELS[rung]} has no linked evidence (${assessment.status}).`
          : `${PROOF_RUNG_LABELS[rung]} is ${assessment.status} (confidence ${assessment.confidence}/100).`,
      );
    }
    if (assessment.unresolvedContradiction) {
      reasons.push(`${PROOF_RUNG_LABELS[rung]} has unresolved contradictory evidence.`);
    }
    for (const s of assessment.untestedCriticalAssumptions) {
      reasons.push(`Critical assumption is completely untested: "${s}".`);
    }

    const eligible = !chainBroken && reasons.length === 0;
    states.push({
      rung,
      label: PROOF_RUNG_LABELS[rung],
      present: true,
      status: assessment.status,
      confidence: assessment.confidence,
      eligible,
      reasons:
        chainBroken && reasons.length === 0
          ? ["Reachable only once the earlier gap is closed."]
          : reasons,
      linkFromPrevious: linkState,
    });

    if (eligible) {
      frontier = rung;
    } else if (!chainBroken) {
      chainBroken = true;
      blockedAt = { rung, label: PROOF_RUNG_LABELS[rung], reasons };
    }
    previousPresent = rung;
  }

  const explanation: string[] = [
    frontier === "NONE"
      ? "No claim is supported by evidence yet. Everything is a hypothesis."
      : `Current Proof Frontier: ${PROOF_RUNG_LABELS[frontier]}. Everything beyond this point remains a product or causal hypothesis.`,
  ];
  if (blockedAt) {
    explanation.push(`Blocked at ${blockedAt.label}: ${blockedAt.reasons[0]}`);
  }

  return {
    frontier,
    frontierLabel: PROOF_RUNG_LABELS[frontier],
    rungs: states,
    blockedAt,
    explanation,
  };
}
