"use client";

import { useRouter } from "next/navigation";
import { cloneElement, isValidElement, useId, useMemo, useState } from "react";
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
import { EXPERIMENT_OUTCOME_TONE, ExperimentOutcome } from "@/domain/enums";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { classifyOutcome } from "@/services/value/experiment-outcome";
import {
  ValidityChecklist,
  ValiditySummary,
  validityFieldsFrom,
  validityInputsFrom,
  type ValidityFormFields,
} from "@/components/value/validity-fields";
import {
  assessInternalValidity,
  defaultDesignLevel,
  parseValidityInputs,
} from "@/services/value/experimental-validity";
import { describeScope, parseScope } from "@/services/value/scope";

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
  const t = useT();
  const locale = useLocale();
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
  const [validity, setValidity] = useState<ValidityFormFields>(() =>
    validityFieldsFrom(
      exp.designLevel ?? defaultDesignLevel(exp.experimentType),
      parseValidityInputs(exp.validityPlan),
    ),
  );
  const setV = <K extends keyof ValidityFormFields>(k: K, v: ValidityFormFields[K]) =>
    setValidity((f) => ({ ...f, [k]: v }));
  const [scope, setScope] = useState(() => {
    const sc = parseScope(exp.scope);
    return {
      scopePopulation: sc?.population ?? exp.population ?? "",
      scopeSystems: sc?.systems?.join(", ") ?? "",
      scopeEnvironment: sc?.environment ?? "",
      scopeTimePeriod: sc?.timePeriod ?? "",
      scopeConditions: sc?.conditions ?? "",
    };
  });
  const validityInputs = validityInputsFrom(validity);
  const preview = useMemo(
    () =>
      assessInternalValidity(validity.designLevel, {
        ...validityInputs,
        sampleSize: form.sampleSize === "" ? undefined : Number(form.sampleSize),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validity, form.sampleSize],
  );
  const scopePreview = describeScope(
    parseScope({
      ...scope,
      population: scope.scopePopulation,
      systems: scope.scopeSystems,
      environment: scope.scopeEnvironment,
      timePeriod: scope.scopeTimePeriod,
      conditions: scope.scopeConditions,
      organizationCount: validity.organizationCount || undefined,
      sampleSize: form.sampleSize || undefined,
    }),
    locale,
  );

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

  const targets = useMemo(() => (graph ? claimTargetsFor(graph, o.id, t) : []), [graph, o.id, t]);
  const extraTargets = targets.filter(
    (target) =>
      target.causalLinkId !== exp.causalLinkId && target.valueChainNodeId !== exp.valueChainNodeId,
  );
  const toggle = (target: ClaimTarget) =>
    setClaims((c) => {
      const next = { ...c };
      if (next[target.key]) delete next[target.key];
      else
        next[target.key] =
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
      designLevel: validity.designLevel,
      ...validityInputs,
      ...scope,
      claims: extraTargets
        .filter((target) => claims[target.key])
        .map((target) => ({
          claimType: target.claimType,
          opportunityId: o.id,
          valueChainNodeId: target.valueChainNodeId,
          causalLinkId: target.causalLinkId,
          direction: claims[target.key],
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
      ? t("experiments.result.observedLine", {
          metric: form.observedMetric || t("experiments.result.observedValueFallback"),
          value: form.observedValue,
          hasUnit: Boolean(form.unit),
          unit: form.unit,
        })
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
              <DialogTitle>{t("experiments.result.doneTitle")}</DialogTitle>
              <DialogDescription>{t("experiments.result.doneDescription")}</DialogDescription>
            </DialogHeader>
            <ValiditySummary
              assessment={done.validity.assessment}
              observed={done.validity.observed}
              interpretation={done.validity.interpretation}
              caveats={done.validity.caveats}
              scopeText={
                done.validity.scope
                  ? describeScope(done.validity.scope, locale)
                  : done.validity.scopeText
              }
              compact
            />
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
              <Button onClick={() => onOpenChange(false)}>{t("common.done")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("experiments.result.title", { title: exp.title })}</DialogTitle>
              <DialogDescription>
                {exp.decisionQuestion
                  ? t("experiments.result.hypothesisDecision", {
                      hypothesis: exp.hypothesis,
                      decision: exp.decisionQuestion,
                    })
                  : t("experiments.result.hypothesis", { hypothesis: exp.hypothesis })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-3">
              <L label={t("experiments.result.field.observedMetric")}>
                <Input
                  value={form.observedMetric}
                  onChange={(e) => set("observedMetric", e.target.value)}
                  placeholder={
                    exp.successMetric ?? t("experiments.result.field.observedMetricPlaceholder")
                  }
                />
              </L>
              <L label={t("experiments.result.field.observedValue")}>
                <Input
                  type="number"
                  step="any"
                  value={form.observedValue}
                  onChange={(e) => set("observedValue", e.target.value)}
                />
              </L>
              <L label={t("experiments.result.field.unit")}>
                <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} />
              </L>
              <L label={t("experiments.result.field.sampleSize")}>
                <Input
                  type="number"
                  min={0}
                  value={form.sampleSize}
                  onChange={(e) => set("sampleSize", e.target.value)}
                />
              </L>
              <L label={t("experiments.result.field.measurementPeriod")}>
                <Input
                  value={form.measurementPeriod}
                  onChange={(e) => set("measurementPeriod", e.target.value)}
                  placeholder={t("experiments.result.field.measurementPeriodPlaceholder")}
                />
              </L>
              <L label={t("experiments.result.field.enteredBy")}>
                <Input value={form.enteredBy} onChange={(e) => set("enteredBy", e.target.value)} />
              </L>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-[10px] font-semibold tracking-wider uppercase">
                {t("experiments.result.outcome.title")}
              </p>
              {hasThresholds ? (
                <div className="mt-1 text-xs">
                  <p className="text-muted-foreground">
                    {t("experiments.result.outcome.byThresholds", {
                      success: exp.successThreshold,
                      failure: exp.failureThreshold,
                      hasUnit: Boolean(exp.unit),
                      unit: exp.unit ?? "",
                    })}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {decided ? (
                      <>
                        <Badge variant={EXPERIMENT_OUTCOME_TONE[decided.outcome]}>
                          {t(`labels.experimentOutcome.${decided.outcome}`)}
                        </Badge>
                        <span className="text-muted-foreground">{t(decided.explanation)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("experiments.result.outcome.waiting")}
                      </span>
                    )}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.outcome === "INVALID"}
                      onCheckedChange={(v) => set("outcome", v ? "INVALID" : "")}
                    />
                    {t("experiments.result.outcome.declareInvalid")}
                  </label>
                </div>
              ) : (
                <div className="mt-1 space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    {t("experiments.result.outcome.noThreshold")}
                  </p>
                  <Select
                    value={form.outcome || "__none__"}
                    onValueChange={(v) =>
                      set("outcome", v === "__none__" ? "" : (v as ExperimentOutcome))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("experiments.result.outcome.inconclusivePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("experiments.result.outcome.inconclusiveDefault")}
                      </SelectItem>
                      {Object.values(ExperimentOutcome).map((oc) => (
                        <SelectItem key={oc} value={oc}>
                          {t(`labels.experimentOutcome.${oc}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <L label={t("experiments.result.field.resultSummary")}>
              <Textarea
                rows={3}
                value={form.resultSummary}
                onChange={(e) => set("resultSummary", e.target.value)}
                required
                minLength={3}
              />
            </L>
            <div className="grid gap-3 sm:grid-cols-3">
              <L label={t("experiments.result.field.limitations")}>
                <Textarea
                  rows={2}
                  value={form.limitations}
                  onChange={(e) => set("limitations", e.target.value)}
                />
              </L>
              <L label={t("experiments.result.field.confounders")}>
                <Textarea
                  rows={2}
                  value={form.confounders}
                  onChange={(e) => set("confounders", e.target.value)}
                />
              </L>
              <L label={t("experiments.result.field.anomalies")}>
                <Textarea
                  rows={2}
                  value={form.anomalies}
                  onChange={(e) => set("anomalies", e.target.value)}
                />
              </L>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <p className="text-[10px] font-semibold tracking-wider uppercase">
                {t("experiments.result.validity.title")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("experiments.result.validity.help")}
              </p>
              <ValidityChecklist fields={validity} onChange={setV} mode="result" idPrefix="res" />
              <div className="grid gap-3 sm:grid-cols-2">
                <L label={t("experiments.result.field.population")}>
                  <Input
                    value={scope.scopePopulation}
                    onChange={(e) => setScope((f) => ({ ...f, scopePopulation: e.target.value }))}
                  />
                </L>
                <L label={t("experiments.plan.scope.systems")}>
                  <Input
                    value={scope.scopeSystems}
                    onChange={(e) => setScope((f) => ({ ...f, scopeSystems: e.target.value }))}
                  />
                </L>
                <L label={t("experiments.plan.scope.environment")}>
                  <Input
                    value={scope.scopeEnvironment}
                    onChange={(e) => setScope((f) => ({ ...f, scopeEnvironment: e.target.value }))}
                  />
                </L>
                <L label={t("experiments.plan.scope.timePeriod")}>
                  <Input
                    value={scope.scopeTimePeriod}
                    onChange={(e) => setScope((f) => ({ ...f, scopeTimePeriod: e.target.value }))}
                  />
                </L>
              </div>
              <ValiditySummary assessment={preview} scopeText={scopePreview} compact />
            </div>

            {effectiveOutcome !== "INVALID" && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-[10px] font-semibold tracking-wider uppercase">
                  {t("experiments.result.signals.title")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("experiments.result.signals.help")}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.isDirectCustomer}
                      onCheckedChange={(v) => set("isDirectCustomer", Boolean(v))}
                    />{" "}
                    {t("experiments.result.signals.directCustomer")}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.hasEconomicImpact}
                      onCheckedChange={(v) => set("hasEconomicImpact", Boolean(v))}
                    />{" "}
                    {t("experiments.result.signals.economicImpact")}
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.hasPurchaseIntent}
                      onCheckedChange={(v) => set("hasPurchaseIntent", Boolean(v))}
                    />{" "}
                    {t("experiments.result.signals.purchaseIntent")}
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <L
                    label={t("experiments.result.signals.strength", { value: form.strengthScore })}
                  >
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={form.strengthScore}
                      onChange={(e) => set("strengthScore", Number(e.target.value))}
                      className="w-full accent-current"
                    />
                  </L>
                  <L
                    label={t("experiments.result.signals.relevance", {
                      value: form.relevanceScore,
                    })}
                  >
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
                      {t("experiments.result.signals.otherClaims")}
                    </p>
                    <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                      {extraTargets.map((target) => (
                        <li
                          key={target.key}
                          className={cn(
                            "flex items-start gap-2 rounded-md border px-2 py-1 text-xs",
                            claims[target.key] && "border-foreground",
                          )}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={Boolean(claims[target.key])}
                            onCheckedChange={() => toggle(target)}
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{t(target.label)}</span>
                            {claims[target.key] && (
                              <span className="text-muted-foreground">
                                {" "}
                                ·{" "}
                                {t("experiments.result.signals.direction", {
                                  direction: claims[target.key],
                                })}
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
                {t("experiments.result.willRecord", {
                  outcome: t(`labels.experimentOutcome.${effectiveOutcome ?? "INCONCLUSIVE"}`),
                })}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} {t("experiments.result.submit")}
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
