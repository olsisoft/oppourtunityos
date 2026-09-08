import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AssumptionLedger } from "@/components/assumptions/assumption-ledger";
import { EvidencePanel } from "@/components/evidence/evidence-panel";
import { CopyReportButton } from "@/components/opportunity/copy-report-button";
import { InterviewGuideSection } from "@/components/opportunity/interview-guide";
import { KillCriteria } from "@/components/opportunity/kill-criteria";
import { NextActionCard } from "@/components/opportunity/next-action";
import { OpportunityInputsForm } from "@/components/opportunity/opportunity-inputs-form";
import {
  EvidenceScoreBreakdown,
  OpportunityScoreBreakdown,
  VerdictExplanation,
} from "@/components/opportunity/score-breakdown";
import { ProvenanceBadge } from "@/components/shared/provenance-badge";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldStatusBadge } from "@/components/value/epistemic-badge";
import { ExperimentsList } from "@/components/value/experiments-list";
import { LearningHistory } from "@/components/value/learning-history";
import { NextValueActionCard } from "@/components/value/next-value-action";
import { prefillFromAction } from "@/services/value/experiment-prefill";
import { ReportLadder } from "@/components/value/report-ladder";
import { Scorecard } from "@/components/value/scorecard";
import { ValueStrengthEditor } from "@/components/value/value-strength-editor";
import { assertWorkspaceAccess, getWorkspaceGraph } from "@/db/workspaces";
import { getT } from "@/i18n/server";
import { ForbiddenError, requireUser } from "@/lib/session";
import type { InterviewGuide } from "@/services/ai/schemas";
import { buildOpportunityReport, reportToMarkdown } from "@/services/report/opportunity-report";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import {
  compactLabel,
  directionGlyph,
  fieldStatus,
  polarityOf,
} from "@/services/value/variable-semantics";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("report.meta.title") };
}

export default async function OpportunityReportPage({
  params,
}: {
  params: Promise<{ workspaceId: string; opportunityId: string }>;
}) {
  const user = await requireUser();
  const { workspaceId, opportunityId } = await params;
  try {
    await assertWorkspaceAccess(user.id, workspaceId);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
  const t = await getT();
  const graph = await getWorkspaceGraph(workspaceId);
  const o = graph.opportunities.find((x) => x.id === opportunityId);
  if (!o) notFound();

  const mechanisms = graph.mechanisms
    .filter((m) => !o.painId || !m.painId || m.painId === o.painId)
    .map((m) => m.name);
  const insights = deriveOpportunityInsights(o, mechanisms.length);
  const report = buildOpportunityReport(
    o,
    mechanisms,
    insights.primaryAction,
    insights.primaryValueAction,
    t,
  );
  const markdown = reportToMarkdown(report, t);
  const guide =
    (o.interviewGuide as unknown as (InterviewGuide & { source?: string }) | null) ?? null;
  const v = o.variable;
  const riskiest = insights.riskiestAssumption;
  const polarity = v ? polarityOf(v.variableType, v.variablePolarity) : null;

  return (
    <div className="h-full scrollbar-thin overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link href={`/app/w/${workspaceId}`}>
                <ArrowLeft /> {graph.name}
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={o.verdict} />
              <ProvenanceBadge provenance={o.provenance} short={false} />
              <Badge variant="outline">
                {t("report.page.confidence", {
                  confidence: t(`labels.confidence.${o.confidence}`),
                })}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{o.title}</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {t(`labels.verdictDescription.${o.verdict}`)}
            </p>
          </div>
          {/* K. Scorecard — four independent questions */}
          <Scorecard opportunity={o} insights={insights} size="lg" className="sm:min-w-[32rem]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{t("report.page.title")}</CardTitle>
                    <CardDescription>{t("report.page.description")}</CardDescription>
                  </div>
                  <CopyReportButton markdown={markdown} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                {/* A. ICP */}
                <Section title={t("report.page.section.icp")} provenance={report.icp?.provenance}>
                  {report.icp ? (
                    <>
                      <p className="font-medium">{report.icp.name}</p>
                      {report.icp.description && (
                        <p className="text-muted-foreground text-xs">{report.icp.description}</p>
                      )}
                    </>
                  ) : (
                    <Unknown />
                  )}
                </Section>
                {/* B. Valuable variable */}
                <Section
                  title={t("report.page.section.variable")}
                  provenance={report.variable?.provenance}
                >
                  {report.variable && v ? (
                    <>
                      <p className="font-medium">{compactLabel(v.desiredDirection, v.name)}</p>
                      <p className="text-muted-foreground text-xs">
                        {t("report.page.variable.actionType", {
                          direction: report.variable.direction,
                          type: v.variableType?.trim() ? v.variableType : "UNKNOWN",
                          hasPolarity: Boolean(polarity),
                          polarity: polarity
                            ? t(`labels.variablePolarity.${polarity}`).toLowerCase()
                            : "",
                        })}
                      </p>
                      {v.parent && (
                        <p className="mt-1 text-xs">
                          <span className="text-muted-foreground">
                            {t("report.page.variable.parentLabel")}{" "}
                          </span>
                          {directionGlyph(v.parentDirection ?? v.parent.desiredDirection)}{" "}
                          {v.parent.name}
                          <FieldStatusBadge
                            status={fieldStatus(v, "parentVariableId")}
                            className="ml-1.5"
                          />
                        </p>
                      )}
                    </>
                  ) : (
                    <Unknown />
                  )}
                </Section>
                {v && report.variableDetail && (
                  <div className="grid gap-3 rounded-md border p-3 sm:col-span-2 sm:grid-cols-3">
                    <VariableField
                      label={t("report.page.variable.field.type")}
                      f={report.variableDetail.variableType}
                      status={fieldStatus(v, "variableType")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.target")}
                      f={report.variableDetail.target}
                      status={fieldStatus(v, "target")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.scope")}
                      f={report.variableDetail.scope}
                      status={fieldStatus(v, "scope")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.currentState")}
                      f={report.variableDetail.currentState}
                      status={fieldStatus(v, "currentState")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.desiredState")}
                      f={report.variableDetail.desiredState}
                      status={fieldStatus(v, "desiredState")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.unit")}
                      f={report.variableDetail.unit}
                      status={fieldStatus(v, "unit")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.importance")}
                      f={report.variableDetail.importance}
                      status={fieldStatus(v, "importanceScore")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.parentVariable")}
                      f={report.variableDetail.parentVariable}
                      status={fieldStatus(v, "parentVariableId")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.whoValuesIt")}
                      f={report.variableDetail.whoValuesIt}
                      status={fieldStatus(v, "whoValuesIt")}
                    />
                    <VariableField
                      label={t("report.page.variable.field.whyItMatters")}
                      f={report.variableDetail.whyItMatters}
                      status={fieldStatus(v, "whyItMatters")}
                      className="sm:col-span-2"
                    />
                  </div>
                )}
                {/* C. Pain */}
                <Section title={t("report.page.section.pain")} className="sm:col-span-2">
                  {report.economicPain}
                </Section>
                {/* D. Trigger */}
                <Section title={t("report.page.section.trigger")} className="sm:col-span-2">
                  {report.trigger}
                </Section>
                {/* E. Alternatives */}
                <Section title={t("report.page.section.alternatives")} className="sm:col-span-2">
                  {report.alternatives.length ? (
                    <ul className="space-y-1">
                      {report.alternatives.map((a) => (
                        <li key={a.name} className="flex items-start justify-between gap-3">
                          <span>
                            <span className="font-medium">{a.name}</span>
                            <span className="text-muted-foreground"> — {a.failure}</span>
                          </span>
                          <Badge variant="outline" className="shrink-0">
                            {t("report.page.alternatives.weakness", { weakness: a.weakness })}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Unknown />
                  )}
                </Section>
                {/* F. Mechanisms */}
                <Section title={t("report.page.section.mechanisms")} className="sm:col-span-2">
                  {report.mechanisms.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {report.mechanisms.map((m) => (
                        <Badge key={m} variant={m === o.mechanism ? "default" : "secondary"}>
                          {m}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("report.page.mechanisms.empty")}
                    </span>
                  )}
                </Section>
                {/* G. Product hypothesis · H. Value proposition */}
                <Section title={t("report.page.section.productHypothesis")}>
                  {report.productHypothesis}
                </Section>
                <Section title={t("report.page.section.valueProposition")}>
                  {report.valueProposition}
                </Section>
                <Section title={t("report.page.section.metric")} className="sm:col-span-2">
                  {report.metric}
                </Section>
                <Section title={t("report.page.section.risks")} className="sm:col-span-2">
                  {report.risks.length ? (
                    <ul className="list-disc space-y-0.5 pl-4">
                      {report.risks.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">{t("report.page.risks.empty")}</span>
                  )}
                </Section>
              </CardContent>
            </Card>

            {/* I. Value causality ladder · J. Proof frontier */}
            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.section.ladder")}</CardTitle>
                <CardDescription>{t("report.page.ladder.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReportLadder opportunity={o} graph={graph} frontier={insights.frontier} />
                <div className="bg-muted/40 rounded-md border border-dashed p-3 text-sm">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    {t("report.page.section.frontier")}
                  </p>
                  <p className="mt-1">{report.frontier.text}</p>
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">
                      {t("report.page.frontier.scopeLabel")}{" "}
                    </span>
                    {t("report.page.frontier.scopeLine", {
                      scope: report.frontier.scope,
                      hasGeneralization: Boolean(report.frontier.generalization),
                      generalization: report.frontier.generalization,
                    })}
                    <span className="text-muted-foreground">
                      {" "}
                      {t("report.page.frontier.scopeHint")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">
                      {t("report.page.frontier.whyStopsLabel")}{" "}
                    </span>
                    {report.frontier.whyStops}
                  </p>
                  {insights.frontier?.blockedAt &&
                    (insights.frontier.blockedAt.blockers?.length ?? 0) > 1 && (
                      <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
                        {insights.frontier.blockedAt.blockers.slice(1).map((b) => (
                          <li key={t(b.message)}>{t(b.message)}</li>
                        ))}
                      </ul>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* L. Riskiest assumption + ledger */}
            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.section.riskiest")}</CardTitle>
                <CardDescription>
                  {t("report.page.riskiest.description", { count: insights.untestedAssumptions })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskiest ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{t(`labels.assumptionKind.${riskiest.kind}`)}</Badge>
                      <span className="text-muted-foreground font-mono text-xs">
                        {t("report.page.riskiest.importance", { importance: riskiest.importance })}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{riskiest.statement}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("report.page.riskiest.collapse")}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t("report.page.riskiest.empty")}</p>
                )}
                <AssumptionLedger graph={graph} opportunityId={o.id} />
              </CardContent>
            </Card>

            {report.commercial.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("report.page.commercial.title")}</CardTitle>
                  <CardDescription>{t("report.page.commercial.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-wrap items-center gap-2 text-sm">
                    {report.commercial.map((c, i) => (
                      <li key={c.label} className="flex items-center gap-2">
                        <span className="rounded-md border px-2 py-1">
                          <span className="font-medium">{c.label}</span>{" "}
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {t("report.page.commercial.rung", {
                              status: c.status,
                              hasEvidence: Boolean(c.evidenceCount),
                              count: c.evidenceCount,
                              fit: c.bestFit,
                            })}
                          </span>
                        </span>
                        {i < report.commercial.length - 1 && (
                          <span className="text-muted-foreground text-xs">→</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.experiments.title")}</CardTitle>
                <CardDescription>{t("report.page.experiments.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ExperimentsList
                  experiments={o.experiments}
                  opportunity={o}
                  insights={insights}
                  graph={graph}
                  prefill={
                    insights.primaryValueAction
                      ? prefillFromAction(insights.primaryValueAction, o.title)
                      : undefined
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.learning.title")}</CardTitle>
                <CardDescription>{t("report.page.learning.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <LearningHistory changes={o.knowledgeChanges} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.interview.title")}</CardTitle>
                <CardDescription>{t("report.page.interview.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewGuideSection opportunityId={o.id} guide={guide} verdict={o.verdict} />
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            {/* M. Next best action */}
            {o.verdict === "KILL" || o.verdict === "IGNORE" || !insights.primaryValueAction ? (
              <NextActionCard
                action={insights.primaryAction}
                others={insights.nextActions.slice(1, 4)}
              />
            ) : (
              <NextValueActionCard
                action={insights.primaryValueAction}
                frontierLabel={report.frontier.label}
                opportunity={o}
                insights={insights}
              />
            )}
            {insights.valueActions.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("report.page.then.title")}</CardTitle>
                  <CardDescription>{t("report.page.then.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    {insights.valueActions.slice(1, 4).map((a) => (
                      <li key={`${a.type}-${a.priority}-${t(a.what)}`} className="flex gap-2">
                        <span className="text-muted-foreground font-mono text-xs">
                          {t("report.page.then.item", {
                            priority: a.priority,
                            score: a.priorityScore,
                          })}
                        </span>
                        <span>{t(a.what)}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.verdict.title")}</CardTitle>
                <CardDescription>{t("report.page.verdict.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <VerdictExplanation result={insights.verdictResult} />
              </CardContent>
            </Card>

            {/* N. Kill criteria */}
            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.section.killCriteria")}</CardTitle>
              </CardHeader>
              <CardContent>
                <KillCriteria warnings={insights.killWarnings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.valueStrength.title")}</CardTitle>
                <CardDescription>{t("report.page.valueStrength.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ValueStrengthEditor opportunity={o} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.causal.title")}</CardTitle>
                <CardDescription>
                  {t("report.page.causal.description", {
                    hasCompleteness: Boolean(insights.causal),
                    completeness: insights.causal?.completeness,
                    hasBlocking: Boolean(insights.causal?.blocking),
                    blocking: insights.causal?.blocking ? t(insights.causal.blocking.label) : "",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs">
                  {(insights.causal?.explanation ?? [t("report.page.causal.notComputed")]).map(
                    (l, i) => (
                      <li key={i} className="text-muted-foreground">
                        {t(l)}
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.potential.title")}</CardTitle>
                <CardDescription>{t("report.page.potential.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <OpportunityScoreBreakdown result={insights.scoreBreakdown} />
                <Tabs defaultValue="closed">
                  <TabsList>
                    <TabsTrigger value="closed">{t("report.page.potential.inputs")}</TabsTrigger>
                    <TabsTrigger value="edit">{t("report.page.potential.editInputs")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="closed">
                    <p className="text-muted-foreground text-xs">
                      {t("report.page.potential.inputsOrigin", { origin: o.provenance })}
                    </p>
                  </TabsContent>
                  <TabsContent value="edit">
                    <OpportunityInputsForm
                      opportunityId={o.id}
                      initial={{
                        importance: o.importance,
                        painIntensity: o.painIntensity,
                        frequency: o.frequency,
                        gap: o.gap,
                        willingnessToPay: o.willingnessToPay,
                        alternativeWeakness: o.alternativeWeakness,
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("report.page.evidenceConfidence.title")}</CardTitle>
                <CardDescription>{t("report.page.evidenceConfidence.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <EvidenceScoreBreakdown result={insights.evidenceBreakdown} />
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("report.page.evidence.title")}</CardTitle>
            <CardDescription>{t("report.page.evidence.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EvidencePanel
              graph={{
                ...graph,
                evidence: graph.evidence.filter(
                  (e) =>
                    e.opportunityId === o.id ||
                    (o.painId && e.painId === o.painId) ||
                    e.claimLinks.some((c) => c.opportunityId === o.id),
                ),
              }}
              compact={false}
              defaultOpportunityId={o.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  title,
  provenance,
  className,
  children,
}: {
  title: string;
  provenance?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground text-xs font-medium">{title}</p>
        {provenance && <span className="text-muted-foreground text-[10px]">({provenance})</span>}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function VariableField({
  label,
  f,
  status,
  className,
}: {
  label: string;
  f: { value: string };
  status: Parameters<typeof FieldStatusBadge>[0]["status"];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </p>
        <FieldStatusBadge status={status} />
      </div>
      <p className={f.value === "UNKNOWN" ? "text-muted-foreground mt-0.5" : "mt-0.5"}>{f.value}</p>
    </div>
  );
}

function Unknown() {
  return <span className="text-muted-foreground">UNKNOWN</span>;
}
