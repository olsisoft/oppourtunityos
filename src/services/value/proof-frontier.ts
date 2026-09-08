/**
 * Proof Frontier — the highest point of the value argument that linked
 * evidence currently supports. Deterministic: computed from claim assessments
 * and causal-link assessments only. Proof must be contiguous: a rung cannot
 * be reached over an unsupported critical link, a mixed or contradicted
 * claim, or a completely untested critical assumption.
 *
 * Advancement requires appropriate evidence, not evidence quantity:
 *   - at least one admissible, supporting item
 *   - the best fit reaches the rung's fitness threshold
 *   - confidence reaches the rung's confidence threshold
 *   - causal links into value rungs carry evidence of the required design level
 *   - no high-fit contradiction (MIXED) and no contradiction across contexts
 *
 * The frontier has a level AND a scope: what was reached, and where it was
 * observed. The result names the exact blocker — never a black box. Every
 * sentence and label it produces is a SystemMessage (section "frontier" of
 * the dictionaries), so the persisted frontier renders in any locale.
 */
import type {
  Criticality,
  ExperimentDesignLevel,
  GeneralizationStatus,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";
import type { CommercialLadderResult } from "./commercial-ladder";
import { isEvidenceBacked, type ClaimAssessment } from "./epistemic";
import { fitBand, type FitBand } from "./evidence-fit";
import { designAtLeast } from "./experimental-validity";
import type { Scope } from "./scope";

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

/** The rung label as a message ("labels.proofRung.<rung>"). */
export function rungLabel(rung: FrontierPosition): SystemMessage {
  return msg(`labels.proofRung.${rung}`);
}

/** The "From → To" label of a causal link between two rungs. */
export function linkLabel(from: ProofRung, to: ProofRung): SystemMessage {
  return msg("frontier.linkLabel", { from: rungLabel(from), to: rungLabel(to) });
}

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

/** Minimum fitness (0–100) the best supporting item must reach at each rung. */
export const FRONTIER_FIT_THRESHOLDS: Record<ProofRung, number> = {
  VARIABLE_IMPORTANCE: 40,
  PAIN: 40,
  ECONOMIC_PAIN: 40,
  MECHANISM: 40,
  CAPABILITY: 40,
  TRANSFORMATION: 55,
  OPERATIONAL_VALUE: 55,
  ECONOMIC_VALUE: 60,
  STRATEGIC_OUTCOME: 60,
  BUSINESS_OUTCOME: 60,
};

/**
 * Minimum experimental design level required on the causal link INTO each
 * value rung. Mechanism and capability are feasibility claims (no causal
 * design needed); value attribution needs comparative designs.
 */
export const FRONTIER_DESIGN_REQUIRED: Partial<Record<ProofRung, ExperimentDesignLevel>> = {
  TRANSFORMATION: "BEFORE_AFTER",
  OPERATIONAL_VALUE: "BEFORE_AFTER",
  ECONOMIC_VALUE: "MATCHED_COMPARISON",
  STRATEGIC_OUTCOME: "MATCHED_COMPARISON",
  BUSINESS_OUTCOME: "CONTROLLED",
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
  | "NOT_ADMISSIBLE"
  | "LOW_FIT"
  | "BELOW_THRESHOLD"
  | "CONTRADICTION"
  | "WEAK_DESIGN"
  | "SCOPE_MISMATCH"
  | "UNTESTED_ASSUMPTION";

/** A structured reason the frontier stops — never a black box. */
export interface FrontierBlocker {
  kind: FrontierBlockerKind;
  subject: "RUNG" | "LINK";
  /** Rung or "From → To" label. */
  label: SystemMessage;
  statement?: string;
  confidence?: number;
  required?: number;
  fit?: number;
  requiredFit?: number;
  designLevel?: ExperimentDesignLevel | null;
  requiredDesign?: ExperimentDesignLevel;
  assumption?: string;
  message: SystemMessage;
}

/** Fitness and scope summary of a claim, as shown on the frontier. */
export interface FrontierClaimSummary {
  bestFit: number;
  bestBand: FitBand;
  admissible: number;
  total: number;
  lowFitOnly: boolean;
  independentOrigins: number;
  observed: boolean;
  generalization: GeneralizationStatus | null;
  scope: Scope | null;
  scopeText: SystemMessage | null;
  designLevel: ExperimentDesignLevel | null;
  inference: SystemMessage;
  nextGeneralizationQuestion: SystemMessage | null;
  generalizationGap: SystemMessage | null;
}

export interface FrontierLinkState {
  statement: string;
  status: ClaimAssessment["status"];
  confidence: number;
  required: number;
  criticality: Criticality;
  eligible: boolean;
  reasons: SystemMessage[];
  blockers: FrontierBlocker[];
  summary: FrontierClaimSummary;
}

export interface FrontierRungState {
  rung: ProofRung;
  label: SystemMessage;
  present: boolean;
  status: ClaimAssessment["status"];
  confidence: number;
  required: number;
  requiredFit: number;
  eligible: boolean;
  reasons: SystemMessage[];
  blockers: FrontierBlocker[];
  linkFromPrevious: FrontierLinkState | null;
  summary: FrontierClaimSummary | null;
}

export interface FrontierScope {
  /** Scope of the observations at the frontier rung. */
  scope: Scope | null;
  /** Compact description of that scope, or why there is none. */
  text: SystemMessage;
  generalization: GeneralizationStatus | null;
  generalizationLabel: SystemMessage | null;
  observed: boolean;
}

export interface ProofFrontierResult {
  frontier: FrontierPosition;
  frontierLabel: SystemMessage;
  /** Where the frontier holds: the scope of what was observed at that level. */
  frontierScope: FrontierScope;
  rungs: FrontierRungState[];
  /** The first rung that could not be reached, with the reasons. */
  blockedAt: {
    rung: ProofRung;
    label: SystemMessage;
    reasons: SystemMessage[];
    blockers: FrontierBlocker[];
  } | null;
  /** One sentence: why the frontier stops here. */
  whyStops: SystemMessage;
  explanation: SystemMessage[];
  /** The commercial ladder, attached by the recompute (each rung its own claim). */
  commercial?: CommercialLadderResult;
}

export function summarizeClaim(a: ClaimAssessment): FrontierClaimSummary {
  return {
    bestFit: a.fitness.best,
    bestBand: a.fitness.bestBand,
    admissible: a.fitness.admissible,
    total: a.fitness.total,
    lowFitOnly: a.fitness.lowFitOnly,
    independentOrigins: a.fitness.independentOrigins,
    observed: a.observed,
    generalization: a.generalization?.status ?? null,
    scope: a.observedScope,
    scopeText: a.observedScopeText,
    designLevel: a.designLevel,
    inference: a.inference,
    nextGeneralizationQuestion: a.generalization?.nextQuestion ?? null,
    generalizationGap: a.generalization?.gap ?? null,
  };
}

/** Blockers shared by rungs and links: evidence, admissibility, fit, threshold, contradiction, scope. */
function claimBlockers(
  a: ClaimAssessment,
  subject: "RUNG" | "LINK",
  label: SystemMessage,
  rung: ProofRung,
  statement?: string,
): FrontierBlocker[] {
  const blockers: FrontierBlocker[] = [];
  const required = FRONTIER_THRESHOLDS[rung];
  const requiredFit = FRONTIER_FIT_THRESHOLDS[rung];
  const isLink = subject === "LINK";
  // Link sentences quote the statement; rung sentences do not.
  const variant = isLink ? "link" : "rung";
  const named = isLink ? { label, statement } : { label };
  const base = { subject, label, statement, confidence: a.confidence, required };
  if (a.fitness.total === 0) {
    blockers.push({
      ...base,
      kind: "NO_EVIDENCE",
      message: msg(`frontier.blocker.noEvidence.${variant}`, { ...named, status: a.status }),
    });
    return blockers;
  }
  if (a.fitness.admissible === 0) {
    blockers.push({
      ...base,
      kind: "NOT_ADMISSIBLE",
      fit: 0,
      requiredFit,
      message: msg(`frontier.blocker.notAdmissible.${variant}`, {
        ...named,
        count: a.fitness.total,
      }),
    });
    return blockers;
  }
  if (a.status === "CONTRADICTED") {
    blockers.push({
      ...base,
      kind: "CONTRADICTION",
      message: msg("frontier.blocker.contradicted", { label }),
    });
  } else if (a.status === "MIXED" || a.unresolvedContradiction) {
    blockers.push({
      ...base,
      kind: "CONTRADICTION",
      message: msg("frontier.blocker.mixed", { label }),
    });
  }
  if (a.fitness.best < requiredFit) {
    blockers.push({
      ...base,
      kind: "LOW_FIT",
      fit: a.fitness.best,
      requiredFit,
      message: msg(
        a.fitness.lowFitOnly
          ? `frontier.blocker.lowFitOnly.${variant}`
          : `frontier.blocker.lowFit.${variant}`,
        { ...named, fit: a.fitness.best, requiredFit },
      ),
    });
  } else if (
    (!isEvidenceBacked(a.status) || a.confidence < required) &&
    a.status !== "CONTRADICTED" &&
    a.status !== "MIXED"
  ) {
    blockers.push({
      ...base,
      kind: "BELOW_THRESHOLD",
      fit: a.fitness.best,
      requiredFit,
      message: msg("frontier.blocker.belowThreshold", {
        label,
        confidence: a.confidence,
        required,
        status: a.status,
      }),
    });
  }
  const gen = a.generalization?.status ?? null;
  if (gen === "CONTRADICTED_ACROSS_CONTEXTS") {
    blockers.push({
      ...base,
      kind: "SCOPE_MISMATCH",
      message: msg("frontier.blocker.contradictedAcrossContexts", { label }),
    });
  } else if (gen === "BROADER_HYPOTHESIS") {
    blockers.push({
      ...base,
      kind: "SCOPE_MISMATCH",
      message: msg("frontier.blocker.broaderHypothesis", {
        label,
        scope: a.observedScopeText ?? msg("frontier.blocker.differentScope"),
      }),
    });
  }
  for (const s of a.untestedCriticalAssumptions) {
    blockers.push({
      ...base,
      kind: "UNTESTED_ASSUMPTION",
      assumption: s,
      message: msg(`frontier.blocker.untestedAssumption.${variant}`, { label, assumption: s }),
    });
  }
  return blockers;
}

function assessLink(link: FrontierLinkInput): FrontierLinkState {
  const a = link.assessment;
  const required = FRONTIER_THRESHOLDS[link.to];
  const label = linkLabel(link.from, link.to);
  const blockers = claimBlockers(a, "LINK", label, link.to, link.statement);
  const requiredDesign = FRONTIER_DESIGN_REQUIRED[link.to];
  if (
    requiredDesign &&
    a.fitness.admissible > 0 &&
    !blockers.some((b) => b.kind === "NO_EVIDENCE" || b.kind === "NOT_ADMISSIBLE") &&
    !designAtLeast(a.designLevel, requiredDesign)
  ) {
    blockers.push({
      kind: "WEAK_DESIGN",
      subject: "LINK",
      label,
      statement: link.statement,
      confidence: a.confidence,
      required,
      designLevel: a.designLevel,
      requiredDesign,
      message: msg("frontier.blocker.weakDesign", {
        label,
        hasDesign: a.designLevel !== null,
        design: msg(`frontier.design.${a.designLevel ?? "none"}`),
        rung: msg(`frontier.rung.inSentence.${link.to}`),
        requiredDesign: msg(`frontier.design.${requiredDesign}`),
      }),
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
      : reasons.map((reason) => msg("frontier.blocker.nonCritical", { reason })),
    blockers: gating ? blockers : [],
    summary: summarizeClaim(a),
  };
}

export function computeProofFrontier(
  rungInputs: FrontierRungInput[],
  links: FrontierLinkInput[],
): ProofFrontierResult {
  const byRung = new Map(rungInputs.map((r) => [r.rung, r.assessment]));
  const states: FrontierRungState[] = [];
  let frontier: FrontierPosition = "NONE";
  let frontierAssessment: ClaimAssessment | null = null;
  let blockedAt: ProofFrontierResult["blockedAt"] = null;
  let previousPresent: ProofRung | null = null;
  let chainBroken = false;

  for (const rung of PROOF_RUNGS) {
    const assessment = byRung.get(rung) ?? null;
    const present = assessment !== null;
    const label = rungLabel(rung);
    const required = FRONTIER_THRESHOLDS[rung];
    const requiredFit = FRONTIER_FIT_THRESHOLDS[rung];
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
            ? msg("frontier.blocker.optionalNotStated")
            : msg("frontier.blocker.notStated", { label }),
      };
      states.push({
        rung,
        label,
        present: false,
        status: "UNKNOWN",
        confidence: 0,
        required,
        requiredFit,
        eligible: false,
        reasons: [notStated.message],
        blockers: [notStated],
        linkFromPrevious: null,
        summary: null,
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
          label: linkLabel(previousPresent, rung),
          required,
          message: msg("frontier.blocker.missingLink", {
            from: rungLabel(previousPresent),
            to: label,
          }),
        });
      }
    }

    blockers.push(...claimBlockers(assessment, "RUNG", label, rung));

    const reasons = blockers.map((b) => b.message);
    const eligible = !chainBroken && blockers.length === 0;
    states.push({
      rung,
      label,
      present: true,
      status: assessment.status,
      confidence: assessment.confidence,
      required,
      requiredFit,
      eligible,
      reasons:
        chainBroken && reasons.length === 0 ? [msg("frontier.blocker.reachableLater")] : reasons,
      blockers,
      linkFromPrevious: linkState,
      summary: summarizeClaim(assessment),
    });

    if (eligible) {
      frontier = rung;
      frontierAssessment = assessment;
    } else if (!chainBroken) {
      chainBroken = true;
      blockedAt = { rung, label, reasons, blockers };
    }
    previousPresent = rung;
  }

  const whyStops = blockedAt
    ? (blockedAt.blockers[0]?.message ?? blockedAt.reasons[0] ?? msg("frontier.blocker.unknown"))
    : frontier === "NONE"
      ? msg("frontier.whyStops.none")
      : msg("frontier.whyStops.complete");

  const gen = frontierAssessment?.generalization?.status ?? null;
  const frontierScope: FrontierScope = {
    scope: frontierAssessment?.observedScope ?? null,
    text:
      frontier === "NONE"
        ? msg("frontier.frontierScope.none")
        : (frontierAssessment?.observedScopeText ??
          (frontierAssessment?.observed
            ? msg("frontier.scope.notRecorded")
            : msg("frontier.frontierScope.reported"))),
    generalization: gen,
    generalizationLabel: gen ? msg(`labels.generalization.${gen}`) : null,
    observed: frontierAssessment?.observed ?? false,
  };

  const explanation: SystemMessage[] = [
    frontier === "NONE"
      ? msg("frontier.explanation.none")
      : msg("frontier.explanation.current", {
          level: rungLabel(frontier),
          scope: frontierScope.text,
          hasGeneralization: gen !== null,
          ...(gen ? { generalization: msg(`labels.generalization.${gen}`) } : {}),
        }),
    msg("frontier.explanation.whyStops", { reason: whyStops }),
  ];
  if (blockedAt && blockedAt.blockers.length > 1) {
    for (const b of blockedAt.blockers.slice(1))
      explanation.push(msg("frontier.explanation.also", { reason: b.message }));
  }

  return {
    frontier,
    frontierLabel: rungLabel(frontier),
    frontierScope,
    rungs: states,
    blockedAt,
    whyStops,
    explanation,
  };
}

/** Fit band of the best supporting item of a rung (for UI). */
export function rungFitBand(state: FrontierRungState): FitBand {
  return state.summary ? fitBand(state.summary.bestFit) : "NONE";
}
