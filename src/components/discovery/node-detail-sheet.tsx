"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowUpRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEntityAction, updateIcpAction, updatePainAction } from "@/actions/entities";
import type { MapSelection } from "@/components/discovery/opportunity-map";
import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Scorecard } from "@/components/value/scorecard";
import { VariableValueForm } from "@/components/value/variable-value-form";
import type { WorkspaceGraph } from "@/db/workspaces";
import { useT } from "@/i18n/client";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import { compactLabel } from "@/services/value/variable-semantics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export function NodeDetailSheet({
  selection,
  workspaceId,
  graph,
  onClose,
}: {
  selection: MapSelection | null;
  workspaceId: string;
  graph: WorkspaceGraph;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(selection)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {selection && (
          <Body selection={selection} workspaceId={workspaceId} graph={graph} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  selection,
  workspaceId,
  graph,
  onClose,
}: {
  selection: MapSelection;
  workspaceId: string;
  graph: WorkspaceGraph;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  const remove = (kind: Parameters<typeof deleteEntityAction>[0]["kind"], id: string) => {
    if (!confirm(t("discovery.detail.confirmDelete"))) return;
    start(async () => {
      const r = await deleteEntityAction({ kind, id, workspaceId });
      if (!r.ok) toast.error(t(r.error));
      else {
        toast.success(t("discovery.detail.deleted"));
        onClose();
        router.refresh();
      }
    });
  };

  switch (selection.kind) {
    case "market":
      return (
        <div className="p-4 pt-10">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs uppercase">
                {t("discovery.detail.market.kind")}
              </span>
              <ProvenanceBadge provenance={selection.item.provenance} />
            </div>
            <SheetTitle>{selection.item.name}</SheetTitle>
            <SheetDescription>
              {selection.item.description ?? t("discovery.detail.market.noDescription")}
            </SheetDescription>
          </SheetHeader>
          <Field
            label={t("discovery.detail.market.attractiveness")}
            value={selection.item.attractivenessNotes}
          />
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => remove("market", selection.item.id)}
            >
              <Trash2 /> {t("discovery.detail.market.delete")}
            </Button>
          </div>
        </div>
      );
    case "icp":
      return (
        <IcpForm
          icp={selection.item}
          onDelete={() => remove("icp", selection.item.id)}
          pending={pending}
        />
      );
    case "variable": {
      const v = selection.item;
      const siblings = graph.markets
        .flatMap((m) => m.icps.flatMap((i) => i.variables))
        .filter((x) => x.id !== v.id)
        .map((x) => ({ id: x.id, name: x.name }));
      return (
        <div className="space-y-3 p-4 pt-10">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs uppercase">
                {t("discovery.detail.variable.kind")}
              </span>
              <ProvenanceBadge provenance={v.provenance} />
            </div>
            <SheetTitle>{compactLabel(v.desiredDirection, v.name)}</SheetTitle>
            <SheetDescription>
              {t("discovery.detail.variable.description", { count: v.pains.length })}
            </SheetDescription>
          </SheetHeader>
          <VariableValueForm variable={v} siblings={siblings} />
          <div className="flex justify-start border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove("variable", v.id)}
              disabled={pending}
            >
              <Trash2 /> {t("discovery.detail.variable.delete")}
            </Button>
          </div>
        </div>
      );
    }
    case "pain":
      return (
        <PainForm
          pain={selection.item}
          onDelete={() => remove("pain", selection.item.id)}
          pending={pending}
        />
      );
    case "opportunity": {
      const o = selection.item;
      const frontier = o.proofFrontierRung
        ? t(`labels.proofRung.${o.proofFrontierRung}`)
        : t("opportunity.score.notComputed");
      return (
        <div className="p-4 pt-10">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs uppercase">
                {t("discovery.detail.opportunity.kind")}
              </span>
              <VerdictBadge verdict={o.verdict} />
            </div>
            <SheetTitle>{o.title}</SheetTitle>
            <SheetDescription>
              {o.problemStatement ?? t("discovery.detail.opportunity.noProblemStatement")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Scorecard
              opportunity={o}
              insights={deriveOpportunityInsights(o, graph.mechanisms.length)}
              size="md"
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            {t("discovery.detail.opportunity.frontierLabel")}{" "}
            <span className="text-foreground">{frontier}</span>.{" "}
            {t("discovery.detail.opportunity.frontierNote")}
          </p>
          <div className="mt-6">
            <Button asChild size="sm">
              <Link href={`/app/w/${workspaceId}/opportunities/${o.id}`}>
                {t("discovery.detail.opportunity.openReport")} <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      );
    }
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="mt-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-sm">
        {value?.trim() ? value : <span className="text-muted-foreground">UNKNOWN</span>}
      </p>
    </div>
  );
}

function useSave<T>(action: (input: T) => Promise<{ ok: boolean; error?: string }>) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  return {
    saving,
    save: async (input: T) => {
      setSaving(true);
      const r = await action(input);
      setSaving(false);
      if (!r.ok) toast.error(r.error ? t(r.error) : t("discovery.detail.failed"));
      else {
        toast.success(t("discovery.detail.saved"));
        router.refresh();
      }
    },
  };
}

function IcpForm({
  icp,
  onDelete,
  pending,
}: {
  icp: Extract<MapSelection, { kind: "icp" }>["item"];
  onDelete: () => void;
  pending: boolean;
}) {
  const t = useT();
  const { save, saving } = useSave(updateIcpAction);
  const [form, setForm] = useState({
    name: icp.name,
    role: icp.role ?? "",
    companyType: icp.companyType ?? "",
    companySize: icp.companySize ?? "",
    responsibilities: icp.responsibilities ?? "",
    economicBuyer: icp.economicBuyer ?? "",
    userRole: icp.userRole ?? "",
    reachability: icp.reachability ?? "",
    notes: icp.notes ?? "",
  });
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form
      className="space-y-3 p-4 pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        void save({ icpId: icp.id, ...form });
      }}
    >
      <SheetHeader className="p-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase">
            {t("discovery.detail.icp.kind")}
          </span>
          <ProvenanceBadge provenance={icp.provenance} />
        </div>
        <SheetTitle>{icp.name}</SheetTitle>
        <SheetDescription>{t("discovery.detail.icp.description")}</SheetDescription>
      </SheetHeader>
      <L label={t("discovery.detail.icp.name")}>
        <Input value={form.name} onChange={set("name")} required />
      </L>
      <div className="grid grid-cols-2 gap-3">
        <L label={t("discovery.detail.icp.role")}>
          <Input value={form.role} onChange={set("role")} />
        </L>
        <L label={t("discovery.detail.icp.companyType")}>
          <Input value={form.companyType} onChange={set("companyType")} />
        </L>
        <L label={t("discovery.detail.icp.companySize")}>
          <Input value={form.companySize} onChange={set("companySize")} />
        </L>
        <L label={t("discovery.detail.icp.userRole")}>
          <Input value={form.userRole} onChange={set("userRole")} />
        </L>
      </div>
      <L label={t("discovery.detail.icp.responsibilities")}>
        <Textarea rows={2} value={form.responsibilities} onChange={set("responsibilities")} />
      </L>
      <L label={t("discovery.detail.icp.economicBuyer")}>
        <Input value={form.economicBuyer} onChange={set("economicBuyer")} placeholder="UNKNOWN" />
      </L>
      <L label={t("discovery.detail.icp.reachability")}>
        <Input value={form.reachability} onChange={set("reachability")} placeholder="UNKNOWN" />
      </L>
      <L label={t("discovery.detail.icp.notes")}>
        <Textarea rows={2} value={form.notes} onChange={set("notes")} />
      </L>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
          <Trash2 /> {t("common.delete")}
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function PainForm({
  pain,
  onDelete,
  pending,
}: {
  pain: Extract<MapSelection, { kind: "pain" }>["item"];
  onDelete: () => void;
  pending: boolean;
}) {
  const t = useT();
  const { save, saving } = useSave(updatePainAction);
  const [form, setForm] = useState({
    description: pain.description,
    severityScore: pain.severityScore,
    frequencyScore: pain.frequencyScore,
    currentState: pain.currentState ?? "",
    desiredState: pain.desiredState ?? "",
    gapDescription: pain.gapDescription ?? "",
  });
  return (
    <form
      className="space-y-3 p-4 pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        void save({ painId: pain.id, ...form });
      }}
    >
      <SheetHeader className="p-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase">
            {t("discovery.detail.pain.kind")}
          </span>
          <ProvenanceBadge provenance={pain.provenance} />
        </div>
        <SheetTitle className="text-base">{pain.description}</SheetTitle>
        <SheetDescription>{t("discovery.detail.pain.description")}</SheetDescription>
      </SheetHeader>
      <L label={t("discovery.detail.pain.descriptionField")}>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </L>
      <div className="grid grid-cols-2 gap-3">
        <L label={t("discovery.detail.pain.severity", { value: form.severityScore })}>
          <input
            type="range"
            min={0}
            max={10}
            value={form.severityScore}
            onChange={(e) => setForm({ ...form, severityScore: Number(e.target.value) })}
            className="w-full accent-current"
          />
        </L>
        <L label={t("discovery.detail.pain.frequency", { value: form.frequencyScore })}>
          <input
            type="range"
            min={0}
            max={10}
            value={form.frequencyScore}
            onChange={(e) => setForm({ ...form, frequencyScore: Number(e.target.value) })}
            className="w-full accent-current"
          />
        </L>
      </div>
      <L label={t("discovery.detail.pain.currentState")}>
        <Input
          value={form.currentState}
          onChange={(e) => setForm({ ...form, currentState: e.target.value })}
          placeholder="UNKNOWN"
        />
      </L>
      <L label={t("discovery.detail.pain.desiredState")}>
        <Input
          value={form.desiredState}
          onChange={(e) => setForm({ ...form, desiredState: e.target.value })}
          placeholder="UNKNOWN"
        />
      </L>
      <L label={t("discovery.detail.pain.gap")}>
        <Textarea
          rows={2}
          value={form.gapDescription}
          onChange={(e) => setForm({ ...form, gapDescription: e.target.value })}
        />
      </L>

      <div className="space-y-2 pt-2">
        <p className="text-xs font-medium">
          {t("discovery.detail.pain.triggers", { count: pain.triggers.length })}
        </p>
        {pain.triggers.length === 0 && (
          <p className="text-muted-foreground text-xs">{t("discovery.detail.pain.noTrigger")}</p>
        )}
        {pain.triggers.map((trigger) => (
          <div key={trigger.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span>{trigger.description}</span>
              <Badge variant="outline">
                {t("discovery.detail.pain.urgency", { value: trigger.urgencyScore })}
              </Badge>
            </div>
          </div>
        ))}
        <p className="pt-2 text-xs font-medium">
          {t("discovery.detail.pain.alternatives", { count: pain.alternatives.length })}
        </p>
        {pain.alternatives.length === 0 && (
          <p className="text-muted-foreground text-xs">
            {t("discovery.detail.pain.noAlternative")}
          </p>
        )}
        {pain.alternatives.map((a) => (
          <div key={a.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{a.name}</span>
              <Badge variant="outline">
                {t("discovery.detail.pain.alternativeBadge", {
                  category: t(`labels.alternativeCategory.${a.category}`),
                  value: a.weaknessScore,
                })}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {a.weaknessDescription ?? t("discovery.detail.pain.failureUnknown")}
            </p>
          </div>
        ))}
        <p className="pt-2 text-xs font-medium">
          {t("discovery.detail.pain.evidence", { count: pain.evidence.length })}
        </p>
        {pain.evidence.length === 0 && (
          <p className="text-muted-foreground text-xs">{t("discovery.detail.pain.noEvidence")}</p>
        )}
        {pain.evidence.slice(0, 5).map((e) => (
          <div key={e.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{e.sourceTitle}</span>
              <Badge variant="muted">{t(`labels.evidenceType.${e.type}`)}</Badge>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
          <Trash2 /> {t("common.delete")}
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} {t("common.save")}
        </Button>
      </div>
    </form>
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
