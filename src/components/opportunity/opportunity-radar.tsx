"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { NewOpportunityDialog } from "@/components/opportunity/new-opportunity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { scoreTone } from "@/components/shared/score-pill";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale, useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import type { T } from "@/i18n/t";
import { frontierMovement, type FrontierPosition } from "@/services/value/proof-frontier";
import { describeScope } from "@/services/value/scope";
import type { OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import { cn } from "@/lib/utils";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";

const RECENT_DAYS = 14;

/** True when the frontier moved forward in the last two weeks. */
export function frontierMovedRecently(o: OpportunityWithRelations): boolean {
  const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
  return o.knowledgeChanges.some(
    (c) =>
      c.createdAt.getTime() >= cutoff &&
      frontierMovement(
        (c.previousFrontier ?? "NONE") as FrontierPosition,
        (c.newFrontier ?? "NONE") as FrontierPosition,
      ) === "FORWARD",
  );
}

function frontierLabel(t: T, rung: string | null | undefined): string {
  return rung ? t(`labels.proofRung.${rung}`) : t("opportunity.score.notComputed");
}

export function OpportunityRadar({
  graph,
  compact = false,
}: {
  graph: WorkspaceGraph;
  compact?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const rows = [...graph.opportunities].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const pains = graph.markets.flatMap((m) =>
    m.icps.flatMap((i) =>
      i.variables.flatMap((v) =>
        v.pains.map((p) => ({
          id: p.id,
          label: `${v.name} — ${p.description}`,
          icpId: i.id,
          variableId: v.id,
        })),
      ),
    ),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{t("opportunity.radar.intro")}</p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus /> {t("opportunity.radar.add")}
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={t("opportunity.radar.empty.title")}
          description={t("opportunity.radar.empty.description")}
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus /> {t("opportunity.radar.create")}
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("opportunity.radar.column.opportunity")}</TableHead>
                <ScoreHead
                  label={
                    compact
                      ? t("opportunity.radar.column.potentialShort")
                      : t("opportunity.radar.column.potential")
                  }
                  question={t("opportunity.radar.question.potential")}
                />
                <ScoreHead
                  label={
                    compact
                      ? t("opportunity.radar.column.evidenceShort")
                      : t("opportunity.radar.column.evidence")
                  }
                  question={t("opportunity.radar.question.evidence")}
                />
                <ScoreHead
                  label={t("opportunity.radar.column.value")}
                  question={t("opportunity.radar.question.value")}
                />
                <ScoreHead
                  label={t("opportunity.radar.column.causal")}
                  question={t("opportunity.radar.question.causal")}
                />
                {!compact && (
                  <ScoreHead
                    label={t("opportunity.radar.column.frontier")}
                    question={t("opportunity.radar.question.frontier")}
                    align="left"
                  />
                )}
                <TableHead>{t("opportunity.radar.column.verdict")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const insights = deriveOpportunityInsights(o, graph.mechanisms.length);
                const frontier = frontierLabel(t, o.proofFrontierRung);
                const frontierScope = insights.frontier?.frontierScope;
                const scopeText = frontierScope
                  ? frontierScope.scope
                    ? describeScope(frontierScope.scope, locale)
                    : t(frontierScope.text)
                  : "";
                return (
                  <TableRow key={o.id}>
                    <TableCell
                      className={cn(
                        "max-w-[14rem] font-medium",
                        compact && "max-w-[11rem] text-xs",
                      )}
                    >
                      <Link
                        href={`/app/w/${graph.id}/opportunities/${o.id}`}
                        className="block truncate hover:underline"
                      >
                        {o.title}
                      </Link>
                      {!compact && o.icp && (
                        <p className="text-muted-foreground truncate text-xs font-normal">
                          {o.icp.name}
                        </p>
                      )}
                      {frontierMovedRecently(o) && (
                        <span className="text-tone-positive text-[10px] font-medium">
                          {t("opportunity.radar.movedRecently")}
                        </span>
                      )}
                      {compact && (
                        <p className="text-muted-foreground truncate text-[10px] font-normal">
                          {t("opportunity.radar.frontierLine", { frontier })}
                        </p>
                      )}
                    </TableCell>
                    <ScoreCell
                      value={o.opportunityScore}
                      lines={insights.scoreBreakdown?.explanation ?? []}
                      question={t("opportunity.radar.question.potential")}
                    />
                    <ScoreCell
                      value={o.evidenceScore}
                      lines={insights.evidenceBreakdown?.explanation ?? []}
                      question={t("opportunity.radar.question.evidence")}
                    />
                    <ScoreCell
                      value={o.valueStrength}
                      lines={
                        insights.valueStrength
                          ? [
                              ...insights.valueStrength.dimensions.map((d) =>
                                t("opportunity.radar.hover.dimension", {
                                  label: t(d.label),
                                  known: d.value !== null,
                                  value: d.value,
                                  provenance: d.provenance,
                                }),
                              ),
                              t("opportunity.radar.hover.completeness", {
                                completeness: insights.valueStrength.completeness,
                              }),
                              ...(insights.valueStrength.nextQuestion
                                ? [
                                    t("opportunity.radar.hover.next", {
                                      question: t(insights.valueStrength.nextQuestion),
                                    }),
                                  ]
                                : []),
                            ]
                          : [t("opportunity.score.notComputedYet")]
                      }
                      question={t("opportunity.radar.question.value")}
                      compact={compact}
                    />
                    <ScoreCell
                      value={o.causalConfidence}
                      lines={
                        insights.causal
                          ? [
                              t("opportunity.radar.hover.criticalLinks", {
                                total: insights.causal.total,
                                validated: insights.causal.validated,
                              }),
                              ...(insights.causal.blocking
                                ? [
                                    t("opportunity.radar.hover.blocking", {
                                      label: t(insights.causal.blocking.label),
                                    }),
                                  ]
                                : []),
                              scopeText
                                ? t("opportunity.radar.hover.frontierWithScope", {
                                    frontier,
                                    scope: scopeText,
                                  })
                                : t("opportunity.radar.hover.frontier", { frontier }),
                              ...insights.causal.links.map((l) =>
                                l.missingLink
                                  ? t("opportunity.radar.hover.linkMissing", {
                                      label: t(l.label),
                                    })
                                  : t(
                                      l.confidence
                                        ? "opportunity.radar.hover.linkWithConfidence"
                                        : "opportunity.radar.hover.link",
                                      {
                                        label: t(l.label),
                                        status: l.status,
                                        statusLabel: t(`labels.epistemic.${l.status}`),
                                        confidence: l.confidence,
                                      },
                                    ),
                              ),
                            ]
                          : [t("opportunity.score.notComputedYet")]
                      }
                      question={t("opportunity.radar.question.causal")}
                      compact={compact}
                    />
                    {!compact && (
                      <FrontierCell
                        frontier={frontier}
                        lines={insights.frontier?.explanation ?? []}
                      />
                    )}
                    <TableCell>
                      <VerdictBadge verdict={o.verdict} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <NewOpportunityDialog
        open={open}
        onOpenChange={setOpen}
        workspaceId={graph.id}
        pains={pains}
      />
    </div>
  );
}

function ScoreHead({
  label,
  question,
  align = "right",
}: {
  label: string;
  question: string;
  align?: "left" | "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{question}</TooltipContent>
      </Tooltip>
    </TableHead>
  );
}

function ScoreCell({
  value,
  lines,
  question,
  compact = false,
}: {
  value: number | null;
  lines: LocalizedText[];
  question: string;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <TableCell className="text-right font-mono tabular-nums">
      <Tooltip>
        <TooltipTrigger asChild>
          {value === null ? (
            <span
              className="text-tone-warning cursor-help text-[10px] font-semibold tracking-wide"
              aria-label={t("opportunity.score.incomplete")}
            >
              {compact ? "—" : t("opportunity.score.incomplete")}
            </span>
          ) : (
            <span className={cn("cursor-help", scoreTone(value))}>{value}</span>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="mb-1 font-medium">{question}</p>
          {value === null && <p className="mb-1">{t("opportunity.radar.hover.incomplete")}</p>}
          <ul className="space-y-0.5">
            {lines.slice(0, 8).map((l, i) => (
              <li key={i}>{t(l)}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

function FrontierCell({ frontier, lines }: { frontier: string; lines: LocalizedText[] }) {
  const t = useT();
  return (
    <TableCell className="text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help whitespace-nowrap">{frontier}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="mb-1 font-medium">{t("opportunity.radar.hover.frontierTitle")}</p>
          <ul className="space-y-0.5">
            {(lines.length ? lines : [t("opportunity.score.notComputedYet")])
              .slice(0, 8)
              .map((l, i) => (
                <li key={i}>{t(l)}</li>
              ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}
