"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { completeExperimentAction, type ExperimentCompletion } from "@/actions/value";
import { claimTargetsFor, type ClaimTarget } from "@/components/evidence/claim-targets";
import { FrontierMovementCard } from "@/components/value/frontier-movement-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GraphExperiment, OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import {
  EXPERIMENT_OUTCOME_LABELS,
  EXPERIMENT_OUTCOME_TONE,
  ExperimentOutcome,
} from "@/domain/enums";
import { cn } from "@/lib/utils";
import { classifyOutcome } from "@/services/value/experiment-outcome";

type Direction = "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";

/**
 * Record what happened. The outcome is decided by the experiment's thresholds
 * when they exist (shown read-only); otherwise you classify it explicitly or
 * it stays INCONCLUSIVE. The result becomes evidence and the engine updates
 * claims, the frontier and the verdict; the change is shown right after.
 */
export function ExperimentResultDialog({
  open,
  onOpenChange,
  experiment: exp,
  opportunity: o,
  graph,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  experiment: GraphExperiment;
  opportunity: OpportunityWithRelations;
  graph?: WorkspaceGraph;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<ExperimentCompletion | null>(null);
  const [form, setForm] = useState({
    observedMetric: exp.successMetric ?? "",
    observedValue: "",
    unit: exp.unit ?? "",
    sampleSize: exp.sampleSize?.toString() ?? "",
    measurementPeriod: exp.duration ?? "",
    resultSummary: "",
    limitations: "",
    confounders: "",
    anomalies: "",
    enteredBy: exp.owner ?? "",
    outcome: "" as ExperimentOutcome | "",
    strengthScore: 6,
    relevanceScore: 8,
    isDirectCustomer:
      exp.experimentType === "CUSTOMER_INTERVIEW" ||
      exp.experimentType === "CONCIERGE_TEST" ||
      exp.experimentType === "PRICING_TEST",
    hasEconomicImpact: false,
    hasPurchaseIntent: exp.experimentType === "PRICING_TEST",
  });
  const [claims, setClaims] = useState<Record<string, Direction>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const hasThresholds = exp.successThreshold !== null && exp.failureThreshold !== null;
  const decided = useMemo(
    () =>
      classifyOutcome({
        observedValue: form.observedValue === "" ? null : Number(form.observedValue),
        successThreshold: exp.successThreshold,
        failureThreshold: exp.failureThreshold,
      }),
    [form.observedValue, exp.successThreshold, exp.failureThreshold],
  );
  const effectiveOutcome: ExperimentOutcome | null =
    form.outcome === "INVALID" ? "INVALID" : decided ? decided.outcome : form.outcome || null;

  const targets = useMemo(() => (graph ? claimTargetsFor(graph, o.id) : []), [graph, o.id]);
  const extraTargets = targets.filter(
    (t) => t.causalLinkId !== exp.causalLinkId && t.valueChainNodeId !== exp.valueChainNodeId,
  );
  const toggle = (t: ClaimTarget) =>
    setClaims((c) => {
      const next = { ...c };
      if (next[t.key]) delete next[t.key];
      else
        next[t.key] =
          effectiveOutcome === "CONTRADICTED"
            ? "CONTRADICTS"
            : effectiveOutcome === "SUPPORTED"
              ? "SUPPORTS"
              : "NEUTRAL";
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await completeExperimentAction({
      experimentId: exp.id,
      outcome: hasThresholds && form.outcome !== "INVALID" ? undefined : form.outcome || undefined,
      observedMetric: form.observedMetric,
      observedValue: form.observedValue,
      unit: form.unit,
      sampleSize: form.sampleSize,
      measurementPeriod: form.measurementPeriod,
      resultSummary: form.resultSummary,
      limitations: form.limitations,
      confounders: form.confounders,
      anomalies: form.anomalies,
      enteredBy: form.enteredBy,
      strengthScore: form.strengthScore,
      relevanceScore: form.relevanceScore,
      isDirectCustomer: form.isDirectCustomer,
      hasEconomicImpact: form.hasEconomicImpact,
      hasPurchaseIntent: form.hasPurchaseIntent,
      claims: extraTargets
        .filter((t) => claims[t.key])
        .map((t) => ({
          claimType: t.claimType,
          opportunityId: o.id,
          valueChainNodeId: t.valueChainNodeId,
          causalLinkId: t.causalLinkId,
          direction: claims[t.key],
        })),
    });
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setDone(r.data);
    router.refresh();
  };

  const observedText =
    form.observedValue !== ""
      ? `${form.observedMetric || "value"}: ${form.observedValue}${form.unit ? ` ${form.unit}` : ""}`
      : form.observedMetric || null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDone(null);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {done ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>What the last test changed</DialogTitle>
              <DialogDescription>
                The result is now evidence (type EXPERIMENT) with its methodology and limitations.
                Claims, the Proof Frontier, the scores and the verdict were recomputed.
              </DialogDescription>
            </DialogHeader>
            <FrontierMovementCard
              title={exp.title}
              outcome={done.outcome}
              outcomeExplanation={done.outcomeExplanation}
              observed={observedText}
              diff={done.diff}
              before={done.before}
              after={done.after}
              nextAction={done.nextAction?.what ?? null}
            />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Record the result — {exp.title}</DialogTitle>
              <DialogDescription>
                Hypothesis: {exp.hypothesis}
                {exp.decisionQuestion ? ` · Decision: ${exp.decisionQuestion}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-3">
              <L label="Observed metric">
                <Input
                  value={form.observedMetric}
                  onChange={(e) => set("observedMetric", e.target.value)}
                  placeholder={exp.successMetric ?? "e.g. no-show rate"}
                />
              </L>
              <L label="Observed value">
                <Input
                  type="number"
                  step="any"
                  value={form.observedValue}
                  onChange={(e) => set("observedValue", e.target.value)}
                />
              </L>
              <L label="Unit">
                <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} />
              </L>
              <L label="Sample size">
                <Input
                  type="number"
                  min={0}
                  value={form.sampleSize}
                  onChange={(e) => set("sampleSize", e.target.value)}
                />
              </L>
              <L label="Measurement period">
                <Input
                  value={form.measurementPeriod}
                  onChange={(e) => set("measurementPeriod", e.target.value)}
                  placeholder="2 weeks, 5 salons"
                />
              </L>
              <L label="Entered by">
                <Input value={form.enteredBy} onChange={(e) => set("enteredBy", e.target.value)} />
              </L>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-[10px] font-semibold tracking-wider uppercase">Outcome</p>
              {hasThresholds ? (
                <div className="mt-1 text-xs">
                  <p className="text-muted-foreground">
                    Decided by the thresholds you configured (success {exp.successThreshold}
                    {exp.unit ? ` ${exp.unit}` : ""}, failure {exp.failureThreshold}
                    {exp.unit ? ` ${exp.unit}` : ""}). Enter the observed value.
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {decided ? (
                      <>
                        <Badge variant={EXPERIMENT_OUTCOME_TONE[decided.outcome]}>
                          {EXPERIMENT_OUTCOME_LABELS[decided.outcome]}
                        </Badge>
                        <span className="text-muted-foreground">{decided.explanation}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Waiting for an observed value…</span>
                    )}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.outcome === "INVALID"}
                      onCheckedChange={(v) => set("outcome", v ? "INVALID" : "")}
                    />
                    Declare this run INVALID (cannot be trusted; produces no evidence)
                  </label>
                </div>
              ) : (
                <div className="mt-1 space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    No deterministic threshold was configured, so you classify the outcome
                    explicitly. Leave it empty to record it as INCONCLUSIVE.
                  </p>
                  <Select
                    value={form.outcome || "__none__"}
                    onValueChange={(v) =>
                      set("outcome", v === "__none__" ? "" : (v as ExperimentOutcome))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="INCONCLUSIVE" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Inconclusive (default)</SelectItem>
                      {Object.values(ExperimentOutcome).map((oc) => (
                        <SelectItem key={oc} value={oc}>
                          {EXPERIMENT_OUTCOME_LABELS[oc]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <L label="Result summary (what happened, with numbers)">
              <Textarea
                rows={3}
                value={form.resultSummary}
                onChange={(e) => set("resultSummary", e.target.value)}
                required
                minLength={3}
              />
            </L>
            <div className="grid gap-3 sm:grid-cols-3">
              <L label="Limitations">
                <Textarea
                  rows={2}
                  value={form.limitations}
                  onChange={(e) => set("limitations", e.target.value)}
                />
              </L>
              <L label="Confounders">
                <Textarea
                  rows={2}
                  value={form.confounders}
                  onChange={(e) => set("confounders", e.target.value)}
                />
              </L>
              <L label="Anomalies">
                <Textarea
                  rows={2}
                  value={form.anomalies}
                  onChange={(e) => set("anomalies", e.target.value)}
                />
              </L>
            </div>

            {effectiveOutcome !== "INVALID" && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-[10px] font-semibold tracking-wider uppercase">
                  Evidence signals
                </p>
                <p className="text-muted-foreground text-xs">
                  The result is stored as evidence. Tick only what the run actually shows; the
                  strength you give it is a judgement, labelled as yours.
                </p>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.isDirectCustomer}
                      onCheckedChange={(v) => set("isDirectCustomer", Boolean(v))}
                    />{" "}
                    Real customers involved
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.hasEconomicImpact}
                      onCheckedChange={(v) => set("hasEconomicImpact", Boolean(v))}
                    />{" "}
                    Quantifies economic impact
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.hasPurchaseIntent}
                      onCheckedChange={(v) => set("hasPurchaseIntent", Boolean(v))}
                    />{" "}
                    Shows purchase intent
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <L label={`Strength ${form.strengthScore}/10`}>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={form.strengthScore}
                      onChange={(e) => set("strengthScore", Number(e.target.value))}
                      className="w-full accent-current"
                    />
                  </L>
                  <L label={`Relevance ${form.relevanceScore}/10`}>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={form.relevanceScore}
                      onChange={(e) => set("relevanceScore", Number(e.target.value))}
                      className="w-full accent-current"
                    />
                  </L>
                </div>
                {extraTargets.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Other claims this result speaks to (optional)
                    </p>
                    <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                      {extraTargets.map((t) => (
                        <li
                          key={t.key}
                          className={cn(
                            "flex items-start gap-2 rounded-md border px-2 py-1 text-xs",
                            claims[t.key] && "border-foreground",
                          )}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={Boolean(claims[t.key])}
                            onCheckedChange={() => toggle(t)}
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{t.label}</span>
                            {claims[t.key] && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {claims[t.key].toLowerCase()}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="items-center sm:justify-between">
              <span className="text-muted-foreground text-[11px]">
                {effectiveOutcome
                  ? `Will be recorded as ${EXPERIMENT_OUTCOME_LABELS[effectiveOutcome]}.`
                  : "Will be recorded as Inconclusive."}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} Record result
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
