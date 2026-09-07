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
import type { WorkspaceGraph } from "@/db/workspaces";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Potential = structural attractiveness. Evidence = external proof. Both deterministic; both
          required for a verdict.
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead className="text-right">Potential</TableHead>
                <TableHead className="text-right">Evidence</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className={cn("max-w-[14rem] font-medium", compact && "text-xs")}>
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
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      scoreTone(o.opportunityScore),
                    )}
                  >
                    {o.opportunityScore}
                  </TableCell>
                  <TableCell
                    className={cn("text-right font-mono tabular-nums", scoreTone(o.evidenceScore))}
                  >
                    {o.evidenceScore}
                  </TableCell>
                  <TableCell>
                    <VerdictBadge verdict={o.verdict} />
                  </TableCell>
                </TableRow>
              ))}
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
