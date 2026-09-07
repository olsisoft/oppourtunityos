"use client";

import { useState } from "react";

import { ValueLadder, type LadderSelection } from "@/components/value/value-ladder";
import { ValueNodeSheet } from "@/components/value/value-node-sheet";
import type { OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import type { ProofFrontierResult } from "@/services/value/proof-frontier";

/**
 * Interactive ladder for the report page: click a level or an arrow to link
 * evidence, state an assumption or plan an experiment.
 */
export function ReportLadder({
  opportunity,
  graph,
  frontier,
}: {
  opportunity: OpportunityWithRelations;
  graph: WorkspaceGraph;
  frontier: ProofFrontierResult | null;
}) {
  const [selection, setSelection] = useState<LadderSelection | null>(null);
  return (
    <>
      <ValueLadder opportunity={opportunity} frontier={frontier} onSelect={setSelection} />
      <ValueNodeSheet
        selection={selection}
        opportunity={opportunity}
        graph={graph}
        onClose={() => setSelection(null)}
      />
    </>
  );
}
