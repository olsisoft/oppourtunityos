"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, FlaskConical } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FieldStatusBadge } from "@/components/value/epistemic-badge";
import { ExperimentPlanDialog } from "@/components/value/experiment-plan-dialog";
import { experimentCounts } from "@/components/value/experiments-list";
import { prefillFromAction } from "@/services/value/experiment-prefill";
import { frontierText, valueMissingText } from "@/components/value/scorecard";
import { ValueLadder, type LadderSelection } from "@/components/value/value-ladder";
import { ValueNodeSheet } from "@/components/value/value-node-sheet";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import type { ValueChainLevel } from "@/generated/prisma/enums";
import { useLocale, useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import type { T } from "@/i18n/t";
import { cn } from "@/lib/utils";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import { describeScope } from "@/services/value/scope";
import {
  compactLabel,
  directionGlyph,
  FIELD_STATUS_LABELS,
  fieldStatus,
  polarityOf,
  type FieldStatus,
} from "@/services/value/variable-semantics";
import { EpistemicBadge } from "@/components/value/epistemic-badge";
import { GeneralizationBadge } from "@/components/value/fit-badge";

/** Provenance of a value dimension ("EVIDENCE", "USER"…) rendered in the locale. */
function provenanceLabel(t: T, provenance: LocalizedText): string {
  if (typeof provenance === "string") {
    const key = (Object.keys(FIELD_STATUS_LABELS) as FieldStatus[]).find(
      (k) => FIELD_STATUS_LABELS[k] === provenance,
    );
    if (key) return t(`labels.fieldStatus.${key}`);
  }
  return t(provenance);
}

const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/**
 * VALUE tab — OpportunityOS as a value-engineering instrument. Per opportunity:
 * the valuable variable (↓ direct variable, type, target, current, desired,
 * parent economic variable), the value path, the Proof Frontier and why it
 * stops, Value Strength / Causal Confidence with their completeness, the next
 * question and the experiments.
 */
export function ValuePanel({ graph }: { graph: WorkspaceGraph }) {
  const t = useT();
  const locale = useLocale();
  const [selection, setSelection] = useState<{
    opportunity: OpportunityWithRelations;
    item: LadderSelection;
  } | null>(null);
  const [planFor, setPlanFor] = useState<OpportunityWithRelations | null>(null);
  const opportunities = [...graph.opportunities].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  );
  const level = (l: ValueChainLevel) => t(`labels.valueChainLevel.${l}`);
  const linkLabel = (l: { from: ValueChainLevel; to: ValueChainLevel }) =>
    t("value.ladder.linkTitle", { from: level(l.from), to: level(l.to) });

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title={t("value.panel.emptyTitle")}
        description={t("value.panel.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">{t("value.panel.intro")}</p>
      {opportunities.map((o) => {
        const insights = deriveOpportunityInsights(o, graph.mechanisms.length);
        const v = o.variable;
        const polarity = v ? polarityOf(v.variableType, v.variablePolarity) : null;
        const counts = experimentCounts(o.experiments);
        const path = o.valuePaths.find((p) => p.isPrimary) ?? o.valuePaths[0] ?? null;
        const vs = insights.valueStrength;
        const cc = insights.causal;
        const nextValueQuestion: LocalizedText | null =
          vs?.nextQuestion ?? cc?.nextQuestion ?? insights.primaryValueAction?.what ?? null;
        const frontierScope = insights.frontier?.frontierScope ?? null;
        const scopeText = frontierScope
          ? frontierScope.scope
            ? describeScope(frontierScope.scope, locale)
            : frontierScope.text
              ? t(frontierScope.text)
              : null
          : null;
        const missing = valueMissingText(insights, t);
        const nextQuestionTitle = vs?.nextQuestion
          ? t("value.panel.nextQuestion.value")
          : cc?.nextQuestion
            ? t("value.panel.nextQuestion.causal")
            : t("value.panel.nextQuestion.action");
        return (
          <section key={o.id} className="bg-card space-y-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <VerdictBadge verdict={o.verdict} />
                <h3 className="mt-1 truncate text-sm font-semibold">{o.title}</h3>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/app/w/${graph.id}/opportunities/${o.id}`}>
                  {t("value.panel.report")} <ArrowUpRight />
                </Link>
              </Button>
            </div>

            {/* VALUABLE VARIABLE */}
            <div className="space-y-1.5 text-xs">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t("value.panel.variable.title")}
              </p>
              {v ? (
                <>
                  <p className="text-base font-semibold">
                    {compactLabel(v.desiredDirection, v.name)}
                  </p>
                  <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                    <Field
                      label={t("value.panel.variable.type")}
                      value={
                        v.variableType
                          ? polarity
                            ? t("value.panel.variable.typeWithPolarity", {
                                type: v.variableType,
                                polarity: t(`labels.variablePolarity.${polarity}`).toLowerCase(),
                              })
                            : v.variableType
                          : null
                      }
                      status={fieldStatus(v, "variableType")}
                    />
                    <Field
                      label={t("value.panel.variable.target")}
                      value={v.target}
                      status={fieldStatus(v, "target")}
                    />
                    <Field
                      label={t("value.panel.variable.current")}
                      value={v.currentState}
                      status={fieldStatus(v, "currentState")}
                    />
                    <Field
                      label={t("value.panel.variable.desired")}
                      value={v.desiredState}
                      status={fieldStatus(v, "desiredState")}
                    />
                  </div>
                  <div className="rounded-md border border-dashed px-2 py-1.5">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      {t("value.panel.variable.parent")}
                    </p>
                    {v.parent ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">
                          {directionGlyph(v.parentDirection ?? v.parent.desiredDirection)}{" "}
                          {v.parent.name}
                        </span>
                        <span className="text-muted-foreground">
                          ·{" "}
                          {t(`labels.direction.${v.parentDirection ?? v.parent.desiredDirection}`)}
                        </span>
                        <FieldStatusBadge status={fieldStatus(v, "parentVariableId")} />
                      </p>
                    ) : (
                      <p className="text-muted-foreground mt-0.5">
                        {t("value.panel.variable.noParent")}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">{t("value.unknown")}</p>
              )}
            </div>

            {/* VALUE PATH */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {path
                    ? t("value.panel.path.titleNamed", { name: path.name })
                    : t("value.panel.path.title")}
                </p>
                {o.valuePaths.length > 1 && (
                  <span className="text-muted-foreground text-[10px]">
                    {t("value.panel.path.count", { count: o.valuePaths.length })}
                  </span>
                )}
              </div>
              <ValueLadder
                opportunity={o}
                frontier={insights.frontier}
                compact
                onSelect={(item) => setSelection({ opportunity: o, item })}
              />
            </div>

            {/* PROOF FRONTIER — level and scope */}
            <div className="bg-muted/40 rounded-md border border-dashed px-2.5 py-2 text-xs">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t("value.panel.frontier.title")}
              </p>
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                {frontierText(o.proofFrontierRung, t)}
                <GeneralizationBadge status={frontierScope?.generalization} />
              </p>
              <p className="text-muted-foreground mt-0.5">
                {t("value.panel.frontier.scope", {
                  scope: scopeText ?? t("value.panel.frontier.scopeNotComputed"),
                })}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {t("value.panel.frontier.whyStops", {
                  reason: insights.frontier?.whyStops ?? t("value.panel.frontier.notComputedYet"),
                })}
              </p>
            </div>

            {/* COMMERCIAL LADDER — each rung is its own claim */}
            {insights.frontier?.commercial && (
              <div className="text-xs">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t("value.panel.commercial.title")}
                </p>
                <ol className="mt-1 flex flex-wrap items-center gap-1.5">
                  {insights.frontier.commercial.rungs.map((r, i) => (
                    <li key={r.claimType} className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "flex cursor-help items-center gap-1 rounded border px-1.5 py-0.5",
                              r.supported ? "border-foreground" : "border-dashed",
                            )}
                          >
                            <span className="font-medium">
                              {t(`labels.commercialRung.${r.claimType}`)}
                            </span>
                            <EpistemicBadge status={r.status} confidence={r.confidence} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            {t("value.panel.commercial.rungStatement", {
                              statement: capitalize(t(`labels.claimStatement.${r.claimType}`)),
                            })}
                          </p>
                          <p className="mt-1">
                            {r.evidenceCount
                              ? t("value.panel.commercial.evidence", {
                                  count: r.evidenceCount,
                                  fit: r.bestFit,
                                })
                              : t("value.panel.commercial.noEvidence")}
                          </p>
                          <p className="text-muted-foreground mt-1">{t(r.evidenceToMove)}</p>
                        </TooltipContent>
                      </Tooltip>
                      {i < insights.frontier!.commercial!.rungs.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="text-muted-foreground mt-1">
                  {t("value.panel.commercial.caveat")}
                  {insights.frontier.commercial.next
                    ? ` ${t("value.panel.commercial.next", {
                        question: insights.frontier.commercial.next.question,
                      })}`
                    : ""}
                </p>
              </div>
            )}

            {/* VALUE STRENGTH · CAUSAL CONFIDENCE */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      {t("value.panel.scores.valueStrength")}
                    </p>
                    <p
                      className={cn(
                        "font-mono font-semibold",
                        o.valueStrength === null && "text-tone-warning",
                      )}
                    >
                      {o.valueStrength === null
                        ? t("value.panel.scores.incompleteWith", {
                            completeness: vs?.completeness ?? "?",
                          })
                        : t("value.panel.scores.score", { score: o.valueStrength })}
                    </p>
                    {o.valueStrength === null && missing && (
                      <p className="text-muted-foreground">
                        {t("value.panel.scores.missing", { missing })}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <ul className="space-y-0.5">
                    {(vs?.dimensions ?? []).map((d) => (
                      <li key={d.key} className="flex justify-between gap-3">
                        <span>{t(`labels.valueDimension.${d.key}`)}</span>
                        <span className="font-mono">
                          {t("value.panel.scores.dimensionRow", {
                            value:
                              d.value === null
                                ? t("value.unknown")
                                : t("value.panel.scores.dimensionValue", { value: d.value }),
                            provenance: provenanceLabel(t, d.provenance),
                          })}
                        </span>
                      </li>
                    ))}
                    {vs && (
                      <li className="mt-1">
                        {t("value.panel.scores.completeness", { completeness: vs.completeness })}
                      </li>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      {t("value.panel.scores.causalConfidence")}
                    </p>
                    <p
                      className={cn(
                        "font-mono font-semibold",
                        o.causalConfidence === null && "text-tone-warning",
                      )}
                    >
                      {o.causalConfidence === null
                        ? t("value.panel.scores.incompleteLinks", {
                            completeness: cc?.completeness ?? "?",
                          })
                        : t("value.panel.scores.score", { score: o.causalConfidence })}
                    </p>
                    {cc?.blocking && (
                      <p className="text-muted-foreground">
                        {t("value.panel.scores.blockingLink", { label: linkLabel(cc.blocking) })}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <ul className="space-y-0.5">
                    {(cc?.links ?? []).map((l) => (
                      <li key={`${l.from}-${l.to}`} className="flex justify-between gap-3">
                        <span>{linkLabel(l)}</span>
                        <span className="font-mono">
                          {l.missingLink
                            ? t("value.unknown")
                            : l.confidence
                              ? t("value.panel.scores.statusWithConfidence", {
                                  status: t(`labels.epistemic.${l.status}`),
                                  confidence: l.confidence,
                                })
                              : t(`labels.epistemic.${l.status}`)}
                        </span>
                      </li>
                    ))}
                    {cc && (
                      <li className="mt-1">
                        {t("value.panel.scores.criticalLinks", {
                          total: cc.total,
                          validated: cc.validated,
                          withBlocking: Boolean(cc.blocking),
                          blocking: cc.blocking ? linkLabel(cc.blocking) : "",
                        })}
                      </li>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* NEXT QUESTION */}
            {nextValueQuestion && (
              <div className="bg-muted/60 rounded-md p-2.5">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {insights.primaryValueAction
                    ? t("value.panel.nextQuestion.withUncertainty", {
                        title: nextQuestionTitle,
                        uncertainty: t(
                          `labels.uncertainty.${insights.primaryValueAction.uncertainty}`,
                        ).toLowerCase(),
                      })
                    : nextQuestionTitle}
                </p>
                <p className="mt-0.5 text-sm">{t(nextValueQuestion)}</p>
                {insights.primaryValueAction?.whatThisCouldChange && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("value.panel.nextQuestion.couldChange", {
                      text: insights.primaryValueAction.whatThisCouldChange,
                    })}
                  </p>
                )}
              </div>
            )}

            {/* EXPERIMENTS */}
            <div className="flex items-center justify-between text-xs">
              <p>
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t("value.panel.experiments.title")}
                </span>{" "}
                <span className="font-mono">
                  {t("value.panel.experiments.counts", {
                    planned: counts.planned,
                    completed: counts.completed,
                  })}
                </span>
              </p>
              <Button size="sm" variant="outline" onClick={() => setPlanFor(o)}>
                <FlaskConical /> {t("value.panel.experiments.plan")}
              </Button>
            </div>
          </section>
        );
      })}
      {selection && (
        <ValueNodeSheet
          selection={selection.item}
          opportunity={selection.opportunity}
          graph={graph}
          onClose={() => setSelection(null)}
        />
      )}
      {planFor && (
        <ExperimentPlanDialog
          open
          onOpenChange={(v) => !v && setPlanFor(null)}
          opportunity={planFor}
          insights={deriveOpportunityInsights(planFor, graph.mechanisms.length)}
          prefill={(() => {
            const a = deriveOpportunityInsights(
              planFor,
              graph.mechanisms.length,
            ).primaryValueAction;
            return a ? prefillFromAction(a, planFor.title) : undefined;
          })()}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  status,
}: {
  label: string;
  value: string | null | undefined;
  status: ReturnType<typeof fieldStatus>;
}) {
  const t = useT();
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
        {label} <FieldStatusBadge status={status} />
      </p>
      <p
        className={cn("truncate", !value?.trim() && "text-muted-foreground")}
        title={value ?? undefined}
      >
        {value?.trim() ? value : t("value.unknown")}
      </p>
    </div>
  );
}
