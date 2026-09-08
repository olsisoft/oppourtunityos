"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { Badge } from "@/components/ui/badge";
import type { GraphVariable, WorkspaceGraph } from "@/db/workspaces";
import { useT } from "@/i18n/client";

/** Evidence count behind a variable and the badge tone; the label is discovery.variables.evidenceCount. */
export function evidenceLevel(variable: GraphVariable): {
  count: number;
  tone: "muted" | "warning" | "positive";
} {
  const count = variable.pains.reduce((s, p) => s + p.evidence.length, 0);
  if (count === 0) return { count, tone: "muted" };
  if (count < 3) return { count, tone: "warning" };
  return { count, tone: "positive" };
}

export function VariableMap({
  graph,
  onSelect,
}: {
  graph: WorkspaceGraph;
  onSelect: (variable: GraphVariable) => void;
}) {
  const t = useT();
  const variables = graph.markets
    .flatMap((m) => m.icps.flatMap((i) => i.variables.map((v) => ({ v, icp: i.name }))))
    .sort((a, b) => b.v.importanceScore - a.v.importanceScore);

  if (variables.length === 0) {
    return (
      <EmptyState
        title={t("discovery.variables.empty.title")}
        description={t("discovery.variables.empty.description")}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {variables.map(({ v, icp }) => {
        const level = evidenceLevel(v);
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelect(v)}
              className="bg-card hover:bg-accent w-full rounded-md border p-3 text-left transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {t(`labels.direction.${v.desiredDirection}`)} ·{" "}
                    {t(`labels.variableCategory.${v.category}`)} · {icp}
                  </p>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {v.importanceScore * 10}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-foreground h-full"
                    style={{ width: `${v.importanceScore * 10}%` }}
                  />
                </div>
                <Badge variant={level.tone} className="px-1.5 py-0 text-[10px]">
                  {t("discovery.variables.evidenceCount", { count: level.count })}
                </Badge>
                <ProvenanceBadge provenance={v.provenance} className="px-1.5 py-0 text-[10px]" />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
