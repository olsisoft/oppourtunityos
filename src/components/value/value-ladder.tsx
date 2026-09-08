"use client";

import { ArrowDown, Plus } from "lucide-react";

import { CausalDistanceBadge, EpistemicBadge } from "@/components/value/epistemic-badge";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EPISTEMIC_LABELS } from "@/domain/enums";
import { DESIGN_LEVEL_LABELS } from "@/services/value/experimental-validity";
import { GENERALIZATION_LABELS } from "@/services/value/language-gate";
import { FIT_BAND_LABELS } from "@/components/value/fit-badge";
import type {
  GraphCausalLink,
  GraphValueChainNode,
  OpportunityWithRelations,
} from "@/db/workspaces";
import { VALUE_CHAIN_LEVEL_LABELS } from "@/domain/enums";
import type { ValueChainLevel } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { VALUE_CHAIN_LEVEL_ORDER } from "@/services/value/epistemic";
import {
  FRONTIER_DESIGN_REQUIRED,
  PROOF_RUNG_LABELS,
  rungIndex,
  type FrontierClaimSummary,
  type FrontierPosition,
  type ProofFrontierResult,
  type ProofRung,
} from "@/services/value/proof-frontier";

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
  status: keyof typeof EPISTEMIC_LABELS;
  confidence: number;
  summary: FrontierClaimSummary | null | undefined;
  requiredDesign?: ProofRung | null;
  blockers?: string[];
}) {
  const design = requiredDesign ? FRONTIER_DESIGN_REQUIRED[requiredDesign] : undefined;
  return (
    <div className="max-w-sm space-y-1 text-xs">
      <p className="font-medium">{title}</p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">Status</span>{" "}
        {EPISTEMIC_LABELS[status]}
        {confidence ? ` ${confidence}/100` : ""}
      </p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">Fit</span>{" "}
        {summary && summary.total > 0
          ? `best ${summary.bestFit}/100 (${FIT_BAND_LABELS[summary.bestBand]}) · ${summary.admissible}/${summary.total} admissible · ${summary.independentOrigins} independent origin${summary.independentOrigins === 1 ? "" : "s"}${summary.lowFitOnly ? " · low-fit only" : ""}`
          : "no evidence linked"}
        {summary?.designLevel
          ? ` · ${DESIGN_LEVEL_LABELS[summary.designLevel].toLowerCase()} design`
          : ""}
        {design ? ` (requires ≥ ${DESIGN_LEVEL_LABELS[design].toLowerCase()})` : ""}
      </p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">Scope</span>{" "}
        {summary?.observed
          ? `observed in ${summary.scopeText ?? "an unrecorded scope"}`
          : summary?.scopeText
            ? summary.scopeText
            : "not observed directly"}
        {summary?.generalization ? ` · ${GENERALIZATION_LABELS[summary.generalization]}` : ""}
      </p>
      {summary?.inference && <p className="text-muted-foreground">{summary.inference}</p>}
      {blockers && blockers.length > 0 && <p className="text-tone-warning">{blockers[0]}</p>}
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
  const frontierPos: FrontierPosition =
    (o.proofFrontierRung as FrontierPosition | null) ?? frontier?.frontier ?? "NONE";
  const frontierIdx = rungIndex(frontierPos);
  const nodeByLevel = new Map(o.valueChainNodes.map((n) => [n.level, n]));
  const levels = VALUE_CHAIN_LEVEL_ORDER.filter(
    (l) => l !== "BUSINESS_OUTCOME" || nodeByLevel.has(l),
  );
  const rungState = (rung: ProofRung) => frontier?.rungs.find((r) => r.rung === rung);
  const interactive = Boolean(onSelect);

  const scopeText = frontier?.frontierScope?.text ?? null;
  const frontierDivider = (
    <div className="my-1 flex items-center gap-2" aria-label="Proof frontier">
      <div className="bg-foreground h-px flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="bg-foreground text-background max-w-full truncate rounded px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase">
            Proof frontier · {PROOF_RUNG_LABELS[frontierPos]}
            {!compact && frontierPos !== "NONE" && scopeText ? ` · ${scopeText}` : ""}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-xs">
          <p className="font-medium">Level: {PROOF_RUNG_LABELS[frontierPos]}</p>
          <p>
            Scope: {scopeText ?? "not computed"}
            {frontier?.frontierScope?.generalizationLabel
              ? ` · ${frontier.frontierScope.generalizationLabel}`
              : ""}
          </p>
          <p className="text-muted-foreground mt-1">
            {frontierPos === "NONE"
              ? "Nothing is supported by fitting evidence yet."
              : "What was reached, and where it was observed. Beyond this scope the claim is a hypothesis."}
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
                    {PROOF_RUNG_LABELS[rung]}
                  </p>
                  {!compact && state?.reasons?.length && !state.eligible ? (
                    <p className="text-muted-foreground truncate text-xs">{state.reasons[0]}</p>
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
                      title={PROOF_RUNG_LABELS[rung]}
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
                          {link.criticality.toLowerCase()}
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
                            title={`${VALUE_CHAIN_LEVEL_LABELS[link.fromNode.level]} → ${VALUE_CHAIN_LEVEL_LABELS[link.toNode.level]}`}
                            status={link.status}
                            confidence={link.confidence}
                            summary={rungState(level as ProofRung)?.linkFromPrevious?.summary}
                            requiredDesign={level as ProofRung}
                            blockers={rungState(level as ProofRung)?.linkFromPrevious?.reasons}
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
                    <Plus className="size-3" /> state the causal assumption
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
                      {VALUE_CHAIN_LEVEL_LABELS[level]}
                    </p>
                    {!compact && <CausalDistanceBadge distance={node.causalDistance} />}
                  </div>
                  <p className={cn("text-sm", compact && "truncate")}>{node.statement}</p>
                  {!compact && (node.evidenceLinks.length > 0 || node.assumptions.length > 0) && (
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {node.evidenceLinks.length} evidence · {node.assumptions.length} assumption
                      {node.assumptions.length === 1 ? "" : "s"}
                      {rungState(level as ProofRung)?.summary?.total
                        ? ` · best fit ${rungState(level as ProofRung)!.summary!.bestFit}`
                        : ""}
                      {node.status === "OBSERVED" && node.observedScope
                        ? ` · scope: ${rungState(level as ProofRung)?.summary?.scopeText ?? "recorded"}`
                        : ""}
                    </p>
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
                      title={`${VALUE_CHAIN_LEVEL_LABELS[level]}: ${node.statement}`}
                      status={node.status}
                      confidence={node.confidence}
                      summary={rungState(level as ProofRung)?.summary}
                      blockers={
                        rungState(level as ProofRung)?.eligible
                          ? []
                          : rungState(level as ProofRung)?.reasons
                      }
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
                    {VALUE_CHAIN_LEVEL_LABELS[level]}
                  </span>{" "}
                  · not stated
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
          <Plus className="size-3" /> Business outcome (optional — farthest from product
          attribution)
        </button>
      )}
    </div>
  );
}
