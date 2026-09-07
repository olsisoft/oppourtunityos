"use client";

import { useState } from "react";
import { FileSearch, Plus, Search } from "lucide-react";

import { AddEvidenceDialog } from "@/components/evidence/add-evidence-dialog";
import { EvidenceItem } from "@/components/evidence/evidence-item";
import { ResearchDialog } from "@/components/evidence/research-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { WorkspaceGraph } from "@/db/workspaces";

export function painOptions(graph: WorkspaceGraph) {
  return graph.markets.flatMap((m) =>
    m.icps.flatMap((i) =>
      i.variables.flatMap((v) =>
        v.pains.map((p) => ({ id: p.id, label: `${v.name} — ${p.description}` })),
      ),
    ),
  );
}

export function EvidencePanel({
  graph,
  compact = true,
}: {
  graph: WorkspaceGraph;
  compact?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const pains = painOptions(graph);
  const opportunities = graph.opportunities.map((o) => ({ id: o.id, label: o.title }));
  const strongest = [...graph.opportunities].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  )[0];

  const emptyDescription =
    strongest && strongest.opportunityScore >= 60
      ? `High-potential hypothesis (“${strongest.title}”, ${strongest.opportunityScore}/100), but nothing has been verified. Add evidence before moving this opportunity forward.`
      : "Hypotheses are not evidence. Capture quotes, reviews, interviews and notes; Evidence Confidence is computed from them.";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {graph.evidence.length} item{graph.evidence.length === 1 ? "" : "s"}. External material
          only — hypotheses never appear here.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setResearchOpen(true)}>
            <Search /> Research
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus /> Add evidence
          </Button>
        </div>
      </div>
      {graph.evidence.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No evidence yet."
          description={emptyDescription}
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus /> Add the first evidence
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {graph.evidence.map((e) => (
            <EvidenceItem key={e.id} evidence={e} workspaceId={graph.id} compact={compact} />
          ))}
        </div>
      )}
      <AddEvidenceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaceId={graph.id}
        pains={pains}
        opportunities={opportunities}
        hypothesis={strongest?.problemStatement ?? pains[0]?.label}
      />
      <ResearchDialog
        open={researchOpen}
        onOpenChange={setResearchOpen}
        workspaceId={graph.id}
        pains={pains}
        defaultQuery={pains[0]?.label.split(" — ")[0] ?? graph.name}
      />
    </div>
  );
}
