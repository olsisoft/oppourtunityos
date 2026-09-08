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
import { ExperimentType } from "@/domain/enums";
import { useT } from "@/i18n/client";
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
  designProofPreview,
  parseValidityInputs,
  resolveDesignLevel,
} from "@/services/value/experimental-validity";
import { parseScope } from "@/services/value/scope";
import type { AssumptionKind, ClaimType } from "@/generated/prisma/enums";

export type { PlanPrefill };
import { rungIndex } from "@/services/value/proof-frontier";

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
  const t = useT();
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
    title: experiment?.title ?? t(prefill?.title),
    experimentType: experiment?.experimentType ?? prefill?.experimentType ?? "OTHER",
    hypothesis: experiment?.hypothesis ?? t(prefill?.hypothesis),
    decisionQuestion: experiment?.decisionQuestion ?? t(prefill?.decisionQuestion),
    target: targetKey(experiment ?? prefill ?? {}),
    design: experiment?.design ?? t(prefill?.design),
    successMetric: experiment?.successMetric ?? t(prefill?.successMetric),
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
    const current = t(`labels.proofRung.${frontier?.frontier ?? "NONE"}`);
    const level = (l: string) => t(`labels.valueChainLevel.${l}`);
    if (affectedLink) {
      const to = affectedLink.toNode.level;
      const from = level(affectedLink.fromNode.level);
      const movesFrontier = blockedRung === to;
      return {
        ifSupported: movesFrontier
          ? t("experiments.plan.expected.linkMovesFrontier", { current, to: level(to) })
          : rungIndex(to) <= rungIndex(frontier?.frontier ?? "NONE")
            ? t("experiments.plan.expected.linkBeyondFrontier", { from, to: level(to) })
            : t("experiments.plan.expected.linkBlocked", {
                from,
                to: level(to),
                blocker: frontier?.blockedAt?.label
                  ? t(frontier.blockedAt.label)
                  : t("experiments.plan.expected.earlierGap"),
              }),
        ifContradicted: t("experiments.plan.expected.linkContradicted", { from, to: level(to) }),
      };
    }
    if (node) {
      const movesFrontier = blockedRung === node.level;
      return {
        ifSupported: movesFrontier
          ? t("experiments.plan.expected.levelMovesFrontier", { current, level: level(node.level) })
          : t("experiments.plan.expected.levelStrengthens", { level: level(node.level) }),
        ifContradicted: t("experiments.plan.expected.levelContradicted", {
          level: level(node.level),
        }),
      };
    }
    if (assumption) {
      return {
        ifSupported: t("experiments.plan.expected.assumptionSupported", {
          kind: t(`labels.assumptionKind.${assumption.kind}`).toLowerCase(),
        }),
        ifContradicted: t("experiments.plan.expected.assumptionContradicted", {
          kind: assumption.kind,
        }),
      };
    }
    return null;
  }, [affectedLink, node, assumption, blockedRung, frontier, t]);

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
  const listSeparator = t("experiments.plan.aside.listSeparator");

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
    toast.success(
      experiment ? t("experiments.plan.toastUpdated") : t("experiments.plan.toastPlanned"),
    );
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {experiment ? t("experiments.plan.titleEdit") : t("experiments.plan.titleNew")}
            </DialogTitle>
            <DialogDescription>{t("experiments.plan.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <L label={t("experiments.plan.field.title")}>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </L>
              <div className="grid grid-cols-2 gap-3">
                <L label={t("experiments.plan.field.type")}>
                  <Select
                    value={form.experimentType}
                    onValueChange={(v) => set("experimentType", v as ExperimentType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ExperimentType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`labels.experimentType.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </L>
                <L label={t("experiments.plan.field.target")}>
                  <Select value={form.target} onValueChange={(v) => set("target", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("experiments.plan.field.targetPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("experiments.plan.field.targetNone")}</SelectItem>
                      {o.assumptions
                        .filter((a) => a.status !== "SUPPORTED")
                        .map((a) => (
                          <SelectItem key={a.id} value={`assumption:${a.id}`}>
                            {t("experiments.plan.field.targetAssumption", {
                              kind: t(`labels.assumptionKind.${a.kind}`),
                              statement: a.statement.slice(0, 70),
                            })}
                          </SelectItem>
                        ))}
                      {o.causalLinks.map((l) => (
                        <SelectItem key={l.id} value={`link:${l.id}`}>
                          {t("experiments.plan.field.targetLink", {
                            from: t(`labels.valueChainLevel.${l.fromNode.level}`),
                            to: t(`labels.valueChainLevel.${l.toNode.level}`),
                          })}
                        </SelectItem>
                      ))}
                      {o.valueChainNodes.map((n) => (
                        <SelectItem key={n.id} value={`node:${n.id}`}>
                          {t("experiments.plan.field.targetLevel", {
                            level: t(`labels.valueChainLevel.${n.level}`),
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </L>
              </div>
              <L label={t("experiments.plan.field.hypothesis")}>
                <Textarea
                  rows={2}
                  value={form.hypothesis}
                  onChange={(e) => set("hypothesis", e.target.value)}
                  required
                  minLength={3}
                />
              </L>
              <L label={t("experiments.plan.field.decisionQuestion")}>
                <Input
                  value={form.decisionQuestion}
                  onChange={(e) => set("decisionQuestion", e.target.value)}
                  placeholder={t("experiments.plan.field.decisionQuestionPlaceholder")}
                />
              </L>
              <L label={t("experiments.plan.field.design")}>
                <Textarea
                  rows={2}
                  value={form.design}
                  onChange={(e) => set("design", e.target.value)}
                />
              </L>
              <div className="grid grid-cols-3 gap-3">
                <L label={t("experiments.plan.field.successMetric")}>
                  <Input
                    value={form.successMetric}
                    onChange={(e) => set("successMetric", e.target.value)}
                    placeholder={t("experiments.plan.field.successMetricPlaceholder")}
                  />
                </L>
                <L label={t("experiments.plan.field.successThreshold")}>
                  <Input
                    type="number"
                    step="any"
                    value={form.successThreshold}
                    onChange={(e) => set("successThreshold", e.target.value)}
                    placeholder={t("experiments.plan.field.successThresholdPlaceholder")}
                  />
                </L>
                <L label={t("experiments.plan.field.failureThreshold")}>
                  <Input
                    type="number"
                    step="any"
                    value={form.failureThreshold}
                    onChange={(e) => set("failureThreshold", e.target.value)}
                    placeholder={t("experiments.plan.field.failureThresholdPlaceholder")}
                  />
                </L>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <L label={t("experiments.plan.field.unit")}>
                  <Input
                    value={form.unit}
                    onChange={(e) => set("unit", e.target.value)}
                    placeholder={t("experiments.plan.field.unitPlaceholder")}
                  />
                </L>
                <L label={t("experiments.plan.field.sampleSize")}>
                  <Input
                    type="number"
                    min={0}
                    value={form.sampleSize}
                    onChange={(e) => set("sampleSize", e.target.value)}
                  />
                </L>
                <L label={t("experiments.plan.field.duration")}>
                  <Input
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                    placeholder={t("experiments.plan.field.durationPlaceholder")}
                  />
                </L>
              </div>
              <L label={t("experiments.plan.field.population")}>
                <Input
                  value={form.population}
                  onChange={(e) => set("population", e.target.value)}
                  placeholder={t("experiments.plan.field.populationPlaceholder")}
                />
              </L>
              <div className="grid grid-cols-3 gap-3">
                <L
                  label={t("experiments.plan.field.decisionImpact", {
                    value: form.decisionImpact || "—",
                  })}
                >
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form.decisionImpact || 5}
                    onChange={(e) => set("decisionImpact", e.target.value)}
                    className="mt-2 w-full accent-current"
                  />
                </L>
                <L
                  label={t("experiments.plan.field.informationGain", {
                    value: form.expectedInformationGain || "—",
                  })}
                >
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form.expectedInformationGain || 5}
                    onChange={(e) => set("expectedInformationGain", e.target.value)}
                    className="mt-2 w-full accent-current"
                  />
                </L>
                <L label={t("experiments.plan.field.effort", { value: form.effort || "—" })}>
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
                <L label={t("experiments.plan.field.timeEstimate")}>
                  <Input
                    value={form.timeEstimate}
                    onChange={(e) => set("timeEstimate", e.target.value)}
                    placeholder={t("experiments.plan.field.timeEstimatePlaceholder")}
                  />
                </L>
                <L label={t("experiments.plan.field.costEstimate")}>
                  <Input
                    value={form.costEstimate}
                    onChange={(e) => set("costEstimate", e.target.value)}
                    placeholder={t("experiments.plan.field.costEstimatePlaceholder")}
                  />
                </L>
                <L label={t("experiments.plan.field.owner")}>
                  <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} />
                </L>
              </div>
              <L label={t("experiments.plan.field.notes")}>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </L>
              <fieldset className="space-y-2 rounded-md border p-3">
                <legend className="px-1 text-[10px] font-semibold tracking-wider uppercase">
                  {t("experiments.plan.validityPlan.legend")}
                </legend>
                <p className="text-muted-foreground text-xs">
                  {t("experiments.plan.validityPlan.help")}
                </p>
                <ValidityChecklist fields={validity} onChange={setV} mode="plan" idPrefix="plan" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <L label={t("experiments.plan.scope.systems")}>
                    <Input
                      value={scope.scopeSystems}
                      onChange={(e) => setScope((f) => ({ ...f, scopeSystems: e.target.value }))}
                      placeholder={t("experiments.plan.scope.systemsPlaceholder")}
                    />
                  </L>
                  <L label={t("experiments.plan.scope.environment")}>
                    <Input
                      value={scope.scopeEnvironment}
                      onChange={(e) =>
                        setScope((f) => ({ ...f, scopeEnvironment: e.target.value }))
                      }
                      placeholder={t("experiments.plan.scope.environmentPlaceholder")}
                    />
                  </L>
                  <L label={t("experiments.plan.scope.timePeriod")}>
                    <Input
                      value={scope.scopeTimePeriod}
                      onChange={(e) => setScope((f) => ({ ...f, scopeTimePeriod: e.target.value }))}
                      placeholder={t("experiments.plan.scope.timePeriodPlaceholder")}
                    />
                  </L>
                  <L label={t("experiments.plan.scope.conditions")}>
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
              <p className="text-[10px] font-semibold tracking-wider uppercase">
                {t("experiments.plan.aside.title")}
              </p>
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {assumption
                    ? t("experiments.plan.aside.testingAssumption")
                    : link
                      ? t("experiments.plan.aside.testingLink")
                      : node
                        ? t("experiments.plan.aside.testingLevel")
                        : t("experiments.plan.aside.testingTarget")}
                </p>
                {assumption ? (
                  <>
                    <p className="mt-0.5">{assumption.statement}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {t(`labels.assumptionKind.${assumption.kind}`)}
                      </Badge>
                      <Badge variant={assumption.status === "CONTRADICTED" ? "negative" : "muted"}>
                        {t(`labels.assumptionStatus.${assumption.status}`)}
                      </Badge>
                      <span className="text-muted-foreground font-mono">
                        {t("experiments.plan.aside.importance", {
                          importance: assumption.importance,
                        })}
                      </span>
                    </div>
                  </>
                ) : link ? (
                  <>
                    <p className="mt-0.5">{link.statement}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <EpistemicBadge status={link.status} confidence={link.confidence} />
                      <Badge variant="outline">
                        {t(`labels.criticality.${link.criticality}`).toLowerCase()}
                      </Badge>
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
                  <p className="text-muted-foreground mt-0.5">
                    {t("experiments.plan.aside.chooseTarget")}
                  </p>
                )}
              </div>
              {affectedLink && (
                <div>
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    {t("experiments.plan.aside.blocks")}
                  </p>
                  <p className="mt-0.5">
                    {t(
                      blockedRung === affectedLink.toNode.level
                        ? "experiments.plan.aside.blockedLinkFirst"
                        : "experiments.plan.aside.blockedLink",
                      {
                        from: t(`labels.valueChainLevel.${affectedLink.fromNode.level}`),
                        to: t(`labels.valueChainLevel.${affectedLink.toNode.level}`),
                      },
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t("experiments.plan.aside.currentFrontier")}
                </p>
                <p className="mt-0.5 font-medium">
                  {t(`labels.proofRung.${frontier?.frontier ?? "NONE"}`)}
                </p>
                {frontier?.whyStops && (
                  <p className="text-muted-foreground mt-0.5">{t(frontier.whyStops)}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t("experiments.plan.aside.whatCanProve")}
                </p>
                <p className="font-medium">
                  {resolved.effective !== validity.designLevel
                    ? t("experiments.plan.aside.effectiveDesignDeclared", {
                        effective: t(`labels.designLevel.${resolved.effective}`),
                        declared: t(`labels.designLevel.${validity.designLevel}`).toLowerCase(),
                      })
                    : t("experiments.plan.aside.effectiveDesign", {
                        effective: t(`labels.designLevel.${resolved.effective}`),
                      })}
                </p>
                {resolved.downgrades.map((d) => (
                  <p key={t(d)} className="text-tone-warning">
                    {t(d)}
                  </p>
                ))}
                {preview.target && (
                  <p>
                    <span className="font-medium">
                      {preview.target.strength === "STRONGLY"
                        ? t("experiments.plan.aside.canStrongly")
                        : preview.target.strength === "PARTIALLY"
                          ? t("experiments.plan.aside.canPartially")
                          : t("experiments.plan.aside.cannotEstablish")}
                    </span>{" "}
                    {t("experiments.plan.aside.targetLine", {
                      statement: t(preview.target.statement),
                      reason: t(preview.target.reason),
                    })}
                  </p>
                )}
                <p>
                  <span className="font-medium">{t("experiments.plan.aside.stronglyList")}</span>{" "}
                  {preview.strongly.map((x) => t(x)).join(listSeparator)}
                </p>
                <p>
                  <span className="font-medium">{t("experiments.plan.aside.partiallyList")}</span>{" "}
                  {preview.partially.map((x) => t(x)).join(listSeparator)}
                </p>
                <p>
                  <span className="font-medium">{t("experiments.plan.aside.cannotList")}</span>{" "}
                  {preview.cannot.map((x) => t(x)).join(listSeparator)}
                </p>
                <p className="text-muted-foreground">{t(preview.note)}</p>
              </div>
              {expected && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    {t("experiments.plan.aside.expectedMovement")}
                  </p>
                  <p>
                    <span className="font-medium">{t("experiments.plan.aside.ifSupported")}</span>{" "}
                    {expected.ifSupported}
                  </p>
                  <p>
                    <span className="font-medium">
                      {t("experiments.plan.aside.ifContradicted")}
                    </span>{" "}
                    {expected.ifContradicted}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  label={t("experiments.plan.aside.statDecisionImpact")}
                  value={form.decisionImpact ? `${form.decisionImpact}/10` : "—"}
                />
                <Stat
                  label={t("experiments.plan.aside.statEffort")}
                  value={form.effort ? `${form.effort}/10` : "—"}
                />
                <Stat
                  label={t("experiments.plan.aside.statTime")}
                  value={form.timeEstimate || "—"}
                />
              </div>
              {warnings.map((w) => (
                <p
                  key={t(w.message)}
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
                  {t(w.message)}
                </p>
              ))}
            </aside>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}{" "}
              {experiment ? t("common.save") : t("experiments.plan.submitNew")}
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
