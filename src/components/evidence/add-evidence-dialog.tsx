"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
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
import { AdmissibilityBadge } from "@/components/value/fit-badge";
import type { WorkspaceGraph } from "@/db/workspaces";
import { EvidenceSourceType, EvidenceSentiment } from "@/domain/enums";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { admissibilityLevel } from "@/services/value/admissibility";
import {
  legacyTypeForSource,
  SOURCE_FAMILY,
  SOURCE_TYPES,
  type EvidenceSourceFamily,
} from "@/services/value/evidence-sources";

const FAMILY_ORDER: EvidenceSourceFamily[] = [
  "SELF_REPORTED",
  "BEHAVIORAL",
  "OPERATIONAL",
  "MARKET",
  "EXPERIMENTAL",
  "TECHNICAL",
  "COMMERCIAL",
  "UNKNOWN",
];

/** Evidence signals the user confirms; labelled by `evidence.dialog.signal.<key>`. */
const SIGNAL_KEYS = [
  "isDirectCustomer",
  "hasExplicitPain",
  "hasEconomicImpact",
  "hasWorkaround",
  "hasPurchaseIntent",
  "isInterview",
] as const;

export interface PainOption {
  id: string;
  label: string;
}
export interface OpportunityOption {
  id: string;
  label: string;
}

type ClaimDirection = "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
const CLAIM_DIRECTIONS: ClaimDirection[] = ["SUPPORTS", "CONTRADICTS", "NEUTRAL"];

/** Renders the *emphasized* segments of a dictionary string as <em>. */
function withEmphasis(text: string): React.ReactNode {
  const parts = text.split("*");
  if (parts.length < 3) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>,
  );
}

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
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [form, setForm] = useState({
    sourceType: "CUSTOMER_QUOTE" as EvidenceSourceType,
    sourceOriginId: "",
    sampleSize: "",
    organizationCount: "",
    scopePopulation: "",
    scopeSystems: "",
    scopeEnvironment: "",
    scopeTimePeriod: "",
    scopeConditions: "",
    scopeGeography: "",
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
    () => (graph ? claimTargetsFor(graph, form.opportunityId || null, t) : []),
    [graph, form.opportunityId, t],
  );
  const groups = useMemo(() => {
    const byGroup = new Map<ClaimTarget["group"], ClaimTarget[]>();
    for (const target of targets)
      byGroup.set(target.group, [...(byGroup.get(target.group) ?? []), target]);
    return [...byGroup.entries()];
  }, [targets]);

  const toggleClaim = (target: ClaimTarget) =>
    setClaims((c) => {
      const next = { ...c };
      if (next[target.key]) delete next[target.key];
      else next[target.key] = form.sentiment === "NEGATIVE" ? "CONTRADICTS" : "SUPPORTS";
      return next;
    });

  const suggest = async () => {
    if (form.sourceExcerpt.trim().length < 20) {
      toast.error(t("evidence.dialog.excerptFirst"));
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
      toast.error(t(r.error));
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
      t("evidence.dialog.suggestionNote", { mock: r.data.isMock, summary: r.data.summary }),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const claimInputs = targets
      .filter((target) => claims[target.key])
      .map((target) => ({
        claimType: target.claimType,
        opportunityId: form.opportunityId || undefined,
        valueChainNodeId: target.valueChainNodeId,
        causalLinkId: target.causalLinkId,
        direction: claims[target.key],
      }));
    const r = await createEvidenceAction({
      workspaceId,
      ...form,
      type: legacyTypeForSource(form.sourceType),
      claims: claimInputs,
    });
    setSaving(false);
    if (!r.ok) {
      toast.error(t(r.error));
      return;
    }
    toast.success(
      claimInputs.length
        ? t("evidence.dialog.savedClaims", { count: claimInputs.length })
        : t("evidence.dialog.savedScores"),
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
            <DialogTitle>{t("evidence.dialog.title")}</DialogTitle>
            <DialogDescription>{t("evidence.dialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("evidence.dialog.sourceType")}</Label>
              <Select
                value={form.sourceType}
                onValueChange={(v) => set("sourceType", v as EvidenceSourceType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_ORDER.map((family) => (
                    <div key={family}>
                      <p className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-[10px] font-medium tracking-wider uppercase">
                        {t(`labels.sourceFamily.${family}`)}
                      </p>
                      {SOURCE_TYPES.filter((type) => SOURCE_FAMILY[type] === family).map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`labels.evidenceSourceType.${type}`)}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[11px]">
                {withEmphasis(t("evidence.dialog.sourceTypeHelp"))}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">{t("evidence.dialog.sourceTitle")}</Label>
              <Input
                id="ev-title"
                value={form.sourceTitle}
                onChange={(e) => set("sourceTitle", e.target.value)}
                required
                placeholder={t("evidence.dialog.sourceTitlePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-url">{t("evidence.dialog.url")}</Label>
              <Input
                id="ev-url"
                value={form.sourceUrl}
                onChange={(e) => set("sourceUrl", e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">{t("evidence.dialog.date")}</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.sourceDate}
                  onChange={(e) => set("sourceDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-author">{t("evidence.dialog.author")}</Label>
                <Input
                  id="ev-author"
                  value={form.sourceAuthor}
                  onChange={(e) => set("sourceAuthor", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-excerpt">{t("evidence.dialog.excerpt")}</Label>
            <Textarea
              id="ev-excerpt"
              rows={5}
              value={form.sourceExcerpt}
              onChange={(e) => set("sourceExcerpt", e.target.value)}
              required
              placeholder={t("evidence.dialog.excerptPlaceholder")}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[11px]">
                {t("evidence.dialog.signalsHelp")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={suggest}
                disabled={suggesting}
              >
                {suggesting ? <Loader2 className="animate-spin" /> : <Sparkles />}{" "}
                {t("evidence.dialog.suggest")}
              </Button>
            </div>
            {suggestionNote && (
              <p className="bg-tone-warning-bg text-tone-warning rounded-md px-2 py-1.5 text-xs">
                {suggestionNote}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {SIGNAL_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(form[key])}
                  onCheckedChange={(v) => set(key, Boolean(v))}
                />
                {t(`evidence.dialog.signal.${key}`)}
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("evidence.dialog.sentiment")}</Label>
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
                      {t(`labels.sentiment.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("evidence.dialog.strength", { score: form.strengthScore })}</Label>
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
              <Label>{t("evidence.dialog.relevance", { score: form.relevanceScore })}</Label>
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
              <Label>{t("evidence.dialog.linkedPain")}</Label>
              <Select
                value={form.painId || "none"}
                onValueChange={(v) => set("painId", v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("common.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {pains.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label.slice(0, 80)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("evidence.dialog.linkedOpportunity")}</Label>
              <Select
                value={form.opportunityId || "none"}
                onValueChange={(v) => {
                  set("opportunityId", v === "none" ? "" : v);
                  setClaims({});
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("common.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {opportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label.slice(0, 80)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-xs font-semibold tracking-wider uppercase">
              {t("evidence.dialog.scopeLegend")}
            </legend>
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">{t("evidence.dialog.scopeHelp")}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setScopeOpen((v) => !v)}
              >
                {scopeOpen ? t("evidence.dialog.hideScope") : t("evidence.dialog.recordScope")}
              </Button>
            </div>
            {scopeOpen && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ev-origin">{t("evidence.dialog.origin")}</Label>
                  <Input
                    id="ev-origin"
                    value={form.sourceOriginId}
                    onChange={(e) => set("sourceOriginId", e.target.value)}
                    placeholder={t("evidence.dialog.originPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-orgs">{t("evidence.dialog.organizations")}</Label>
                    <Input
                      id="ev-orgs"
                      type="number"
                      min={0}
                      value={form.organizationCount}
                      onChange={(e) => set("organizationCount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-n">{t("evidence.dialog.sampleSize")}</Label>
                    <Input
                      id="ev-n"
                      type="number"
                      min={0}
                      value={form.sampleSize}
                      onChange={(e) => set("sampleSize", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-pop">{t("evidence.dialog.population")}</Label>
                  <Input
                    id="ev-pop"
                    value={form.scopePopulation}
                    onChange={(e) => set("scopePopulation", e.target.value)}
                    placeholder={t("evidence.dialog.populationPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-systems">{t("evidence.dialog.systems")}</Label>
                  <Input
                    id="ev-systems"
                    value={form.scopeSystems}
                    onChange={(e) => set("scopeSystems", e.target.value)}
                    placeholder={t("evidence.dialog.systemsPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-env">{t("evidence.dialog.environment")}</Label>
                  <Input
                    id="ev-env"
                    value={form.scopeEnvironment}
                    onChange={(e) => set("scopeEnvironment", e.target.value)}
                    placeholder={t("evidence.dialog.environmentPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-period">{t("evidence.dialog.timePeriod")}</Label>
                  <Input
                    id="ev-period"
                    value={form.scopeTimePeriod}
                    onChange={(e) => set("scopeTimePeriod", e.target.value)}
                    placeholder={t("evidence.dialog.timePeriodPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-geo">{t("evidence.dialog.geography")}</Label>
                  <Input
                    id="ev-geo"
                    value={form.scopeGeography}
                    onChange={(e) => set("scopeGeography", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-cond">{t("evidence.dialog.conditions")}</Label>
                  <Input
                    id="ev-cond"
                    value={form.scopeConditions}
                    onChange={(e) => set("scopeConditions", e.target.value)}
                  />
                </div>
              </div>
            )}
          </fieldset>

          {graph && (
            <fieldset className="space-y-2 rounded-md border p-3">
              <legend className="px-1 text-xs font-semibold tracking-wider uppercase">
                {t("evidence.dialog.claimsLegend")}
              </legend>
              {!form.opportunityId ? (
                <p className="text-muted-foreground text-xs">
                  {t("evidence.dialog.claimsChooseOpportunity")}
                </p>
              ) : targets.length === 0 ? (
                <p className="text-muted-foreground text-xs">{t("evidence.dialog.noClaims")}</p>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs">
                    {t("evidence.dialog.claimsHelp", {
                      source: t(`labels.evidenceSourceType.${form.sourceType}`).toLowerCase(),
                    })}
                  </p>
                  {groups.map(([group, items]) => (
                    <div key={group} className="space-y-1">
                      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                        {t(`evidence.claimTargets.group.${group}`)}
                      </p>
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {items.map((target) => {
                          const dir = claims[target.key];
                          return (
                            <li
                              key={target.key}
                              className={cn(
                                "flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs",
                                dir && "border-foreground",
                              )}
                            >
                              <Checkbox
                                className="mt-0.5"
                                checked={Boolean(dir)}
                                onCheckedChange={() => toggleClaim(target)}
                                aria-label={t("evidence.dialog.affectsClaim", {
                                  claim: target.label,
                                })}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 font-medium">
                                  {target.label}
                                  <AdmissibilityBadge
                                    level={admissibilityLevel(form.sourceType, target.claimType)}
                                  />
                                </p>
                                {target.detail && (
                                  <p className="text-muted-foreground truncate">{target.detail}</p>
                                )}
                                {dir && (
                                  <div className="mt-1 flex gap-1">
                                    {CLAIM_DIRECTIONS.map((d) => (
                                      <button
                                        key={d}
                                        type="button"
                                        onClick={() =>
                                          setClaims((c) => ({ ...c, [target.key]: d }))
                                        }
                                        className={cn(
                                          "rounded border px-1.5 py-0.5 text-[10px]",
                                          dir === d
                                            ? "bg-foreground text-background border-foreground"
                                            : "text-muted-foreground hover:text-foreground",
                                        )}
                                      >
                                        {t(`shared.direction.${d}`)}
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
              {t("evidence.dialog.stored", { count: selectedCount })}
            </Badge>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} {t("evidence.dialog.save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
