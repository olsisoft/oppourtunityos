/**
 * Opportunity Report — the artifact produced at the end of discovery.
 * Pure transformation of the persisted state into a report object plus a
 * Markdown rendering. Provenance is preserved so hypotheses are never shown
 * as facts.
 */
import type { OpportunityWithRelations } from "@/db/workspaces";
import { DIRECTION_LABELS, PROVENANCE_LABELS, VERDICT_LABELS } from "@/domain/enums";
import type { KillWarning } from "@/services/scoring/kill-criteria";
import type { NextAction } from "@/services/scoring/next-action";
import type { VerdictResult } from "@/services/scoring/verdict";

export interface ReportEvidenceItem {
  title: string;
  type: string;
  sentiment: string;
  strength: number;
  relevance: number;
  isDemo: boolean;
  isMocked: boolean;
}

export interface OpportunityReport {
  title: string;
  generatedAt: string;
  icp: { name: string; description: string; provenance: string } | null;
  variable: { name: string; direction: string; category: string; provenance: string } | null;
  currentState: string;
  desiredState: string;
  economicPain: string;
  trigger: string;
  alternatives: Array<{ name: string; failure: string; weakness: number }>;
  mechanisms: string[];
  productHypothesis: string;
  valueProposition: string;
  metric: string;
  opportunityScore: number;
  evidenceScore: number;
  verdict: string;
  verdictLabel: string;
  verdictReasons: string[];
  confidence: string;
  killWarnings: KillWarning[];
  assumptions: Array<{ statement: string; status: string; importance: number }>;
  evidence: ReportEvidenceItem[];
  risks: string[];
  nextAction: NextAction | null;
}

export function buildOpportunityReport(
  o: OpportunityWithRelations,
  mechanisms: string[],
  nextAction: NextAction | null,
): OpportunityReport {
  const verdictResult = (o.verdictReasons as unknown as VerdictResult | null) ?? null;
  const killWarnings = (o.killWarnings as unknown as KillWarning[] | null) ?? [];
  return {
    title: o.title,
    generatedAt: new Date().toISOString(),
    icp: o.icp
      ? {
          name: o.icp.name,
          description: [o.icp.role, o.icp.companyType, o.icp.companySize]
            .filter(Boolean)
            .join(" · "),
          provenance: PROVENANCE_LABELS[o.icp.provenance],
        }
      : null,
    variable: o.variable
      ? {
          name: o.variable.name,
          direction: DIRECTION_LABELS[o.variable.desiredDirection],
          category: o.variable.category,
          provenance: PROVENANCE_LABELS[o.variable.provenance],
        }
      : null,
    currentState: o.pain?.currentState ?? "UNKNOWN",
    desiredState: o.pain?.desiredState ?? "UNKNOWN",
    economicPain: o.problemStatement ?? o.pain?.description ?? "UNKNOWN",
    trigger: o.pain?.triggers[0]?.description ?? "UNKNOWN — no trigger identified",
    alternatives: (o.pain?.alternatives ?? []).map((a) => ({
      name: a.name,
      failure: a.weaknessDescription ?? "Failure UNKNOWN",
      weakness: a.weaknessScore,
    })),
    mechanisms,
    productHypothesis: o.productHypothesis ?? "Not yet formed",
    valueProposition: o.valueProposition ?? "Not yet formed",
    metric: o.metric ?? "UNKNOWN — no measurable outcome defined",
    opportunityScore: o.opportunityScore,
    evidenceScore: o.evidenceScore,
    verdict: o.verdict,
    verdictLabel: VERDICT_LABELS[o.verdict],
    verdictReasons: verdictResult?.reasons ?? [],
    confidence: o.confidence,
    killWarnings,
    assumptions: o.assumptions.map((a) => ({
      statement: a.statement,
      status: a.status,
      importance: a.importance,
    })),
    evidence: o.evidence.map((e) => ({
      title: e.sourceTitle,
      type: e.type,
      sentiment: e.sentiment,
      strength: e.strengthScore,
      relevance: e.relevanceScore,
      isDemo: e.isDemo,
      isMocked: e.isMocked,
    })),
    risks: o.risks,
    nextAction,
  };
}

export function reportToMarkdown(r: OpportunityReport): string {
  const lines: string[] = [];
  lines.push(`# Opportunity Report — ${r.title}`);
  lines.push("");
  lines.push(
    `Generated ${r.generatedAt.slice(0, 10)} by OpportunityOS. Hypotheses are labelled; nothing below is validated unless backed by evidence.`,
  );
  lines.push("");
  lines.push(
    `## ICP\n${r.icp ? `${r.icp.name} — ${r.icp.description || "details UNKNOWN"} _(${r.icp.provenance})_` : "UNKNOWN"}`,
  );
  lines.push(
    `## Valuable variable\n${r.variable ? `${r.variable.name} — desired direction: ${r.variable.direction} _(${r.variable.provenance})_` : "UNKNOWN"}`,
  );
  lines.push(`## Current state\n${r.currentState}`);
  lines.push(`## Desired state\n${r.desiredState}`);
  lines.push(`## Economic pain\n${r.economicPain}`);
  lines.push(`## Trigger\n${r.trigger}`);
  lines.push(
    `## Current alternatives\n${r.alternatives.length ? r.alternatives.map((a) => `- ${a.name} (weakness ${a.weakness}/10): ${a.failure}`).join("\n") : "UNKNOWN"}`,
  );
  lines.push(
    `## Mechanisms explored\n${r.mechanisms.length ? r.mechanisms.map((m) => `- ${m}`).join("\n") : "None explored yet"}`,
  );
  lines.push(`## Product hypothesis\n${r.productHypothesis}`);
  lines.push(`## Value proposition\n${r.valueProposition}`);
  lines.push(`## Metric\n${r.metric}`);
  lines.push(
    `## Scores\n- Opportunity Potential: **${r.opportunityScore}/100**\n- Evidence Confidence: **${r.evidenceScore}/100** (${r.confidence.toLowerCase()} confidence)\n- Verdict: **${r.verdictLabel.toUpperCase()}**`,
  );
  if (r.verdictReasons.length) lines.push(r.verdictReasons.map((x) => `  - ${x}`).join("\n"));
  lines.push(
    `## Kill criteria\n${r.killWarnings.length ? r.killWarnings.map((w) => `- [${w.severity}] ${w.message}`).join("\n") : "No warnings triggered."}`,
  );
  lines.push(
    `## Critical assumptions\n${r.assumptions.length ? r.assumptions.map((a, i) => `${i + 1}. [${a.status}] ${a.statement} (importance ${a.importance}/10)`).join("\n") : "No assumptions recorded."}`,
  );
  lines.push(
    `## Evidence (${r.evidence.length})\n${r.evidence.length ? r.evidence.map((e) => `- ${e.title} — ${e.type}, ${e.sentiment}, strength ${e.strength}, relevance ${e.relevance}${e.isDemo ? " [DEMO DATA]" : ""}${e.isMocked ? " [MOCKED]" : ""}`).join("\n") : "No evidence captured. Everything above is a hypothesis."}`,
  );
  lines.push(
    `## Risks\n${r.risks.length ? r.risks.map((x) => `- ${x}`).join("\n") : "None recorded."}`,
  );
  lines.push(
    `## Next action\n${r.nextAction ? `**${r.nextAction.title}**\n${r.nextAction.rationale}` : "UNKNOWN"}`,
  );
  return lines.join("\n\n");
}
