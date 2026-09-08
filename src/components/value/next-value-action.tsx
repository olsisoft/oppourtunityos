"use client";

import { useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";

import { ExperimentPlanDialog } from "@/components/value/experiment-plan-dialog";
import { prefillFromAction } from "@/services/value/experiment-prefill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OpportunityWithRelations } from "@/db/workspaces";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import type { ValueAction } from "@/services/value/next-value-action";

export function NextValueActionCard({
  action,
  frontierLabel,
  opportunity,
  insights,
  compact = false,
}: {
  action: ValueAction | null;
  frontierLabel: LocalizedText;
  opportunity: OpportunityWithRelations;
  insights: OpportunityInsights;
  compact?: boolean;
}) {
  const t = useT();
  const [planOpen, setPlanOpen] = useState(false);

  if (!action) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm">
        <p className="text-muted-foreground">{t("value.nextAction.empty")}</p>
      </div>
    );
  }
  const s = action.scoring;
  const assumedLabel = (dimension: LocalizedText) =>
    typeof dimension === "string" && t.has(`value.nextAction.assumedDimension.${dimension}`)
      ? t(`value.nextAction.assumedDimension.${dimension}`)
      : t(dimension);

  return (
    <div className="bg-foreground text-background rounded-lg p-4">
      <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
        {t("value.nextAction.title")}
      </p>
      <p className="mt-1 flex items-start gap-2 text-sm font-medium">
        <ArrowRight className="mt-0.5 size-4 shrink-0" /> {t(action.what)}
      </p>
      <dl className={compact ? "mt-2 space-y-1 text-xs" : "mt-3 grid gap-2 text-xs sm:grid-cols-2"}>
        <Row label={t("value.nextAction.whyNow")} value={action.whyNow} className="sm:col-span-2" />
        <Row label={t("value.nextAction.why")} value={action.why} />
        <Row label={t("value.nextAction.affects")} value={action.affects} />
        <Row label={t("value.nextAction.ifFalse")} value={action.ifFalse} />
        <Row label={t("value.nextAction.evidenceToMove")} value={action.evidenceToMove} />
        {action.whatThisCouldChange && (
          <Row
            label={t("value.nextAction.whatThisCouldChange")}
            value={action.whatThisCouldChange}
            className="sm:col-span-2"
          />
        )}
        {!compact && action.experiment && (
          <Row
            label={t("value.nextAction.experiment")}
            value={action.experiment}
            className="sm:col-span-2"
          />
        )}
      </dl>
      <p className="text-background/60 mt-2 font-mono text-[10px]">
        {t("value.nextAction.scoring", {
          priority: action.priorityScore,
          impact: s.decisionImpact,
          uncertainty: s.uncertaintyReduction,
          frontier: s.frontierMovement,
          criticality: s.criticality,
          effort: s.effort,
          time: s.time,
          cost: s.cost,
        })}
        {s.assumed.length
          ? ` ${t("value.nextAction.assumed", { assumed: s.assumed.map(assumedLabel).join(", ") })}`
          : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-background/30 text-background">
          {t("value.nextAction.currentFrontier", { frontier: t(frontierLabel) })}
        </Badge>
        <Badge variant="outline" className="border-background/30 text-background">
          {t(`value.nextAction.type.${action.type}`)}
        </Badge>
        {action.uncertainty && (
          <Badge variant="outline" className="border-background/30 text-background">
            {t(`labels.uncertainty.${action.uncertainty}`).toLowerCase()}
          </Badge>
        )}
        <Button size="sm" variant="secondary" onClick={() => setPlanOpen(true)}>
          <FlaskConical /> {t("value.nextAction.plan")}
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

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: LocalizedText;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={className}>
      <dt className="text-background/60 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-background/90 mt-0.5 leading-relaxed">{t(value)}</dd>
    </div>
  );
}
