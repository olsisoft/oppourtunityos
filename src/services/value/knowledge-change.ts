/**
 * Knowledge change — what a recompute changed, and how much. Pure diff of two
 * snapshots of an opportunity's epistemic state; the persisted record is the
 * audit trail of how the workspace came to believe what it believes.
 */
import type { EpistemicStatus, GeneralizationStatus, Verdict } from "@/generated/prisma/enums";
import { msg, type LocalizedText, type MessageParam, type SystemMessage } from "@/i18n/messages";
import { EPISTEMIC_RANK, isEvidenceBacked } from "./epistemic";
import { frontierMovement, type FrontierMovement, type FrontierPosition } from "./proof-frontier";

export interface KnowledgeClaim {
  /** Stable key, e.g. "rung:PAIN", "node:CAPABILITY", "link:MECHANISM->CAPABILITY". */
  key: string;
  label: LocalizedText;
  status: EpistemicStatus;
  confidence: number;
  /** Scope in which the claim was observed (OBSERVED), if any. */
  scope?: LocalizedText | null;
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
  label: LocalizedText;
  before: {
    status: EpistemicStatus;
    confidence: number;
    generalization?: GeneralizationStatus | null;
  };
  after: {
    status: EpistemicStatus;
    confidence: number;
    scope?: LocalizedText | null;
    generalization?: GeneralizationStatus | null;
  };
  text: SystemMessage;
}

export interface KnowledgeDiff {
  changed: boolean;
  frontierMovement: FrontierMovement;
  strengthened: ClaimDelta[];
  weakened: ClaimDelta[];
  contradicted: ClaimDelta[];
  summary: SystemMessage;
  lines: SystemMessage[];
}

const STATUS_RANK = EPISTEMIC_RANK;

/** "SUPPORTED 64", "HYPOTHESIS" — tolerates legacy statuses (e.g. "PROVEN") kept as plain text. */
function fmt(status: EpistemicStatus, confidence: number): SystemMessage {
  const label: MessageParam =
    status in STATUS_RANK ? msg(`labels.epistemic.${status}`) : (status as string);
  return isEvidenceBacked(status) || confidence > 0
    ? msg("nextAction.knowledge.state.withConfidence", { status: label, confidence })
    : msg("nextAction.knowledge.state.statusOnly", { status: label });
}

function scoreText(n: number | null, completeness?: string): MessageParam {
  if (n !== null) return n;
  return completeness
    ? msg("nextAction.knowledge.score.incomplete", { completeness })
    : msg("nextAction.knowledge.score.incompleteBare");
}

function generalizationLabel(status: GeneralizationStatus | null | undefined): SystemMessage {
  return status
    ? msg(`labels.generalization.${status}`)
    : msg("nextAction.fallback.generalizationNone");
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
    const scope = claim.status === "OBSERVED" && claim.scope ? claim.scope : null;
    const withGeneralization = genChanged && Boolean(claim.generalization);
    const text =
      scope && withGeneralization
        ? msg("nextAction.knowledge.delta.scopedGeneralized", {
            label: claim.label,
            before: fmt(b.status, b.confidence),
            after: fmt(claim.status, claim.confidence),
            scope,
            genBefore: generalizationLabel(b.generalization),
            genAfter: generalizationLabel(claim.generalization),
          })
        : scope
          ? msg("nextAction.knowledge.delta.scoped", {
              label: claim.label,
              before: fmt(b.status, b.confidence),
              after: fmt(claim.status, claim.confidence),
              scope,
            })
          : withGeneralization
            ? msg("nextAction.knowledge.delta.generalized", {
                label: claim.label,
                before: fmt(b.status, b.confidence),
                after: fmt(claim.status, claim.confidence),
                genBefore: generalizationLabel(b.generalization),
                genAfter: generalizationLabel(claim.generalization),
              })
            : msg("nextAction.knowledge.delta.plain", {
                label: claim.label,
                before: fmt(b.status, b.confidence),
                after: fmt(claim.status, claim.confidence),
              });
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
      text,
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
  const lines: SystemMessage[] = [];
  if (movement !== "NONE") {
    lines.push(
      msg(
        movement === "FORWARD"
          ? "nextAction.knowledge.frontier.forward"
          : "nextAction.knowledge.frontier.backward",
        {
          before: msg(`labels.proofRung.${before.frontier}`),
          after: msg(`labels.proofRung.${after.frontier}`),
        },
      ),
    );
  }
  if (before.evidenceConfidence !== after.evidenceConfidence)
    lines.push(
      msg("nextAction.knowledge.line.evidenceConfidence", {
        before: before.evidenceConfidence,
        after: after.evidenceConfidence,
      }),
    );
  if (
    before.valueStrength !== after.valueStrength ||
    before.valueCompleteness !== after.valueCompleteness
  )
    lines.push(
      msg("nextAction.knowledge.line.valueStrength", {
        before: scoreText(before.valueStrength, before.valueCompleteness),
        after: scoreText(after.valueStrength, after.valueCompleteness),
      }),
    );
  if (
    before.causalConfidence !== after.causalConfidence ||
    before.causalCompleteness !== after.causalCompleteness
  )
    lines.push(
      msg("nextAction.knowledge.line.causalConfidence", {
        before: scoreText(before.causalConfidence, before.causalCompleteness),
        after: scoreText(after.causalConfidence, after.causalCompleteness),
      }),
    );
  if (before.verdict !== after.verdict)
    lines.push(
      msg("nextAction.knowledge.line.verdict", { before: before.verdict, after: after.verdict }),
    );
  for (const d of [...contradicted, ...strengthened, ...weakened]) lines.push(d.text);

  const changed = lines.length > 0;
  const summary = !changed
    ? msg("nextAction.knowledge.summary.nothing")
    : movement !== "NONE"
      ? lines[0]
      : contradicted.length
        ? msg("nextAction.knowledge.summary.contradicted", {
            count: contradicted.length,
            label: contradicted[0].label,
          })
        : strengthened.length
          ? strengthened[0].text
          : weakened.length
            ? weakened[0].text
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
