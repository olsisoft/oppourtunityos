"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createEvidenceAction, suggestEvidenceSignalsAction } from "@/actions/evidence";
import { claimTargetsFor, type ClaimTarget } from "@/components/evidence/claim-targets";
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
import type { WorkspaceGraph } from "@/db/workspaces";
import {
  EVIDENCE_TYPE_LABELS,
  EvidenceType,
  SENTIMENT_LABELS,
  EvidenceSentiment,
} from "@/domain/enums";
import { cn } from "@/lib/utils";

export interface PainOption {
  id: string;
  label: string;
}
export interface OpportunityOption {
  id: string;
  label: string;
}

type ClaimDirection = "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
const DIRECTION_LABEL: Record<ClaimDirection, string> = {
  SUPPORTS: "supports",
  CONTRADICTS: "contradicts",
  NEUTRAL: "neutral",
};

export function AddEvidenceDialog({
  open,
  onOpenChange,
  workspaceId,
  pains,
  opportunities,
  graph,
  defaultPainId,
  defaultOpportunityId,
  hypothesis,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaceId: string;
  pains: PainOption[];
  opportunities: OpportunityOption[];
  /** When provided, the dialog offers "What claim does this evidence affect?". */
  graph?: WorkspaceGraph;
  defaultPainId?: string;
  defaultOpportunityId?: string;
  hypothesis?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "CUSTOMER_QUOTE" as EvidenceType,
    sourceTitle: "",
    sourceUrl: "",
    sourceExcerpt: "",
    sourceDate: "",
    sourceAuthor: "",
    relevanceScore: 6,
    strengthScore: 5,
    sentiment: "POSITIVE" as EvidenceSentiment,
    painId: defaultPainId ?? "",
    opportunityId: defaultOpportunityId ?? "",
    isDirectCustomer: false,
    hasExplicitPain: false,
    hasEconomicImpact: false,
    hasWorkaround: false,
    hasPurchaseIntent: false,
    isInterview: false,
  });
  const [claims, setClaims] = useState<Record<string, ClaimDirection>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const targets = useMemo(
    () => (graph ? claimTargetsFor(graph, form.opportunityId || null) : []),
    [graph, form.opportunityId],
  );
  const groups = useMemo(() => {
    const byGroup = new Map<ClaimTarget["group"], ClaimTarget[]>();
    for (const t of targets) byGroup.set(t.group, [...(byGroup.get(t.group) ?? []), t]);
    return [...byGroup.entries()];
  }, [targets]);

  const toggleClaim = (t: ClaimTarget) =>
    setClaims((c) => {
      const next = { ...c };
      if (next[t.key]) delete next[t.key];
      else next[t.key] = form.sentiment === "NEGATIVE" ? "CONTRADICTS" : "SUPPORTS";
      return next;
    });

  const suggest = async () => {
    if (form.sourceExcerpt.trim().length < 20) {
      toast.error("Paste the excerpt first.");
      return;
    }
    setSuggesting(true);
    const r = await suggestEvidenceSignalsAction({
      workspaceId,
      sourceTitle: form.sourceTitle || "Untitled",
      excerpt: form.sourceExcerpt,
      hypothesis: hypothesis ?? "",
    });
    setSuggesting(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setForm((f) => ({
      ...f,
      isDirectCustomer: r.data.isDirectCustomer,
      hasExplicitPain: r.data.hasExplicitPain,
      hasEconomicImpact: r.data.hasEconomicImpact,
      hasWorkaround: r.data.hasWorkaround,
      hasPurchaseIntent: r.data.hasPurchaseIntent,
      sentiment: r.data.sentiment,
      strengthScore: r.data.strengthScore,
      relevanceScore: r.data.relevanceScore,
    }));
    setSuggestionNote(
      `${r.data.isMock ? "Mock provider suggestion — " : "AI suggestion — "}${r.data.summary} Confirm every flag before saving.`,
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const claimInputs = targets
      .filter((t) => claims[t.key])
      .map((t) => ({
        claimType: t.claimType,
        opportunityId: form.opportunityId || undefined,
        valueChainNodeId: t.valueChainNodeId,
        causalLinkId: t.causalLinkId,
        direction: claims[t.key],
      }));
    const r = await createEvidenceAction({ workspaceId, ...form, claims: claimInputs });
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(
      claimInputs.length
        ? `Evidence captured — ${claimInputs.length} claim${claimInputs.length === 1 ? "" : "s"} reassessed`
        : "Evidence captured — scores recomputed",
    );
    onOpenChange(false);
    router.refresh();
  };

  const selectedCount = Object.keys(claims).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add evidence</DialogTitle>
            <DialogDescription>
              Paste a customer quote, a forum post, a review, interview notes or a URL. Evidence is
              external material — it is never generated by the analyst. Its content is treated as
              data, never as instructions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as EvidenceType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EvidenceType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {EVIDENCE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Source title</Label>
              <Input
                id="ev-title"
                value={form.sourceTitle}
                onChange={(e) => set("sourceTitle", e.target.value)}
                required
                placeholder="e.g. Interview — salon owner, Lyon"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-url">URL (optional, http/https only)</Label>
              <Input
                id="ev-url"
                value={form.sourceUrl}
                onChange={(e) => set("sourceUrl", e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Date</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.sourceDate}
                  onChange={(e) => set("sourceDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-author">Author</Label>
                <Input
                  id="ev-author"
                  value={form.sourceAuthor}
                  onChange={(e) => set("sourceAuthor", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-excerpt">Excerpt / quote / notes</Label>
            <Textarea
              id="ev-excerpt"
              rows={5}
              value={form.sourceExcerpt}
              onChange={(e) => set("sourceExcerpt", e.target.value)}
              required
              placeholder="Verbatim quote or notes. Keep the customer's words."
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[11px]">
                Signals below drive Evidence Confidence. Tick only what the source actually shows.
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={suggest}
                disabled={suggesting}
              >
                {suggesting ? <Loader2 className="animate-spin" /> : <Sparkles />} Suggest signals
              </Button>
            </div>
            {suggestionNote && (
              <p className="bg-tone-warning-bg text-tone-warning rounded-md px-2 py-1.5 text-xs">
                {suggestionNote}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["isDirectCustomer", "Direct customer / user of the ICP"],
                ["hasExplicitPain", "States the pain explicitly"],
                ["hasEconomicImpact", "Quantifies economic impact"],
                ["hasWorkaround", "Describes a workaround"],
                ["hasPurchaseIntent", "Shows purchase intent / spend"],
                ["isInterview", "This is an interview note"],
              ] as Array<[keyof typeof form, string]>
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(form[key])}
                  onCheckedChange={(v) => set(key, Boolean(v) as never)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sentiment toward the hypothesis</Label>
              <Select
                value={form.sentiment}
                onValueChange={(v) => set("sentiment", v as EvidenceSentiment)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EvidenceSentiment).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SENTIMENT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Strength {form.strengthScore}/10</Label>
              <input
                type="range"
                min={0}
                max={10}
                value={form.strengthScore}
                onChange={(e) => set("strengthScore", Number(e.target.value))}
                className="w-full accent-current"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Relevance {form.relevanceScore}/10</Label>
              <input
                type="range"
                min={0}
                max={10}
                value={form.relevanceScore}
                onChange={(e) => set("relevanceScore", Number(e.target.value))}
                className="w-full accent-current"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Linked pain</Label>
              <Select
                value={form.painId || "none"}
                onValueChange={(v) => set("painId", v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {pains.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label.slice(0, 80)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked opportunity</Label>
              <Select
                value={form.opportunityId || "none"}
                onValueChange={(v) => {
                  set("opportunityId", v === "none" ? "" : v);
                  setClaims({});
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {opportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label.slice(0, 80)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {graph && (
            <fieldset className="space-y-2 rounded-md border p-3">
              <legend className="px-1 text-xs font-semibold tracking-wider uppercase">
                What claim does this evidence affect?
              </legend>
              {!form.opportunityId ? (
                <p className="text-muted-foreground text-xs">
                  Choose a linked opportunity to attach this evidence to specific claims: the pain,
                  its magnitude, willingness to pay, a value chain level or a causal link. One item
                  may affect several claims.
                </p>
              ) : targets.length === 0 ? (
                <p className="text-muted-foreground text-xs">No claims available.</p>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs">
                    Tick each claim and say whether the source supports, contradicts or is neutral
                    about it. The engine reassesses the claim; nothing becomes proven automatically.
                  </p>
                  {groups.map(([group, items]) => (
                    <div key={group} className="space-y-1">
                      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                        {group}
                      </p>
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {items.map((t) => {
                          const dir = claims[t.key];
                          return (
                            <li
                              key={t.key}
                              className={cn(
                                "flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs",
                                dir && "border-foreground",
                              )}
                            >
                              <Checkbox
                                className="mt-0.5"
                                checked={Boolean(dir)}
                                onCheckedChange={() => toggleClaim(t)}
                                aria-label={`Affects ${t.label}`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{t.label}</p>
                                {t.detail && (
                                  <p className="text-muted-foreground truncate">{t.detail}</p>
                                )}
                                {dir && (
                                  <div className="mt-1 flex gap-1">
                                    {(
                                      ["SUPPORTS", "CONTRADICTS", "NEUTRAL"] as ClaimDirection[]
                                    ).map((d) => (
                                      <button
                                        key={d}
                                        type="button"
                                        onClick={() => setClaims((c) => ({ ...c, [t.key]: d }))}
                                        className={cn(
                                          "rounded border px-1.5 py-0.5 text-[10px]",
                                          dir === d
                                            ? "bg-foreground text-background border-foreground"
                                            : "text-muted-foreground hover:text-foreground",
                                        )}
                                      >
                                        {DIRECTION_LABEL[d]}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </>
              )}
            </fieldset>
          )}

          <DialogFooter className="items-center sm:justify-between">
            <Badge variant="muted" className="font-normal">
              Stored as EXTERNAL EVIDENCE, never as hypothesis
              {selectedCount
                ? ` · affects ${selectedCount} claim${selectedCount === 1 ? "" : "s"}`
                : ""}
            </Badge>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Save evidence
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
