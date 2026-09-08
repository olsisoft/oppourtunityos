"use client";

import { useRouter } from "next/navigation";
import { cloneElement, isValidElement, useId, useMemo, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createExperimentAction, updateExperimentAction } from "@/actions/value";
import { EpistemicBadge } from "@/components/value/epistemic-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { GraphExperiment, OpportunityWithRelations } from "@/db/workspaces";
import {
  ASSUMPTION_KIND_LABELS,
  ASSUMPTION_STATUS_LABELS,
  EXPERIMENT_TYPE_LABELS,
  ExperimentType,
  VALUE_CHAIN_LEVEL_LABELS,
} from "@/domain/enums";
import type { OpportunityInsights } from "@/services/scoring/opportunity-insights";
import { experimentWarnings } from "@/services/value/experiment-outcome";
import type { PlanPrefill } from "@/services/value/experiment-prefill";
import {
  ValidityChecklist,
  validityFieldsFrom,
  validityInputsFrom,
  type ValidityFormFields,
} from "@/components/value/validity-fields";
import { claimTypeForLevel, claimTypeForLink } from "@/services/value/claim-taxonomy";
import {
  defaultDesignLevel,
  DESIGN_LEVEL_LABELS,
  designProofPreview,
  parseValidityInputs,
  resolveDesignLevel,
} from "@/services/value/experimental-validity";
import { parseScope } from "@/services/value/scope";
import type { AssumptionKind, ClaimType } from "@/generated/prisma/enums";

export type { PlanPrefill };
import { PROOF_RUNG_LABELS, rungIndex } from "@/services/value/proof-frontier";

const CLAIM_BY_ASSUMPTION_KIND: Record<AssumptionKind, ClaimType> = {
  CAUSAL: "CAUSAL_EFFECT",
  VALUE: "ECONOMIC_IMPACT",
  FEASIBILITY: "MECHANISM_FEASIBLE",
  WTP: "WILLINGNESS_TO_PAY",
  ACCESS: "BUYER_REACHABILITY",
  GENERIC: "OTHER",
};

const NONE = "__none__";

interface PlanForm {
  title: string;
  experimentType: ExperimentType;
  hypothesis: string;
  decisionQuestion: string;
  target: string;
  design: string;
  successMetric: string;
  successThreshold: string;
  failureThreshold: string;
  unit: string;
  population: string;
  sampleSize: string;
  duration: string;
  decisionImpact: string;
  expectedInformationGain: string;
  effort: string;
  costEstimate: string;
  timeEstimate: string;
  owner: string;
  notes: string;
}

function targetKey(p: {
  causalLinkId?: string | null;
  assumptionId?: string | null;
  valueChainNodeId?: string | null;
}) {
  if (p.causalLinkId) return `link:${p.causalLinkId}`;
  if (p.assumptionId) return `assumption:${p.assumptionId}`;
  if (p.valueChainNodeId) return `node:${p.valueChainNodeId}`;
  return NONE;
}

function splitTarget(key: string) {
  const [kind, id] = key.split(":");
  return {
    causalLinkId: kind === "link" ? id : "",
    assumptionId: kind === "assumption" ? id : "",
    valueChainNodeId: kind === "node" ? id : "",
  };
}

/**
 * Plan (or edit) an experiment. Shows, before it runs, what is being tested,
 * its current status, what it blocks, the current Proof Frontier and the
 * movement to expect if the result supports or contradicts the hypothesis.
 */
export function ExperimentPlanDialog({
  open,
  onOpenChange,
  opportunity: o,
  insights,
  prefill,
  experiment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunity: OpportunityWithRelations;
  insights: OpportunityInsights;
  prefill?: PlanPrefill;
  /** Edit mode. */
  experiment?: GraphExperiment | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [designTouched, setDesignTouched] = useState(Boolean(experiment?.designLevel));
  const [validity, setValidity] = useState<ValidityFormFields>(() =>
    validityFieldsFrom(
      experiment?.designLevel ??
        defaultDesignLevel(experiment?.experimentType ?? prefill?.experimentType ?? "OTHER"),
      parseValidityInputs(experiment?.validityPlan),
    ),
  );
  const [scope, setScope] = useState(() => {
    const sc = parseScope(experiment?.scope);
    return {
      scopeSystems: sc?.systems?.join(", ") ?? "",
      scopeEnvironment: sc?.environment ?? "",
      scopeTimePeriod: sc?.timePeriod ?? "",
      scopeConditions: sc?.conditions ?? "",
    };
  });
  const setV = <K extends keyof ValidityFormFields>(k: K, v: ValidityFormFields[K]) => {
    if (k === "designLevel") setDesignTouched(true);
    setValidity((f) => ({ ...f, [k]: v }));
  };
  const [form, setForm] = useState<PlanForm>(() => ({
    title: experiment?.title ?? prefill?.title ?? "",
    experimentType: experiment?.experimentType ?? prefill?.experimentType ?? "OTHER",
    hypothesis: experiment?.hypothesis ?? prefill?.hypothesis ?? "",
    decisionQuestion: experiment?.decisionQuestion ?? prefill?.decisionQuestion ?? "",
    target: targetKey(experiment ?? prefill ?? {}),
    design: experiment?.design ?? prefill?.design ?? "",
    successMetric: experiment?.successMetric ?? prefill?.successMetric ?? "",
    successThreshold: experiment?.successThreshold?.toString() ?? "",
    failureThreshold: experiment?.failureThreshold?.toString() ?? "",
    unit: experiment?.unit ?? "",
    population: experiment?.population ?? "",
    sampleSize: experiment?.sampleSize?.toString() ?? "",
    duration: experiment?.duration ?? "",
    decisionImpact: experiment?.decisionImpact?.toString() ?? "",
    expectedInformationGain: experiment?.expectedInformationGain?.toString() ?? "",
    effort: experiment?.effort?.toString() ?? "",
    costEstimate: experiment?.costEstimate ?? "",
    timeEstimate: experiment?.timeEstimate ?? "",
    owner: experiment?.owner ?? "",
    notes: experiment?.notes ?? "",
  }));
  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "experimentType" && !designTouched)
      setValidity((f) => ({ ...f, designLevel: defaultDesignLevel(v as ExperimentType) }));
  };
  const ids = splitTarget(form.target);

  const link = o.causalLinks.find((l) => l.id === ids.causalLinkId) ?? null;
  const assumption = o.assumptions.find((a) => a.id === ids.assumptionId) ?? null;
  const node = o.valueChainNodes.find((n) => n.id === ids.valueChainNodeId) ?? null;
  const assumptionLink = assumption?.causalLinkId
    ? (o.causalLinks.find((l) => l.id === assumption.causalLinkId) ?? null)
    : null;
  const affectedLink = link ?? assumptionLink;

  const frontier = insights.frontier;
  const blockedRung = frontier?.blockedAt?.rung ?? null;
  const expected = useMemo(() => {
    const current = PROOF_RUNG_LABELS[frontier?.frontier ?? "NONE"];
    if (affectedLink) {
      const to = affectedLink.toNode.level;
      const movesFrontier = blockedRung === to;
      return {
        ifSupported: movesFrontier
          ? `Proof Frontier may move ${current} → ${VALUE_CHAIN_LEVEL_LABELS[to]} (if no other blocker remains on that level).`
          : rungIndex(to) <= rungIndex(frontier?.frontier ?? "NONE")
            ? `Strengthens ${VALUE_CHAIN_LEVEL_LABELS[affectedLink.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[to]}; the frontier is already beyond it.`
            : `Strengthens ${VALUE_CHAIN_LEVEL_LABELS[affectedLink.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[to]}; the frontier cannot reach it until ${frontier?.blockedAt?.label ?? "the earlier gap"} is resolved.`,
        ifContradicted: `The link ${VALUE_CHAIN_LEVEL_LABELS[affectedLink.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[to]} becomes CONTRADICTED: everything downstream stays a hypothesis and the frontier can move back.`,
      };
    }
    if (node) {
      const movesFrontier = blockedRung === node.level;
      return {
        ifSupported: movesFrontier
          ? `Proof Frontier may move ${current} → ${VALUE_CHAIN_LEVEL_LABELS[node.level]}.`
          : `Strengthens the ${VALUE_CHAIN_LEVEL_LABELS[node.level]} level.`,
        ifContradicted: `The ${VALUE_CHAIN_LEVEL_LABELS[node.level]} level becomes CONTRADICTED.`,
      };
    }
    if (assumption) {
      return {
        ifSupported: `The ${ASSUMPTION_KIND_LABELS[assumption.kind].toLowerCase()} becomes SUPPORTED; it no longer blocks any link it is attached to.`,
        ifContradicted:
          assumption.kind === "CAUSAL"
            ? "The product hypothesis collapses: the mechanism would not move the variable."
            : assumption.kind === "VALUE"
              ? "The opportunity collapses: moving the variable would not create enough value."
              : assumption.kind === "FEASIBILITY"
                ? "The current product mechanism becomes infeasible."
                : assumption.kind === "WTP"
                  ? "The problem may be real but nobody pays: the business case collapses."
                  : "A load-bearing belief is false; the opportunity must be re-examined.",
      };
    }
    return null;
  }, [affectedLink, node, assumption, blockedRung, frontier]);

  const targetClaim: ClaimType | null = link
    ? claimTypeForLink(link.fromNode.level, link.toNode.level)
    : node
      ? claimTypeForLevel(node.level)
      : assumption
        ? CLAIM_BY_ASSUMPTION_KIND[assumption.kind]
        : null;
  const planInputs = validityInputsFrom(validity);
  const resolved = resolveDesignLevel(validity.designLevel, planInputs);
  const preview = designProofPreview(form.experimentType, resolved.effective, targetClaim);

  const warnings = experimentWarnings({
    decisionQuestion: form.decisionQuestion,
    causalLinkId: ids.causalLinkId || null,
    assumptionId: ids.assumptionId || null,
    valueChainNodeId: ids.valueChainNodeId || null,
    successThreshold: form.successThreshold === "" ? null : Number(form.successThreshold),
    failureThreshold: form.failureThreshold === "" ? null : Number(form.failureThreshold),
    unit: form.unit,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      experimentType: form.experimentType,
      hypothesis: form.hypothesis,
      decisionQuestion: form.decisionQuestion,
      causalLinkId: ids.causalLinkId,
      assumptionId: ids.assumptionId,
      valueChainNodeId: ids.valueChainNodeId,
      design: form.design,
      successMetric: form.successMetric,
      successThreshold: form.successThreshold,
      failureThreshold: form.failureThreshold,
      unit: form.unit,
      population: form.population,
      sampleSize: form.sampleSize,
      duration: form.duration,
      decisionImpact: form.decisionImpact,
      expectedInformationGain: form.expectedInformationGain,
      effort: form.effort,
      costEstimate: form.costEstimate,
      timeEstimate: form.timeEstimate,
      owner: form.owner,
      notes: form.notes,
      designLevel: validity.designLevel,
      ...planInputs,
      ...scope,
    };
    const r = experiment
      ? await updateExperimentAction({ experimentId: experiment.id, ...payload })
      : await createExperimentAction({ opportunityId: o.id, ...payload });
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(experiment ? "Experiment updated" : "Experiment planned");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{experiment ? "Edit experiment" : "Plan an experiment"}</DialogTitle>
            <DialogDescription>
              An experiment tests one assumption, causal link or value chain level and must say what
              decision becomes easier afterwards. Its result becomes evidence; the engine decides
              what that proves.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <L label="Title">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </L>
              <div className="grid grid-cols-2 gap-3">
                <L label="Type">
                  <Select
                    value={form.experimentType}
                    onValueChange={(v) => set("experimentType", v as ExperimentType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ExperimentType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {EXPERIMENT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </L>
                <L label="What it tests">
                  <Select value={form.target} onValueChange={(v) => set("target", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— nothing yet —</SelectItem>
                      {o.assumptions
                        .filter((a) => a.status !== "SUPPORTED")
                        .map((a) => (
                          <SelectItem key={a.id} value={`assumption:${a.id}`}>
                            {ASSUMPTION_KIND_LABELS[a.kind]}: {a.statement.slice(0, 70)}
                          </SelectItem>
                        ))}
                      {o.causalLinks.map((l) => (
                        <SelectItem key={l.id} value={`link:${l.id}`}>
                          Link {VALUE_CHAIN_LEVEL_LABELS[l.fromNode.level]} →{" "}
                          {VALUE_CHAIN_LEVEL_LABELS[l.toNode.level]}
                        </SelectItem>
                      ))}
                      {o.valueChainNodes.map((n) => (
                        <SelectItem key={n.id} value={`node:${n.id}`}>
                          Level {VALUE_CHAIN_LEVEL_LABELS[n.level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </L>
              </div>
              <L label="Hypothesis (falsifiable)">
                <Textarea
                  rows={2}
                  value={form.hypothesis}
                  onChange={(e) => set("hypothesis", e.target.value)}
                  required
                  minLength={3}
                />
              </L>
              <L label="Decision question — what decision becomes easier after this experiment?">
                <Input
                  value={form.decisionQuestion}
                  onChange={(e) => set("decisionQuestion", e.target.value)}
                  placeholder='e.g. "Can we build the reconciliation mechanism?"'
                />
              </L>
              <L label="Design">
                <Textarea
                  rows={2}
                  value={form.design}
                  onChange={(e) => set("design", e.target.value)}
                />
              </L>
              <div className="grid grid-cols-3 gap-3">
                <L label="Success metric">
                  <Input
                    value={form.successMetric}
                    onChange={(e) => set("successMetric", e.target.value)}
                    placeholder="no-show rate"
                  />
                </L>
                <L label="Success threshold">
                  <Input
                    type="number"
                    step="any"
                    value={form.successThreshold}
                    onChange={(e) => set("successThreshold", e.target.value)}
                    placeholder="≤ 10"
                  />
                </L>
                <L label="Failure threshold">
                  <Input
                    type="number"
                    step="any"
                    value={form.failureThreshold}
                    onChange={(e) => set("failureThreshold", e.target.value)}
                    placeholder="≥ 13"
                  />
                </L>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <L label="Unit">
                  <Input
                    value={form.unit}
                    onChange={(e) => set("unit", e.target.value)}
                    placeholder="%"
                  />
                </L>
                <L label="Sample size">
                  <Input
                    type="number"
                    min={0}
                    value={form.sampleSize}
                    onChange={(e) => set("sampleSize", e.target.value)}
                  />
                </L>
                <L label="Duration">
                  <Input
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                    placeholder="2 weeks"
                  />
                </L>
              </div>
              <L label="Population">
                <Input
                  value={form.population}
                  onChange={(e) => set("population", e.target.value)}
                  placeholder="5 salons, 8–12 chairs"
                />
              </L>
              <div className="grid grid-cols-3 gap-3">
                <L label={`Decision impact ${form.decisionImpact || "—"}/10`}>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form.decisionImpact || 5}
                    onChange={(e) => set("decisionImpact", e.target.value)}
                    className="mt-2 w-full accent-current"
                  />
                </L>
                <L label={`Information gain ${form.expectedInformationGain || "—"}/10`}>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form.expectedInformationGain || 5}
                    onChange={(e) => set("expectedInformationGain", e.target.value)}
                    className="mt-2 w-full accent-current"
                  />
                </L>
                <L label={`Effort ${form.effort || "—"}/10`}>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form.effort || 5}
                    onChange={(e) => set("effort", e.target.value)}
                    className="mt-2 w-full accent-current"
                  />
                </L>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <L label="Time estimate">
                  <Input
                    value={form.timeEstimate}
                    onChange={(e) => set("timeEstimate", e.target.value)}
                    placeholder="2 days"
                  />
                </L>
                <L label="Cost estimate">
                  <Input
                    value={form.costEstimate}
                    onChange={(e) => set("costEstimate", e.target.value)}
                    placeholder="€200"
                  />
                </L>
                <L label="Owner">
                  <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} />
                </L>
              </div>
              <L label="Notes">
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </L>
              <fieldset className="space-y-2 rounded-md border p-3">
                <legend className="px-1 text-[10px] font-semibold tracking-wider uppercase">
                  Experimental validity plan
                </legend>
                <p className="text-muted-foreground text-xs">
                  What the design intends. The result records what actually happened; the
                  application decides what the run can establish.
                </p>
                <ValidityChecklist fields={validity} onChange={setV} mode="plan" idPrefix="plan" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <L label="Systems / configurations (comma-separated)">
                    <Input
                      value={scope.scopeSystems}
                      onChange={(e) => setScope((f) => ({ ...f, scopeSystems: e.target.value }))}
                      placeholder="POS A, POS B"
                    />
                  </L>
                  <L label="Environment / conditions">
                    <Input
                      value={scope.scopeEnvironment}
                      onChange={(e) =>
                        setScope((f) => ({ ...f, scopeEnvironment: e.target.value }))
                      }
                      placeholder="founder-assisted"
                    />
                  </L>
                  <L label="Time period">
                    <Input
                      value={scope.scopeTimePeriod}
                      onChange={(e) => setScope((f) => ({ ...f, scopeTimePeriod: e.target.value }))}
                      placeholder="one month"
                    />
                  </L>
                  <L label="Other conditions">
                    <Input
                      value={scope.scopeConditions}
                      onChange={(e) => setScope((f) => ({ ...f, scopeConditions: e.target.value }))}
                    />
                  </L>
                </div>
              </fieldset>
            </div>

            {/* Before running: what is at stake */}
            <aside className="bg-muted/40 space-y-3 rounded-md border p-3 text-xs">
              <p className="text-[10px] font-semibold tracking-wider uppercase">Before running</p>
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {assumption
                    ? "Assumption being tested"
                    : link
                      ? "Causal link being tested"
                      : node
                        ? "Level being tested"
                        : "Target"}
                </p>
                {assumption ? (
                  <>
                    <p className="mt-0.5">{assumption.statement}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{ASSUMPTION_KIND_LABELS[assumption.kind]}</Badge>
                      <Badge variant={assumption.status === "CONTRADICTED" ? "negative" : "muted"}>
                        {ASSUMPTION_STATUS_LABELS[assumption.status]}
                      </Badge>
                      <span className="text-muted-foreground font-mono">
                        importance {assumption.importance}/10
                      </span>
                    </div>
                  </>
                ) : link ? (
                  <>
                    <p className="mt-0.5">{link.statement}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <EpistemicBadge status={link.status} confidence={link.confidence} />
                      <Badge variant="outline">{link.criticality.toLowerCase()}</Badge>
                    </div>
                  </>
                ) : node ? (
                  <>
                    <p className="mt-0.5">{node.statement}</p>
                    <EpistemicBadge
                      status={node.status}
                      confidence={node.confidence}
                      className="mt-1"
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground mt-0.5">Choose what this experiment tests.</p>
                )}
              </div>
              {affectedLink && (
                <div>
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    What it blocks
                  </p>
                  <p className="mt-0.5">
                    {VALUE_CHAIN_LEVEL_LABELS[affectedLink.fromNode.level]} →{" "}
                    {VALUE_CHAIN_LEVEL_LABELS[affectedLink.toNode.level]}
                    {blockedRung === affectedLink.toNode.level
                      ? " — the first level beyond the frontier"
                      : ""}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Current Proof Frontier
                </p>
                <p className="mt-0.5 font-medium">
                  {PROOF_RUNG_LABELS[frontier?.frontier ?? "NONE"]}
                </p>
                {frontier?.whyStops && (
                  <p className="text-muted-foreground mt-0.5">{frontier.whyStops}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  What can this design prove?
                </p>
                <p className="font-medium">
                  {DESIGN_LEVEL_LABELS[resolved.effective]}
                  {resolved.effective !== validity.designLevel
                    ? ` (declared ${DESIGN_LEVEL_LABELS[validity.designLevel].toLowerCase()})`
                    : ""}
                </p>
                {resolved.downgrades.map((d) => (
                  <p key={d} className="text-tone-warning">
                    {d}
                  </p>
                ))}
                {preview.target && (
                  <p>
                    <span className="font-medium">
                      {preview.target.strength === "STRONGLY"
                        ? "Can strongly establish"
                        : preview.target.strength === "PARTIALLY"
                          ? "Can partially support"
                          : "Cannot establish"}
                    </span>{" "}
                    that {preview.target.statement} — {preview.target.reason}
                  </p>
                )}
                <p>
                  <span className="font-medium">Can strongly:</span> {preview.strongly.join("; ")}
                </p>
                <p>
                  <span className="font-medium">Partially:</span> {preview.partially.join("; ")}
                </p>
                <p>
                  <span className="font-medium">Cannot:</span> {preview.cannot.join("; ")}
                </p>
                <p className="text-muted-foreground">{preview.note}</p>
              </div>
              {expected && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    Expected movement
                  </p>
                  <p>
                    <span className="font-medium">If supported:</span> {expected.ifSupported}
                  </p>
                  <p>
                    <span className="font-medium">If contradicted:</span> {expected.ifContradicted}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  label="Decision impact"
                  value={form.decisionImpact ? `${form.decisionImpact}/10` : "—"}
                />
                <Stat label="Effort" value={form.effort ? `${form.effort}/10` : "—"} />
                <Stat label="Time" value={form.timeEstimate || "—"} />
              </div>
              {warnings.map((w) => (
                <p
                  key={w.message}
                  className={
                    w.level === "warning"
                      ? "bg-tone-warning-bg text-tone-warning flex items-start gap-1.5 rounded px-2 py-1"
                      : "text-muted-foreground flex items-start gap-1.5"
                  }
                >
                  {w.level === "warning" ? (
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  ) : (
                    <Info className="mt-0.5 size-3 shrink-0" />
                  )}
                  {w.message}
                </p>
              ))}
            </aside>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}{" "}
              {experiment ? "Save" : "Plan experiment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  // Associate the label with the control so assistive tech (and tests) can
  // find the field by its label.
  const id = useId();
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? id })
    : children;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {control}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className="font-mono">{value}</p>
    </div>
  );
}
