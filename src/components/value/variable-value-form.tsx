"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateVariableValueFieldsAction } from "@/actions/value";
import { FieldStatusBadge } from "@/components/value/epistemic-badge";
import { Button } from "@/components/ui/button";
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
import type { GraphVariable } from "@/db/workspaces";
import {
  DIRECTION_LABELS,
  DesiredDirection,
  VARIABLE_CATEGORY_LABELS,
  VARIABLE_POLARITY_LABELS,
  VariableCategory,
  VariablePolarity,
} from "@/domain/enums";
import {
  checkVerbType,
  compactLabel,
  fieldStatus,
  knownVariableType,
  suggestedVerbsFor,
  VARIABLE_TYPES_BY_POLARITY,
  type VariableField,
} from "@/services/value/variable-semantics";

const NONE = "__none__";

/**
 * Valuable Variable editor: ACTION × VARIABLE × TARGET, the variable *type*
 * (what is directly moved — the compatibility check runs on it), scope,
 * states, and the parent economic variable with its expected direction.
 * Every field keeps its own status; empty stays UNKNOWN.
 */
export function VariableValueForm({
  variable,
  siblings,
}: {
  variable: GraphVariable;
  siblings: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: variable.name,
    category: variable.category,
    variableType: variable.variableType ?? "",
    variablePolarity: (variable.variablePolarity ?? "") as VariablePolarity | "",
    desiredDirection: variable.desiredDirection,
    importanceScore: variable.importanceScore,
    target: variable.target ?? "",
    scope: variable.scope ?? "",
    currentState: variable.currentState ?? "",
    desiredState: variable.desiredState ?? "",
    unit: variable.unit ?? "",
    whoValuesIt: variable.whoValuesIt ?? "",
    whyItMatters: variable.whyItMatters ?? "",
    parentVariableId: variable.parentVariableId ?? "",
    parentDirection: (variable.parentDirection ?? "") as DesiredDirection | "",
  });
  const known = useMemo(() => knownVariableType(form.variableType), [form.variableType]);
  const isCustom = form.variableType.trim().length > 0 && !known;
  const check = useMemo(
    () =>
      checkVerbType(
        form.desiredDirection,
        form.variableType || null,
        (form.variablePolarity || null) as VariablePolarity | null,
      ),
    [form.desiredDirection, form.variableType, form.variablePolarity],
  );
  const suggestions = useMemo(() => suggestedVerbsFor(check.polarity), [check.polarity]);
  const status = (field: VariableField) => fieldStatus(variable, field);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const changed: Record<string, unknown> = { variableId: variable.id };
    for (const [k, v] of Object.entries(form)) {
      const before = (variable as unknown as Record<string, unknown>)[k] ?? "";
      if (String(before) !== String(v)) changed[k] = v === "" ? null : v;
    }
    const r = await updateVariableValueFieldsAction(changed);
    setSaving(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Variable saved (changed fields marked USER)");
      router.refresh();
    }
  };

  const setTypeQuick = (name: string) =>
    setForm({ ...form, variableType: name, variablePolarity: "" });

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="rounded-md border p-2.5">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Direct variable
        </p>
        <p className="text-base font-semibold">{compactLabel(form.desiredDirection, form.name)}</p>
        <p className="text-muted-foreground text-xs">
          Action: {DIRECTION_LABELS[form.desiredDirection]} · Type:{" "}
          {form.variableType.trim() ? form.variableType : "UNKNOWN"}
          {check.polarity ? ` (${VARIABLE_POLARITY_LABELS[check.polarity].toLowerCase()})` : ""}
        </p>
      </div>

      <F label="Variable" status={status("name")}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </F>

      <div className="grid grid-cols-2 gap-3">
        <F label="Action (verb)" status={status("desiredDirection")}>
          <Select
            value={form.desiredDirection}
            onValueChange={(v) => setForm({ ...form, desiredDirection: v as DesiredDirection })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map((d) => (
                <SelectItem key={d} value={d}>
                  {DIRECTION_LABELS[d]} · suggested
                </SelectItem>
              ))}
              {Object.values(DesiredDirection)
                .filter((d) => !suggestions.includes(d))
                .map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIRECTION_LABELS[d]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Variable type (what is moved)" status={status("variableType")}>
          <Input
            list={`variable-types-${variable.id}`}
            value={form.variableType}
            onChange={(e) => setForm({ ...form, variableType: e.target.value })}
            placeholder="Leakage, Churn, Downtime, Revenue… or custom"
          />
          <datalist id={`variable-types-${variable.id}`}>
            {(["NEGATIVE", "POSITIVE", "NEUTRAL"] as VariablePolarity[]).flatMap((p) =>
              VARIABLE_TYPES_BY_POLARITY[p].map((t) => (
                <option key={t} value={t}>
                  {VARIABLE_POLARITY_LABELS[p]}
                </option>
              )),
            )}
          </datalist>
        </F>
      </div>
      {!form.variableType.trim() && (
        <div className="flex flex-wrap gap-1">
          {[
            "Leakage",
            "Cost",
            "Churn",
            "Downtime",
            "Manual effort",
            "Revenue",
            "Retention",
            "Utilization",
          ].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeQuick(t)}
              className="text-muted-foreground hover:text-foreground rounded border px-1.5 py-0.5 text-[11px]"
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {isCustom && (
        <F label="Polarity of this custom type" status={status("variablePolarity")}>
          <Select
            value={form.variablePolarity || NONE}
            onValueChange={(v) =>
              setForm({ ...form, variablePolarity: v === NONE ? "" : (v as VariablePolarity) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="UNKNOWN" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>UNKNOWN — no compatibility check</SelectItem>
              {Object.values(VariablePolarity).map((p) => (
                <SelectItem key={p} value={p}>
                  {VARIABLE_POLARITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
      )}
      {check.level === "warning" && (
        <p className="bg-tone-warning-bg text-tone-warning flex items-start gap-2 rounded-md px-2 py-1.5 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {check.message}
        </p>
      )}
      {check.level === "unknown" && (
        <p className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {check.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <F label="Economic category" status={status("category")}>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v as VariableCategory })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(VariableCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {VARIABLE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label={`Importance ${form.importanceScore}/10`} status={status("importanceScore")}>
          <input
            type="range"
            min={0}
            max={10}
            value={form.importanceScore}
            onChange={(e) => setForm({ ...form, importanceScore: Number(e.target.value) })}
            className="mt-2 w-full accent-current"
          />
        </F>
      </div>

      <F label="Target (what exactly is moved)" status={status("target")}>
        <Input
          value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
          placeholder="e.g. booked appointments not honoured or cancelled same-day"
        />
      </F>
      <F label="Scope (where it applies)" status={status("scope")}>
        <Input
          value={form.scope}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
          placeholder="e.g. peak-hour bookings, single-location salons"
        />
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Current state" status={status("currentState")}>
          <Input
            value={form.currentState}
            onChange={(e) => setForm({ ...form, currentState: e.target.value })}
            placeholder="UNKNOWN"
          />
        </F>
        <F label="Desired state" status={status("desiredState")}>
          <Input
            value={form.desiredState}
            onChange={(e) => setForm({ ...form, desiredState: e.target.value })}
            placeholder="UNKNOWN"
          />
        </F>
        <F label="Unit" status={status("unit")}>
          <Input
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder="% of appointments"
          />
        </F>
        <F label="Who values it" status={status("whoValuesIt")}>
          <Input
            value={form.whoValuesIt}
            onChange={(e) => setForm({ ...form, whoValuesIt: e.target.value })}
            placeholder="Independent salon owner"
          />
        </F>
      </div>
      <F label="Why it matters" status={status("whyItMatters")}>
        <Textarea
          rows={2}
          value={form.whyItMatters}
          onChange={(e) => setForm({ ...form, whyItMatters: e.target.value })}
          placeholder="Empty peak-hour slots cannot always be resold…"
        />
      </F>

      <div className="rounded-md border border-dashed p-2.5">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Parent economic variable
        </p>
        <p className="text-muted-foreground mb-2 text-[11px]">
          What benefits downstream when this variable moves as desired. The relation stays a
          hypothesis until evidence supports it; it never enters the compatibility check.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <F label="Parent variable" status={status("parentVariableId")}>
            <Select
              value={form.parentVariableId || NONE}
              onValueChange={(v) => setForm({ ...form, parentVariableId: v === NONE ? "" : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {siblings
                  .filter((s) => s.id !== variable.id)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Expected movement of the parent" status={status("parentDirection")}>
            <Select
              value={form.parentDirection || NONE}
              onValueChange={(v) =>
                setForm({ ...form, parentDirection: v === NONE ? "" : (v as DesiredDirection) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="UNKNOWN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>UNKNOWN</SelectItem>
                {Object.values(DesiredDirection).map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIRECTION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
        </div>
      </div>

      <p className="text-muted-foreground text-[11px]">
        Each field keeps its own status. Empty fields are UNKNOWN and stay UNKNOWN; saving marks the
        fields you changed as USER.
      </p>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save variable
        </Button>
      </div>
    </form>
  );
}

function F({
  label,
  status,
  children,
}: {
  label: string;
  status: ReturnType<typeof fieldStatus>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <FieldStatusBadge status={status} />
      </div>
      {children}
    </div>
  );
}
