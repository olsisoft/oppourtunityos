"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { importResearchResultAction, runResearchAction } from "@/actions/evidence";
import type { PainOption } from "@/components/evidence/add-evidence-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import type { ResearchResult } from "@/services/research/types";

export function ResearchDialog({
  open,
  onOpenChange,
  workspaceId,
  pains,
  defaultQuery,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaceId: string;
  pains: PainOption[];
  defaultQuery?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [painId, setPainId] = useState(pains[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    providerName: string;
    isMocked: boolean;
    results: ResearchResult[];
  } | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [sentiments, setSentiments] = useState<Record<string, "POSITIVE" | "NEGATIVE" | "NEUTRAL">>(
    {},
  );

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await runResearchAction({ workspaceId, query });
    setLoading(false);
    if (!r.ok) toast.error(t(r.error));
    else setResults(r.data);
  };

  const importResult = async (result: ResearchResult) => {
    setImporting(result.id);
    const sentiment =
      sentiments[result.id] ?? (/contradict/i.test(result.title) ? "NEGATIVE" : "NEUTRAL");
    const r = await importResearchResultAction({
      workspaceId,
      painId: painId || undefined,
      result,
      sentiment,
      relevanceScore: result.relevanceHint,
      strengthScore: 4,
    });
    setImporting(null);
    if (!r.ok) toast.error(t(r.error));
    else {
      toast.success(t("evidence.research.imported"));
      setResults((prev) =>
        prev ? { ...prev, results: prev.results.filter((x) => x.id !== result.id) } : prev,
      );
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("evidence.research.title")}</DialogTitle>
          <DialogDescription>{t("evidence.research.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={run} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("evidence.research.placeholder")}
            required
            className="flex-1"
          />
          {pains.length > 0 && (
            <Select
              value={painId || "none"}
              onValueChange={(v) => setPainId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder={t("evidence.research.linkToPain")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("evidence.research.noPainLink")}</SelectItem>
                {pains.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label.slice(0, 60)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}{" "}
            {t("evidence.research.search")}
          </Button>
        </form>
        {results && (
          <div className="space-y-3">
            {results.isMocked && (
              <div className="bg-tone-warning-bg text-tone-warning flex items-start gap-2 rounded-md px-3 py-2 text-xs">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>{t("evidence.research.mockedTitle")}</strong>{" "}
                  {t("evidence.research.mockedBody", { provider: results.providerName })}
                </span>
              </div>
            )}
            {results.results.length === 0 && (
              <p className="text-muted-foreground text-sm">{t("evidence.research.noResults")}</p>
            )}
            {results.results.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{t(`labels.evidenceType.${r.type}`)}</Badge>
                  {r.isMocked && <Badge variant="warning">{t("evidence.research.mock")}</Badge>}
                  <span className="text-muted-foreground text-xs">
                    {t("evidence.research.meta", {
                      date: r.publishedAt
                        ? formatDate(r.publishedAt, locale)
                        : t("evidence.research.undated"),
                      hint: r.relevanceHint,
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium">{r.title}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{r.excerpt}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Select
                    value={
                      sentiments[r.id] ?? (/contradict/i.test(r.title) ? "NEGATIVE" : "NEUTRAL")
                    }
                    onValueChange={(v) =>
                      setSentiments((s) => ({
                        ...s,
                        [r.id]: v as "POSITIVE" | "NEGATIVE" | "NEUTRAL",
                      }))
                    }
                  >
                    <SelectTrigger size="sm" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POSITIVE">{t("labels.sentiment.POSITIVE")}</SelectItem>
                      <SelectItem value="NEUTRAL">{t("labels.sentiment.NEUTRAL")}</SelectItem>
                      <SelectItem value="NEGATIVE">{t("labels.sentiment.NEGATIVE")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => importResult(r)}
                    disabled={importing === r.id}
                  >
                    {importing === r.id && <Loader2 className="animate-spin" />}{" "}
                    {t("evidence.research.import")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
