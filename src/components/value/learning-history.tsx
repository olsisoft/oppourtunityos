import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import type { GraphKnowledgeChange } from "@/db/workspaces";
import { KNOWLEDGE_TRIGGER_LABELS } from "@/domain/enums";
import { formatDate } from "@/lib/utils";
import type { ClaimDelta } from "@/services/value/knowledge-change";
import {
  frontierMovement,
  PROOF_RUNG_LABELS,
  type FrontierPosition,
} from "@/services/value/proof-frontier";

function deltas(json: unknown): ClaimDelta[] {
  return Array.isArray(json) ? (json as ClaimDelta[]) : [];
}

/**
 * LEARNING HISTORY — how we came to believe what we believe: every recompute
 * that moved a claim, a score, the frontier or the verdict, newest first.
 */
export function LearningHistory({
  changes,
  limit,
}: {
  changes: GraphKnowledgeChange[];
  limit?: number;
}) {
  const rows = limit ? changes.slice(0, limit) : changes;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No learning recorded yet"
        description="Every time evidence or an experiment result changes a claim, a score, the Proof Frontier or the verdict, the change is recorded here with what caused it."
      />
    );
  }
  return (
    <ol className="space-y-2">
      {rows.map((c) => {
        const movement = frontierMovement(
          (c.previousFrontier ?? "NONE") as FrontierPosition,
          (c.newFrontier ?? "NONE") as FrontierPosition,
        );
        const cause = c.experiment
          ? c.experiment.title
          : c.evidence
            ? c.evidence.sourceTitle
            : KNOWLEDGE_TRIGGER_LABELS[c.trigger];
        const strengthened = deltas(c.claimsStrengthened);
        const contradicted = deltas(c.claimsContradicted);
        const weakened = deltas(c.claimsWeakened);
        return (
          <li key={c.id} className="bg-card rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px]">
                  {formatDate(c.createdAt)} · {KNOWLEDGE_TRIGGER_LABELS[c.trigger]}
                </p>
                <p className="font-medium">{cause}</p>
              </div>
              {movement !== "NONE" ? (
                <Badge
                  variant={movement === "FORWARD" ? "positive" : "negative"}
                  className="shrink-0"
                >
                  {movement === "FORWARD" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}{" "}
                  frontier {PROOF_RUNG_LABELS[(c.previousFrontier ?? "NONE") as FrontierPosition]} →{" "}
                  {PROOF_RUNG_LABELS[(c.newFrontier ?? "NONE") as FrontierPosition]}
                </Badge>
              ) : (
                <Badge variant="muted" className="shrink-0">
                  <Minus className="size-3" /> frontier unchanged
                </Badge>
              )}
            </div>
            <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
              {[...contradicted, ...strengthened, ...weakened].slice(0, 5).map((d) => (
                <li key={d.key}>{d.text}</li>
              ))}
              {c.previousEvidenceConfidence !== c.newEvidenceConfidence && (
                <li>
                  Evidence Confidence {c.previousEvidenceConfidence} → {c.newEvidenceConfidence}
                </li>
              )}
              {(c.previousCausalConfidence ?? null) !== (c.newCausalConfidence ?? null) && (
                <li>
                  Causal Confidence {c.previousCausalConfidence ?? "INCOMPLETE"} →{" "}
                  {c.newCausalConfidence ?? "INCOMPLETE"}
                </li>
              )}
              {(c.previousValueStrength ?? null) !== (c.newValueStrength ?? null) && (
                <li>
                  Value Strength {c.previousValueStrength ?? "INCOMPLETE"} →{" "}
                  {c.newValueStrength ?? "INCOMPLETE"}
                </li>
              )}
              {c.previousVerdict !== c.newVerdict && (
                <li className="text-foreground">
                  Verdict {c.previousVerdict} → {c.newVerdict}
                </li>
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
