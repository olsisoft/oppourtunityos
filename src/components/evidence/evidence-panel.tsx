"use client";

import { useState } from "react";
import { FileSearch, Plus, Search } from "lucide-react";

import { AddEvidenceDialog } from "@/components/evidence/add-evidence-dialog";
import { EvidenceItem } from "@/components/evidence/evidence-item";
import { ResearchDialog } from "@/components/evidence/research-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { WorkspaceGraph } from "@/db/workspaces";
import { useT } from "@/i18n/client";

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
  defaultOpportunityId,
}: {
  graph: WorkspaceGraph;
  compact?: boolean;
  /** Pre-selects the opportunity in the add dialog (used on the report page). */
  defaultOpportunityId?: string;
}) {
  const t = useT();
  const [addOpen, setAddOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const pains = painOptions(graph);
  const opportunities = graph.opportunities.map((o) => ({ id: o.id, label: o.title }));
  const strongest = [...graph.opportunities].sort(
    (a, b) => b.opportunityScore - a.opportunityScore,
  )[0];

  const emptyDescription =
    strongest && strongest.opportunityScore >= 60
      ? t("evidence.panel.emptyStrong", {
          title: strongest.title,
          score: strongest.opportunityScore,
        })
      : t("evidence.panel.emptyDefault");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {t("evidence.panel.count", { count: graph.evidence.length })}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setResearchOpen(true)}>
            <Search /> {t("evidence.panel.research")}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus /> {t("evidence.panel.add")}
          </Button>
        </div>
      </div>
      {graph.evidence.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={t("evidence.panel.emptyTitle")}
          description={emptyDescription}
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus /> {t("evidence.panel.addFirst")}
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
        graph={graph}
        defaultOpportunityId={defaultOpportunityId}
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
