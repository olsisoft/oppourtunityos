"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEvidenceAction } from "@/actions/evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GraphEvidence } from "@/db/workspaces";
import {
  CLAIM_TYPE_LABELS,
  EVIDENCE_TYPE_LABELS,
  SENTIMENT_LABELS,
  VALUE_CHAIN_LEVEL_LABELS,
} from "@/domain/enums";
import { cn, formatDate, truncate } from "@/lib/utils";

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
            <Badge variant="outline">{EVIDENCE_TYPE_LABELS[e.type]}</Badge>
            <Badge variant={SENTIMENT_TONE[e.sentiment]}>{SENTIMENT_LABELS[e.sentiment]}</Badge>
            {e.isDemo && <Badge variant="warning">DEMO DATA</Badge>}
            {e.isMocked && <Badge variant="warning">MOCKED</Badge>}
            {e.origin === "INTERVIEW" && <Badge variant="positive">Interview</Badge>}
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
          Claims affected
        </p>
        {claims.length === 0 ? (
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Not linked to a specific claim. It counts toward the pain or opportunity it is attached
            to; link it to a claim to move a value chain level or a causal link.
          </p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-1">
            {claims.map((c) => {
              const target = c.valueChainNode
                ? `${VALUE_CHAIN_LEVEL_LABELS[c.valueChainNode.level]}: ${truncate(c.valueChainNode.statement, 50)}`
                : c.causalLink
                  ? `Causal link: ${truncate(c.causalLink.statement, 50)}`
                  : CLAIM_TYPE_LABELS[c.claimType];
              return (
                <li key={c.id} className="rounded border px-1.5 py-0.5 text-[11px]">
                  <span className={cn("font-medium", DIRECTION_TONE[c.direction])}>
                    {c.direction.toLowerCase()}
                  </span>{" "}
                  <span className="text-muted-foreground">{target}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
