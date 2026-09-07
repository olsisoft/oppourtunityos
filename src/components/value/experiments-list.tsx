"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteExperimentAction, updateExperimentAction } from "@/actions/value";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GraphExperiment } from "@/db/workspaces";
import { EXPERIMENT_STATUS_LABELS, ExperimentStatus } from "@/domain/enums";

export function ExperimentsList({ experiments }: { experiments: GraphExperiment[] }) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, string>>({});

  if (experiments.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No experiment planned"
        description="An experiment tests one causal link or collapse-level assumption. Plan one from the Next Best Action or from a causal link in the ladder."
      />
    );
  }

  const setStatus = async (e: GraphExperiment, status: ExperimentStatus) => {
    const r = await updateExperimentAction({
      experimentId: e.id,
      status,
      result: results[e.id] ?? e.result ?? undefined,
    });
    if (!r.ok) toast.error(r.error);
    else router.refresh();
  };

  return (
    <ul className="space-y-2">
      {experiments.map((e) => (
        <li key={e.id} className="bg-card rounded-lg border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{e.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">Hypothesis: {e.hypothesis}</p>
              {e.design && (
                <p className="text-muted-foreground mt-0.5 text-xs">Design: {e.design}</p>
              )}
              {e.successMetric && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Success metric: {e.successMetric}
                </p>
              )}
            </div>
            <Badge
              variant={
                e.status === "COMPLETED" ? "positive" : e.status === "ABANDONED" ? "muted" : "info"
              }
            >
              {EXPERIMENT_STATUS_LABELS[e.status]}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Select value={e.status} onValueChange={(v) => setStatus(e, v as ExperimentStatus)}>
              <SelectTrigger size="sm" className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ExperimentStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {EXPERIMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Delete experiment"
              onClick={async () => {
                const r = await deleteExperimentAction(e.id);
                if (!r.ok) toast.error(r.error);
                else router.refresh();
              }}
            >
              <Trash2 />
            </Button>
          </div>
          {(e.status === "RUNNING" || e.status === "COMPLETED") && (
            <div className="mt-2 space-y-1">
              <Textarea
                rows={2}
                value={results[e.id] ?? e.result ?? ""}
                onChange={(ev) => setResults({ ...results, [e.id]: ev.target.value })}
                placeholder="Result (what was observed, with numbers)…"
              />
              <p className="text-muted-foreground text-[11px]">
                A result is not evidence until it is captured in the Evidence tab and linked to the
                causal link it tested. The frontier moves only then.
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
