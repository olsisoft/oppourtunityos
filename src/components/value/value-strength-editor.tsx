"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateValueDimensionsAction } from "@/actions/value";
import { FieldStatusBadge } from "@/components/value/epistemic-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OpportunityWithRelations } from "@/db/workspaces";
import type { FieldStatus } from "@/services/value/variable-semantics";
import {
  computeValueStrength,
  VALUE_DIMENSION_HELP,
  VALUE_DIMENSION_LABELS,
  VALUE_DIMENSIONS,
  type ValueDimension,
} from "@/services/value/value-strength";

type Dims = Record<ValueDimension, number | null>;

export function dimsOf(o: OpportunityWithRelations): Dims {
  return {
    importance: o.vsImportance,
    magnitude: o.vsMagnitude,
    frequency: o.vsFrequency,
    population: o.vsPopulation,
    attributability: o.vsAttributability,
  };
}

export function ValueStrengthEditor({ opportunity: o }: { opportunity: OpportunityWithRelations }) {
  const router = useRouter();
  const initial = useMemo(() => dimsOf(o), [o]);
  const [dims, setDims] = useState<Dims>(initial);
  const [saving, setSaving] = useState(false);
  const provenance = (o.valueDimensionProvenance as Record<string, string> | null) ?? {};
  const preview = useMemo(() => computeValueStrength(dims), [dims]);
  const dirty = JSON.stringify(dims) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    const r = await updateValueDimensionsAction({ opportunityId: o.id, ...dims });
    setSaving(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Dimensions saved — Value Strength recomputed");
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider uppercase">
          Value Strength dimensions (0–10)
        </p>
        <span className="font-mono text-sm tabular-nums">
          {preview.status === "COMPLETE" ? (
            <>
              Preview <span className="font-semibold">{preview.score}</span>/100
            </>
          ) : (
            <span className="text-tone-warning font-semibold">INCOMPLETE</span>
          )}
        </span>
      </div>
      {VALUE_DIMENSIONS.map((key) => {
        const value = dims[key];
        const status: FieldStatus =
          value === null ? "UNKNOWN" : ((provenance[key] as FieldStatus | undefined) ?? "USER");
        return (
          <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-xs font-medium underline decoration-dotted underline-offset-2">
                      {VALUE_DIMENSION_LABELS[key]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{VALUE_DIMENSION_HELP[key]}</TooltipContent>
                </Tooltip>
                <FieldStatusBadge status={status} />
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={value ?? 5}
                disabled={value === null}
                onChange={(e) => setDims({ ...dims, [key]: Number(e.target.value) })}
                className="mt-1 w-full accent-current disabled:opacity-30"
                aria-label={VALUE_DIMENSION_LABELS[key]}
              />
            </div>
            <div className="flex w-28 items-center justify-end gap-2">
              <span className="font-mono text-sm tabular-nums">{value === null ? "—" : value}</span>
              <label className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Checkbox
                  checked={value === null}
                  onCheckedChange={(c) => setDims({ ...dims, [key]: c ? null : 5 })}
                />{" "}
                unknown
              </label>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          {preview.status === "INCOMPLETE"
            ? `Needs validation: ${preview.missing.map((m) => VALUE_DIMENSION_LABELS[m]).join(", ")}. UNKNOWN is never estimated.`
            : "Geometric mean: one weak dimension pulls the score down hard."}
        </p>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="animate-spin" />} Save dimensions
        </Button>
      </div>
    </div>
  );
}
