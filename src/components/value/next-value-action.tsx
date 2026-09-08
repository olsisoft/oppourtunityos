"use client";

import { useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";

import { ExperimentPlanDialog } from "@/components/value/experiment-plan-dialog";
import { prefillFromAction } from "@/services/value/experiment-prefill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OpportunityWithRelations } from "@/db/workspaces";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import { UNCERTAINTY_LABELS, type ValueAction } from "@/services/value/next-value-action";

export function NextValueActionCard({
  action,
  frontierLabel,
  opportunity,
  insights,
  compact = false,
}: {
  action: ValueAction | null;
  frontierLabel: string;
  opportunity: OpportunityWithRelations;
  insights: OpportunityInsights;
  compact?: boolean;
}) {
  const [planOpen, setPlanOpen] = useState(false);

  if (!action) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm">
        <p className="text-muted-foreground">
          No decision-relevant uncertainty identified yet. Form an opportunity and its value chain
          first.
        </p>
      </div>
    );
  }
  const s = action.scoring;

  return (
    <div className="bg-foreground text-background rounded-lg p-4">
      <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
        Next best action
      </p>
      <p className="mt-1 flex items-start gap-2 text-sm font-medium">
        <ArrowRight className="mt-0.5 size-4 shrink-0" /> {action.what}
      </p>
      <dl className={compact ? "mt-2 space-y-1 text-xs" : "mt-3 grid gap-2 text-xs sm:grid-cols-2"}>
        <Row label="Why this test now?" value={action.whyNow} className="sm:col-span-2" />
        <Row label="Why this matters" value={action.why} />
        <Row label="Affects" value={action.affects} />
        <Row label="If false" value={action.ifFalse} />
        <Row label="Evidence that would move the frontier" value={action.evidenceToMove} />
        {action.whatThisCouldChange && (
          <Row
            label="What this could change"
            value={action.whatThisCouldChange}
            className="sm:col-span-2"
          />
        )}
        {!compact && action.experiment && (
          <Row label="Recommended experiment" value={action.experiment} className="sm:col-span-2" />
        )}
      </dl>
      <p className="text-background/60 mt-2 font-mono text-[10px]">
        priority {action.priorityScore}/100 · impact {s.decisionImpact} · uncertainty{" "}
        {s.uncertaintyReduction} · frontier {s.frontierMovement} · criticality {s.criticality} ÷
        effort {s.effort} · time {s.time} · cost {s.cost}
        {s.assumed.length
          ? ` (${s.assumed.join(", ")} assumed — plan the experiment to refine)`
          : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-background/30 text-background">
          Current Proof Frontier: {frontierLabel}
        </Badge>
        <Badge variant="outline" className="border-background/30 text-background">
          {action.type.replace(/_/g, " ").toLowerCase()}
        </Badge>
        {action.uncertainty && (
          <Badge variant="outline" className="border-background/30 text-background">
            {UNCERTAINTY_LABELS[action.uncertainty].toLowerCase()}
          </Badge>
        )}
        <Button size="sm" variant="secondary" onClick={() => setPlanOpen(true)}>
          <FlaskConical /> Plan this experiment
        </Button>
      </div>
      {planOpen && (
        <ExperimentPlanDialog
          open={planOpen}
          onOpenChange={setPlanOpen}
          opportunity={opportunity}
          insights={insights}
          prefill={prefillFromAction(action, opportunity.title)}
        />
      )}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-background/60 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-background/90 mt-0.5 leading-relaxed">{value}</dd>
    </div>
  );
}
