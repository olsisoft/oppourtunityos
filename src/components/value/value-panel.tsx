"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FieldStatusBadge } from "@/components/value/epistemic-badge";
import { frontierText } from "@/components/value/scorecard";
import { ScoreTile } from "@/components/value/score-tile";
import { ValueLadder, type LadderSelection } from "@/components/value/value-ladder";
import { ValueNodeSheet } from "@/components/value/value-node-sheet";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Button } from "@/components/ui/button";
import type { OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import { DIRECTION_LABELS } from "@/domain/enums";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import { SCORE_QUESTIONS } from "@/components/value/scorecard";
import { fieldStatus } from "@/services/value/variable-semantics";

export function ValuePanel({ graph }: { graph: WorkspaceGraph }) {
  const [selection, setSelection] = useState<{
    opportunity: OpportunityWithRelations;
    item: LadderSelection;
  } | null>(null);
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
        Action × variable × target, the value causality ladder, and where evidence currently ends.
        Click a level or an arrow to link evidence or state an assumption.
      </p>
      {opportunities.map((o) => {
        const insights = deriveOpportunityInsights(o, graph.mechanisms.length);
        const v = o.variable;
        return (
          <section key={o.id} className="bg-card space-y-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <VerdictBadge verdict={o.verdict} />
                </div>
                <h3 className="mt-1 truncate text-sm font-semibold">{o.title}</h3>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/app/w/${graph.id}/opportunities/${o.id}`}>
                  Report <ArrowUpRight />
                </Link>
              </Button>
            </div>

            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Valuable variable
                </p>
                <p className="text-sm font-medium">
                  {v ? (
                    `${DIRECTION_LABELS[v.desiredDirection]} × ${v.name}`
                  ) : (
                    <span className="text-muted-foreground">UNKNOWN</span>
                  )}
                  {v?.target ? (
                    <span className="text-muted-foreground font-normal"> × {v.target}</span>
                  ) : null}
                </p>
              </div>
              <Field
                label="Current"
                value={v?.currentState}
                status={v ? fieldStatus(v, "currentState") : "UNKNOWN"}
              />
              <Field
                label="Desired"
                value={v?.desiredState}
                status={v ? fieldStatus(v, "desiredState") : "UNKNOWN"}
              />
              <Field
                label="Parent variable"
                value={v?.parent?.name}
                status={v ? fieldStatus(v, "parentVariableId") : "UNKNOWN"}
              />
              <Field label="Unit" value={v?.unit} status={v ? fieldStatus(v, "unit") : "UNKNOWN"} />
            </div>

            <div>
              <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                Value chain
              </p>
              <ValueLadder
                opportunity={o}
                frontier={insights.frontier}
                compact
                onSelect={(item) => setSelection({ opportunity: o, item })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <ScoreTile
                label="Value strength"
                question={SCORE_QUESTIONS.value}
                value={o.valueStrength}
                lines={insights.valueStrength?.explanation ?? []}
                size="sm"
              />
              <ScoreTile
                label="Causal confidence"
                question={SCORE_QUESTIONS.causal}
                value={o.causalConfidence}
                lines={insights.causal?.explanation ?? []}
                size="sm"
              />
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Proof frontier
                </p>
                <p className="text-sm font-medium">{frontierText(o.proofFrontierRung)}</p>
              </div>
            </div>

            {insights.primaryValueAction && (
              <div className="bg-muted/60 rounded-md p-2.5">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Next value question
                </p>
                <p className="mt-0.5 text-sm">{insights.primaryValueAction.what}</p>
              </div>
            )}
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
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </p>
        <FieldStatusBadge status={status} />
      </div>
      <p className="mt-0.5">
        {value?.trim() ? value : <span className="text-muted-foreground">UNKNOWN</span>}
      </p>
    </div>
  );
}
