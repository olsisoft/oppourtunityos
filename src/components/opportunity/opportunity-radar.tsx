"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { NewOpportunityDialog } from "@/components/opportunity/new-opportunity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { scoreTone } from "@/components/shared/score-pill";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SCORE_QUESTIONS, frontierText } from "@/components/value/scorecard";
import type { OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import { cn } from "@/lib/utils";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";

export function OpportunityRadar({
  graph,
  compact = false,
}: {
  graph: WorkspaceGraph;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rows = [...graph.opportunities].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const pains = graph.markets.flatMap((m) =>
    m.icps.flatMap((i) =>
      i.variables.flatMap((v) =>
        v.pains.map((p) => ({
          id: p.id,
          label: `${v.name} — ${p.description}`,
          icpId: i.id,
          variableId: v.id,
        })),
      ),
    ),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Four independent questions, one deterministic verdict. Hover a score for its
          decomposition; INCOMPLETE means an input is UNKNOWN, not zero.
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus /> Opportunity
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="Opportunities form once an ICP, a variable and a pain are known. You can also create one manually and set its inputs."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus /> Create opportunity
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <ScoreHead
                  label={compact ? "Pot." : "Potential"}
                  question={SCORE_QUESTIONS.potential}
                />
                <ScoreHead
                  label={compact ? "Evid." : "Evidence"}
                  question={SCORE_QUESTIONS.evidence}
                />
                <ScoreHead label="Value" question={SCORE_QUESTIONS.value} />
                <ScoreHead label="Causal" question={SCORE_QUESTIONS.causal} />
                {!compact && (
                  <ScoreHead
                    label="Proof frontier"
                    question="Where supported knowledge currently ends. Deterministic: derived from linked evidence and critical causal links, never from the analyst."
                    align="left"
                  />
                )}
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const insights = deriveOpportunityInsights(o, graph.mechanisms.length);
                return (
                  <TableRow key={o.id}>
                    <TableCell
                      className={cn(
                        "max-w-[14rem] font-medium",
                        compact && "max-w-[11rem] text-xs",
                      )}
                    >
                      <Link
                        href={`/app/w/${graph.id}/opportunities/${o.id}`}
                        className="block truncate hover:underline"
                      >
                        {o.title}
                      </Link>
                      {!compact && o.icp && (
                        <p className="text-muted-foreground truncate text-xs font-normal">
                          {o.icp.name}
                        </p>
                      )}
                      {compact && (
                        <p className="text-muted-foreground truncate text-[10px] font-normal">
                          frontier · {frontierText(o.proofFrontierRung)}
                        </p>
                      )}
                    </TableCell>
                    <ScoreCell
                      value={o.opportunityScore}
                      lines={insights.scoreBreakdown?.explanation ?? []}
                      question={SCORE_QUESTIONS.potential}
                    />
                    <ScoreCell
                      value={o.evidenceScore}
                      lines={insights.evidenceBreakdown?.explanation ?? []}
                      question={SCORE_QUESTIONS.evidence}
                    />
                    <ScoreCell
                      value={o.valueStrength}
                      lines={insights.valueStrength?.explanation ?? ["Not computed yet."]}
                      question={SCORE_QUESTIONS.value}
                      compact={compact}
                    />
                    <ScoreCell
                      value={o.causalConfidence}
                      lines={insights.causal?.explanation ?? ["Not computed yet."]}
                      question={SCORE_QUESTIONS.causal}
                      compact={compact}
                    />
                    {!compact && (
                      <FrontierCell opportunity={o} lines={insights.frontier?.explanation ?? []} />
                    )}
                    <TableCell>
                      <VerdictBadge verdict={o.verdict} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <NewOpportunityDialog
        open={open}
        onOpenChange={setOpen}
        workspaceId={graph.id}
        pains={pains}
      />
    </div>
  );
}

function ScoreHead({
  label,
  question,
  align = "right",
}: {
  label: string;
  question: string;
  align?: "left" | "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{question}</TooltipContent>
      </Tooltip>
    </TableHead>
  );
}

function ScoreCell({
  value,
  lines,
  question,
  compact = false,
}: {
  value: number | null;
  lines: string[];
  question: string;
  compact?: boolean;
}) {
  return (
    <TableCell className="text-right font-mono tabular-nums">
      <Tooltip>
        <TooltipTrigger asChild>
          {value === null ? (
            <span
              className="text-tone-warning cursor-help text-[10px] font-semibold tracking-wide"
              aria-label="INCOMPLETE"
            >
              {compact ? "—" : "INCOMPLETE"}
            </span>
          ) : (
            <span className={cn("cursor-help", scoreTone(value))}>{value}</span>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="mb-1 font-medium">{question}</p>
          {value === null && (
            <p className="mb-1">INCOMPLETE — an input is UNKNOWN; this is not a zero.</p>
          )}
          <ul className="space-y-0.5">
            {lines.slice(0, 8).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

function FrontierCell({
  opportunity: o,
  lines,
}: {
  opportunity: OpportunityWithRelations;
  lines: string[];
}) {
  return (
    <TableCell className="text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help whitespace-nowrap">{frontierText(o.proofFrontierRung)}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="mb-1 font-medium">Proof Frontier</p>
          <ul className="space-y-0.5">
            {(lines.length ? lines : ["Not computed yet."]).slice(0, 8).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}
