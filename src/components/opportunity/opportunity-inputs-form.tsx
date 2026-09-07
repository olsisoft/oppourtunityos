"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateOpportunityAction } from "@/actions/opportunities";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  computeOpportunityScore,
  OPPORTUNITY_INPUT_HELP,
  OPPORTUNITY_INPUT_LABELS,
  OPPORTUNITY_WEIGHTS,
  type OpportunityInputKey,
  type OpportunityScoreInputs,
} from "@/services/scoring/opportunity-score";

export function InputsEditor({
  value,
  onChange,
}: {
  value: OpportunityScoreInputs;
  onChange: (next: OpportunityScoreInputs) => void;
}) {
  const preview = useMemo(() => computeOpportunityScore(value), [value]);
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider uppercase">Scoring inputs (0–10)</p>
        <span className="font-mono text-sm tabular-nums">
          Potential preview <span className="font-semibold">{preview.score}</span>/100
        </span>
      </div>
      {(Object.keys(OPPORTUNITY_WEIGHTS) as OpportunityInputKey[]).map((key) => (
        <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    className="cursor-help text-xs font-medium underline decoration-dotted underline-offset-2"
                    htmlFor={`input-${key}`}
                  >
                    {OPPORTUNITY_INPUT_LABELS[key]}
                  </label>
                </TooltipTrigger>
                <TooltipContent>{OPPORTUNITY_INPUT_HELP[key]}</TooltipContent>
              </Tooltip>
              <span className="text-muted-foreground text-[10px]">
                {Math.round(OPPORTUNITY_WEIGHTS[key] * 100)}%
              </span>
            </div>
            <input
              id={`input-${key}`}
              type="range"
              min={0}
              max={10}
              step={1}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
              className="mt-1 w-full accent-current"
            />
          </div>
          <span className="w-8 text-right font-mono text-sm tabular-nums">{value[key]}</span>
        </div>
      ))}
    </div>
  );
}

export function OpportunityInputsForm({
  opportunityId,
  initial,
}: {
  opportunityId: string;
  initial: OpportunityScoreInputs;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    const r = await updateOpportunityAction({ opportunityId, inputs: value });
    setSaving(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Inputs saved — scores recomputed");
      router.refresh();
    }
  };

  return (
    <div className="space-y-3">
      <InputsEditor value={value} onChange={setValue} />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Editing inputs marks them as yours (provenance USER). The verdict is recomputed by the
          rule engine.
        </p>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="animate-spin" />} Save inputs
        </Button>
      </div>
    </div>
  );
}
