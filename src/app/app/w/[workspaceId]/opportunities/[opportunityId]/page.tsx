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
import { ScorePill } from "@/components/shared/score-pill";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assertWorkspaceAccess, getWorkspaceGraph } from "@/db/workspaces";
import { CONFIDENCE_LABELS, VERDICT_DESCRIPTIONS } from "@/domain/enums";
import { ForbiddenError, requireUser } from "@/lib/session";
import type { InterviewGuide } from "@/services/ai/schemas";
import { buildOpportunityReport, reportToMarkdown } from "@/services/report/opportunity-report";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";

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
  const graph = await getWorkspaceGraph(workspaceId);
  const o = graph.opportunities.find((x) => x.id === opportunityId);
  if (!o) notFound();

  const mechanisms = graph.mechanisms
    .filter((m) => !o.painId || !m.painId || m.painId === o.painId)
    .map((m) => m.name);
  const insights = deriveOpportunityInsights(o, mechanisms.length);
  const report = buildOpportunityReport(o, mechanisms, insights.primaryAction);
  const markdown = reportToMarkdown(report);
  const guide =
    (o.interviewGuide as unknown as (InterviewGuide & { source?: string }) | null) ?? null;

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
              <Badge variant="outline">{CONFIDENCE_LABELS[o.confidence]} confidence</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{o.title}</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {VERDICT_DESCRIPTIONS[o.verdict]}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <ScorePill value={o.opportunityScore} label="Opportunity potential" size="lg" />
            <ScorePill value={o.evidenceScore} label="Evidence confidence" size="lg" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Opportunity report</CardTitle>
                    <CardDescription>
                      The artifact of this discovery. Hypotheses stay labelled; UNKNOWN is an honest
                      answer.
                    </CardDescription>
                  </div>
                  <CopyReportButton markdown={markdown} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <Section title="ICP" provenance={report.icp?.provenance}>
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
                <Section title="Valuable variable" provenance={report.variable?.provenance}>
                  {report.variable ? (
                    <>
                      <p className="font-medium">{report.variable.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Desired direction: {report.variable.direction}
                      </p>
                    </>
                  ) : (
                    <Unknown />
                  )}
                </Section>
                <Section title="Current state">{report.currentState}</Section>
                <Section title="Desired state">{report.desiredState}</Section>
                <Section title="Economic pain" className="sm:col-span-2">
                  {report.economicPain}
                </Section>
                <Section title="Trigger" className="sm:col-span-2">
                  {report.trigger}
                </Section>
                <Section title="Current alternatives" className="sm:col-span-2">
                  {report.alternatives.length ? (
                    <ul className="space-y-1">
                      {report.alternatives.map((a) => (
                        <li key={a.name} className="flex items-start justify-between gap-3">
                          <span>
                            <span className="font-medium">{a.name}</span>
                            <span className="text-muted-foreground"> — {a.failure}</span>
                          </span>
                          <Badge variant="outline" className="shrink-0">
                            weakness {a.weakness}/10
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Unknown />
                  )}
                </Section>
                <Section title="Mechanisms explored" className="sm:col-span-2">
                  {report.mechanisms.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {report.mechanisms.map((m) => (
                        <Badge key={m} variant="secondary">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      None explored yet. Problem ≠ product.
                    </span>
                  )}
                </Section>
                <Section title="Product hypothesis">{report.productHypothesis}</Section>
                <Section title="Value proposition">{report.valueProposition}</Section>
                <Section title="Metric that proves value" className="sm:col-span-2">
                  {report.metric}
                </Section>
                <Section title="Risks" className="sm:col-span-2">
                  {report.risks.length ? (
                    <ul className="list-disc space-y-0.5 pl-4">
                      {report.risks.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">None recorded.</span>
                  )}
                </Section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical assumptions</CardTitle>
                <CardDescription>
                  {insights.untestedAssumptions > 0
                    ? `${insights.untestedAssumptions} assumption${insights.untestedAssumptions === 1 ? "" : "s"} remain untested.`
                    : "Link evidence to support or contradict each assumption."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssumptionLedger graph={graph} opportunityId={o.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interview guide</CardTitle>
                <CardDescription>
                  Generated when an opportunity is worth customer discovery. Save what you hear as
                  evidence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewGuideSection opportunityId={o.id} guide={guide} verdict={o.verdict} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <NextActionCard
              action={insights.primaryAction}
              others={insights.nextActions.slice(1, 4)}
            />

            <Card>
              <CardHeader>
                <CardTitle>Why this verdict</CardTitle>
                <CardDescription>
                  Deterministic rule over the two scores. The analyst never decides this.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VerdictExplanation result={insights.verdictResult} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kill criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <KillCriteria warnings={insights.killWarnings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why this Opportunity Potential</CardTitle>
                <CardDescription>
                  Importance 20% · Pain 20% · Frequency 15% · Gap 15% · Willingness to pay 20% ·
                  Alternative weakness 10%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <OpportunityScoreBreakdown result={insights.scoreBreakdown} />
                <Tabs defaultValue="closed">
                  <TabsList>
                    <TabsTrigger value="closed">Inputs</TabsTrigger>
                    <TabsTrigger value="edit">Edit inputs</TabsTrigger>
                  </TabsList>
                  <TabsContent value="closed">
                    <p className="text-muted-foreground text-xs">
                      Inputs were{" "}
                      {o.provenance === "USER"
                        ? "set by you"
                        : "proposed by the analyst (hypothesis)"}
                      . Edit them to reflect what you actually know.
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
                <CardTitle>Why this Evidence Confidence</CardTitle>
                <CardDescription>
                  Direct customer 25 · Explicit pain 20 · Economic impact 20 · Workaround 10 ·
                  Purchase intent 15 · Diversity 5 · Recency 5. Contradictions subtract.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvidenceScoreBreakdown result={insights.evidenceBreakdown} />
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
            <CardDescription>
              Items linked to this opportunity or its pain count toward Evidence Confidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EvidencePanel
              graph={{
                ...graph,
                evidence: graph.evidence.filter(
                  (e) => e.opportunityId === o.id || (o.painId && e.painId === o.painId),
                ),
              }}
              compact={false}
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

function Unknown() {
  return <span className="text-muted-foreground">UNKNOWN</span>;
}
