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
import { DIRECTION_LABELS, VARIABLE_POLARITY_LABELS } from "@/domain/enums";
import { cn } from "@/lib/utils";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import {
  compactLabel,
  directionGlyph,
  fieldStatus,
  polarityOf,
} from "@/services/value/variable-semantics";

/**
 * VALUE tab — OpportunityOS as a value-engineering instrument. Per opportunity:
 * the valuable variable (↓ direct variable, type, target, current, desired,
 * parent economic variable), the value path, the Proof Frontier and why it
 * stops, Value Strength / Causal Confidence with their completeness, the next
 * question and the experiments.
 */
export function ValuePanel({ graph }: { graph: WorkspaceGraph }) {
  const [selection, setSelection] = useState<{
    opportunity: OpportunityWithRelations;
    item: LadderSelection;
  } | null>(null);
  const [planFor, setPlanFor] = useState<OpportunityWithRelations | null>(null);
  const opportunities = [...graph.opportunities].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  );

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No opportunity yet"
        description="Value engineering starts once an opportunity exists: a valuable variable, a mechanism hypothesis, a causal chain, and the evidence that supports (or not) each link."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Action × variable × target, the value path, and where evidence currently ends. Click a level
        or an arrow to link evidence, state an assumption or plan an experiment.
      </p>
      {opportunities.map((o) => {
        const insights = deriveOpportunityInsights(o, graph.mechanisms.length);
        const v = o.variable;
        const polarity = v ? polarityOf(v.variableType, v.variablePolarity) : null;
        const counts = experimentCounts(o.experiments);
        const path = o.valuePaths.find((p) => p.isPrimary) ?? o.valuePaths[0] ?? null;
        const vs = insights.valueStrength;
        const cc = insights.causal;
        const nextValueQuestion =
          vs?.nextQuestion ?? cc?.nextQuestion ?? insights.primaryValueAction?.what ?? null;
        return (
          <section key={o.id} className="bg-card space-y-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <VerdictBadge verdict={o.verdict} />
                <h3 className="mt-1 truncate text-sm font-semibold">{o.title}</h3>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/app/w/${graph.id}/opportunities/${o.id}`}>
                  Report <ArrowUpRight />
                </Link>
              </Button>
            </div>

            {/* VALUABLE VARIABLE */}
            <div className="space-y-1.5 text-xs">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Valuable variable
              </p>
              {v ? (
                <>
                  <p className="text-base font-semibold">
                    {compactLabel(v.desiredDirection, v.name)}
                  </p>
                  <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                    <Field
                      label="Type"
                      value={
                        v.variableType
                          ? `${v.variableType}${polarity ? ` · ${VARIABLE_POLARITY_LABELS[polarity].toLowerCase()}` : ""}`
                          : null
                      }
                      status={fieldStatus(v, "variableType")}
                    />
                    <Field label="Target" value={v.target} status={fieldStatus(v, "target")} />
                    <Field
                      label="Current"
                      value={v.currentState}
                      status={fieldStatus(v, "currentState")}
                    />
                    <Field
                      label="Desired"
                      value={v.desiredState}
                      status={fieldStatus(v, "desiredState")}
                    />
                  </div>
                  <div className="rounded-md border border-dashed px-2 py-1.5">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Parent economic variable
                    </p>
                    {v.parent ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">
                          {directionGlyph(v.parentDirection ?? v.parent.desiredDirection)}{" "}
                          {v.parent.name}
                        </span>
                        <span className="text-muted-foreground">
                          · {DIRECTION_LABELS[v.parentDirection ?? v.parent.desiredDirection]}
                        </span>
                        <FieldStatusBadge status={fieldStatus(v, "parentVariableId")} />
                      </p>
                    ) : (
                      <p className="text-muted-foreground mt-0.5">UNKNOWN — no parent stated.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">UNKNOWN</p>
              )}
            </div>

            {/* VALUE PATH */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Value path{path ? ` · ${path.name}` : ""}
                </p>
                {o.valuePaths.length > 1 && (
                  <span className="text-muted-foreground text-[10px]">
                    {o.valuePaths.length} paths
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

            {/* PROOF FRONTIER */}
            <div className="bg-muted/40 rounded-md border border-dashed px-2.5 py-2 text-xs">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Proof frontier
              </p>
              <p className="text-sm font-medium">{frontierText(o.proofFrontierRung)}</p>
              <p className="text-muted-foreground mt-0.5">
                Why it stops: {insights.frontier?.whyStops ?? "Not computed yet."}
              </p>
            </div>

            {/* VALUE STRENGTH · CAUSAL CONFIDENCE */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Value strength
                    </p>
                    <p
                      className={cn(
                        "font-mono font-semibold",
                        o.valueStrength === null && "text-tone-warning",
                      )}
                    >
                      {o.valueStrength === null
                        ? `INCOMPLETE · ${vs?.completeness ?? "?"}`
                        : `${o.valueStrength}/100`}
                    </p>
                    {o.valueStrength === null && valueMissingText(insights) && (
                      <p className="text-muted-foreground">Missing: {valueMissingText(insights)}</p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <ul className="space-y-0.5">
                    {(vs?.dimensions ?? []).map((d) => (
                      <li key={d.key} className="flex justify-between gap-3">
                        <span>{d.label}</span>
                        <span className="font-mono">
                          {d.value === null ? "UNKNOWN" : `${d.value}/10`} · {d.provenance}
                        </span>
                      </li>
                    ))}
                    {vs && <li className="mt-1">Completeness: {vs.completeness}</li>}
                  </ul>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Causal confidence
                    </p>
                    <p
                      className={cn(
                        "font-mono font-semibold",
                        o.causalConfidence === null && "text-tone-warning",
                      )}
                    >
                      {o.causalConfidence === null
                        ? `INCOMPLETE · ${cc?.completeness ?? "?"} links`
                        : `${o.causalConfidence}/100`}
                    </p>
                    {cc?.blocking && (
                      <p className="text-muted-foreground">Blocking link: {cc.blocking.label}</p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <ul className="space-y-0.5">
                    {(cc?.links ?? []).map((l) => (
                      <li key={l.label} className="flex justify-between gap-3">
                        <span>{l.label}</span>
                        <span className="font-mono">
                          {l.missingLink
                            ? "UNKNOWN"
                            : `${l.status}${l.confidence ? ` ${l.confidence}` : ""}`}
                        </span>
                      </li>
                    ))}
                    {cc && (
                      <li className="mt-1">
                        Critical links: {cc.total} · validated: {cc.validated}
                        {cc.blocking ? ` · blocking: ${cc.blocking.label}` : ""}
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
                  {vs?.nextQuestion
                    ? "Next value question"
                    : cc?.nextQuestion
                      ? "Next causal question"
                      : "Next best action"}
                </p>
                <p className="mt-0.5 text-sm">{nextValueQuestion}</p>
              </div>
            )}

            {/* EXPERIMENTS */}
            <div className="flex items-center justify-between text-xs">
              <p>
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Experiments
                </span>{" "}
                <span className="font-mono">
                  {counts.planned} planned · {counts.completed} completed
                </span>
              </p>
              <Button size="sm" variant="outline" onClick={() => setPlanFor(o)}>
                <FlaskConical /> Plan experiment
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
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase">
        {label} <FieldStatusBadge status={status} />
      </p>
      <p
        className={cn("truncate", !value?.trim() && "text-muted-foreground")}
        title={value ?? undefined}
      >
        {value?.trim() ? value : "UNKNOWN"}
      </p>
    </div>
  );
}
