"use client";

import { useState } from "react";

import { NodeDetailSheet } from "@/components/discovery/node-detail-sheet";
import { OpportunityMap, type MapSelection } from "@/components/discovery/opportunity-map";
import { VariableMap } from "@/components/discovery/variable-map";
import { AssumptionLedger } from "@/components/assumptions/assumption-ledger";
import { EvidencePanel } from "@/components/evidence/evidence-panel";
import { OpportunityRadar } from "@/components/opportunity/opportunity-radar";
import { ValuePanel } from "@/components/value/value-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkspaceGraph } from "@/db/workspaces";

export function OpportunityPanel({ graph }: { graph: WorkspaceGraph }) {
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const evidenceCount = graph.evidence.length;
  const oppCount = graph.opportunities.length;
  const untested = graph.assumptions.filter((a) => a.status === "UNKNOWN").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs defaultValue="map" className="flex h-full min-h-0 flex-col gap-0">
        <div className="border-b px-3 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="value">Value</TabsTrigger>
            <TabsTrigger value="radar">Radar{oppCount ? ` ${oppCount}` : ""}</TabsTrigger>
            <TabsTrigger value="evidence">
              Evidence{evidenceCount ? ` ${evidenceCount}` : ""}
            </TabsTrigger>
            <TabsTrigger value="assumptions">
              Assumptions{untested ? ` ${untested}` : ""}
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto p-3">
          <TabsContent value="map">
            <p className="text-muted-foreground mb-3 text-xs">
              Market → ICP → Variable → Pain → Opportunity → Mechanism → Value chain. Click a node
              to inspect or edit it; expand an opportunity to see its ladder and Proof Frontier.
              Badges show where each fact came from.
            </p>
            <OpportunityMap graph={graph} onSelect={setSelection} />
          </TabsContent>
          <TabsContent value="variables">
            <p className="text-muted-foreground mb-3 text-xs">
              Valuable variables ranked by importance (0–100 = importance × 10). Importance is a
              hypothesis until evidence backs it.
            </p>
            <VariableMap
              graph={graph}
              onSelect={(v) => setSelection({ kind: "variable", item: v })}
            />
          </TabsContent>
          <TabsContent value="value">
            <ValuePanel graph={graph} />
          </TabsContent>
          <TabsContent value="radar">
            <OpportunityRadar graph={graph} compact />
          </TabsContent>
          <TabsContent value="evidence">
            <EvidencePanel graph={graph} />
          </TabsContent>
          <TabsContent value="assumptions">
            <AssumptionLedger graph={graph} />
          </TabsContent>
        </div>
      </Tabs>
      <NodeDetailSheet
        selection={selection}
        workspaceId={graph.id}
        graph={graph}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}
