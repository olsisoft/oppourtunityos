/**
 * The commercial ladder: EXISTING_SPEND → PURCHASE_INTENT → WILLINGNESS_TO_PAY
 * → PRICE_ACCEPTANCE → ACTUAL_PURCHASE. Each rung is a separate claim with its
 * own evidence; support for one rung never moves the rungs above it. "Owners
 * already pay an accountant" is evidence of existing spend — nothing more.
 */
import type { ClaimType, EpistemicStatus } from "@/generated/prisma/enums";
import { COMMERCIAL_LADDER, CLAIM_STATEMENTS } from "./claim-taxonomy";
import { isEvidenceBacked, type ClaimAssessment } from "./epistemic";

export const COMMERCIAL_RUNG_LABELS: Record<string, string> = {
  EXISTING_SPEND: "Existing spend",
  PURCHASE_INTENT: "Purchase intent",
  WILLINGNESS_TO_PAY: "Stated willingness to pay",
  PRICE_ACCEPTANCE: "Price acceptance",
  ACTUAL_PURCHASE: "Actual purchase",
};

const RUNG_QUESTIONS: Record<string, string> = {
  EXISTING_SPEND:
    "What do target buyers already spend to deal with this (accountants, tools, staff time)?",
  PURCHASE_INTENT: "Do target buyers say they would buy something that removes this?",
  WILLINGNESS_TO_PAY: "How much do target buyers say they would pay, and for what?",
  PRICE_ACCEPTANCE:
    "Do target buyers accept a stated price when it is actually put in front of them?",
  ACTUAL_PURCHASE: "Has anyone paid real money — a paid pilot, a subscription, a signed contract?",
};

const RUNG_EVIDENCE: Record<string, string> = {
  EXISTING_SPEND:
    "Invoices, financial records or statements of what is paid today for partial solutions.",
  PURCHASE_INTENT: "Interviews, sales conversations, waitlist sign-ups or letters of intent.",
  WILLINGNESS_TO_PAY:
    "Pricing experiments or paid pilots; stated amounts from interviews count as medium evidence.",
  PRICE_ACCEPTANCE: "A pricing test or paid pilot at the intended price.",
  ACTUAL_PURCHASE:
    "Transactions, contracts, invoices or subscription purchases — never statements.",
};

export interface CommercialRung {
  claimType: ClaimType;
  label: string;
  statement: string;
  status: EpistemicStatus;
  confidence: number;
  bestFit: number;
  evidenceCount: number;
  supported: boolean;
  question: string;
  evidenceToMove: string;
}

export interface CommercialLadderResult {
  rungs: CommercialRung[];
  /** Highest rung with evidence-backed status (rungs above are separate claims). */
  highestSupported: ClaimType | null;
  /** First rung that is not supported: the next commercial question. */
  next: CommercialRung | null;
  supportedCount: number;
  explanation: string[];
}

export function computeCommercialLadder(
  assessments: Partial<Record<ClaimType, ClaimAssessment>>,
): CommercialLadderResult {
  const rungs: CommercialRung[] = COMMERCIAL_LADDER.map((claimType) => {
    const a = assessments[claimType];
    return {
      claimType,
      label: COMMERCIAL_RUNG_LABELS[claimType],
      statement: CLAIM_STATEMENTS[claimType],
      status: a?.status ?? "HYPOTHESIS",
      confidence: a?.confidence ?? 0,
      bestFit: a?.fitness.best ?? 0,
      evidenceCount: a?.fitness.admissible ?? 0,
      supported: a ? isEvidenceBacked(a.status) : false,
      question: RUNG_QUESTIONS[claimType],
      evidenceToMove: RUNG_EVIDENCE[claimType],
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
      ...rungs.map(
        (r) =>
          `${r.label}: ${r.status}${r.evidenceCount ? ` (${r.evidenceCount} admissible item${r.evidenceCount === 1 ? "" : "s"}, best fit ${r.bestFit})` : ""}`,
      ),
      "Each rung is its own claim: existing spend is not willingness to pay; stated willingness is not a purchase.",
    ],
  };
}
