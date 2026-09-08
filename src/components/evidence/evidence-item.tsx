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
import {
  CLAIM_TYPE_LABELS,
  EVIDENCE_SOURCE_TYPE_LABELS,
  SENTIMENT_LABELS,
  VALUE_CHAIN_LEVEL_LABELS,
} from "@/domain/enums";
import { cn, formatDate, truncate } from "@/lib/utils";
import { SOURCE_FAMILY_LABELS, sourceFamily } from "@/services/value/evidence-sources";
import { describeScope, parseScope } from "@/services/value/scope";

const SENTIMENT_TONE = { POSITIVE: "positive", NEGATIVE: "negative", NEUTRAL: "muted" } as const;
const DIRECTION_TONE = {
  SUPPORTS: "text-tone-positive",
  CONTRADICTS: "text-tone-negative",
  NEUTRAL: "text-muted-foreground",
} as const;

export function EvidenceItem({
  evidence: e,
  workspaceId,
  compact = false,
}: {
  evidence: GraphEvidence;
  workspaceId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const flags = [
    e.isDirectCustomer && "direct customer",
    e.hasExplicitPain && "explicit pain",
    e.hasEconomicImpact && "economic impact",
    e.hasWorkaround && "workaround",
    e.hasPurchaseIntent && "purchase intent",
  ].filter(Boolean) as string[];
  const claims = e.claimLinks ?? [];
  const scope = parseScope(e.scope);
  const family = sourceFamily(e.sourceType);

  const remove = async () => {
    if (!confirm("Delete this evidence? Scores will be recomputed.")) return;
    setDeleting(true);
    const r = await deleteEvidenceAction(workspaceId, e.id);
    setDeleting(false);
    if (!r.ok) toast.error(r.error);
    else router.refresh();
  };

  return (
    <article className={cn("bg-card rounded-lg border p-3", compact && "p-2.5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{EVIDENCE_SOURCE_TYPE_LABELS[e.sourceType]}</Badge>
            <Badge variant="muted" className="font-normal">
              {SOURCE_FAMILY_LABELS[family].toLowerCase()}
            </Badge>
            <Badge variant={SENTIMENT_TONE[e.sentiment]}>{SENTIMENT_LABELS[e.sentiment]}</Badge>
            {e.isDemo && <Badge variant="warning">DEMO DATA</Badge>}
            {e.isMocked && <Badge variant="warning">MOCKED</Badge>}
            {e.origin === "INTERVIEW" && <Badge variant="positive">Interview</Badge>}
            {e.type === "EXPERIMENT" && (
              <Badge variant="info">
                Experiment{e.experiment ? `: ${truncate(e.experiment.title, 40)}` : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium">{e.sourceTitle}</p>
          <p className="text-muted-foreground text-xs">
            {formatDate(e.sourceDate)}
            {e.sourceAuthor ? ` · ${e.sourceAuthor}` : ""}
            {e.pain ? ` · ${truncate(e.pain.description, 50)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {e.sourceUrl && (
            <Button asChild size="icon-xs" variant="ghost" aria-label="Open source">
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
            aria-label="Delete evidence"
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
            {expanded ? "less" : "more"}
          </button>
        )}
      </blockquote>
      {e.type === "EXPERIMENT" && (e.methodology || e.limitations || e.sampleSize !== null) && (
        <p className="text-muted-foreground mt-2 text-[11px]">
          {e.methodology ? `${e.methodology} · ` : ""}
          {e.sampleSize !== null ? `n = ${e.sampleSize} · ` : ""}
          {e.limitations ? `Limitations: ${e.limitations}` : ""}
        </p>
      )}
      {(scope || e.sourceOriginId || e.organizationCount !== null) && (
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          <span className="font-medium tracking-wider uppercase">Scope</span>{" "}
          {scope ? describeScope(scope) : "not recorded"}
          {e.sourceOriginId ? ` · origin: ${e.sourceOriginId}` : ""}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-mono tabular-nums">strength {e.strengthScore}/10</span>
        <span className="font-mono tabular-nums">relevance {e.relevanceScore}/10</span>
        {flags.map((f) => (
          <span key={f} className="text-muted-foreground">
            · {f}
          </span>
        ))}
      </div>
      <div className="mt-2 border-t pt-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Fit to claim
        </p>
        {claims.length === 0 ? (
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Not linked to a specific claim. It counts toward the pain or opportunity it is attached
            to; link it to a claim to see how well it fits that claim — evidence existing is not
            evidence fitting.
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {claims.map((c) => {
              const target = c.valueChainNode
                ? `${VALUE_CHAIN_LEVEL_LABELS[c.valueChainNode.level]}: ${truncate(c.valueChainNode.statement, 50)}`
                : c.causalLink
                  ? `${CLAIM_TYPE_LABELS[c.claimType]}: ${truncate(c.causalLink.statement, 50)}`
                  : CLAIM_TYPE_LABELS[c.claimType];
              const fit = readFit(c);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded border px-1.5 py-1 text-[11px]"
                >
                  <span className={cn("font-medium", DIRECTION_TONE[c.direction])}>
                    {c.direction.toLowerCase()}
                  </span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">{target}</span>
                  <FitBadge fit={fit} compact={compact} />
                  {!compact && fit.summary && (
                    <span className="text-muted-foreground w-full text-[10px]">
                      {fit.summary.replace(/^[A-Z ]+ fit \(\d+\/100\) for "[^"]*" — /, "")}
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
