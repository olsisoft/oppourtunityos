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
import {
  EXPERIMENT_OUTCOME_LABELS,
  EXPERIMENT_OUTCOME_TONE,
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_TYPE_LABELS,
  VALUE_CHAIN_LEVEL_LABELS,
} from "@/domain/enums";
import { formatDate } from "@/lib/utils";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import { experimentWarnings } from "@/services/value/experiment-outcome";
import {
  DESIGN_LEVEL_LABELS,
  INTERNAL_VALIDITY_LABELS,
} from "@/services/value/experimental-validity";
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
      ? `Link ${VALUE_CHAIN_LEVEL_LABELS[e.causalLink.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[e.causalLink.toNode.level]}`
      : e.assumption
        ? `Assumption: ${e.assumption.statement}`
        : e.valueChainNode
          ? `Level ${VALUE_CHAIN_LEVEL_LABELS[e.valueChainNode.level]}`
          : "No target";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {experimentCounts(experiments).planned} planned ·{" "}
          {experimentCounts(experiments).completed} completed. An experiment tests one assumption,
          causal link or level, and must name the decision it makes easier.
        </p>
        <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>
          <Plus /> Plan experiment
        </Button>
      </div>
      {experiments.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No experiment planned"
          description="Plan one from the Next Best Action, from a causal link in the ladder, or with the button above."
        />
      ) : (
        <ul className="space-y-2">
          {experiments.map((e) => {
            const warnings = experimentWarnings(e).filter((w) => w.level === "warning");
            const result = e.resultRecord;
            return (
              <li key={e.id} className="bg-card rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {EXPERIMENT_TYPE_LABELS[e.experimentType]}
                      </Badge>
                      <Badge variant={STATUS_TONE[e.status]}>
                        {EXPERIMENT_STATUS_LABELS[e.status]}
                      </Badge>
                      {result && (
                        <Badge variant={EXPERIMENT_OUTCOME_TONE[result.outcome]}>
                          {EXPERIMENT_OUTCOME_LABELS[result.outcome]}
                          {result.outcomeSource === "THRESHOLD" ? " · by thresholds" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 font-medium">{e.title}</p>
                    <p className="text-muted-foreground text-xs">{targetText(e)}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Hypothesis: {e.hypothesis}
                    </p>
                    {e.decisionQuestion ? (
                      <p className="mt-0.5 text-xs">Decision: {e.decisionQuestion}</p>
                    ) : null}
                    {(e.successThreshold !== null || e.failureThreshold !== null) && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {e.successMetric ?? "Metric"}: success {e.successThreshold ?? "—"}, failure{" "}
                        {e.failureThreshold ?? "—"}
                        {e.unit ? ` ${e.unit}` : ""}
                      </p>
                    )}
                    {!result && e.designLevel && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Planned design: {DESIGN_LEVEL_LABELS[e.designLevel]}
                        {parseScope(e.scope)
                          ? ` · scope: ${describeScope(parseScope(e.scope))}`
                          : ""}
                      </p>
                    )}
                    {result && (
                      <div className="mt-2 rounded-md border border-dashed p-2 text-xs">
                        <p>
                          {result.observedMetric ? `${result.observedMetric}: ` : ""}
                          {result.observedValue !== null
                            ? `${result.observedValue}${result.unit ? ` ${result.unit}` : ""} · `
                            : ""}
                          {result.resultSummary}
                        </p>
                        {(result.designLevel || result.internalValidity) && (
                          <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            {result.designLevel && (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                design · {DESIGN_LEVEL_LABELS[result.designLevel]}
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
                                validity · {INTERNAL_VALIDITY_LABELS[result.internalValidity]}
                              </Badge>
                            )}
                            {parseScope(result.scope) && (
                              <Badge variant="muted" className="font-mono text-[10px]">
                                scope · {describeScope(parseScope(result.scope))}
                              </Badge>
                            )}
                          </p>
                        )}
                        {result.interpretation && (
                          <p className="mt-1">
                            <span className="text-muted-foreground">Interpretation: </span>
                            {result.interpretation}
                          </p>
                        )}
                        {result.limitations && (
                          <p className="text-muted-foreground mt-0.5">
                            Limitations: {result.limitations}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-0.5">
                          {formatDate(result.completedAt)}
                          {e.evidence.length
                            ? ` · recorded as evidence "${e.evidence[0].sourceTitle}"`
                            : " · no evidence produced"}
                        </p>
                      </div>
                    )}
                    {warnings.length > 0 && e.status !== "COMPLETED" && (
                      <p className="text-tone-warning mt-1 flex items-start gap-1 text-[11px]">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {warnings[0].message}
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
                            <Play /> Start
                          </Button>
                        )}
                        <Button size="sm" className="h-7 text-xs" onClick={() => setRecording(e)}>
                          Record result
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Edit experiment"
                          onClick={() => setEditing(e)}
                        >
                          <Pencil />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Delete experiment"
                      onClick={async () => {
                        if (!confirm("Delete this experiment? Evidence it produced is kept."))
                          return;
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
                      cancel
                    </button>
                    {e.timeEstimate && (
                      <span className="text-muted-foreground">time {e.timeEstimate}</span>
                    )}
                    {e.costEstimate && (
                      <span className="text-muted-foreground">cost {e.costEstimate}</span>
                    )}
                    {e.effort !== null && (
                      <span className="text-muted-foreground">effort {e.effort}/10</span>
                    )}
                    {e.decisionImpact !== null && (
                      <span className="text-muted-foreground">impact {e.decisionImpact}/10</span>
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
