"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import type { GraphKnowledgeChange } from "@/db/workspaces";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import type { ClaimDelta } from "@/services/value/knowledge-change";
import { frontierMovement, type FrontierPosition } from "@/services/value/proof-frontier";

function deltas(json: unknown): ClaimDelta[] {
  return Array.isArray(json) ? (json as ClaimDelta[]) : [];
}

/**
 * LEARNING HISTORY — how we came to believe what we believe: every recompute
 * that moved a claim, a score, the frontier or the verdict, newest first.
 */
export function LearningHistory({
  changes,
  limit,
}: {
  changes: GraphKnowledgeChange[];
  limit?: number;
}) {
  const t = useT();
  const locale = useLocale();
  const rows = limit ? changes.slice(0, limit) : changes;
  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("value.history.emptyTitle")}
        description={t("value.history.emptyDescription")}
      />
    );
  }
  const rung = (position: string | null | undefined) =>
    t(`labels.proofRung.${(position ?? "NONE") as FrontierPosition}`);
  const incomplete = t("value.incomplete");
  return (
    <ol className="space-y-2">
      {rows.map((c) => {
        const movement = frontierMovement(
          (c.previousFrontier ?? "NONE") as FrontierPosition,
          (c.newFrontier ?? "NONE") as FrontierPosition,
        );
        const trigger = t(`labels.knowledgeTrigger.${c.trigger}`);
        const cause = c.experiment
          ? c.experiment.title
          : c.evidence
            ? c.evidence.sourceTitle
            : trigger;
        const strengthened = deltas(c.claimsStrengthened);
        const contradicted = deltas(c.claimsContradicted);
        const weakened = deltas(c.claimsWeakened);
        return (
          <li key={c.id} className="bg-card rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px]">
                  {t("value.history.meta", { date: formatDate(c.createdAt, locale), trigger })}
                </p>
                <p className="font-medium">{cause}</p>
              </div>
              {movement !== "NONE" ? (
                <Badge
                  variant={movement === "FORWARD" ? "positive" : "negative"}
                  className="shrink-0"
                >
                  {movement === "FORWARD" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}{" "}
                  {t("value.history.frontierMoved", {
                    from: rung(c.previousFrontier),
                    to: rung(c.newFrontier),
                  })}
                </Badge>
              ) : (
                <Badge variant="muted" className="shrink-0">
                  <Minus className="size-3" /> {t("value.history.frontierUnchanged")}
                </Badge>
              )}
            </div>
            <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
              {[...contradicted, ...strengthened, ...weakened].slice(0, 5).map((d) => (
                <li key={d.key}>{t(d.text)}</li>
              ))}
              {c.previousEvidenceConfidence !== c.newEvidenceConfidence && (
                <li>
                  {t("value.history.evidenceConfidence", {
                    before: c.previousEvidenceConfidence,
                    after: c.newEvidenceConfidence,
                  })}
                </li>
              )}
              {(c.previousCausalConfidence ?? null) !== (c.newCausalConfidence ?? null) && (
                <li>
                  {t("value.history.causalConfidence", {
                    before: c.previousCausalConfidence ?? incomplete,
                    after: c.newCausalConfidence ?? incomplete,
                  })}
                </li>
              )}
              {(c.previousValueStrength ?? null) !== (c.newValueStrength ?? null) && (
                <li>
                  {t("value.history.valueStrength", {
                    before: c.previousValueStrength ?? incomplete,
                    after: c.newValueStrength ?? incomplete,
                  })}
                </li>
              )}
              {c.previousVerdict !== c.newVerdict && (
                <li className="text-foreground">
                  {t("value.history.verdict", {
                    before: t(`labels.verdict.${c.previousVerdict}`).toUpperCase(),
                    after: t(`labels.verdict.${c.newVerdict}`).toUpperCase(),
                  })}
                </li>
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
