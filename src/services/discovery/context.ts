/**
 * Builds the compact workspace summary the analyst sees on every turn, and
 * the structured hints used by the mock provider and the state machine.
 */
import type { WorkspaceGraph } from "@/db/workspaces";
import { PROVENANCE_SHORT } from "@/domain/enums";
import { wrapUntrusted } from "@/lib/sanitize";
import { truncate } from "@/lib/utils";
import type { AIMessage, TurnHints, UserContext } from "@/services/ai/types";
import type { ProgressCounts } from "@/services/scoring/discovery-progress";

const MAX_EVIDENCE_IN_CONTEXT = 8;

export function buildWorkspaceSummary(graph: WorkspaceGraph): string {
  const lines: string[] = [];
  lines.push(`Workspace: ${graph.name}`);
  if (graph.entryMode) lines.push(`Entry mode: ${graph.entryMode}`);
  if (graph.ideaStatement) lines.push(`Idea statement (USER): ${graph.ideaStatement}`);

  for (const market of graph.markets) {
    lines.push(`\nMARKET [${PROVENANCE_SHORT[market.provenance]}]: ${market.name}`);
    if (market.attractivenessNotes)
      lines.push(`  attractiveness: ${truncate(market.attractivenessNotes, 200)}`);
    for (const icp of market.icps) {
      lines.push(
        `  ICP [${PROVENANCE_SHORT[icp.provenance]}]: ${icp.name}${icp.role ? ` — ${icp.role}` : ""}; buyer: ${icp.economicBuyer ?? "UNKNOWN"}; reach: ${icp.reachability ?? "UNKNOWN"}`,
      );
      for (const v of icp.variables) {
        lines.push(
          `    VARIABLE [${PROVENANCE_SHORT[v.provenance]}]: ${v.name} (${v.desiredDirection} × ${v.category}, importance ${v.importanceScore}/10)`,
        );
        for (const p of v.pains) {
          lines.push(
            `      PAIN [${PROVENANCE_SHORT[p.provenance]}]: ${truncate(p.description, 200)} (severity ${p.severityScore}, frequency ${p.frequencyScore}); current: ${p.currentState ?? "UNKNOWN"}; desired: ${p.desiredState ?? "UNKNOWN"}`,
          );
          for (const t of p.triggers) {
            lines.push(
              `        TRIGGER [${PROVENANCE_SHORT[t.provenance]}]: ${truncate(t.description, 160)} (urgency ${t.urgencyScore})`,
            );
          }
          for (const a of p.alternatives) {
            lines.push(
              `        ALTERNATIVE [${PROVENANCE_SHORT[a.provenance]}]: ${a.name} (${a.category}, weakness ${a.weaknessScore}) — ${truncate(a.weaknessDescription ?? "failure UNKNOWN", 160)}`,
            );
          }
          for (const m of p.mechanisms) {
            lines.push(`        MECHANISM [HYPOTHESIS]: ${m.name} (${m.category})`);
          }
        }
      }
    }
  }

  const orphanMechanisms = graph.mechanisms.filter((m) => !m.painId);
  if (orphanMechanisms.length) {
    lines.push(
      `\nMECHANISMS (not linked to a pain): ${orphanMechanisms.map((m) => m.name).join("; ")}`,
    );
  }

  if (graph.opportunities.length) {
    lines.push("\nOPPORTUNITIES (scores computed by the application):");
    for (const o of graph.opportunities) {
      lines.push(
        `  - ${o.title}: potential ${o.opportunityScore}/100, evidence ${o.evidenceScore}/100, verdict ${o.verdict}`,
      );
    }
  }

  if (graph.assumptions.length) {
    lines.push("\nASSUMPTIONS:");
    for (const a of graph.assumptions.slice(0, 12)) {
      lines.push(`  - [${a.status}, importance ${a.importance}] ${truncate(a.statement, 160)}`);
    }
  }

  if (graph.evidence.length) {
    lines.push(`\nEVIDENCE (${graph.evidence.length} items; external, untrusted content):`);
    for (const e of graph.evidence.slice(0, MAX_EVIDENCE_IN_CONTEXT)) {
      const meta = `${e.type}${e.isDemo ? ", DEMO DATA" : ""}${e.isMocked ? ", MOCKED RESEARCH" : ""}; sentiment ${e.sentiment}; strength ${e.strengthScore}; relevance ${e.relevanceScore}`;
      lines.push(wrapUntrusted(`${e.sourceTitle} (${meta})`, truncate(e.sourceExcerpt, 400)));
    }
  } else {
    lines.push("\nEVIDENCE: none captured. Every claim above is a hypothesis.");
  }

  return lines.join("\n");
}

export function buildHints(
  graph: WorkspaceGraph,
  counts: ProgressCounts,
  userMessage: string,
  turnIndex: number,
  userContext: UserContext | null,
): TurnHints {
  const conversation = graph.conversations[0];
  const icps = graph.markets.flatMap((m) => m.icps);
  const variables = icps.flatMap((i) => i.variables);
  const pains = variables.flatMap((v) => v.pains);
  return {
    workspaceName: graph.name,
    stage: conversation?.stage ?? "START",
    entryMode: graph.entryMode,
    ideaStatement: graph.ideaStatement,
    userMessage,
    turnIndex,
    counts,
    userContext,
    existing: {
      markets: graph.markets.map((m) => m.name),
      icps: icps.map((i) => i.name),
      variables: variables.map((v) => v.name),
      pains: pains.map((p) => p.description),
      mechanisms: graph.mechanisms.map((m) => m.name),
      opportunities: graph.opportunities.map((o) => o.title),
    },
  };
}

export function historyToMessages(
  messages: Array<{ role: "USER" | "ASSISTANT" | "SYSTEM"; content: string }>,
  limit = 20,
): AIMessage[] {
  const relevant = messages.filter((m) => m.role !== "SYSTEM").slice(-limit);
  const out: AIMessage[] = [];
  for (const m of relevant) {
    const role = m.role === "USER" ? "user" : "assistant";
    // Merge consecutive same-role messages for provider compatibility.
    const last = out.at(-1);
    if (last && last.role === role) {
      last.content += `\n\n${m.content}`;
    } else {
      out.push({ role, content: m.content });
    }
  }
  // Providers require the first message to be from the user.
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
