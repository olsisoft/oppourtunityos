"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { frontierText } from "@/components/value/scorecard";
import { ValueLadder } from "@/components/value/value-ladder";
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
  if (graph.markets.length === 0) {
    return (
      <EmptyState
        title="No market yet"
        description="The map fills itself as the conversation progresses: Market → ICP → Variables → Pains → Opportunities → Mechanism → Value chain."
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

function stateLine(variable: GraphVariable): string {
  const current = variable.currentState?.trim();
  const desired = variable.desiredState?.trim();
  const cur = current
    ? `current ${current} (${fieldStatus(variable, "currentState").toLowerCase().replace("_", " ")})`
    : "current UNKNOWN";
  const des = desired
    ? `desired ${desired} (${fieldStatus(variable, "desiredState").toLowerCase().replace("_", " ")})`
    : "desired UNKNOWN";
  const type = variable.variableType?.trim() ? `type ${variable.variableType}` : "type UNKNOWN";
  const parent = variable.parent ? ` · parent ${variable.parent.name}` : "";
  return `${DIRECTION_LABELS[variable.desiredDirection]} · ${type} · importance ${variable.importanceScore}/10 · ${cur} · ${des}${parent}`;
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
          label="Valuable variable"
          title={compactLabel(variable.desiredDirection, variable.name)}
          subtitle={stateLine(variable)}
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
  const [expanded, setExpanded] = useState(false);
  const insights = deriveOpportunityInsights(o, mechanismCount);
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
              Opportunity
            </span>
            <VerdictBadge verdict={o.verdict} />
          </div>
          <p className="mt-1 text-sm font-medium">{o.title}</p>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs tabular-nums">
            <span>potential {o.opportunityScore}</span>
            <span>evidence {o.evidenceScore}</span>
            <span>value {o.valueStrength ?? "INCOMPLETE"}</span>
            <span>causal {o.causalConfidence ?? "INCOMPLETE"}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Proof frontier · {frontierText(o.proofFrontierRung)}
          </p>
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mt-2 rounded p-1"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse value chain" : "Expand value chain"}
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
              Mechanism
            </span>
            <p className="mt-1 text-sm">
              {o.mechanism?.trim() ? (
                o.mechanism
              ) : (
                <span className="text-muted-foreground">
                  UNKNOWN — no mechanism chosen yet. Problem ≠ product.
                </span>
              )}
            </p>
          </div>
          <div className="ml-3 space-y-2 border-l pl-3">
            <Connector label="Value chain" />
            {hasChain ? (
              <ValueLadder
                opportunity={o}
                frontier={insights.frontier}
                compact
                showProblemRungs={false}
              />
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed p-2 text-xs">
                No value chain stated yet. Open the Value tab to state how the mechanism creates
                value: Mechanism → Capability → Transformation → Operational → Economic → Strategic.
              </p>
            )}
            <Connector
              label={
                planned
                  ? `${planned} experiment${planned === 1 ? "" : "s"}`
                  : "No experiment planned"
              }
            />
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
