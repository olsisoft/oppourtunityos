/**
 * Knowledge change — what a recompute changed, and how much. Pure diff of two
 * snapshots of an opportunity's epistemic state; the persisted record is the
 * audit trail of how the workspace came to believe what it believes.
 */
import type { EpistemicStatus, GeneralizationStatus, Verdict } from "@/generated/prisma/enums";
import { EPISTEMIC_LABELS } from "@/domain/enums";
import { EPISTEMIC_RANK, isEvidenceBacked } from "./epistemic";
import { GENERALIZATION_LABELS } from "./language-gate";
import {
  frontierMovement,
  PROOF_RUNG_LABELS,
  type FrontierMovement,
  type FrontierPosition,
} from "./proof-frontier";

export interface KnowledgeClaim {
  /** Stable key, e.g. "rung:PAIN", "node:CAPABILITY", "link:MECHANISM->CAPABILITY". */
  key: string;
  label: string;
  status: EpistemicStatus;
  confidence: number;
  /** Scope in which the claim was observed (OBSERVED), if any. */
  scope?: string | null;
  generalization?: GeneralizationStatus | null;
}

export interface KnowledgeSnapshot {
  frontier: FrontierPosition;
  evidenceConfidence: number;
  valueStrength: number | null;
  valueCompleteness: string;
  causalConfidence: number | null;
  causalCompleteness: string;
  verdict: Verdict;
  claims: KnowledgeClaim[];
}

export interface ClaimDelta {
  key: string;
  label: string;
  before: {
    status: EpistemicStatus;
    confidence: number;
    generalization?: GeneralizationStatus | null;
  };
  after: {
    status: EpistemicStatus;
    confidence: number;
    scope?: string | null;
    generalization?: GeneralizationStatus | null;
  };
  text: string;
}

export interface KnowledgeDiff {
  changed: boolean;
  frontierMovement: FrontierMovement;
  strengthened: ClaimDelta[];
  weakened: ClaimDelta[];
  contradicted: ClaimDelta[];
  summary: string;
  lines: string[];
}

const STATUS_RANK = EPISTEMIC_RANK;

function fmt(status: EpistemicStatus, confidence: number): string {
  const label = (EPISTEMIC_LABELS as Record<string, string>)[status] ?? status;
  return `${label}${isEvidenceBacked(status) || confidence > 0 ? ` ${confidence}` : ""}`;
}

function scoreText(n: number | null, completeness?: string): string {
  return n === null ? `INCOMPLETE${completeness ? ` · ${completeness}` : ""}` : String(n);
}

export function diffKnowledge(before: KnowledgeSnapshot, after: KnowledgeSnapshot): KnowledgeDiff {
  const strengthened: ClaimDelta[] = [];
  const weakened: ClaimDelta[] = [];
  const contradicted: ClaimDelta[] = [];
  const beforeByKey = new Map(before.claims.map((c) => [c.key, c]));

  for (const claim of after.claims) {
    const prev = beforeByKey.get(claim.key);
    const b: Pick<KnowledgeClaim, "status" | "confidence" | "generalization"> = prev ?? {
      status: "UNKNOWN",
      confidence: 0,
      generalization: null,
    };
    const genChanged = (b.generalization ?? null) !== (claim.generalization ?? null);
    if (b.status === claim.status && b.confidence === claim.confidence && !genChanged) continue;
    const scopeText =
      claim.status === "OBSERVED" && claim.scope ? ` (in tested scope: ${claim.scope})` : "";
    const genText =
      genChanged && claim.generalization
        ? ` · generalization ${b.generalization ? GENERALIZATION_LABELS[b.generalization] : "—"} → ${GENERALIZATION_LABELS[claim.generalization]}`
        : "";
    const delta: ClaimDelta = {
      key: claim.key,
      label: claim.label,
      before: {
        status: b.status,
        confidence: b.confidence,
        generalization: b.generalization ?? null,
      },
      after: {
        status: claim.status,
        confidence: claim.confidence,
        scope: claim.scope ?? null,
        generalization: claim.generalization ?? null,
      },
      text: `${claim.label}: ${fmt(b.status, b.confidence)} → ${fmt(claim.status, claim.confidence)}${scopeText}${genText}`,
    };
    if (claim.status === "CONTRADICTED" && b.status !== "CONTRADICTED") contradicted.push(delta);
    else if (
      STATUS_RANK[claim.status] > STATUS_RANK[b.status] ||
      (STATUS_RANK[claim.status] === STATUS_RANK[b.status] && claim.confidence > b.confidence)
    )
      strengthened.push(delta);
    else weakened.push(delta);
  }

  const movement = frontierMovement(before.frontier, after.frontier);
  const lines: string[] = [];
  if (movement !== "NONE") {
    lines.push(
      `Proof Frontier ${movement === "FORWARD" ? "moved forward" : "moved back"}: ${PROOF_RUNG_LABELS[before.frontier]} → ${PROOF_RUNG_LABELS[after.frontier]}`,
    );
  }
  if (before.evidenceConfidence !== after.evidenceConfidence)
    lines.push(`Evidence Confidence ${before.evidenceConfidence} → ${after.evidenceConfidence}`);
  if (
    before.valueStrength !== after.valueStrength ||
    before.valueCompleteness !== after.valueCompleteness
  )
    lines.push(
      `Value Strength ${scoreText(before.valueStrength, before.valueCompleteness)} → ${scoreText(after.valueStrength, after.valueCompleteness)}`,
    );
  if (
    before.causalConfidence !== after.causalConfidence ||
    before.causalCompleteness !== after.causalCompleteness
  )
    lines.push(
      `Causal Confidence ${scoreText(before.causalConfidence, before.causalCompleteness)} → ${scoreText(after.causalConfidence, after.causalCompleteness)}`,
    );
  if (before.verdict !== after.verdict) lines.push(`Verdict ${before.verdict} → ${after.verdict}`);
  for (const d of [...contradicted, ...strengthened, ...weakened]) lines.push(d.text);

  const changed = lines.length > 0;
  const summary = !changed
    ? "Nothing changed."
    : movement !== "NONE"
      ? lines[0]
      : contradicted.length
        ? `${contradicted.length} claim${contradicted.length === 1 ? "" : "s"} contradicted: ${contradicted[0].label}`
        : strengthened.length
          ? `${strengthened[0].text}`
          : weakened.length
            ? `${weakened[0].text}`
            : lines[0];

  return {
    changed,
    frontierMovement: movement,
    strengthened,
    weakened,
    contradicted,
    summary,
    lines,
  };
}
