import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { QuickStart } from "@/components/dashboard/quick-start";
import { EmptyState } from "@/components/shared/empty-state";
import { scoreTone } from "@/components/shared/score-pill";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EVIDENCE_GAP_LABELS, getDashboardData } from "@/db/dashboard";
import {
  ASSUMPTION_KIND_LABELS,
  STAGE_LABELS,
  VALUE_CHAIN_LEVEL_LABELS,
  VERDICT_ORDER,
  VERDICT_TONE,
} from "@/domain/enums";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const user = await requireUser();
  const { intent } = await searchParams;
  const data = await getDashboardData(user.id);
  const maxVerdict = Math.max(1, ...Object.values(data.byVerdict));

  return (
    <div className="h-full scrollbar-thin overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">What should I investigate next?</h1>
          <p className="text-muted-foreground text-sm">
            {data.totals.workspaces} active workspace{data.totals.workspaces === 1 ? "" : "s"} ·{" "}
            {data.totals.opportunities} opportunit{data.totals.opportunities === 1 ? "y" : "ies"} ·{" "}
            {data.totals.evidence} evidence item{data.totals.evidence === 1 ? "" : "s"} ·{" "}
            {data.totals.untestedAssumptions} untested assumption
            {data.totals.untestedAssumptions === 1 ? "" : "s"}
          </p>
        </div>

        {data.workspaces.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Start your first discovery</CardTitle>
              <CardDescription>
                Create a workspace, then choose how to begin inside the conversation. Run{" "}
                <code>npm run db:seed</code> to add the Beauty Salons demo workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickStart intent={intent} />
            </CardContent>
          </Card>
        ) : (
          <>
            {data.nextAction ? (
              <div className="bg-foreground text-background rounded-lg p-5">
                <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
                  Next best action
                </p>
                <p className="mt-1 flex items-start gap-2 text-base font-medium">
                  <ArrowRight className="mt-1 size-4 shrink-0" />{" "}
                  {data.nextValueAction?.what ?? data.nextAction.title}
                </p>
                <p className="text-background/80 mt-1 text-sm">
                  {data.nextValueAction?.why ?? data.nextAction.rationale}
                </p>
                {data.nextValueAction && (
                  <p className="text-background/70 mt-1 text-xs">
                    If false: {data.nextValueAction.ifFalse}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-background/30 text-background">
                    {data.nextAction.opportunityTitle}
                  </Badge>
                  {data.nextValueAction && (
                    <Badge variant="outline" className="border-background/30 text-background">
                      Proof frontier: {frontierText(data.nextValueAction.frontier)}
                    </Badge>
                  )}
                  <Button size="sm" variant="secondary" asChild>
                    <Link
                      href={`/app/w/${data.nextAction.workspaceId}/opportunities/${data.nextAction.opportunityId}`}
                    >
                      Open opportunity <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No opportunity formed yet"
                description="Continue a conversation until an ICP, a variable and a pain are known. The dashboard then tells you what to research first."
                action={<QuickStart intent={intent} />}
              />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Strongest opportunities</CardTitle>
                  <CardDescription>
                    Ranked by Opportunity Potential. Evidence says whether the problem is real,
                    Value how much moving the variable is worth, Causal whether the mechanism can
                    move it. Hover the title for the Proof Frontier.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.strongest.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nothing scored yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Opportunity</TableHead>
                            <TableHead>Workspace</TableHead>
                            <Head label="Potential" question={SCORE_QUESTIONS.potential} />
                            <Head label="Evidence" question={SCORE_QUESTIONS.evidence} />
                            <Head label="Value" question={SCORE_QUESTIONS.value} />
                            <Head label="Causal" question={SCORE_QUESTIONS.causal} />
                            <TableHead>Verdict</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.strongest.map(({ opportunity: o }) => (
                            <TableRow key={o.id}>
                              <TableCell className="max-w-[16rem] font-medium">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      href={`/app/w/${o.workspaceId}/opportunities/${o.id}`}
                                      className="block truncate hover:underline"
                                    >
                                      {o.title}
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Proof frontier: {frontierText(o.proofFrontierRung)}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {o.workspace.name}
                                {o.workspace.isDemo && !/demo/i.test(o.workspace.name)
                                  ? " (demo)"
                                  : ""}
                              </TableCell>
                              <Score value={o.opportunityScore} />
                              <Score value={o.evidenceScore} />
                              <Score value={o.valueStrength} />
                              <Score value={o.causalConfidence} />
                              <TableCell>
                                <VerdictBadge verdict={o.verdict} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Opportunities by verdict</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {VERDICT_ORDER.map((v) => (
                    <div
                      key={v}
                      className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 text-xs"
                    >
                      <Badge variant={VERDICT_TONE[v]} className="w-fit">
                        {v}
                      </Badge>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-foreground h-full"
                          style={{ width: `${(data.byVerdict[v] / maxVerdict) * 100}%` }}
                        />
                      </div>
                      <span className="text-right font-mono tabular-nums">{data.byVerdict[v]}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weakest assumptions</CardTitle>
                  <CardDescription>
                    Untested, high importance. Causal and value assumptions rank first: if one is
                    false, the opportunity collapses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.weakestAssumptions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No untested assumptions. Either everything is verified or nothing was written
                      down.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.weakestAssumptions.map((a) => (
                        <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={a.kind === "GENERIC" ? "muted" : "outline"}
                                className="text-[10px]"
                              >
                                {ASSUMPTION_KIND_LABELS[a.kind]}
                              </Badge>
                              {a.valueChainNode && (
                                <span className="text-muted-foreground text-[11px]">
                                  on {VALUE_CHAIN_LEVEL_LABELS[a.valueChainNode.level]}
                                </span>
                              )}
                              {a.causalLink && (
                                <span className="text-muted-foreground text-[11px]">
                                  on a causal link
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5">{a.statement}</p>
                            <p className="text-muted-foreground text-xs">
                              {a.workspace.name}
                              {a.opportunity ? ` · ${a.opportunity.title}` : ""} · {a.links.length}{" "}
                              evidence
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            importance {a.importance}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evidence gaps</CardTitle>
                  <CardDescription>
                    What kind of evidence is missing: the problem itself, its economic magnitude,
                    the causal chain, willingness to pay or mechanism feasibility.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.evidenceGaps.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No open evidence gap on a live opportunity.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.evidenceGaps.map(({ opportunity: o, kind, detail }) => (
                        <li key={`${o.id}-${kind}`} className="text-sm">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {EVIDENCE_GAP_LABELS[kind]}
                            </Badge>
                            <Link
                              href={`/app/w/${o.workspaceId}/opportunities/${o.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.title}
                            </Link>
                          </div>
                          <p className="text-muted-foreground text-xs">{detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Workspaces</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.workspaces.map((w) => (
                    <li key={w.id}>
                      <Link
                        href={`/app/w/${w.id}`}
                        className="bg-card hover:bg-accent block rounded-lg border p-3 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{w.name}</p>
                          {w.isDemo && <Badge variant="muted">Demo</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {STAGE_LABELS[w.conversations[0]?.stage ?? "START"]} ·{" "}
                          {w._count.opportunities} opportunit
                          {w._count.opportunities === 1 ? "y" : "ies"} · {w._count.evidence}{" "}
                          evidence
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <QuickStart intent={intent} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Head({ label, question }: { label: string; question: string }) {
  return (
    <TableHead className="text-right">
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

function Score({ value }: { value: number | null }) {
  return (
    <TableCell className="text-right font-mono tabular-nums">
      {value === null ? (
        <span className="text-tone-warning text-[10px] font-semibold tracking-wide">
          INCOMPLETE
        </span>
      ) : (
        <span className={cn(scoreTone(value))}>{value}</span>
      )}
    </TableCell>
  );
}
