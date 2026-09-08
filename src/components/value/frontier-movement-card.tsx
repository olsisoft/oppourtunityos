import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EXPERIMENT_OUTCOME_LABELS, EXPERIMENT_OUTCOME_TONE } from "@/domain/enums";
import type { ExperimentOutcome } from "@/generated/prisma/enums";
import type { KnowledgeDiff, KnowledgeSnapshot } from "@/services/value/knowledge-change";
import { PROOF_RUNG_LABELS, type FrontierPosition } from "@/services/value/proof-frontier";

function score(n: number | null, completeness: string): string {
  return n === null ? `INCOMPLETE · ${completeness}` : `${n}`;
}

/**
 * "What did the last test change?" — before/after view of one recompute.
 * Shown right after a result is recorded and in the learning history.
 */
export function FrontierMovementCard({
  title,
  outcome,
  outcomeExplanation,
  observed,
  diff,
  before,
  after,
  nextAction,
  compact = false,
}: {
  title: string;
  outcome?: ExperimentOutcome | null;
  outcomeExplanation?: string | null;
  observed?: string | null;
  diff: KnowledgeDiff | null;
  before: KnowledgeSnapshot | null;
  after: KnowledgeSnapshot | null;
  nextAction?: string | null;
  compact?: boolean;
}) {
  const moved = diff?.frontierMovement ?? "NONE";
  return (
    <div className="space-y-3 rounded-lg border p-4 text-sm">
      <div>
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Experiment result
        </p>
        <p className="font-semibold">{title}</p>
        {observed && <p className="text-muted-foreground mt-0.5 text-xs">Observed: {observed}</p>}
        {outcome && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={EXPERIMENT_OUTCOME_TONE[outcome]}>
              {EXPERIMENT_OUTCOME_LABELS[outcome]}
            </Badge>
            {outcomeExplanation && (
              <span className="text-muted-foreground text-xs">{outcomeExplanation}</span>
            )}
          </div>
        )}
      </div>

      {!diff || !diff.changed ? (
        <p className="text-muted-foreground text-xs">
          {outcome === "INVALID"
            ? "An invalid run never moves the frontier: nothing changed."
            : outcome === "INCONCLUSIVE"
              ? "An inconclusive result is recorded as neutral evidence; it neither supports nor contradicts the claim, so nothing moved."
              : "Nothing changed: the evidence did not cross a threshold. It still counts toward the claim."}
        </p>
      ) : (
        <>
          {(diff.contradicted.length > 0 ||
            diff.strengthened.length > 0 ||
            diff.weakened.length > 0) && (
            <div>
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Affected claims
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {[...diff.contradicted, ...diff.strengthened, ...diff.weakened]
                  .slice(0, compact ? 4 : 12)
                  .map((c) => (
                    <li key={c.key} className="flex items-center gap-2">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground">
                        {c.before.status}
                        {c.before.confidence ? ` ${c.before.confidence}` : ""}
                      </span>
                      <ArrowRight className="size-3 shrink-0" />
                      <span
                        className={c.after.status === "CONTRADICTED" ? "text-tone-negative" : ""}
                      >
                        {c.after.status}
                        {c.after.confidence ? ` ${c.after.confidence}` : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {before && after && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Delta
                label="Proof frontier"
                before={PROOF_RUNG_LABELS[before.frontier as FrontierPosition]}
                after={PROOF_RUNG_LABELS[after.frontier as FrontierPosition]}
                tone={
                  moved === "FORWARD" ? "positive" : moved === "BACKWARD" ? "negative" : "muted"
                }
              />
              <Delta label="Verdict" before={before.verdict} after={after.verdict} />
              <Delta
                label="Evidence confidence"
                before={String(before.evidenceConfidence)}
                after={String(after.evidenceConfidence)}
              />
              <Delta
                label="Causal confidence"
                before={score(before.causalConfidence, before.causalCompleteness)}
                after={score(after.causalConfidence, after.causalCompleteness)}
              />
              <Delta
                label="Value strength"
                before={score(before.valueStrength, before.valueCompleteness)}
                after={score(after.valueStrength, after.valueCompleteness)}
              />
            </div>
          )}
        </>
      )}
      {nextAction && (
        <div className="bg-foreground text-background rounded-md p-3">
          <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
            Next best action
          </p>
          <p className="mt-0.5 text-sm">{nextAction}</p>
        </div>
      )}
    </div>
  );
}

function Delta({
  label,
  before,
  after,
  tone,
}: {
  label: string;
  before: string;
  after: string;
  tone?: "positive" | "negative" | "muted";
}) {
  const changed = before !== after;
  return (
    <div className="rounded-md border p-2">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Before: {before}</span>
        <ArrowRight className="size-3 shrink-0" />
        <span
          className={
            !changed
              ? "text-muted-foreground"
              : tone === "positive"
                ? "text-tone-positive font-medium"
                : tone === "negative"
                  ? "text-tone-negative font-medium"
                  : "font-medium"
          }
        >
          After: {after}
        </span>
      </div>
    </div>
  );
}
