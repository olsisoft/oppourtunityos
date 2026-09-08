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
import { DesiredDirection, VariableCategory, VariablePolarity } from "@/domain/enums";
import { useT } from "@/i18n/client";
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
  const t = useT();
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
  const direction = (d: DesiredDirection) => t(`labels.direction.${d}`);
  const polarity = (p: VariablePolarity) => t(`labels.variablePolarity.${p}`);
  const unknown = t("value.unknown");

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
    if (!r.ok) toast.error(t(r.error));
    else {
      toast.success(t("value.variableForm.saved"));
      router.refresh();
    }
  };

  const setTypeQuick = (name: string) =>
    setForm({ ...form, variableType: name, variablePolarity: "" });

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="rounded-md border p-2.5">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t("value.variableForm.direct")}
        </p>
        <p className="text-base font-semibold">{compactLabel(form.desiredDirection, form.name)}</p>
        <p className="text-muted-foreground text-xs">
          {t("value.variableForm.summary", {
            action: direction(form.desiredDirection),
            type: form.variableType.trim() ? form.variableType : unknown,
            withPolarity: Boolean(check.polarity),
            polarity: check.polarity ? polarity(check.polarity).toLowerCase() : "",
          })}
        </p>
      </div>

      <F label={t("value.variableForm.name")} status={status("name")}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </F>

      <div className="grid grid-cols-2 gap-3">
        <F label={t("value.variableForm.action")} status={status("desiredDirection")}>
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
                  {t("value.variableForm.suggested", { label: direction(d) })}
                </SelectItem>
              ))}
              {Object.values(DesiredDirection)
                .filter((d) => !suggestions.includes(d))
                .map((d) => (
                  <SelectItem key={d} value={d}>
                    {direction(d)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </F>
        <F label={t("value.variableForm.type")} status={status("variableType")}>
          <Input
            list={`variable-types-${variable.id}`}
            value={form.variableType}
            onChange={(e) => setForm({ ...form, variableType: e.target.value })}
            placeholder={t("value.variableForm.typePlaceholder")}
          />
          <datalist id={`variable-types-${variable.id}`}>
            {(["NEGATIVE", "POSITIVE", "NEUTRAL"] as VariablePolarity[]).flatMap((p) =>
              VARIABLE_TYPES_BY_POLARITY[p].map((type) => (
                <option key={type} value={type}>
                  {polarity(p)}
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
          ].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeQuick(type)}
              className="text-muted-foreground hover:text-foreground rounded border px-1.5 py-0.5 text-[11px]"
            >
              {type}
            </button>
          ))}
        </div>
      )}
      {isCustom && (
        <F label={t("value.variableForm.polarity")} status={status("variablePolarity")}>
          <Select
            value={form.variablePolarity || NONE}
            onValueChange={(v) =>
              setForm({ ...form, variablePolarity: v === NONE ? "" : (v as VariablePolarity) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={unknown} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("value.variableForm.noPolarity")}</SelectItem>
              {Object.values(VariablePolarity).map((p) => (
                <SelectItem key={p} value={p}>
                  {polarity(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
      )}
      {check.level === "warning" && (
        <p className="bg-tone-warning-bg text-tone-warning flex items-start gap-2 rounded-md px-2 py-1.5 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {t(check.message)}
        </p>
      )}
      {check.level === "unknown" && (
        <p className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {t(check.message)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <F label={t("value.variableForm.category")} status={status("category")}>
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
                  {t(`labels.variableCategory.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F
          label={t("value.variableForm.importance", { score: form.importanceScore })}
          status={status("importanceScore")}
        >
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

      <F label={t("value.variableForm.target")} status={status("target")}>
        <Input
          value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
          placeholder={t("value.variableForm.targetPlaceholder")}
        />
      </F>
      <F label={t("value.variableForm.scope")} status={status("scope")}>
        <Input
          value={form.scope}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
          placeholder={t("value.variableForm.scopePlaceholder")}
        />
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label={t("value.variableForm.currentState")} status={status("currentState")}>
          <Input
            value={form.currentState}
            onChange={(e) => setForm({ ...form, currentState: e.target.value })}
            placeholder={unknown}
          />
        </F>
        <F label={t("value.variableForm.desiredState")} status={status("desiredState")}>
          <Input
            value={form.desiredState}
            onChange={(e) => setForm({ ...form, desiredState: e.target.value })}
            placeholder={unknown}
          />
        </F>
        <F label={t("value.variableForm.unit")} status={status("unit")}>
          <Input
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder={t("value.variableForm.unitPlaceholder")}
          />
        </F>
        <F label={t("value.variableForm.whoValuesIt")} status={status("whoValuesIt")}>
          <Input
            value={form.whoValuesIt}
            onChange={(e) => setForm({ ...form, whoValuesIt: e.target.value })}
            placeholder={t("value.variableForm.whoPlaceholder")}
          />
        </F>
      </div>
      <F label={t("value.variableForm.whyItMatters")} status={status("whyItMatters")}>
        <Textarea
          rows={2}
          value={form.whyItMatters}
          onChange={(e) => setForm({ ...form, whyItMatters: e.target.value })}
          placeholder={t("value.variableForm.whyPlaceholder")}
        />
      </F>

      <div className="rounded-md border border-dashed p-2.5">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t("value.variableForm.parent")}
        </p>
        <p className="text-muted-foreground mb-2 text-[11px]">
          {t("value.variableForm.parentHelp")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("value.variableForm.parentVariable")} status={status("parentVariableId")}>
            <Select
              value={form.parentVariableId || NONE}
              onValueChange={(v) => setForm({ ...form, parentVariableId: v === NONE ? "" : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("value.variableForm.none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("value.variableForm.none")}</SelectItem>
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
          <F label={t("value.variableForm.parentDirection")} status={status("parentDirection")}>
            <Select
              value={form.parentDirection || NONE}
              onValueChange={(v) =>
                setForm({ ...form, parentDirection: v === NONE ? "" : (v as DesiredDirection) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={unknown} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{unknown}</SelectItem>
                {Object.values(DesiredDirection).map((d) => (
                  <SelectItem key={d} value={d}>
                    {direction(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
        </div>
      </div>

      <p className="text-muted-foreground text-[11px]">{t("value.variableForm.footer")}</p>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} {t("value.variableForm.save")}
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
