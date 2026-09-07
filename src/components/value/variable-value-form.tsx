"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
  VariableCategory,
} from "@/domain/enums";
import {
  checkVerbCategory,
  fieldStatus,
  suggestedVerbs,
  type VariableField,
} from "@/services/value/variable-semantics";

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
    desiredDirection: variable.desiredDirection,
    importanceScore: variable.importanceScore,
    target: variable.target ?? "",
    currentState: variable.currentState ?? "",
    desiredState: variable.desiredState ?? "",
    unit: variable.unit ?? "",
    whoValuesIt: variable.whoValuesIt ?? "",
    whyItMatters: variable.whyItMatters ?? "",
    parentVariableId: variable.parentVariableId ?? "",
  });
  const check = useMemo(
    () => checkVerbCategory(form.desiredDirection, form.category),
    [form.desiredDirection, form.category],
  );
  const suggestions = useMemo(() => suggestedVerbs(form.category), [form.category]);
  const status = (field: VariableField) => fieldStatus(variable, field);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const changed: Record<string, unknown> = { variableId: variable.id };
    for (const [k, v] of Object.entries(form)) {
      const before = (variable as unknown as Record<string, unknown>)[k] ?? "";
      if (String(before) !== String(v)) changed[k] = v;
    }
    const r = await updateVariableValueFieldsAction(changed);
    setSaving(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Variable saved (changed fields marked USER)");
      router.refresh();
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <F label="Variable" status={status("name")}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Action (direction)" status={status("desiredDirection")}>
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
        <F label="Category" status={status("category")}>
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
      </div>
      {check.level === "warning" && (
        <p className="bg-tone-warning-bg text-tone-warning flex items-start gap-2 rounded-md px-2 py-1.5 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {check.message} You may keep it if
          it is intended.
        </p>
      )}
      <F label="Target (what exactly is moved)" status={status("target")}>
        <Input
          value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
          placeholder="e.g. booked appointments that become unused capacity"
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
      <F label="Who values it" status={status("whoValuesIt")}>
        <Input
          value={form.whoValuesIt}
          onChange={(e) => setForm({ ...form, whoValuesIt: e.target.value })}
          placeholder="Independent salon owner"
        />
      </F>
      <F label="Why it matters" status={status("whyItMatters")}>
        <Textarea
          rows={2}
          value={form.whyItMatters}
          onChange={(e) => setForm({ ...form, whyItMatters: e.target.value })}
          placeholder="Empty peak-hour slots cannot always be resold…"
        />
      </F>
      <F label="Parent economic variable" status={status("parentVariableId")}>
        <Select
          value={form.parentVariableId || "none"}
          onValueChange={(v) => setForm({ ...form, parentVariableId: v === "none" ? "" : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
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
