"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { ValueLadder } from "@/components/value/value-ladder";
import type {
  GraphIcp,
  GraphMarket,
  GraphPain,
  GraphVariable,
  OpportunityWithRelations,
  WorkspaceGraph,
} from "@/db/workspaces";
import { useT } from "@/i18n/client";
import type { T } from "@/i18n/t";
import { cn, truncate } from "@/lib/utils";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import { compactLabel, fieldStatus } from "@/services/value/variable-semantics";

export type MapSelection =
  | { kind: "market"; item: GraphMarket }
  | { kind: "icp"; item: GraphIcp }
  | { kind: "variable"; item: GraphVariable }
  | { kind: "pain"; item: GraphPain }
  | { kind: "opportunity"; item: OpportunityWithRelations };

export function OpportunityMap({
  graph,
  onSelect,
}: {
  graph: WorkspaceGraph;
  onSelect: (selection: MapSelection) => void;
}) {
  const t = useT();
  if (graph.markets.length === 0) {
    return (
      <EmptyState
        title={t("discovery.map.empty.title")}
        description={t("discovery.map.empty.description")}
      />
    );
  }
  return (
    <div className="space-y-3">
      {graph.markets.map((market) => (
        <MarketNode key={market.id} market={market} graph={graph} onSelect={onSelect} />
      ))}
      {graph.markets.length > 0 && graph.opportunities.length === 0 && (
        <p className="text-muted-foreground px-1 text-xs">{t("discovery.map.noOpportunity")}</p>
      )}
    </div>
  );
}

function MarketNode({
  market,
  graph,
  onSelect,
}: {
  market: GraphMarket;
  graph: WorkspaceGraph;
  onSelect: (s: MapSelection) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-2">
      <Node
        label={t("discovery.map.node.market")}
        title={market.name}
        provenance={market.provenance}
        onClick={() => onSelect({ kind: "market", item: market })}
      />
      {market.icps.length === 0 && <Connector label={t("discovery.map.pending.icp")} />}
      {market.icps.map((icp) => (
        <div key={icp.id} className="ml-3 space-y-2 border-l pl-3">
          <Connector />
          <Node
            label={t("discovery.map.node.icp")}
            title={icp.name}
            subtitle={[icp.role, icp.companySize].filter(Boolean).join(" · ") || undefined}
            provenance={icp.provenance}
            onClick={() => onSelect({ kind: "icp", item: icp })}
          />
          {icp.variables.length === 0 && <Connector label={t("discovery.map.pending.variables")} />}
          {icp.variables.map((variable) => (
            <VariableNode key={variable.id} variable={variable} graph={graph} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** "current 12% (ai hypothesis)" — the raw status keeps the English wording; French uses its label. */
function statePart(
  t: T,
  variable: GraphVariable,
  field: "currentState" | "desiredState",
  known: string,
  unknown: string,
): string {
  const value = variable[field]?.trim();
  if (!value) return t(unknown);
  const status = fieldStatus(variable, field);
  return t(known, {
    value,
    status: status.toLowerCase().replace("_", " "),
    statusLabel: t(`labels.fieldStatus.${status}`),
  });
}

function stateLine(t: T, variable: GraphVariable): string {
  const type = variable.variableType?.trim()
    ? t("discovery.map.typeKnown", { type: variable.variableType })
    : t("discovery.map.typeUnknown");
  return t("discovery.map.variableLine", {
    direction: t(`labels.direction.${variable.desiredDirection}`),
    type,
    importance: variable.importanceScore,
    current: statePart(
      t,
      variable,
      "currentState",
      "discovery.map.currentKnown",
      "discovery.map.currentUnknown",
    ),
    desired: statePart(
      t,
      variable,
      "desiredState",
      "discovery.map.desiredKnown",
      "discovery.map.desiredUnknown",
    ),
    hasParent: Boolean(variable.parent),
    parent: variable.parent?.name ?? "",
  });
}

function VariableNode({
  variable,
  graph,
  onSelect,
}: {
  variable: GraphVariable;
  graph: WorkspaceGraph;
  onSelect: (s: MapSelection) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const opportunities = graph.opportunities.filter((o) => o.variableId === variable.id);
  return (
    <div className="ml-3 space-y-2 border-l pl-3">
      <Connector />
      <div className="flex items-start gap-1">
        <Node
          className="flex-1"
          label={t("discovery.map.node.variable")}
          title={compactLabel(variable.desiredDirection, variable.name)}
          subtitle={stateLine(t, variable)}
          provenance={variable.provenance}
          onClick={() => onSelect({ kind: "variable", item: variable })}
        />
        {(variable.pains.length > 0 || opportunities.length > 0) && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-2 rounded p-1"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("discovery.map.collapse") : t("discovery.map.expand")}
          >
            <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          </button>
        )}
      </div>
      {open &&
        variable.pains.map((pain) => (
          <div key={pain.id} className="ml-3 space-y-2 border-l pl-3">
            <Connector />
            <Node
              label={t("discovery.map.node.pain")}
              title={truncate(pain.description, 90)}
              subtitle={t("discovery.map.painLine", {
                severity: pain.severityScore,
                frequency: pain.frequencyScore,
                triggers: pain.triggers.length,
                alternatives: pain.alternatives.length,
                evidence: pain.evidence.length,
              })}
              provenance={pain.provenance}
              onClick={() => onSelect({ kind: "pain", item: pain })}
            />
            {graph.opportunities
              .filter((o) => o.painId === pain.id)
              .map((o) => (
                <div key={o.id} className="ml-3 space-y-2 border-l pl-3">
                  <Connector />
                  <OpportunityNode
                    opportunity={o}
                    mechanismCount={graph.mechanisms.length}
                    onClick={() => onSelect({ kind: "opportunity", item: o })}
                  />
                </div>
              ))}
          </div>
        ))}
      {open &&
        opportunities
          .filter((o) => !o.painId)
          .map((o) => (
            <div key={o.id} className="ml-3 space-y-2 border-l pl-3">
              <Connector />
              <OpportunityNode
                opportunity={o}
                mechanismCount={graph.mechanisms.length}
                onClick={() => onSelect({ kind: "opportunity", item: o })}
              />
            </div>
          ))}
    </div>
  );
}

/**
 * Progressive disclosure: collapsed, an opportunity is one row. Expanded, it
 * reveals Mechanism → Value chain (with the Proof Frontier marker) → Experiments.
 */
function OpportunityNode({
  opportunity: o,
  mechanismCount,
  onClick,
}: {
  opportunity: OpportunityWithRelations;
  mechanismCount: number;
  onClick: () => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const insights = deriveOpportunityInsights(o, mechanismCount);
  const incomplete = t("opportunity.score.incomplete");
  const frontier = o.proofFrontierRung
    ? t(`labels.proofRung.${o.proofFrontierRung}`)
    : t("opportunity.score.notComputed");
  const planned = o.experiments.filter((e) => e.status !== "ABANDONED").length;
  const hasChain = o.valueChainNodes.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={onClick}
          className="bg-card hover:bg-accent w-full flex-1 rounded-md border p-2.5 text-left transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {t("discovery.map.node.opportunity")}
            </span>
            <VerdictBadge verdict={o.verdict} />
          </div>
          <p className="mt-1 text-sm font-medium">{o.title}</p>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs tabular-nums">
            <span>{t("discovery.map.scores.potential", { value: o.opportunityScore })}</span>
            <span>{t("discovery.map.scores.evidence", { value: o.evidenceScore })}</span>
            <span>{t("discovery.map.scores.value", { value: o.valueStrength ?? incomplete })}</span>
            <span>
              {t("discovery.map.scores.causal", { value: o.causalConfidence ?? incomplete })}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">
            {t("discovery.map.frontier", { frontier })}
          </p>
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mt-2 rounded p-1"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? t("discovery.map.collapseChain") : t("discovery.map.expandChain")}
          aria-expanded={expanded}
        >
          <ChevronDown className={cn("size-4 transition-transform", !expanded && "-rotate-90")} />
        </button>
      </div>

      {expanded && (
        <div className="ml-3 space-y-2 border-l pl-3">
          <Connector />
          <div className="bg-card rounded-md border p-2.5">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {t("discovery.map.node.mechanism")}
            </span>
            <p className="mt-1 text-sm">
              {o.mechanism?.trim() ? (
                o.mechanism
              ) : (
                <span className="text-muted-foreground">{t("discovery.map.mechanismUnknown")}</span>
              )}
            </p>
          </div>
          <div className="ml-3 space-y-2 border-l pl-3">
            <Connector label={t("discovery.map.valueChain")} />
            {hasChain ? (
              <ValueLadder
                opportunity={o}
                frontier={insights.frontier}
                compact
                showProblemRungs={false}
              />
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed p-2 text-xs">
                {t("discovery.map.noChain")}
              </p>
            )}
            <Connector label={t("discovery.map.experiments", { count: planned })} />
          </div>
        </div>
      )}
    </div>
  );
}

function Node({
  label,
  title,
  subtitle,
  provenance,
  onClick,
  className,
}: {
  label: string;
  title: string;
  subtitle?: string;
  provenance: GraphMarket["provenance"];
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-card hover:bg-accent w-full rounded-md border p-2.5 text-left transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
        <ProvenanceBadge provenance={provenance} className="px-1.5 py-0 text-[10px]" />
      </div>
      <p className="mt-1 text-sm font-medium">{title}</p>
      {subtitle && <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>}
    </button>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
      <span className="bg-border h-3 w-px" />
      {label && (
        <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
          {label}
        </Badge>
      )}
    </div>
  );
}
