"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import type {
  GraphIcp,
  GraphMarket,
  GraphPain,
  GraphVariable,
  OpportunityWithRelations,
  WorkspaceGraph,
} from "@/db/workspaces";
import { DIRECTION_LABELS } from "@/domain/enums";
import { cn, truncate } from "@/lib/utils";

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
  if (graph.markets.length === 0) {
    return (
      <EmptyState
        title="No market yet"
        description="The map fills itself as the conversation progresses: Market → ICP → Variables → Pains → Opportunities."
      />
    );
  }
  return (
    <div className="space-y-3">
      {graph.markets.map((market) => (
        <MarketNode key={market.id} market={market} graph={graph} onSelect={onSelect} />
      ))}
      {graph.markets.length > 0 && graph.opportunities.length === 0 && (
        <p className="text-muted-foreground px-1 text-xs">
          No opportunity formed yet. Opportunities appear once ICP, variable and pain are known.
        </p>
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
  return (
    <div className="space-y-2">
      <Node
        label="Market"
        title={market.name}
        provenance={market.provenance}
        onClick={() => onSelect({ kind: "market", item: market })}
      />
      {market.icps.length === 0 && <Connector label="ICP pending" />}
      {market.icps.map((icp) => (
        <div key={icp.id} className="ml-3 space-y-2 border-l pl-3">
          <Connector />
          <Node
            label="ICP"
            title={icp.name}
            subtitle={[icp.role, icp.companySize].filter(Boolean).join(" · ") || undefined}
            provenance={icp.provenance}
            onClick={() => onSelect({ kind: "icp", item: icp })}
          />
          {icp.variables.length === 0 && <Connector label="Variables pending" />}
          {icp.variables.map((variable) => (
            <VariableNode key={variable.id} variable={variable} graph={graph} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
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
  const [open, setOpen] = useState(true);
  const opportunities = graph.opportunities.filter((o) => o.variableId === variable.id);
  return (
    <div className="ml-3 space-y-2 border-l pl-3">
      <Connector />
      <div className="flex items-start gap-1">
        <Node
          className="flex-1"
          label="Variable"
          title={`${DIRECTION_LABELS[variable.desiredDirection]} × ${variable.name}`}
          subtitle={`importance ${variable.importanceScore}/10`}
          provenance={variable.provenance}
          onClick={() => onSelect({ kind: "variable", item: variable })}
        />
        {(variable.pains.length > 0 || opportunities.length > 0) && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-2 rounded p-1"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
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
              label="Pain"
              title={truncate(pain.description, 90)}
              subtitle={`severity ${pain.severityScore} · frequency ${pain.frequencyScore} · ${pain.triggers.length} trigger${pain.triggers.length === 1 ? "" : "s"} · ${pain.alternatives.length} alternative${pain.alternatives.length === 1 ? "" : "s"} · ${pain.evidence.length} evidence`}
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
                onClick={() => onSelect({ kind: "opportunity", item: o })}
              />
            </div>
          ))}
    </div>
  );
}

function OpportunityNode({
  opportunity,
  onClick,
}: {
  opportunity: OpportunityWithRelations;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card hover:bg-accent w-full rounded-md border p-2.5 text-left transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Opportunity
        </span>
        <VerdictBadge verdict={opportunity.verdict} />
      </div>
      <p className="mt-1 text-sm font-medium">{opportunity.title}</p>
      <div className="text-muted-foreground mt-1 flex gap-3 font-mono text-xs tabular-nums">
        <span>potential {opportunity.opportunityScore}</span>
        <span>evidence {opportunity.evidenceScore}</span>
      </div>
    </button>
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
