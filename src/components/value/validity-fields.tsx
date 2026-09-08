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
import { cn } from "@/lib/utils";
import {
  ASSIGNMENT_METHOD_LABELS,
  DESIGN_LEVEL_HELP,
  DESIGN_LEVEL_LABELS,
  DESIGN_LEVELS,
  INTERNAL_VALIDITY_LABELS,
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

const TRI: Array<[keyof ValidityFormFields, string, "plan" | "both"]> = [
  ["baselineMeasured", "Baseline measured before the intervention", "both"],
  ["comparisonGroup", "A comparison group exists", "both"],
  ["sameMeasurement", "Same measurement before and after", "both"],
  ["interventionIsolated", "Only the intervention changed", "both"],
  ["confoundersControlled", "Known confounders controlled", "both"],
  ["instrumentationChanged", "Instrumentation changed during the run", "plan"],
  ["contaminationRisk", "Comparison units exposed to the intervention", "plan"],
  ["seasonalityRisk", "Seasonality could explain part of the change", "plan"],
  ["concurrentChanges", "Other changes happened during the run", "plan"],
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
  return (
    <Select
      value={value || "__unknown__"}
      onValueChange={(v) => onChange(v === "__unknown__" ? "" : (v as TriState))}
    >
      <SelectTrigger id={id} size="sm" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unknown__">not recorded</SelectItem>
        <SelectItem value="yes">yes</SelectItem>
        <SelectItem value="no">no</SelectItem>
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
  const rows = TRI.filter(([, , when]) => when === "both" || mode === "result");
  return (
    <div className="space-y-2 text-xs">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-design`} className="text-xs">
            Design level
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
                  {DESIGN_LEVEL_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground">{DESIGN_LEVEL_HELP[fields.designLevel]}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-assignment`} className="text-xs">
            Assignment method
          </Label>
          <Select
            value={fields.assignmentMethod || "__unknown__"}
            onValueChange={(v) =>
              onChange("assignmentMethod", v === "__unknown__" ? "" : (v as AssignmentMethod))
            }
          >
            <SelectTrigger id={`${idPrefix}-assignment`} className="w-full">
              <SelectValue placeholder="not recorded" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unknown__">not recorded</SelectItem>
              {(Object.keys(ASSIGNMENT_METHOD_LABELS) as AssignmentMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {ASSIGNMENT_METHOD_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(([key, label]) => (
          <li
            key={key}
            className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
          >
            <Label htmlFor={`${idPrefix}-${key}`} className="text-xs font-normal">
              {label}
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
            Organizations
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
            Duration (days)
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
                Attrition (%)
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
                Data completeness (%)
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
  observed?: string | null;
  interpretation?: string | null;
  caveats?: string[];
  scopeText?: string | null;
  compact?: boolean;
}) {
  const tone =
    assessment.internalValidity === "HIGH"
      ? "positive"
      : assessment.internalValidity === "MEDIUM"
        ? "info"
        : assessment.internalValidity === "LOW"
          ? "negative"
          : "warning";
  const shown = compact ? assessment.checks.filter((c) => c.ok !== null) : assessment.checks;
  return (
    <div className="space-y-2 rounded-md border p-3 text-xs">
      <p className="text-[10px] font-semibold tracking-wider uppercase">Experimental validity</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="font-mono text-[10px]">
          design · {DESIGN_LEVEL_LABELS[assessment.designEffective]}
          {assessment.designEffective !== assessment.designDeclared
            ? ` (declared ${DESIGN_LEVEL_LABELS[assessment.designDeclared].toLowerCase()})`
            : ""}
        </Badge>
        <Badge variant={tone} className="font-mono text-[10px]">
          internal validity · {INTERNAL_VALIDITY_LABELS[assessment.internalValidity]}
        </Badge>
      </div>
      {scopeText && (
        <p className="text-muted-foreground break-words">
          <span className="font-mono text-[10px] uppercase">Scope</span> {scopeText}
        </p>
      )}
      {assessment.downgrades.map((d) => (
        <p key={d} className="text-tone-warning flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {d}
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
            <span className={c.ok === null ? "text-muted-foreground" : ""}>{c.text}</span>
          </li>
        ))}
      </ul>
      {observed && (
        <p>
          <span className="text-muted-foreground font-mono text-[10px] uppercase">Observed</span>{" "}
          {observed}
        </p>
      )}
      {interpretation && (
        <p className="bg-muted/60 rounded px-2 py-1.5">
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            System interpretation
          </span>{" "}
          {interpretation}
        </p>
      )}
      {caveats?.map((c) => (
        <p key={c} className="text-muted-foreground">
          {c}
        </p>
      ))}
      <p className="text-muted-foreground">
        The wording follows the design and its validity, never the hoped-for outcome. You cannot
        rewrite the inference strength; you can record more facts about the run.
      </p>
    </div>
  );
}
