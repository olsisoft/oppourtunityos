import { Progress } from "@/components/ui/progress";
import type { EvidenceScoreResult } from "@/services/scoring/evidence-score";
import type { OpportunityScoreResult } from "@/services/scoring/opportunity-score";
import type { VerdictResult } from "@/services/scoring/verdict";

export function OpportunityScoreBreakdown({ result }: { result: OpportunityScoreResult | null }) {
  if (!result) return <p className="text-muted-foreground text-sm">Not computed yet.</p>;
  return (
    <div className="space-y-2">
      {result.components.map((c) => (
        <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span>{c.label}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {c.value}/10 × {Math.round(c.weight * 100)}%
              </span>
            </div>
            <Progress value={(c.points / c.maxPoints) * 100} className="mt-1" />
          </div>
          <span className="w-14 text-right font-mono tabular-nums">{c.points} pts</span>
        </div>
      ))}
      <p className="text-muted-foreground pt-1 text-xs">
        Weakest inputs:{" "}
        {result.weakestInputs
          .map((k) => result.components.find((c) => c.key === k)?.label)
          .join(", ")}
        .
      </p>
    </div>
  );
}

export function EvidenceScoreBreakdown({ result }: { result: EvidenceScoreResult | null }) {
  if (!result) return <p className="text-muted-foreground text-sm">Not computed yet.</p>;
  return (
    <div className="space-y-2">
      {result.counts.total === 0 && (
        <p className="text-tone-warning text-xs">
          No evidence captured. Everything about this opportunity is still a hypothesis.
        </p>
      )}
      {result.components.map((c) => (
        <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span>{c.label}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {Math.round(c.fill * 100)}% of {c.weight} · {c.itemCount} item
                {c.itemCount === 1 ? "" : "s"}
              </span>
            </div>
            <Progress value={c.fill * 100} className="mt-1" />
          </div>
          <span className="w-14 text-right font-mono tabular-nums">{c.points} pts</span>
        </div>
      ))}
      {result.penalty.contradictingCount > 0 && (
        <p className="text-tone-negative text-xs">
          Contradictory evidence ({result.penalty.contradictingCount} item
          {result.penalty.contradictingCount === 1 ? "" : "s"}) −{result.penalty.points} pts
        </p>
      )}
      {result.gaps.length > 0 && (
        <div className="pt-1">
          <p className="text-xs font-medium">Evidence gaps</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {result.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function VerdictExplanation({ result }: { result: VerdictResult | null }) {
  if (!result) return <p className="text-muted-foreground text-sm">Not computed yet.</p>;
  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium">{result.condition}</p>
      <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
        {result.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {result.isFallback && (
        <p className="text-muted-foreground text-xs">
          This score pair falls between the primary rules; the documented fallback grid applied.
        </p>
      )}
    </div>
  );
}
