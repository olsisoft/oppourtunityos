"use client";

import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EXPERIMENT_OUTCOME_TONE } from "@/domain/enums";
import type { EpistemicStatus, ExperimentOutcome } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import type { T } from "@/i18n/t";
import type { KnowledgeDiff, KnowledgeSnapshot } from "@/services/value/knowledge-change";
import type { FrontierPosition } from "@/services/value/proof-frontier";

function score(t: T, n: number | null, completeness: string): string {
  return n === null ? t("value.panel.scores.incompleteWith", { completeness }) : `${n}`;
}

function claimStatus(t: T, status: EpistemicStatus, confidence: number): string {
  const label = t(`labels.epistemic.${status}`);
  return confidence ? t("value.movement.statusConfidence", { status: label, confidence }) : label;
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
  outcomeExplanation?: LocalizedText | null;
  observed?: LocalizedText | null;
  diff: KnowledgeDiff | null;
  before: KnowledgeSnapshot | null;
  after: KnowledgeSnapshot | null;
  nextAction?: LocalizedText | null;
  compact?: boolean;
}) {
  const t = useT();
  const moved = diff?.frontierMovement ?? "NONE";
  const rung = (position: FrontierPosition) => t(`labels.proofRung.${position}`);
  return (
    <div className="space-y-3 rounded-lg border p-4 text-sm">
      <div>
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t("value.movement.title")}
        </p>
        <p className="font-semibold">{title}</p>
        {observed && (
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("value.movement.observed", { observed })}
          </p>
        )}
        {outcome && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={EXPERIMENT_OUTCOME_TONE[outcome]}>
              {t(`labels.experimentOutcome.${outcome}`)}
            </Badge>
            {outcomeExplanation && (
              <span className="text-muted-foreground text-xs">{t(outcomeExplanation)}</span>
            )}
          </div>
        )}
      </div>

      {!diff || !diff.changed ? (
        <p className="text-muted-foreground text-xs">
          {outcome === "INVALID"
            ? t("value.movement.invalid")
            : outcome === "INCONCLUSIVE"
              ? t("value.movement.inconclusive")
              : t("value.movement.nothing")}
        </p>
      ) : (
        <>
          {(diff.contradicted.length > 0 ||
            diff.strengthened.length > 0 ||
            diff.weakened.length > 0) && (
            <div>
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t("value.movement.affected")}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {[...diff.contradicted, ...diff.strengthened, ...diff.weakened]
                  .slice(0, compact ? 4 : 12)
                  .map((c) => (
                    <li key={c.key} className="flex items-center gap-2">
                      <span className="font-medium">{t(c.label)}</span>
                      <span className="text-muted-foreground">
                        {claimStatus(t, c.before.status, c.before.confidence)}
                      </span>
                      <ArrowRight className="size-3 shrink-0" />
                      <span
                        className={c.after.status === "CONTRADICTED" ? "text-tone-negative" : ""}
                      >
                        {claimStatus(t, c.after.status, c.after.confidence)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {before && after && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Delta
                label={t("value.movement.frontier")}
                before={rung(before.frontier as FrontierPosition)}
                after={rung(after.frontier as FrontierPosition)}
                tone={
                  moved === "FORWARD" ? "positive" : moved === "BACKWARD" ? "negative" : "muted"
                }
              />
              <Delta
                label={t("value.movement.verdict")}
                before={t(`labels.verdict.${before.verdict}`).toUpperCase()}
                after={t(`labels.verdict.${after.verdict}`).toUpperCase()}
              />
              <Delta
                label={t("value.movement.evidenceConfidence")}
                before={String(before.evidenceConfidence)}
                after={String(after.evidenceConfidence)}
              />
              <Delta
                label={t("value.movement.causalConfidence")}
                before={score(t, before.causalConfidence, before.causalCompleteness)}
                after={score(t, after.causalConfidence, after.causalCompleteness)}
              />
              <Delta
                label={t("value.movement.valueStrength")}
                before={score(t, before.valueStrength, before.valueCompleteness)}
                after={score(t, after.valueStrength, after.valueCompleteness)}
              />
            </div>
          )}
        </>
      )}
      {nextAction && (
        <div className="bg-foreground text-background rounded-md p-3">
          <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
            {t("value.movement.nextAction")}
          </p>
          <p className="mt-0.5 text-sm">{t(nextAction)}</p>
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
  const t = useT();
  const changed = before !== after;
  return (
    <div className="rounded-md border p-2">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {t("value.movement.before", { value: before })}
        </span>
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
          {t("value.movement.after", { value: after })}
        </span>
      </div>
    </div>
  );
}
