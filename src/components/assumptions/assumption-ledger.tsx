"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAssumptionAction,
  deleteAssumptionAction,
  linkAssumptionEvidenceAction,
  unlinkAssumptionEvidenceAction,
  updateAssumptionAction,
} from "@/actions/assumptions";
import { EmptyState } from "@/components/shared/empty-state";
import { ProvenanceBadge } from "@/components/shared/provenance-badge";
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
import type { GraphAssumption, WorkspaceGraph } from "@/db/workspaces";
import { AssumptionKind, AssumptionStatus } from "@/domain/enums";
import { useT } from "@/i18n/client";
import { truncate } from "@/lib/utils";

const STATUS_TONE = { UNKNOWN: "muted", SUPPORTED: "positive", CONTRADICTED: "negative" } as const;

/** Causal and value assumptions rank first: they are the ones that collapse an opportunity. */
const KIND_RANK: Record<AssumptionKind, number> = {
  CAUSAL: 0,
  VALUE: 1,
  WTP: 2,
  FEASIBILITY: 3,
  ACCESS: 4,
  GENERIC: 5,
};

export function assumptionRank(a: Pick<GraphAssumption, "status" | "importance" | "kind">) {
  const statusRank = a.status === "UNKNOWN" ? 0 : a.status === "CONTRADICTED" ? 1 : 2;
  return statusRank * 1000 - a.importance * 10 + KIND_RANK[a.kind];
}

export function AssumptionLedger({
  graph,
  opportunityId,
}: {
  graph: WorkspaceGraph;
  opportunityId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [statement, setStatement] = useState("");
  const [importance, setImportance] = useState(7);
  const [kind, setKind] = useState<AssumptionKind>("GENERIC");
  const [saving, setSaving] = useState(false);
  const [linkFor, setLinkFor] = useState<GraphAssumption | null>(null);

  const assumptions = graph.assumptions
    .filter((a) => (opportunityId ? a.opportunityId === opportunityId : true))
    .sort((a, b) => assumptionRank(a) - assumptionRank(b));
  const untested = assumptions.filter((a) => a.status === "UNKNOWN" && a.importance >= 7).length;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await createAssumptionAction({
      workspaceId: graph.id,
      opportunityId,
      statement,
      importance,
      kind,
    });
    setSaving(false);
    if (!r.ok) toast.error(t(r.error));
    else {
      setStatement("");
      setAdding(false);
      router.refresh();
    }
  };

  const setStatus = async (a: GraphAssumption, status: AssumptionStatus) => {
    const r = await updateAssumptionAction({ assumptionId: a.id, status });
    if (!r.ok) toast.error(t(r.error));
    else router.refresh();
  };

  const setKindOf = async (a: GraphAssumption, next: AssumptionKind) => {
    const r = await updateAssumptionAction({ assumptionId: a.id, kind: next });
    if (!r.ok) toast.error(t(r.error));
    else router.refresh();
  };

  const remove = async (a: GraphAssumption) => {
    const r = await deleteAssumptionAction(a.id);
    if (!r.ok) toast.error(t(r.error));
    else router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {untested > 0
            ? t("assumptions.summary.untested", { count: untested })
            : t("assumptions.summary.default")}
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus /> {t("assumptions.addButton")}
        </Button>
      </div>
      {adding && (
        <form onSubmit={add} className="bg-card space-y-2 rounded-lg border p-3">
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as AssumptionKind)}>
              <SelectTrigger size="sm" className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AssumptionKind).map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`labels.assumptionKind.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder={t("assumptions.examplePlaceholder", {
                example: t(`assumptions.example.${kind}`),
              })}
              required
              minLength={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs whitespace-nowrap">
              {t("assumptions.importance", { value: importance })}
            </Label>
            <input
              type="range"
              min={0}
              max={10}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="flex-1 accent-current"
            />
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} {t("assumptions.add")}
            </Button>
          </div>
          <p className="text-muted-foreground text-[11px]">{t("assumptions.formHelp")}</p>
        </form>
      )}
      {assumptions.length === 0 ? (
        <EmptyState
          title={t("assumptions.emptyTitle")}
          description={t("assumptions.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {assumptions.map((a) => (
            <li key={a.id} className="bg-card rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={a.kind === "GENERIC" ? "muted" : "outline"}
                      className="text-[10px]"
                    >
                      {t(`labels.assumptionKind.${a.kind}`)}
                    </Badge>
                    {a.valueChainNode && (
                      <span className="text-muted-foreground text-[11px]">
                        {t("assumptions.onLevel", {
                          level: t(`labels.valueChainLevel.${a.valueChainNode.level}`),
                        })}
                      </span>
                    )}
                    {a.causalLink && (
                      <span className="text-muted-foreground truncate text-[11px]">
                        {t("assumptions.onLink", {
                          statement: truncate(a.causalLink.statement, 60),
                        })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{a.statement}</p>
                </div>
                <Badge variant={STATUS_TONE[a.status]}>
                  {t(`labels.assumptionStatus.${a.status}`)}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="font-mono tabular-nums">
                  {t("assumptions.item.importance", { value: a.importance })}
                </span>
                <span className="font-mono tabular-nums">
                  {t("assumptions.item.confidence", { value: a.confidence })}
                </span>
                <span>{t("assumptions.item.evidenceCount", { count: a.links.length })}</span>
                <ProvenanceBadge provenance={a.provenance} className="px-1.5 py-0 text-[10px]" />
              </div>
              {a.links.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {a.links.map((l) => (
                    <li
                      key={l.evidenceId}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="truncate">
                        <span
                          className={
                            l.direction === "SUPPORTS"
                              ? "text-tone-positive"
                              : l.direction === "CONTRADICTS"
                                ? "text-tone-negative"
                                : "text-muted-foreground"
                          }
                        >
                          {t(`shared.direction.${l.direction}`)}
                        </span>{" "}
                        · {l.evidence.sourceTitle}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={async () => {
                          const r = await unlinkAssumptionEvidenceAction(a.id, l.evidenceId);
                          if (!r.ok) toast.error(t(r.error));
                          else router.refresh();
                        }}
                      >
                        {t("assumptions.unlink")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select value={a.status} onValueChange={(v) => setStatus(a, v as AssumptionStatus)}>
                  <SelectTrigger size="sm" className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssumptionStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`labels.assumptionStatus.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={a.kind} onValueChange={(v) => setKindOf(a, v as AssumptionKind)}>
                  <SelectTrigger size="sm" className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssumptionKind).map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`labels.assumptionKind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setLinkFor(a)}
                  disabled={graph.evidence.length === 0}
                >
                  <Link2 /> {t("assumptions.linkEvidence")}
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => remove(a)}
                  aria-label={t("assumptions.delete")}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <LinkEvidenceDialog assumption={linkFor} graph={graph} onClose={() => setLinkFor(null)} />
    </div>
  );
}

function LinkEvidenceDialog({
  assumption,
  graph,
  onClose,
}: {
  assumption: GraphAssumption | null;
  graph: WorkspaceGraph;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [evidenceId, setEvidenceId] = useState("");
  const [direction, setDirection] = useState<"SUPPORTS" | "CONTRADICTS" | "NEUTRAL">("SUPPORTS");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assumption || !evidenceId) return;
    setSaving(true);
    const r = await linkAssumptionEvidenceAction({
      assumptionId: assumption.id,
      evidenceId,
      direction,
    });
    setSaving(false);
    if (!r.ok) toast.error(t(r.error));
    else {
      toast.success(t("assumptions.linkDialog.linked"));
      onClose();
      router.refresh();
    }
  };

  return (
    <Dialog open={Boolean(assumption)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("assumptions.linkDialog.title")}</DialogTitle>
            <DialogDescription>{assumption?.statement}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>{t("assumptions.linkDialog.evidence")}</Label>
            <Select value={evidenceId} onValueChange={setEvidenceId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("assumptions.linkDialog.choose")} />
              </SelectTrigger>
              <SelectContent>
                {graph.evidence.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.sourceTitle.slice(0, 70)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("assumptions.linkDialog.direction")}</Label>
            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as "SUPPORTS" | "CONTRADICTS" | "NEUTRAL")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPPORTS">{t("assumptions.linkDialog.supports")}</SelectItem>
                <SelectItem value="CONTRADICTS">
                  {t("assumptions.linkDialog.contradicts")}
                </SelectItem>
                <SelectItem value="NEUTRAL">{t("assumptions.linkDialog.neutral")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !evidenceId}>
              {saving && <Loader2 className="animate-spin" />} {t("assumptions.linkDialog.link")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
