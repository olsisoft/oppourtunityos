"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, FlaskConical, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteExperimentAction, updateExperimentAction } from "@/actions/value";
import { EmptyState } from "@/components/shared/empty-state";
import { ExperimentPlanDialog } from "@/components/value/experiment-plan-dialog";
import type { PlanPrefill } from "@/services/value/experiment-prefill";
import { ExperimentResultDialog } from "@/components/value/experiment-result-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GraphExperiment, OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import { EXPERIMENT_OUTCOME_TONE } from "@/domain/enums";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { isSystemMessage, type LocalizedText } from "@/i18n/messages";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import { experimentWarnings } from "@/services/value/experiment-outcome";
import { describeScope, parseScope } from "@/services/value/scope";

const STATUS_TONE = {
  PLANNED: "info",
  RUNNING: "info",
  COMPLETED: "positive",
  ABANDONED: "muted",
  CANCELLED: "muted",
  INVALID: "warning",
} as const;

export function experimentCounts(experiments: GraphExperiment[]) {
  const planned = experiments.filter(
    (e) => e.status === "PLANNED" || e.status === "RUNNING",
  ).length;
  const completed = experiments.filter((e) => e.status === "COMPLETED").length;
  return { planned, completed };
}

/** The structured message persisted next to a text column, when the row has one. */
function localized(message: unknown, text: string | null | undefined): LocalizedText | null {
  if (isSystemMessage(message)) return message;
  return text ?? null;
}

export function ExperimentsList({
  experiments,
  opportunity,
  insights,
  graph,
  prefill,
}: {
  experiments: GraphExperiment[];
  opportunity: OpportunityWithRelations;
  insights: OpportunityInsights;
  graph?: WorkspaceGraph;
  /** Prefill for the "Plan experiment" button (from the next best action). */
  prefill?: PlanPrefill;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [planOpen, setPlanOpen] = useState(false);
  const [editing, setEditing] = useState<GraphExperiment | null>(null);
  const [recording, setRecording] = useState<GraphExperiment | null>(null);

  const setStatus = async (e: GraphExperiment, status: "RUNNING" | "CANCELLED") => {
    const r = await updateExperimentAction({ experimentId: e.id, status });
    if (!r.ok) toast.error(r.error);
    else router.refresh();
  };

  const targetText = (e: GraphExperiment) =>
    e.causalLink
      ? t("experiments.list.target.link", {
          from: t(`labels.valueChainLevel.${e.causalLink.fromNode.level}`),
          to: t(`labels.valueChainLevel.${e.causalLink.toNode.level}`),
        })
      : e.assumption
        ? t("experiments.list.target.assumption", { statement: e.assumption.statement })
        : e.valueChainNode
          ? t("experiments.list.target.level", {
              level: t(`labels.valueChainLevel.${e.valueChainNode.level}`),
            })
          : t("experiments.list.target.none");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {t("experiments.list.summary", experimentCounts(experiments))}
        </p>
        <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>
          <Plus /> {t("experiments.list.plan")}
        </Button>
      </div>
      {experiments.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={t("experiments.list.empty.title")}
          description={t("experiments.list.empty.description")}
        />
      ) : (
        <ul className="space-y-2">
          {experiments.map((e) => {
            const warnings = experimentWarnings(e).filter((w) => w.level === "warning");
            const result = e.resultRecord;
            const plannedScope = parseScope(e.scope);
            const resultScope = result ? parseScope(result.scope) : null;
            return (
              <li key={e.id} className="bg-card rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t(`labels.experimentType.${e.experimentType}`)}
                      </Badge>
                      <Badge variant={STATUS_TONE[e.status]}>
                        {t(`labels.experimentStatus.${e.status}`)}
                      </Badge>
                      {result && (
                        <Badge variant={EXPERIMENT_OUTCOME_TONE[result.outcome]}>
                          {result.outcomeSource === "THRESHOLD"
                            ? t("experiments.list.outcomeByThresholds", {
                                outcome: t(`labels.experimentOutcome.${result.outcome}`),
                              })
                            : t(`labels.experimentOutcome.${result.outcome}`)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 font-medium">{e.title}</p>
                    <p className="text-muted-foreground text-xs">{targetText(e)}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {t("experiments.list.hypothesis", { hypothesis: e.hypothesis })}
                    </p>
                    {e.decisionQuestion ? (
                      <p className="mt-0.5 text-xs">
                        {t("experiments.list.decision", { decision: e.decisionQuestion })}
                      </p>
                    ) : null}
                    {(e.successThreshold !== null || e.failureThreshold !== null) && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {t("experiments.list.thresholds", {
                          metric: e.successMetric ?? t("experiments.list.metricFallback"),
                          success: e.successThreshold ?? "—",
                          failure: e.failureThreshold ?? "—",
                          hasUnit: Boolean(e.unit),
                          unit: e.unit ?? "",
                        })}
                      </p>
                    )}
                    {!result && e.designLevel && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {plannedScope
                          ? t("experiments.list.plannedDesignScope", {
                              design: t(`labels.designLevel.${e.designLevel}`),
                              scope: describeScope(plannedScope, locale),
                            })
                          : t("experiments.list.plannedDesign", {
                              design: t(`labels.designLevel.${e.designLevel}`),
                            })}
                      </p>
                    )}
                    {result && (
                      <div className="mt-2 rounded-md border border-dashed p-2 text-xs">
                        <p>
                          {t("experiments.list.resultLine", {
                            hasMetric: Boolean(result.observedMetric),
                            metric: result.observedMetric ?? "",
                            hasValue: result.observedValue !== null,
                            value: result.observedValue ?? "",
                            hasUnit: Boolean(result.unit),
                            unit: result.unit ?? "",
                            summary: result.resultSummary,
                          })}
                        </p>
                        {(result.designLevel || result.internalValidity) && (
                          <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            {result.designLevel && (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {t("experiments.list.designBadge", {
                                  design: t(`labels.designLevel.${result.designLevel}`),
                                })}
                              </Badge>
                            )}
                            {result.internalValidity && (
                              <Badge
                                variant={
                                  result.internalValidity === "HIGH"
                                    ? "positive"
                                    : result.internalValidity === "MEDIUM"
                                      ? "info"
                                      : result.internalValidity === "LOW"
                                        ? "negative"
                                        : "warning"
                                }
                                className="font-mono text-[10px]"
                              >
                                {t("experiments.list.validityBadge", {
                                  validity: t(`labels.internalValidity.${result.internalValidity}`),
                                })}
                              </Badge>
                            )}
                          </p>
                        )}
                        {resultScope && (
                          <p className="text-muted-foreground mt-0.5 break-words">
                            <span className="font-mono text-[10px] uppercase">
                              {t("experiments.list.scope")}
                            </span>{" "}
                            {describeScope(resultScope, locale)}
                          </p>
                        )}
                        {result.interpretation && (
                          <p className="mt-1">
                            <span className="text-muted-foreground">
                              {t("experiments.list.interpretationLabel")}{" "}
                            </span>
                            {t(localized(result.interpretationMessage, result.interpretation))}
                          </p>
                        )}
                        {result.limitations && (
                          <p className="text-muted-foreground mt-0.5">
                            {t("experiments.list.limitations", { limitations: result.limitations })}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-0.5">
                          {e.evidence.length
                            ? t("experiments.list.recordedAsEvidence", {
                                date: formatDate(result.completedAt, locale),
                                title: e.evidence[0].sourceTitle,
                              })
                            : t("experiments.list.noEvidenceProduced", {
                                date: formatDate(result.completedAt, locale),
                              })}
                        </p>
                      </div>
                    )}
                    {warnings.length > 0 && e.status !== "COMPLETED" && (
                      <p className="text-tone-warning mt-1 flex items-start gap-1 text-[11px]">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />{" "}
                        {t(warnings[0].message)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(e.status === "PLANNED" || e.status === "RUNNING") && (
                      <>
                        {e.status === "PLANNED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setStatus(e, "RUNNING")}
                          >
                            <Play /> {t("experiments.list.start")}
                          </Button>
                        )}
                        <Button size="sm" className="h-7 text-xs" onClick={() => setRecording(e)}>
                          {t("experiments.list.recordResult")}
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={t("experiments.list.editAria")}
                          onClick={() => setEditing(e)}
                        >
                          <Pencil />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={t("experiments.list.deleteAria")}
                      onClick={async () => {
                        if (!confirm(t("experiments.list.deleteConfirm"))) return;
                        const r = await deleteExperimentAction(e.id);
                        if (!r.ok) toast.error(r.error);
                        else router.refresh();
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {(e.status === "PLANNED" || e.status === "RUNNING") && (
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground underline"
                      onClick={() => setStatus(e, "CANCELLED")}
                    >
                      {t("experiments.list.cancel")}
                    </button>
                    {e.timeEstimate && (
                      <span className="text-muted-foreground">
                        {t("experiments.list.time", { time: e.timeEstimate })}
                      </span>
                    )}
                    {e.costEstimate && (
                      <span className="text-muted-foreground">
                        {t("experiments.list.cost", { cost: e.costEstimate })}
                      </span>
                    )}
                    {e.effort !== null && (
                      <span className="text-muted-foreground">
                        {t("experiments.list.effort", { effort: e.effort })}
                      </span>
                    )}
                    {e.decisionImpact !== null && (
                      <span className="text-muted-foreground">
                        {t("experiments.list.impact", { impact: e.decisionImpact })}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {planOpen && (
        <ExperimentPlanDialog
          open={planOpen}
          onOpenChange={setPlanOpen}
          opportunity={opportunity}
          insights={insights}
          prefill={prefill}
        />
      )}
      {editing && (
        <ExperimentPlanDialog
          open
          onOpenChange={(v) => !v && setEditing(null)}
          opportunity={opportunity}
          insights={insights}
          experiment={editing}
        />
      )}
      {recording && (
        <ExperimentResultDialog
          open
          onOpenChange={(v) => !v && setRecording(null)}
          experiment={recording}
          opportunity={opportunity}
          graph={graph}
        />
      )}
    </div>
  );
}
