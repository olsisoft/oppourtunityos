"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEvidenceAction } from "@/actions/evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FitBadge, readFit } from "@/components/value/fit-badge";
import type { GraphEvidence } from "@/db/workspaces";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { cn, truncate } from "@/lib/utils";
import { sourceFamily } from "@/services/value/evidence-sources";
import { describeScope, parseScope } from "@/services/value/scope";

const SENTIMENT_TONE = { POSITIVE: "positive", NEGATIVE: "negative", NEUTRAL: "muted" } as const;
const DIRECTION_TONE = {
  SUPPORTS: "text-tone-positive",
  CONTRADICTS: "text-tone-negative",
  NEUTRAL: "text-muted-foreground",
} as const;

/**
 * The fit summary opens with the badge's own words ("HIGH fit (82/100) for
 * "…" — "); only the rest is shown next to the badge. The first pattern is
 * the English rendering, the second any rendering that keeps the "(n/100) … —"
 * structure.
 */
const FIT_PREFIX = [/^[A-Z ]+ fit \(\d+\/100\) for "[^"]*" — /, /^[^—]*\(\d+\/100\)[^—]*— /];
function stripFitPrefix(summary: string): string {
  for (const pattern of FIT_PREFIX) if (pattern.test(summary)) return summary.replace(pattern, "");
  return summary;
}

export function EvidenceItem({
  evidence: e,
  workspaceId,
  compact = false,
}: {
  evidence: GraphEvidence;
  workspaceId: string;
  compact?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const flags = [
    e.isDirectCustomer && t("evidence.item.flag.directCustomer"),
    e.hasExplicitPain && t("evidence.item.flag.explicitPain"),
    e.hasEconomicImpact && t("evidence.item.flag.economicImpact"),
    e.hasWorkaround && t("evidence.item.flag.workaround"),
    e.hasPurchaseIntent && t("evidence.item.flag.purchaseIntent"),
  ].filter(Boolean) as string[];
  const claims = e.claimLinks ?? [];
  const scope = parseScope(e.scope);
  const family = sourceFamily(e.sourceType);

  const remove = async () => {
    if (!confirm(t("evidence.item.deleteConfirm"))) return;
    setDeleting(true);
    const r = await deleteEvidenceAction(workspaceId, e.id);
    setDeleting(false);
    if (!r.ok) toast.error(t(r.error));
    else router.refresh();
  };

  return (
    <article className={cn("bg-card rounded-lg border p-3", compact && "p-2.5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{t(`labels.evidenceSourceType.${e.sourceType}`)}</Badge>
            <Badge variant="muted" className="font-normal">
              {t(`labels.sourceFamily.${family}`).toLowerCase()}
            </Badge>
            <Badge variant={SENTIMENT_TONE[e.sentiment]}>
              {t(`labels.sentiment.${e.sentiment}`)}
            </Badge>
            {e.isDemo && <Badge variant="warning">{t("common.demoData")}</Badge>}
            {e.isMocked && <Badge variant="warning">{t("evidence.item.mocked")}</Badge>}
            {e.origin === "INTERVIEW" && (
              <Badge variant="positive">{t("evidence.item.interview")}</Badge>
            )}
            {e.type === "EXPERIMENT" && (
              <Badge variant="info">
                {e.experiment
                  ? t("evidence.item.experimentTitled", { title: truncate(e.experiment.title, 40) })
                  : t("evidence.item.experiment")}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium">{e.sourceTitle}</p>
          <p className="text-muted-foreground text-xs">
            {e.sourceDate ? formatDate(e.sourceDate, locale) : "—"}
            {e.sourceAuthor ? ` · ${e.sourceAuthor}` : ""}
            {e.pain ? ` · ${truncate(e.pain.description, 50)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {e.sourceUrl && (
            <Button
              asChild
              size="icon-xs"
              variant="ghost"
              aria-label={t("evidence.item.openSource")}
            >
              <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                <ExternalLink />
              </a>
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={remove}
            disabled={deleting}
            aria-label={t("evidence.item.delete")}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <blockquote className="text-muted-foreground mt-2 border-l-2 pl-2 text-xs leading-relaxed whitespace-pre-wrap">
        {expanded || e.sourceExcerpt.length <= 220
          ? e.sourceExcerpt
          : truncate(e.sourceExcerpt, 220)}
        {e.sourceExcerpt.length > 220 && (
          <button
            type="button"
            className="text-foreground ml-1 underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t("evidence.item.less") : t("evidence.item.more")}
          </button>
        )}
      </blockquote>
      {e.type === "EXPERIMENT" && (e.methodology || e.limitations || e.sampleSize !== null) && (
        <p className="text-muted-foreground mt-2 text-[11px]">
          {e.methodology ? `${e.methodology} · ` : ""}
          {e.sampleSize !== null ? `${t("evidence.item.sampleSize", { n: e.sampleSize })} · ` : ""}
          {e.limitations ? t("evidence.item.limitations", { text: e.limitations }) : ""}
        </p>
      )}
      {(scope || e.sourceOriginId || e.organizationCount !== null) && (
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          <span className="font-medium tracking-wider uppercase">{t("evidence.item.scope")}</span>{" "}
          {scope ? describeScope(scope, locale) : t("common.notRecorded")}
          {e.sourceOriginId ? ` · ${t("evidence.item.origin", { id: e.sourceOriginId })}` : ""}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-mono tabular-nums">
          {t("evidence.item.strength", { score: e.strengthScore })}
        </span>
        <span className="font-mono tabular-nums">
          {t("evidence.item.relevance", { score: e.relevanceScore })}
        </span>
        {flags.map((f) => (
          <span key={f} className="text-muted-foreground">
            · {f}
          </span>
        ))}
      </div>
      <div className="mt-2 border-t pt-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t("evidence.item.fitTitle")}
        </p>
        {claims.length === 0 ? (
          <p className="text-muted-foreground mt-0.5 text-[11px]">{t("evidence.item.notLinked")}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {claims.map((c) => {
              const target = c.valueChainNode
                ? t("evidence.item.claimTarget", {
                    label: t(`labels.valueChainLevel.${c.valueChainNode.level}`),
                    statement: truncate(c.valueChainNode.statement, 50),
                  })
                : c.causalLink
                  ? t("evidence.item.claimTarget", {
                      label: t(`labels.claimType.${c.claimType}`),
                      statement: truncate(c.causalLink.statement, 50),
                    })
                  : t(`labels.claimType.${c.claimType}`);
              const fit = readFit(c);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded border px-1.5 py-1 text-[11px]"
                >
                  <span className={cn("font-medium", DIRECTION_TONE[c.direction])}>
                    {t(`shared.direction.${c.direction}`)}
                  </span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">{target}</span>
                  <FitBadge fit={fit} compact={compact} />
                  {!compact && fit.summary && (
                    <span className="text-muted-foreground w-full text-[10px]">
                      {stripFitPrefix(t(fit.summary))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
