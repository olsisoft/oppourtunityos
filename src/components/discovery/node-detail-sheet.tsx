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
import { Scorecard, frontierText } from "@/components/value/scorecard";
import { VariableValueForm } from "@/components/value/variable-value-form";
import type { WorkspaceGraph } from "@/db/workspaces";
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
import { ALTERNATIVE_CATEGORY_LABELS, EVIDENCE_TYPE_LABELS } from "@/domain/enums";

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
  const router = useRouter();
  const [pending, start] = useTransition();

  const remove = (kind: Parameters<typeof deleteEntityAction>[0]["kind"], id: string) => {
    if (!confirm("Delete this item and everything beneath it? Scores will be recomputed.")) return;
    start(async () => {
      const r = await deleteEntityAction({ kind, id, workspaceId });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Deleted");
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
              <span className="text-muted-foreground text-xs uppercase">Market</span>
              <ProvenanceBadge provenance={selection.item.provenance} />
            </div>
            <SheetTitle>{selection.item.name}</SheetTitle>
            <SheetDescription>{selection.item.description ?? "No description."}</SheetDescription>
          </SheetHeader>
          <Field label="Attractiveness notes" value={selection.item.attractivenessNotes} />
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => remove("market", selection.item.id)}
            >
              <Trash2 /> Delete market
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
              <span className="text-muted-foreground text-xs uppercase">Valuable variable</span>
              <ProvenanceBadge provenance={v.provenance} />
            </div>
            <SheetTitle>{compactLabel(v.desiredDirection, v.name)}</SheetTitle>
            <SheetDescription>
              {v.pains.length} pain{v.pains.length === 1 ? "" : "s"} attached. Each field carries
              its own status; leave a field empty when it is UNKNOWN rather than guessing.
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
              <Trash2 /> Delete variable
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
      return (
        <div className="p-4 pt-10">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs uppercase">Opportunity</span>
              <VerdictBadge verdict={o.verdict} />
            </div>
            <SheetTitle>{o.title}</SheetTitle>
            <SheetDescription>{o.problemStatement ?? "No problem statement yet."}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Scorecard
              opportunity={o}
              insights={deriveOpportunityInsights(o, graph.mechanisms.length)}
              size="md"
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Current Proof Frontier:{" "}
            <span className="text-foreground">{frontierText(o.proofFrontierRung)}</span>. Everything
            beyond it remains a product or causal hypothesis.
          </p>
          <div className="mt-6">
            <Button asChild size="sm">
              <Link href={`/app/w/${workspaceId}/opportunities/${o.id}`}>
                Open report <ArrowUpRight />
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
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  return {
    saving,
    save: async (input: T) => {
      setSaving(true);
      const r = await action(input);
      setSaving(false);
      if (!r.ok) toast.error(r.error ?? "Failed");
      else {
        toast.success("Saved");
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
          <span className="text-muted-foreground text-xs uppercase">ICP</span>
          <ProvenanceBadge provenance={icp.provenance} />
        </div>
        <SheetTitle>{icp.name}</SheetTitle>
        <SheetDescription>
          Edit any field. Manual edits mark the ICP as stated by you. Say UNKNOWN when you do not
          know.
        </SheetDescription>
      </SheetHeader>
      <L label="Name">
        <Input value={form.name} onChange={set("name")} required />
      </L>
      <div className="grid grid-cols-2 gap-3">
        <L label="Role">
          <Input value={form.role} onChange={set("role")} />
        </L>
        <L label="Company type">
          <Input value={form.companyType} onChange={set("companyType")} />
        </L>
        <L label="Company size">
          <Input value={form.companySize} onChange={set("companySize")} />
        </L>
        <L label="User role">
          <Input value={form.userRole} onChange={set("userRole")} />
        </L>
      </div>
      <L label="Responsibilities">
        <Textarea rows={2} value={form.responsibilities} onChange={set("responsibilities")} />
      </L>
      <L label="Economic buyer (who controls the budget?)">
        <Input value={form.economicBuyer} onChange={set("economicBuyer")} placeholder="UNKNOWN" />
      </L>
      <L label="Reachability (how can you reach them?)">
        <Input value={form.reachability} onChange={set("reachability")} placeholder="UNKNOWN" />
      </L>
      <L label="Notes">
        <Textarea rows={2} value={form.notes} onChange={set("notes")} />
      </L>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
          <Trash2 /> Delete
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save
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
          <span className="text-muted-foreground text-xs uppercase">Pain</span>
          <ProvenanceBadge provenance={pain.provenance} />
        </div>
        <SheetTitle className="text-base">{pain.description}</SheetTitle>
        <SheetDescription>
          Current state, desired state and gap. UNKNOWN is a valid and honest answer.
        </SheetDescription>
      </SheetHeader>
      <L label="Description">
        <Textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </L>
      <div className="grid grid-cols-2 gap-3">
        <L label={`Severity ${form.severityScore}/10`}>
          <input
            type="range"
            min={0}
            max={10}
            value={form.severityScore}
            onChange={(e) => setForm({ ...form, severityScore: Number(e.target.value) })}
            className="w-full accent-current"
          />
        </L>
        <L label={`Frequency ${form.frequencyScore}/10`}>
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
      <L label="Current state">
        <Input
          value={form.currentState}
          onChange={(e) => setForm({ ...form, currentState: e.target.value })}
          placeholder="UNKNOWN"
        />
      </L>
      <L label="Desired state">
        <Input
          value={form.desiredState}
          onChange={(e) => setForm({ ...form, desiredState: e.target.value })}
          placeholder="UNKNOWN"
        />
      </L>
      <L label="Gap">
        <Textarea
          rows={2}
          value={form.gapDescription}
          onChange={(e) => setForm({ ...form, gapDescription: e.target.value })}
        />
      </L>

      <div className="space-y-2 pt-2">
        <p className="text-xs font-medium">Triggers ({pain.triggers.length})</p>
        {pain.triggers.length === 0 && (
          <p className="text-muted-foreground text-xs">
            No trigger identified. Without a trigger there is no urgency.
          </p>
        )}
        {pain.triggers.map((t) => (
          <div key={t.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span>{t.description}</span>
              <Badge variant="outline">urgency {t.urgencyScore}</Badge>
            </div>
          </div>
        ))}
        <p className="pt-2 text-xs font-medium">
          Current alternatives ({pain.alternatives.length})
        </p>
        {pain.alternatives.length === 0 && (
          <p className="text-muted-foreground text-xs">
            No alternative documented. Alternative weakness cannot be trusted yet.
          </p>
        )}
        {pain.alternatives.map((a) => (
          <div key={a.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{a.name}</span>
              <Badge variant="outline">
                {ALTERNATIVE_CATEGORY_LABELS[a.category]} · weakness {a.weaknessScore}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {a.weaknessDescription ?? "Failure UNKNOWN"}
            </p>
          </div>
        ))}
        <p className="pt-2 text-xs font-medium">Evidence on this pain ({pain.evidence.length})</p>
        {pain.evidence.length === 0 && (
          <p className="text-muted-foreground text-xs">
            No evidence yet. Everything about this pain is a hypothesis.
          </p>
        )}
        {pain.evidence.slice(0, 5).map((e) => (
          <div key={e.id} className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{e.sourceTitle}</span>
              <Badge variant="muted">{EVIDENCE_TYPE_LABELS[e.type]}</Badge>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
          <Trash2 /> Delete
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save
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
