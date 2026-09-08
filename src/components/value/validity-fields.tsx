"use client";

import { AlertTriangle, Check, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignmentMethod, ExperimentDesignLevel } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import {
  ASSIGNMENT_METHOD_LABELS,
  DESIGN_LEVELS,
  type InternalValidityAssessment,
  type ValidityInputs,
} from "@/services/value/experimental-validity";

export type TriState = "" | "yes" | "no";

export function triFromBool(v: boolean | null | undefined): TriState {
  return v === true ? "yes" : v === false ? "no" : "";
}

/** Facts about a run as form fields (planned on the experiment, actual on the result). */
export interface ValidityFormFields {
  designLevel: ExperimentDesignLevel;
  baselineMeasured: TriState;
  comparisonGroup: TriState;
  assignmentMethod: AssignmentMethod | "";
  sameMeasurement: TriState;
  interventionIsolated: TriState;
  confoundersControlled: TriState;
  instrumentationChanged: TriState;
  contaminationRisk: TriState;
  seasonalityRisk: TriState;
  concurrentChanges: TriState;
  attritionPercent: string;
  dataCompletenessPercent: string;
  durationDays: string;
  organizationCount: string;
}

export function validityFieldsFrom(
  designLevel: ExperimentDesignLevel,
  inputs: ValidityInputs,
): ValidityFormFields {
  return {
    designLevel,
    baselineMeasured: triFromBool(inputs.baselineMeasured),
    comparisonGroup: triFromBool(inputs.comparisonGroup),
    assignmentMethod: inputs.assignmentMethod ?? "",
    sameMeasurement: triFromBool(inputs.sameMeasurement),
    interventionIsolated: triFromBool(inputs.interventionIsolated),
    confoundersControlled: triFromBool(inputs.confoundersControlled),
    instrumentationChanged: triFromBool(inputs.instrumentationChanged),
    contaminationRisk: triFromBool(inputs.contaminationRisk),
    seasonalityRisk: triFromBool(inputs.seasonalityRisk),
    concurrentChanges: triFromBool(inputs.concurrentChanges),
    attritionPercent: inputs.attritionPercent?.toString() ?? "",
    dataCompletenessPercent: inputs.dataCompletenessPercent?.toString() ?? "",
    durationDays: inputs.durationDays?.toString() ?? "",
    organizationCount: inputs.organizationCount?.toString() ?? "",
  };
}

function bool(v: TriState): boolean | undefined {
  return v === "yes" ? true : v === "no" ? false : undefined;
}
function num(v: string): number | undefined {
  return v === "" ? undefined : Number(v);
}

export function validityInputsFrom(f: ValidityFormFields): ValidityInputs {
  const out: ValidityInputs = {
    baselineMeasured: bool(f.baselineMeasured),
    comparisonGroup: bool(f.comparisonGroup),
    assignmentMethod: f.assignmentMethod || undefined,
    sameMeasurement: bool(f.sameMeasurement),
    interventionIsolated: bool(f.interventionIsolated),
    confoundersControlled: bool(f.confoundersControlled),
    instrumentationChanged: bool(f.instrumentationChanged),
    contaminationRisk: bool(f.contaminationRisk),
    seasonalityRisk: bool(f.seasonalityRisk),
    concurrentChanges: bool(f.concurrentChanges),
    attritionPercent: num(f.attritionPercent),
    dataCompletenessPercent: num(f.dataCompletenessPercent),
    durationDays: num(f.durationDays),
    organizationCount: num(f.organizationCount),
  };
  for (const k of Object.keys(out) as Array<keyof ValidityInputs>)
    if (out[k] === undefined) delete out[k];
  return out;
}

/** Tri-state checks: form field, dictionary key of its label, and when it is shown. */
const TRI: Array<[keyof ValidityFormFields, string, "plan" | "both"]> = [
  ["baselineMeasured", "experiments.validity.check.baselineMeasured", "both"],
  ["comparisonGroup", "experiments.validity.check.comparisonGroup", "both"],
  ["sameMeasurement", "experiments.validity.check.sameMeasurement", "both"],
  ["interventionIsolated", "experiments.validity.check.interventionIsolated", "both"],
  ["confoundersControlled", "experiments.validity.check.confoundersControlled", "both"],
  ["instrumentationChanged", "experiments.validity.check.instrumentationChanged", "plan"],
  ["contaminationRisk", "experiments.validity.check.contaminationRisk", "plan"],
  ["seasonalityRisk", "experiments.validity.check.seasonalityRisk", "plan"],
  ["concurrentChanges", "experiments.validity.check.concurrentChanges", "plan"],
];

function TriSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  const t = useT();
  return (
    <Select
      value={value || "__unknown__"}
      onValueChange={(v) => onChange(v === "__unknown__" ? "" : (v as TriState))}
    >
      <SelectTrigger id={id} size="sm" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unknown__">{t("common.notRecorded")}</SelectItem>
        <SelectItem value="yes">{t("experiments.validity.tri.yes")}</SelectItem>
        <SelectItem value="no">{t("experiments.validity.tri.no")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

/**
 * Design level + validity checklist. `mode="plan"` records what the design
 * intends; `mode="result"` records what actually happened (all facts).
 */
export function ValidityChecklist({
  fields,
  onChange,
  mode,
  idPrefix,
}: {
  fields: ValidityFormFields;
  onChange: <K extends keyof ValidityFormFields>(key: K, value: ValidityFormFields[K]) => void;
  mode: "plan" | "result";
  idPrefix: string;
}) {
  const t = useT();
  const rows = TRI.filter(([, , when]) => when === "both" || mode === "result");
  return (
    <div className="space-y-2 text-xs">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-design`} className="text-xs">
            {t("experiments.validity.designLevel")}
          </Label>
          <Select
            value={fields.designLevel}
            onValueChange={(v) => onChange("designLevel", v as ExperimentDesignLevel)}
          >
            <SelectTrigger id={`${idPrefix}-design`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESIGN_LEVELS.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`labels.designLevel.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground">
            {t(`labels.designLevelHelp.${fields.designLevel}`)}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-assignment`} className="text-xs">
            {t("experiments.validity.assignmentMethod")}
          </Label>
          <Select
            value={fields.assignmentMethod || "__unknown__"}
            onValueChange={(v) =>
              onChange("assignmentMethod", v === "__unknown__" ? "" : (v as AssignmentMethod))
            }
          >
            <SelectTrigger id={`${idPrefix}-assignment`} className="w-full">
              <SelectValue placeholder={t("common.notRecorded")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unknown__">{t("common.notRecorded")}</SelectItem>
              {(Object.keys(ASSIGNMENT_METHOD_LABELS) as AssignmentMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`labels.assignmentMethod.${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(([key, labelKey]) => (
          <li
            key={key}
            className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
          >
            <Label htmlFor={`${idPrefix}-${key}`} className="text-xs font-normal">
              {t(labelKey)}
            </Label>
            <TriSelect
              id={`${idPrefix}-${key}`}
              value={fields[key] as TriState}
              onChange={(v) => onChange(key, v as ValidityFormFields[typeof key])}
            />
          </li>
        ))}
      </ul>
      <div className={cn("grid gap-3", mode === "result" ? "sm:grid-cols-4" : "sm:grid-cols-2")}>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-orgs`} className="text-xs">
            {t("experiments.validity.organizations")}
          </Label>
          <Input
            id={`${idPrefix}-orgs`}
            type="number"
            min={0}
            value={fields.organizationCount}
            onChange={(e) => onChange("organizationCount", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-days`} className="text-xs">
            {t("experiments.validity.durationDays")}
          </Label>
          <Input
            id={`${idPrefix}-days`}
            type="number"
            min={0}
            value={fields.durationDays}
            onChange={(e) => onChange("durationDays", e.target.value)}
          />
        </div>
        {mode === "result" && (
          <>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-attrition`} className="text-xs">
                {t("experiments.validity.attrition")}
              </Label>
              <Input
                id={`${idPrefix}-attrition`}
                type="number"
                min={0}
                max={100}
                value={fields.attritionPercent}
                onChange={(e) => onChange("attritionPercent", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-completeness`} className="text-xs">
                {t("experiments.validity.completeness")}
              </Label>
              <Input
                id={`${idPrefix}-completeness`}
                type="number"
                min={0}
                max={100}
                value={fields.dataCompletenessPercent}
                onChange={(e) => onChange("dataCompletenessPercent", e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** EXPERIMENTAL VALIDITY — design, internal validity and the reasons (✓ / ⚠). */
export function ValiditySummary({
  assessment,
  observed,
  interpretation,
  caveats,
  scopeText,
  compact = false,
}: {
  assessment: Pick<
    InternalValidityAssessment,
    "designDeclared" | "designEffective" | "internalValidity" | "checks" | "downgrades"
  >;
  observed?: LocalizedText | null;
  interpretation?: LocalizedText | null;
  caveats?: LocalizedText[];
  scopeText?: LocalizedText | null;
  compact?: boolean;
}) {
  const t = useT();
  const tone =
    assessment.internalValidity === "HIGH"
      ? "positive"
      : assessment.internalValidity === "MEDIUM"
        ? "info"
        : assessment.internalValidity === "LOW"
          ? "negative"
          : "warning";
  const shown = compact ? assessment.checks.filter((c) => c.ok !== null) : assessment.checks;
  const design = t(`labels.designLevel.${assessment.designEffective}`);
  return (
    <div className="space-y-2 rounded-md border p-3 text-xs">
      <p className="text-[10px] font-semibold tracking-wider uppercase">
        {t("experiments.validity.summary.title")}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="font-mono text-[10px]">
          {assessment.designEffective !== assessment.designDeclared
            ? t("experiments.validity.summary.designDeclared", {
                design,
                declared: t(`labels.designLevel.${assessment.designDeclared}`).toLowerCase(),
              })
            : t("experiments.validity.summary.design", { design })}
        </Badge>
        <Badge variant={tone} className="font-mono text-[10px]">
          {t("experiments.validity.summary.internalValidity", {
            validity: t(`labels.internalValidity.${assessment.internalValidity}`),
          })}
        </Badge>
      </div>
      {scopeText && (
        <p className="text-muted-foreground break-words">
          <span className="font-mono text-[10px] uppercase">
            {t("experiments.validity.summary.scope")}
          </span>{" "}
          {t(scopeText)}
        </p>
      )}
      {assessment.downgrades.map((d) => (
        <p key={t(d)} className="text-tone-warning flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {t(d)}
        </p>
      ))}
      <ul className={cn("grid gap-x-3 gap-y-0.5", compact ? "" : "sm:grid-cols-2")}>
        {shown.map((c) => (
          <li key={c.key} className="flex items-start gap-1.5">
            {c.ok === true ? (
              <Check className="text-tone-positive mt-0.5 size-3 shrink-0" />
            ) : c.ok === false ? (
              <AlertTriangle
                className={cn(
                  "mt-0.5 size-3 shrink-0",
                  c.severity === "critical" ? "text-tone-negative" : "text-tone-warning",
                )}
              />
            ) : (
              <Minus className="text-muted-foreground mt-0.5 size-3 shrink-0" />
            )}
            <span className={c.ok === null ? "text-muted-foreground" : ""}>{t(c.text)}</span>
          </li>
        ))}
      </ul>
      {observed && (
        <p>
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("experiments.validity.summary.observed")}
          </span>{" "}
          {t(observed)}
        </p>
      )}
      {interpretation && (
        <p className="bg-muted/60 rounded px-2 py-1.5">
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("experiments.validity.summary.interpretation")}
          </span>{" "}
          {t(interpretation)}
        </p>
      )}
      {caveats?.map((c) => (
        <p key={t(c)} className="text-muted-foreground">
          {t(c)}
        </p>
      ))}
      <p className="text-muted-foreground">{t("experiments.validity.summary.footer")}</p>
    </div>
  );
}
