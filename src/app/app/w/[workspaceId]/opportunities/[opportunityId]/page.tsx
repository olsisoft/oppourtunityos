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
import { ASSUMPTION_KIND_LABELS, CONFIDENCE_LABELS, VERDICT_DESCRIPTIONS } from "@/domain/enums";
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
import { VARIABLE_POLARITY_LABELS } from "@/domain/enums";

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
  const report = buildOpportunityReport(
    o,
    mechanisms,
    insights.primaryAction,
    insights.primaryValueAction,
  );
  const markdown = reportToMarkdown(report);
  const guide =
    (o.interviewGuide as unknown as (InterviewGuide & { source?: string }) | null) ?? null;
  const v = o.variable;
  const riskiest = insights.riskiestAssumption;

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
          {/* K. Scorecard — four independent questions */}
          <Scorecard opportunity={o} insights={insights} size="lg" className="sm:min-w-[32rem]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Opportunity report</CardTitle>
                    <CardDescription>
                      The artifact of this discovery. Hypotheses stay labelled; UNKNOWN is an honest
                      answer. Each field of the valuable variable carries its own status.
                    </CardDescription>
                  </div>
                  <CopyReportButton markdown={markdown} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                {/* A. ICP */}
                <Section title="A · ICP" provenance={report.icp?.provenance}>
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
                <Section title="B · Valuable variable" provenance={report.variable?.provenance}>
                  {report.variable && v ? (
                    <>
                      <p className="font-medium">{compactLabel(v.desiredDirection, v.name)}</p>
                      <p className="text-muted-foreground text-xs">
                        Action: {report.variable.direction} · Type:{" "}
                        {v.variableType?.trim() ? v.variableType : "UNKNOWN"}
                        {polarityOf(v.variableType, v.variablePolarity)
                          ? ` (${VARIABLE_POLARITY_LABELS[polarityOf(v.variableType, v.variablePolarity)!].toLowerCase()})`
                          : ""}
                      </p>
                      {v.parent && (
                        <p className="mt-1 text-xs">
                          <span className="text-muted-foreground">Parent economic variable: </span>
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
                      label="Type"
                      f={report.variableDetail.variableType}
                      status={fieldStatus(v, "variableType")}
                    />
                    <VariableField
                      label="Target"
                      f={report.variableDetail.target}
                      status={fieldStatus(v, "target")}
                    />
                    <VariableField
                      label="Scope"
                      f={report.variableDetail.scope}
                      status={fieldStatus(v, "scope")}
                    />
                    <VariableField
                      label="Current state"
                      f={report.variableDetail.currentState}
                      status={fieldStatus(v, "currentState")}
                    />
                    <VariableField
                      label="Desired state"
                      f={report.variableDetail.desiredState}
                      status={fieldStatus(v, "desiredState")}
                    />
                    <VariableField
                      label="Unit"
                      f={report.variableDetail.unit}
                      status={fieldStatus(v, "unit")}
                    />
                    <VariableField
                      label="Importance"
                      f={report.variableDetail.importance}
                      status={fieldStatus(v, "importanceScore")}
                    />
                    <VariableField
                      label="Parent economic variable"
                      f={report.variableDetail.parentVariable}
                      status={fieldStatus(v, "parentVariableId")}
                    />
                    <VariableField
                      label="Who values it"
                      f={report.variableDetail.whoValuesIt}
                      status={fieldStatus(v, "whoValuesIt")}
                    />
                    <VariableField
                      label="Why it matters"
                      f={report.variableDetail.whyItMatters}
                      status={fieldStatus(v, "whyItMatters")}
                      className="sm:col-span-2"
                    />
                  </div>
                )}
                {/* C. Pain */}
                <Section title="C · Pain / economic consequence" className="sm:col-span-2">
                  {report.economicPain}
                </Section>
                {/* D. Trigger */}
                <Section title="D · Trigger" className="sm:col-span-2">
                  {report.trigger}
                </Section>
                {/* E. Alternatives */}
                <Section title="E · Current alternatives" className="sm:col-span-2">
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
                {/* F. Mechanisms */}
                <Section title="F · Mechanisms explored" className="sm:col-span-2">
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
                      None explored yet. Problem ≠ product.
                    </span>
                  )}
                </Section>
                {/* G. Product hypothesis · H. Value proposition */}
                <Section title="G · Product hypothesis">{report.productHypothesis}</Section>
                <Section title="H · Value proposition">{report.valueProposition}</Section>
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

            {/* I. Value causality ladder · J. Proof frontier */}
            <Card>
              <CardHeader>
                <CardTitle>I · Value causality ladder</CardTitle>
                <CardDescription>
                  Mechanism → Capability → Transformation → Operational value → Economic value →
                  Strategic outcome. Each level shows its epistemic status; each arrow is a testable
                  causal assumption. Click to link evidence, add an assumption or plan an
                  experiment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReportLadder opportunity={o} graph={graph} frontier={insights.frontier} />
                <div className="bg-muted/40 rounded-md border border-dashed p-3 text-sm">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    J · Proof frontier
                  </p>
                  <p className="mt-1">{report.frontier.text}</p>
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">Scope: </span>
                    {report.frontier.scope}
                    {report.frontier.generalization ? ` · ${report.frontier.generalization}` : ""}
                    <span className="text-muted-foreground">
                      {" "}
                      — what was reached, and where it was observed.
                    </span>
                  </p>
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">Why the frontier stops here: </span>
                    {report.frontier.whyStops}
                  </p>
                  {insights.frontier?.blockedAt &&
                    (insights.frontier.blockedAt.blockers?.length ?? 0) > 1 && (
                      <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
                        {insights.frontier.blockedAt.blockers.slice(1).map((b) => (
                          <li key={b.message}>{b.message}</li>
                        ))}
                      </ul>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* L. Riskiest assumption + ledger */}
            <Card>
              <CardHeader>
                <CardTitle>L · Riskiest assumption</CardTitle>
                <CardDescription>
                  {insights.untestedAssumptions > 0
                    ? `${insights.untestedAssumptions} assumption${insights.untestedAssumptions === 1 ? "" : "s"} remain untested. Causal and value assumptions rank first.`
                    : "Link evidence to support or contradict each assumption."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskiest ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{ASSUMPTION_KIND_LABELS[riskiest.kind]}</Badge>
                      <span className="text-muted-foreground font-mono text-xs">
                        importance {riskiest.importance}/10
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{riskiest.statement}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      If this assumption is false, the opportunity collapses. It has not been
                      tested.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No untested assumption recorded. Either everything is verified or nothing was
                    written down.
                  </p>
                )}
                <AssumptionLedger graph={graph} opportunityId={o.id} />
              </CardContent>
            </Card>

            {report.commercial.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Commercial ladder</CardTitle>
                  <CardDescription>
                    Existing spend → purchase intent → stated willingness to pay → price acceptance
                    → actual purchase. Each rung is its own claim with its own evidence; support for
                    one rung never moves the rungs above it.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-wrap items-center gap-2 text-sm">
                    {report.commercial.map((c, i) => (
                      <li key={c.label} className="flex items-center gap-2">
                        <span className="rounded-md border px-2 py-1">
                          <span className="font-medium">{c.label}</span>{" "}
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {c.status}
                            {c.evidenceCount
                              ? ` · ${c.evidenceCount} admissible · fit ${c.bestFit}`
                              : ""}
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
                <CardTitle>Experiments</CardTitle>
                <CardDescription>
                  Assumption → experiment → result → evidence → knowledge update → frontier movement
                  → verdict. Record a result and see exactly what it changed. Each result carries
                  its design level, internal validity and a language-gated interpretation.
                </CardDescription>
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
                <CardTitle>Learning history</CardTitle>
                <CardDescription>
                  How we came to believe what we believe: every change of a claim, a score, the
                  Proof Frontier or the verdict, with what caused it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LearningHistory changes={o.knowledgeChanges} />
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
                  <CardTitle>Then</CardTitle>
                  <CardDescription>Lower-priority uncertainties, in order.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    {insights.valueActions.slice(1, 4).map((a) => (
                      <li key={`${a.type}-${a.priority}-${a.what}`} className="flex gap-2">
                        <span className="text-muted-foreground font-mono text-xs">
                          {a.priority} · {a.priorityScore}
                        </span>
                        <span>{a.what}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Why this verdict</CardTitle>
                <CardDescription>
                  Deterministic rules over the four scores and the frontier. The analyst never
                  decides this.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VerdictExplanation result={insights.verdictResult} />
              </CardContent>
            </Card>

            {/* N. Kill criteria */}
            <Card>
              <CardHeader>
                <CardTitle>N · Kill criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <KillCriteria warnings={insights.killWarnings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why this Value Strength</CardTitle>
                <CardDescription>
                  Geometric mean of importance, magnitude, frequency, population and
                  attributability. A missing dimension makes the score INCOMPLETE, never zero.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ValueStrengthEditor opportunity={o} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why this Causal Confidence</CardTitle>
                <CardDescription>
                  The weakest critical causal link decides. A link with no evidence makes the score
                  INCOMPLETE
                  {insights.causal
                    ? ` · ${insights.causal.completeness} chain links validated`
                    : ""}
                  {insights.causal?.blocking
                    ? ` · blocked by ${insights.causal.blocking.label}`
                    : ""}
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs">
                  {(
                    insights.causal?.explanation ?? [
                      "Not computed yet — state the value chain first.",
                    ]
                  ).map((l, i) => (
                    <li key={i} className="text-muted-foreground">
                      {l}
                    </li>
                  ))}
                </ul>
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
              Items linked to this opportunity, its pain or one of its claims. Each item says which
              claims it supports or contradicts; the engine decides what that proves.
            </CardDescription>
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
