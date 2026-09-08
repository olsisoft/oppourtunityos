"use client";

import { ArrowDown, Plus } from "lucide-react";

import { CausalDistanceBadge, EpistemicBadge } from "@/components/value/epistemic-badge";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  GraphCausalLink,
  GraphValueChainNode,
  OpportunityWithRelations,
} from "@/db/workspaces";
import type {
  EpistemicStatus,
  ExperimentDesignLevel,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import { useLocale, useT } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import type { LocalizedText } from "@/i18n/messages";
import type { T } from "@/i18n/t";
import { cn } from "@/lib/utils";
import { VALUE_CHAIN_LEVEL_ORDER } from "@/services/value/epistemic";
import {
  FRONTIER_DESIGN_REQUIRED,
  rungIndex,
  type FrontierClaimSummary,
  type FrontierPosition,
  type ProofFrontierResult,
  type ProofRung,
} from "@/services/value/proof-frontier";
import { describeScope } from "@/services/value/scope";

/** Scope of a claim summary, rendered from the object when available. */
function summaryScope(
  summary: FrontierClaimSummary | null | undefined,
  t: T,
  locale: Locale,
): string | null {
  if (!summary) return null;
  if (summary.scope) return describeScope(summary.scope, locale);
  return summary.scopeText ? t(summary.scopeText) : null;
}

/** STATUS / FIT / SCOPE of a claim, shown on hover of a ladder node or link. */
function ClaimHover({
  title,
  status,
  confidence,
  summary,
  requiredDesign,
  blockers,
}: {
  title: string;
  status: EpistemicStatus;
  confidence: number;
  summary: FrontierClaimSummary | null | undefined;
  requiredDesign?: ProofRung | null;
  blockers?: LocalizedText[];
}) {
  const t = useT();
  const locale = useLocale();
  const design = requiredDesign ? FRONTIER_DESIGN_REQUIRED[requiredDesign] : undefined;
  const designLabel = (d: ExperimentDesignLevel) => t(`labels.designLevel.${d}`).toLowerCase();
  const statusLabel = t(`labels.epistemic.${status}`);
  const fitParts =
    summary && summary.total > 0
      ? [
          t("value.ladder.hover.fitBest", {
            fit: summary.bestFit,
            band: t(`value.fitBand.${summary.bestBand}`),
          }),
          t("value.ladder.hover.admissible", {
            admissible: summary.admissible,
            total: summary.total,
          }),
          t("value.ladder.hover.independentOrigins", { count: summary.independentOrigins }),
          ...(summary.lowFitOnly ? [t("value.ladder.hover.lowFitOnly")] : []),
        ]
      : [t("value.ladder.hover.noEvidence")];
  if (summary?.designLevel)
    fitParts.push(t("value.ladder.hover.design", { design: designLabel(summary.designLevel) }));
  const scope = summaryScope(summary, t, locale);
  const scopeLine = summary?.observed
    ? t("value.ladder.hover.observedIn", {
        scope: scope ?? t("value.ladder.hover.unrecordedScope"),
      })
    : (scope ?? t("value.ladder.hover.notObserved"));
  return (
    <div className="max-w-sm space-y-1 text-xs">
      <p className="font-medium">{title}</p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("value.ladder.hover.status")}
        </span>{" "}
        {confidence
          ? t("value.ladder.hover.statusConfidence", { status: statusLabel, confidence })
          : statusLabel}
      </p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("value.ladder.hover.fit")}
        </span>{" "}
        {fitParts.join(" · ")}
        {design
          ? ` ${t("value.ladder.hover.requiresDesign", { design: designLabel(design) })}`
          : ""}
      </p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("value.ladder.hover.scope")}
        </span>{" "}
        {scopeLine}
        {summary?.generalization
          ? ` · ${t(`labels.generalization.${summary.generalization}`)}`
          : ""}
      </p>
      {summary?.inference && <p className="text-muted-foreground">{t(summary.inference)}</p>}
      {blockers && blockers.length > 0 && <p className="text-tone-warning">{t(blockers[0])}</p>}
    </div>
  );
}

export type LadderSelection =
  | { kind: "node"; node: GraphValueChainNode }
  | { kind: "link"; link: GraphCausalLink }
  | { kind: "add-node"; level: ValueChainLevel }
  | { kind: "add-link"; fromLevel: ValueChainLevel; toLevel: ValueChainLevel };

const PROBLEM_RUNGS: ProofRung[] = ["VARIABLE_IMPORTANCE", "PAIN", "ECONOMIC_PAIN"];

export function ValueLadder({
  opportunity: o,
  frontier,
  onSelect,
  compact = false,
  showProblemRungs = true,
  className,
}: {
  opportunity: OpportunityWithRelations;
  frontier: ProofFrontierResult | null;
  onSelect?: (selection: LadderSelection) => void;
  compact?: boolean;
  showProblemRungs?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const frontierPos: FrontierPosition =
    (o.proofFrontierRung as FrontierPosition | null) ?? frontier?.frontier ?? "NONE";
  const frontierIdx = rungIndex(frontierPos);
  const nodeByLevel = new Map(o.valueChainNodes.map((n) => [n.level, n]));
  const levels = VALUE_CHAIN_LEVEL_ORDER.filter(
    (l) => l !== "BUSINESS_OUTCOME" || nodeByLevel.has(l),
  );
  const rungState = (rung: ProofRung) => frontier?.rungs.find((r) => r.rung === rung);
  const interactive = Boolean(onSelect);
  const rungLabel = (rung: FrontierPosition) => t(`labels.proofRung.${rung}`);
  const levelLabel = (level: ValueChainLevel) => t(`labels.valueChainLevel.${level}`);

  const frontierScope = frontier?.frontierScope ?? null;
  const scopeText = frontierScope
    ? frontierScope.scope
      ? describeScope(frontierScope.scope, locale)
      : frontierScope.text
        ? t(frontierScope.text)
        : null
    : null;
  const frontierLevel = rungLabel(frontierPos);
  const frontierDivider = (
    <div className="my-1 flex items-center gap-2" aria-label={t("value.ladder.frontierAria")}>
      <div className="bg-foreground h-px flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="bg-foreground text-background max-w-full truncate rounded px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase">
            {!compact && frontierPos !== "NONE" && scopeText
              ? t("value.ladder.frontierChipScoped", { level: frontierLevel, scope: scopeText })
              : t("value.ladder.frontierChip", { level: frontierLevel })}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-xs">
          <p className="font-medium">{t("value.ladder.level", { level: frontierLevel })}</p>
          <p>
            {frontierScope?.generalization
              ? t("value.ladder.scopeWithGeneralization", {
                  scope: scopeText ?? t("value.ladder.scopeNotComputed"),
                  generalization: t(`labels.generalization.${frontierScope.generalization}`),
                })
              : t("value.ladder.scope", {
                  scope: scopeText ?? t("value.ladder.scopeNotComputed"),
                })}
          </p>
          <p className="text-muted-foreground mt-1">
            {frontierPos === "NONE"
              ? t("value.ladder.nothingSupported")
              : t("value.ladder.reachedWhere")}
          </p>
        </TooltipContent>
      </Tooltip>
      <div className="bg-foreground h-px flex-1" />
    </div>
  );

  return (
    <div className={cn("space-y-1", className)}>
      {showProblemRungs &&
        PROBLEM_RUNGS.map((rung) => {
          const state = rungState(rung);
          return (
            <div key={rung}>
              <div
                className={cn(
                  "bg-muted/40 flex items-center justify-between gap-2 rounded-md border border-dashed px-2.5",
                  compact ? "py-1.5" : "py-2",
                )}
              >
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    {rungLabel(rung)}
                  </p>
                  {!compact && state?.reasons?.length && !state.eligible ? (
                    <p className="text-muted-foreground truncate text-xs">{t(state.reasons[0])}</p>
                  ) : null}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <EpistemicBadge
                        status={state?.status ?? "UNKNOWN"}
                        confidence={state?.confidence}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <ClaimHover
                      title={rungLabel(rung)}
                      status={state?.status ?? "UNKNOWN"}
                      confidence={state?.confidence ?? 0}
                      summary={state?.summary}
                      blockers={state?.eligible ? [] : state?.reasons}
                    />
                  </TooltipContent>
                </Tooltip>
              </div>
              {frontierPos === rung && frontierDivider}
            </div>
          );
        })}
      {frontierPos === "NONE" && showProblemRungs && frontierDivider}
      {!showProblemRungs && rungIndex(frontierPos) < rungIndex("MECHANISM") && frontierDivider}

      {levels.map((level, i) => {
        const node = nodeByLevel.get(level);
        const prevLevel = i > 0 ? levels[i - 1] : null;
        const prevNode = prevLevel ? nodeByLevel.get(prevLevel) : undefined;
        const link =
          prevNode && node
            ? o.causalLinks.find((l) => l.fromNodeId === prevNode.id && l.toNodeId === node.id)
            : undefined;
        const isFrontier = frontierPos === level;
        const beyond = rungIndex(level as ProofRung) > frontierIdx;
        const state = rungState(level as ProofRung);
        const nodeMeta = node
          ? [
              t("value.ladder.counts", {
                evidence: node.evidenceLinks.length,
                assumptions: node.assumptions.length,
              }),
              ...(state?.summary?.total
                ? [t("value.ladder.bestFit", { fit: state.summary.bestFit })]
                : []),
              ...(node.status === "OBSERVED" && node.observedScope
                ? [
                    t("value.ladder.scopeRecorded", {
                      scope: summaryScope(state?.summary, t, locale) ?? t("value.ladder.recorded"),
                    }),
                  ]
                : []),
            ].join(" · ")
          : "";

        return (
          <div key={level}>
            {prevLevel && (
              <div className="flex min-w-0 items-center gap-2 overflow-hidden py-0.5 pl-3">
                <ArrowDown className="text-muted-foreground size-3.5 shrink-0" />
                {link ? (
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() => onSelect?.({ kind: "link", link })}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1.5 py-0.5 text-left",
                      interactive && "hover:bg-accent",
                    )}
                  >
                    <span className="text-muted-foreground truncate text-xs italic">
                      {link.statement}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {link.criticality !== "CRITICAL" && (
                        <Badge variant="outline" className="px-1 py-0 text-[9px]">
                          {t(`labels.criticality.${link.criticality}`).toLowerCase()}
                        </Badge>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <EpistemicBadge status={link.status} confidence={link.confidence} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <ClaimHover
                            title={t("value.ladder.linkTitle", {
                              from: levelLabel(link.fromNode.level),
                              to: levelLabel(link.toNode.level),
                            })}
                            status={link.status}
                            confidence={link.confidence}
                            summary={state?.linkFromPrevious?.summary}
                            requiredDesign={level as ProofRung}
                            blockers={state?.linkFromPrevious?.reasons}
                          />
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </button>
                ) : prevNode && node ? (
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() =>
                      onSelect?.({ kind: "add-link", fromLevel: prevLevel, toLevel: level })
                    }
                    className={cn(
                      "text-muted-foreground flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                      interactive && "hover:bg-accent",
                    )}
                  >
                    <Plus className="size-3" /> {t("value.ladder.stateCausalAssumption")}
                  </button>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
            )}
            {node ? (
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onSelect?.({ kind: "node", node })}
                className={cn(
                  "bg-card flex w-full items-start justify-between gap-2 rounded-md border px-2.5 text-left",
                  compact ? "py-1.5" : "py-2",
                  interactive && "hover:bg-accent",
                  beyond && "border-dashed",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      {levelLabel(level)}
                    </p>
                    {!compact && <CausalDistanceBadge distance={node.causalDistance} />}
                  </div>
                  <p className={cn("text-sm", compact && "truncate")}>{node.statement}</p>
                  {!compact && (node.evidenceLinks.length > 0 || node.assumptions.length > 0) && (
                    <p className="text-muted-foreground mt-0.5 text-[11px]">{nodeMeta}</p>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <EpistemicBadge status={node.status} confidence={node.confidence} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <ClaimHover
                      title={t("value.ladder.nodeTitle", {
                        level: levelLabel(level),
                        statement: node.statement,
                      })}
                      status={node.status}
                      confidence={node.confidence}
                      summary={state?.summary}
                      blockers={state?.eligible ? [] : state?.reasons}
                    />
                  </TooltipContent>
                </Tooltip>
              </button>
            ) : (
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onSelect?.({ kind: "add-node", level })}
                className={cn(
                  "text-muted-foreground flex w-full items-center justify-between gap-2 rounded-md border border-dashed px-2.5 text-left text-xs",
                  compact ? "py-1.5" : "py-2",
                  interactive && "hover:bg-accent",
                )}
              >
                <span>
                  <span className="text-[10px] font-medium tracking-wider uppercase">
                    {levelLabel(level)}
                  </span>{" "}
                  · {t("value.ladder.notStated")}
                </span>
                {interactive && <Plus className="size-3.5" />}
              </button>
            )}
            {isFrontier && frontierDivider}
          </div>
        );
      })}
      {!nodeByLevel.has("BUSINESS_OUTCOME") && interactive && !compact && (
        <button
          type="button"
          onClick={() => onSelect?.({ kind: "add-node", level: "BUSINESS_OUTCOME" })}
          className="text-muted-foreground hover:bg-accent flex w-full items-center gap-1 rounded-md px-2.5 py-1 text-left text-[11px]"
        >
          <Plus className="size-3" /> {t("value.ladder.addBusinessOutcome")}
        </button>
      )}
    </div>
  );
}
