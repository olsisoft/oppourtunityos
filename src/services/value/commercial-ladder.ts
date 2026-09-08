/**
 * The commercial ladder: EXISTING_SPEND → PURCHASE_INTENT → WILLINGNESS_TO_PAY
 * → PRICE_ACCEPTANCE → ACTUAL_PURCHASE. Each rung is a separate claim with its
 * own evidence; support for one rung never moves the rungs above it. "Owners
 * already pay an accountant" is evidence of existing spend — nothing more.
 *
 * Every sentence (question, evidence that would move the rung, explanation)
 * is a SystemMessage; the templates live in the "frontier.commercial" section.
 */
import type { ClaimType, EpistemicStatus } from "@/generated/prisma/enums";
import { msg, type SystemMessage } from "@/i18n/messages";
import { claimStatement, COMMERCIAL_LADDER } from "./claim-taxonomy";
import { isEvidenceBacked, type ClaimAssessment } from "./epistemic";

export const COMMERCIAL_RUNG_LABELS: Record<string, string> = {
  EXISTING_SPEND: "Existing spend",
  PURCHASE_INTENT: "Purchase intent",
  WILLINGNESS_TO_PAY: "Stated willingness to pay",
  PRICE_ACCEPTANCE: "Price acceptance",
  ACTUAL_PURCHASE: "Actual purchase",
};

export interface CommercialRung {
  claimType: ClaimType;
  label: SystemMessage;
  statement: SystemMessage;
  status: EpistemicStatus;
  confidence: number;
  bestFit: number;
  evidenceCount: number;
  supported: boolean;
  question: SystemMessage;
  evidenceToMove: SystemMessage;
}

export interface CommercialLadderResult {
  rungs: CommercialRung[];
  /** Highest rung with evidence-backed status (rungs above are separate claims). */
  highestSupported: ClaimType | null;
  /** First rung that is not supported: the next commercial question. */
  next: CommercialRung | null;
  supportedCount: number;
  explanation: SystemMessage[];
}

export function computeCommercialLadder(
  assessments: Partial<Record<ClaimType, ClaimAssessment>>,
): CommercialLadderResult {
  const rungs: CommercialRung[] = COMMERCIAL_LADDER.map((claimType) => {
    const a = assessments[claimType];
    return {
      claimType,
      label: msg(`labels.commercialRung.${claimType}`),
      statement: claimStatement(claimType),
      status: a?.status ?? "HYPOTHESIS",
      confidence: a?.confidence ?? 0,
      bestFit: a?.fitness.best ?? 0,
      evidenceCount: a?.fitness.admissible ?? 0,
      supported: a ? isEvidenceBacked(a.status) : false,
      question: msg(`frontier.commercial.question.${claimType}`),
      evidenceToMove: msg(`frontier.commercial.evidence.${claimType}`),
    };
  });
  const supportedRungs = rungs.filter((r) => r.supported);
  const highestSupported = supportedRungs.length
    ? supportedRungs[supportedRungs.length - 1].claimType
    : null;
  const next = rungs.find((r) => !r.supported) ?? null;
  return {
    rungs,
    highestSupported,
    next,
    supportedCount: supportedRungs.length,
    explanation: [
      ...rungs.map((r) =>
        msg("frontier.commercial.rungLine", {
          label: r.label,
          status: r.status,
          count: r.evidenceCount,
          fit: r.bestFit,
        }),
      ),
      msg("frontier.commercial.principle"),
    ],
  };
}
