import type { Metadata } from "next";
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
import { STALLED_AFTER_DAYS, getDashboardData } from "@/db/dashboard";
import { VERDICT_ORDER, VERDICT_TONE } from "@/domain/enums";
import { formatDate } from "@/i18n/format";
import { getLocale, getT } from "@/i18n/server";
import type { T } from "@/i18n/t";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("dashboard.metaTitle") };
}

/** Proof-frontier rung label; an unknown code (legacy row) is shown as-is. */
function frontierLabel(t: T, rung: string | null | undefined): string {
  if (!rung) return t("dashboard.frontier.notComputed");
  const key = `labels.proofRung.${rung}`;
  return t.has(key) ? t(key) : rung;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const user = await requireUser();
  const t = await getT();
  const locale = await getLocale();
  const { intent } = await searchParams;
  const data = await getDashboardData(user.id);
  const maxVerdict = Math.max(1, ...Object.values(data.byVerdict));
  const incomplete = t("dashboard.incomplete");

  return (
    <div className="h-full scrollbar-thin overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("dashboard.summary", {
              workspaces: data.totals.workspaces,
              opportunities: data.totals.opportunities,
              evidence: data.totals.evidence,
              assumptions: data.totals.untestedAssumptions,
            })}
          </p>
        </div>

        {data.workspaces.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.firstDiscovery.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.firstDiscovery.descriptionBefore")} <code>npm run db:seed</code>{" "}
                {t("dashboard.firstDiscovery.descriptionAfter")}
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
                  {t("dashboard.nextAction.label")}
                </p>
                <p className="mt-1 flex items-start gap-2 text-base font-medium">
                  <ArrowRight className="mt-1 size-4 shrink-0" />{" "}
                  {t(data.nextValueAction?.what ?? data.nextAction.title)}
                </p>
                <p className="text-background/80 mt-1 text-sm">
                  {t(data.nextValueAction?.why ?? data.nextAction.rationale)}
                </p>
                {data.nextValueAction && (
                  <p className="text-background/70 mt-1 text-xs">
                    {t("dashboard.nextAction.ifFalse", {
                      consequence: t(data.nextValueAction.ifFalse),
                    })}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-background/30 text-background">
                    {data.nextAction.opportunityTitle}
                  </Badge>
                  {data.nextValueAction && (
                    <Badge variant="outline" className="border-background/30 text-background">
                      {t("dashboard.frontier.label", {
                        frontier: frontierLabel(t, data.nextValueAction.frontier),
                      })}
                    </Badge>
                  )}
                  <Button size="sm" variant="secondary" asChild>
                    <Link
                      href={`/app/w/${data.nextAction.workspaceId}/opportunities/${data.nextAction.opportunityId}`}
                    >
                      {t("dashboard.nextAction.open")} <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t("dashboard.nextAction.emptyTitle")}
                description={t("dashboard.nextAction.emptyDescription")}
                action={<QuickStart intent={intent} />}
              />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t("dashboard.strongest.title")}</CardTitle>
                  <CardDescription>{t("dashboard.strongest.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.strongest.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.strongest.empty")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("dashboard.columns.opportunity")}</TableHead>
                            <TableHead>{t("dashboard.columns.workspace")}</TableHead>
                            <Head
                              label={t("dashboard.columns.potential")}
                              question={t("dashboard.scoreQuestions.potential")}
                            />
                            <Head
                              label={t("dashboard.columns.evidence")}
                              question={t("dashboard.scoreQuestions.evidence")}
                            />
                            <Head
                              label={t("dashboard.columns.value")}
                              question={t("dashboard.scoreQuestions.value")}
                            />
                            <Head
                              label={t("dashboard.columns.causal")}
                              question={t("dashboard.scoreQuestions.causal")}
                            />
                            <TableHead>{t("dashboard.columns.verdict")}</TableHead>
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
                                    {t("dashboard.frontier.label", {
                                      frontier: frontierLabel(t, o.proofFrontierRung),
                                    })}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {o.workspace.isDemo && !/demo/i.test(o.workspace.name)
                                  ? t("dashboard.strongest.demoWorkspace", {
                                      name: o.workspace.name,
                                    })
                                  : o.workspace.name}
                              </TableCell>
                              <Score value={o.opportunityScore} incomplete={incomplete} />
                              <Score value={o.evidenceScore} incomplete={incomplete} />
                              <Score value={o.valueStrength} incomplete={incomplete} />
                              <Score value={o.causalConfidence} incomplete={incomplete} />
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
                  <CardTitle>{t("dashboard.byVerdict.title")}</CardTitle>
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
                  <CardTitle>{t("dashboard.learning.title")}</CardTitle>
                  <CardDescription>{t("dashboard.learning.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.recentLearning.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("dashboard.learning.empty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.recentLearning.map((c) => {
                        const reason = c.experiment
                          ? t("dashboard.learning.reasonExperiment", { title: c.experiment.title })
                          : c.evidence
                            ? t("dashboard.learning.reasonEvidence", {
                                title: c.evidence.sourceTitle,
                              })
                            : t(`labels.knowledgeTrigger.${c.trigger}`).toLowerCase();
                        return (
                          <li key={c.id} className="text-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/app/w/${c.opportunity.workspaceId}/opportunities/${c.opportunity.id}`}
                                className="font-medium hover:underline"
                              >
                                {c.opportunity.title}
                              </Link>
                              {c.movement !== "NONE" && (
                                <Badge variant={c.movement === "FORWARD" ? "positive" : "negative"}>
                                  {t("dashboard.learning.frontierMoved", {
                                    from: frontierLabel(t, c.previousFrontier),
                                    to: frontierLabel(t, c.newFrontier),
                                  })}
                                </Badge>
                              )}
                              {c.previousVerdict !== c.newVerdict && (
                                <Badge variant="outline">
                                  {t("dashboard.learning.verdictChanged", {
                                    from: c.previousVerdict,
                                    to: c.newVerdict,
                                  })}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {t("dashboard.learning.meta", {
                                summary: t((c.summaryMessage as LocalizedText | null) ?? c.summary),
                                reason,
                                date: formatDate(c.createdAt, locale),
                              })}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.stalled.title")}</CardTitle>
                  <CardDescription>
                    {t("dashboard.stalled.description", { days: STALLED_AFTER_DAYS })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.stalled.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("dashboard.stalled.empty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.stalled.map(
                        ({ opportunity: o, untestedCritical, daysSince, planned }) => (
                          <li key={o.id} className="text-sm">
                            <Link
                              href={`/app/w/${o.workspaceId}/opportunities/${o.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.title}
                            </Link>
                            <p className="text-muted-foreground text-xs">
                              {t("dashboard.stalled.detail", {
                                status: daysSince === null ? "NEVER" : "SINCE",
                                days: daysSince ?? 0,
                                critical: untestedCritical,
                                planned,
                              })}
                            </p>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.weakest.title")}</CardTitle>
                  <CardDescription>{t("dashboard.weakest.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.weakestAssumptions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("dashboard.weakest.empty")}</p>
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
                                {t(`labels.assumptionKind.${a.kind}`)}
                              </Badge>
                              {a.valueChainNode && (
                                <span className="text-muted-foreground text-[11px]">
                                  {t("dashboard.weakest.onLevel", {
                                    level: t(`labels.valueChainLevel.${a.valueChainNode.level}`),
                                  })}
                                </span>
                              )}
                              {a.causalLink && (
                                <span className="text-muted-foreground text-[11px]">
                                  {t("dashboard.weakest.onCausalLink")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5">{a.statement}</p>
                            <p className="text-muted-foreground text-xs">
                              {a.workspace.name}
                              {a.opportunity ? ` · ${a.opportunity.title}` : ""} ·{" "}
                              {t("dashboard.weakest.evidenceCount", { count: a.links.length })}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {t("dashboard.weakest.importance", { value: a.importance })}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.gaps.title")}</CardTitle>
                  <CardDescription>{t("dashboard.gaps.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.evidenceGaps.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("dashboard.gaps.empty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.evidenceGaps.map(({ opportunity: o, kind, detail }) => (
                        <li key={`${o.id}-${kind}`} className="text-sm">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {t(`dashboard.gaps.kinds.${kind}`)}
                            </Badge>
                            <Link
                              href={`/app/w/${o.workspaceId}/opportunities/${o.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.title}
                            </Link>
                          </div>
                          <p className="text-muted-foreground text-xs">{t(detail)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.fitness.title")}</CardTitle>
                  <CardDescription>{t("dashboard.fitness.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.fitnessGaps.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("dashboard.fitness.empty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.fitnessGaps.map(({ opportunity: o, kind, claim, detail }) => (
                        <li key={`${o.id}-${kind}`} className="text-sm">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {t(`dashboard.fitness.kinds.${kind}`)}
                            </Badge>
                            <Link
                              href={`/app/w/${o.workspaceId}/opportunities/${o.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.title}
                            </Link>
                            <span className="text-muted-foreground text-xs">· {t(claim)}</span>
                          </div>
                          <details className="text-muted-foreground text-xs">
                            <summary className="cursor-pointer">{t("dashboard.why")}</summary>
                            <p className="mt-0.5">{t(detail)}</p>
                          </details>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.generalization.title")}</CardTitle>
                  <CardDescription>{t("dashboard.generalization.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.generalizationGaps.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.generalization.empty")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.generalizationGaps.map(
                        ({ opportunity: o, level, generalization, scope, detail, question }) => (
                          <li key={o.id} className="text-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {t(`labels.generalization.${generalization}`)}
                              </Badge>
                              <Link
                                href={`/app/w/${o.workspaceId}/opportunities/${o.id}`}
                                className="font-medium hover:underline"
                              >
                                {o.title}
                              </Link>
                              <span className="text-muted-foreground text-xs">
                                · {t(level)} · {t(scope)}
                              </span>
                            </div>
                            <details className="text-muted-foreground text-xs">
                              <summary className="cursor-pointer">
                                {question ? t(question) : t("dashboard.why")}
                              </summary>
                              <p className="mt-0.5">{t(detail)}</p>
                            </details>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.workspaces.title")}</CardTitle>
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
                          {w.isDemo && <Badge variant="muted">{t("layout.demoBadge")}</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {t(`labels.stage.${w.conversations[0]?.stage ?? "START"}`)} ·{" "}
                          {t("dashboard.workspaces.counts", {
                            opportunities: w._count.opportunities,
                            evidence: w._count.evidence,
                          })}
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

function Score({ value, incomplete }: { value: number | null; incomplete: string }) {
  return (
    <TableCell className="text-right font-mono tabular-nums">
      {value === null ? (
        <span className="text-tone-warning text-[10px] font-semibold tracking-wide">
          {incomplete}
        </span>
      ) : (
        <span className={cn(scoreTone(value))}>{value}</span>
      )}
    </TableCell>
  );
}
