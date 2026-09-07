import Link from "next/link";

import { KillCriteria } from "@/components/opportunity/kill-criteria";
import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Scorecard, frontierText } from "@/components/value/scorecard";
import type { OpportunityWithRelations } from "@/db/workspaces";
import { ASSUMPTION_KIND_LABELS, ASSUMPTION_STATUS_LABELS, DIRECTION_LABELS } from "@/domain/enums";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";

export function OpportunityCard({
  opportunity: o,
  insights,
  workspaceId,
  mechanisms,
}: {
  opportunity: OpportunityWithRelations;
  insights: OpportunityInsights;
  workspaceId: string;
  mechanisms: string[];
}) {
  const trigger = o.pain?.triggers[0];
  const alternative = o.pain?.alternatives[0];
  const nextStep = insights.primaryValueAction?.what ?? insights.primaryAction?.title ?? null;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={o.verdict} />
              <ProvenanceBadge provenance={o.provenance} />
            </div>
            <h3 className="mt-2 text-base font-semibold">
              <Link
                href={`/app/w/${workspaceId}/opportunities/${o.id}`}
                className="hover:underline"
              >
                {o.title}
              </Link>
            </h3>
          </div>
          <Scorecard opportunity={o} insights={insights} size="sm" className="gap-3" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <Row label="ICP" value={o.icp?.name} />
        <Row
          label="Valuable variable"
          value={
            o.variable
              ? `${DIRECTION_LABELS[o.variable.desiredDirection]} × ${o.variable.name}${o.variable.target ? ` × ${o.variable.target}` : ""}`
              : null
          }
        />
        <Row label="Pain" value={o.pain?.description} />
        <Row label="Trigger" value={trigger?.description} />
        <Row
          label="Alternative"
          value={
            alternative
              ? `${alternative.name} — ${alternative.weaknessDescription ?? "failure UNKNOWN"}`
              : null
          }
        />
        <Row
          label="Mechanism"
          value={o.mechanism ?? (mechanisms.length ? mechanisms.join(", ") : null)}
        />
        <Row label="Value proposition" value={o.valueProposition} className="sm:col-span-2" />
        <Row
          label="Proof frontier"
          value={`${frontierText(o.proofFrontierRung)} — everything beyond it remains a hypothesis`}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <p className="text-muted-foreground text-xs font-medium">Kill criteria</p>
          <KillCriteria warnings={insights.killWarnings} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <p className="text-muted-foreground text-xs font-medium">
            Assumptions ({o.assumptions.length})
          </p>
          {o.assumptions.length === 0 ? (
            <p className="text-muted-foreground mt-1 text-xs">No assumptions recorded.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {o.assumptions.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    <span className="text-muted-foreground">
                      {ASSUMPTION_KIND_LABELS[a.kind]} ·{" "}
                    </span>
                    {a.statement}
                  </span>
                  <Badge
                    variant={
                      a.status === "SUPPORTED"
                        ? "positive"
                        : a.status === "CONTRADICTED"
                          ? "negative"
                          : "muted"
                    }
                  >
                    {ASSUMPTION_STATUS_LABELS[a.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        {nextStep && (
          <div className="bg-muted/60 rounded-md p-3 sm:col-span-2">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Next step
            </p>
            <p className="mt-0.5 text-sm font-medium">{nextStep}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-0.5">
        {value?.trim() ? value : <span className="text-muted-foreground">UNKNOWN</span>}
      </p>
    </div>
  );
}
