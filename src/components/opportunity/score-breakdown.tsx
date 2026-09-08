"use client";

import { Progress } from "@/components/ui/progress";
import { useT } from "@/i18n/client";
import type { EvidenceScoreResult } from "@/services/scoring/evidence-score";
import type { OpportunityScoreResult } from "@/services/scoring/opportunity-score";
import type { VerdictResult } from "@/services/scoring/verdict";

export function OpportunityScoreBreakdown({ result }: { result: OpportunityScoreResult | null }) {
  const t = useT();
  if (!result) {
    return <p className="text-muted-foreground text-sm">{t("opportunity.score.notComputedYet")}</p>;
  }
  const label = (c: OpportunityScoreResult["components"][number]) => {
    const key = `labels.opportunityInput.${c.key}`;
    return t.has(key) ? t(key) : t(c.label);
  };
  return (
    <div className="space-y-2">
      {result.components.map((c) => (
        <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span>{label(c)}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {t("opportunity.breakdown.weight", {
                  value: c.value,
                  weight: Math.round(c.weight * 100),
                })}
              </span>
            </div>
            <Progress value={(c.points / c.maxPoints) * 100} className="mt-1" />
          </div>
          <span className="w-14 text-right font-mono tabular-nums">
            {t("opportunity.breakdown.points", { points: c.points })}
          </span>
        </div>
      ))}
      <p className="text-muted-foreground pt-1 text-xs">
        {t("opportunity.breakdown.weakest", {
          inputs: result.weakestInputs
            .map((k) => {
              const c = result.components.find((x) => x.key === k);
              return c ? label(c) : null;
            })
            .filter(Boolean)
            .join(", "),
        })}
      </p>
    </div>
  );
}

export function EvidenceScoreBreakdown({ result }: { result: EvidenceScoreResult | null }) {
  const t = useT();
  if (!result) {
    return <p className="text-muted-foreground text-sm">{t("opportunity.score.notComputedYet")}</p>;
  }
  const label = (c: EvidenceScoreResult["components"][number]) => {
    const key = `labels.evidenceComponent.${c.key}`;
    return t.has(key) ? t(key) : t(c.label);
  };
  return (
    <div className="space-y-2">
      {result.counts.total === 0 && (
        <p className="text-tone-warning text-xs">{t("opportunity.breakdown.noEvidence")}</p>
      )}
      {result.components.map((c) => (
        <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span>{label(c)}</span>
              <span className="text-muted-foreground font-mono tabular-nums">
                {t("opportunity.breakdown.fill", {
                  fill: Math.round(c.fill * 100),
                  weight: c.weight,
                  count: c.itemCount,
                })}
              </span>
            </div>
            <Progress value={c.fill * 100} className="mt-1" />
          </div>
          <span className="w-14 text-right font-mono tabular-nums">
            {t("opportunity.breakdown.points", { points: c.points })}
          </span>
        </div>
      ))}
      {result.penalty.contradictingCount > 0 && (
        <p className="text-tone-negative text-xs">
          {t("opportunity.breakdown.contradictory", {
            count: result.penalty.contradictingCount,
            points: result.penalty.points,
          })}
        </p>
      )}
      {result.gaps.length > 0 && (
        <div className="pt-1">
          <p className="text-xs font-medium">{t("opportunity.breakdown.gaps")}</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {result.gaps.map((g, i) => (
              <li key={i}>{t(g)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function VerdictExplanation({ result }: { result: VerdictResult | null }) {
  const t = useT();
  if (!result) {
    return <p className="text-muted-foreground text-sm">{t("opportunity.score.notComputedYet")}</p>;
  }
  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium">{t(result.condition)}</p>
      <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
        {result.reasons.map((r, i) => (
          <li key={i}>{t(r)}</li>
        ))}
      </ul>
      {result.isFallback && (
        <p className="text-muted-foreground text-xs">{t("opportunity.breakdown.fallback")}</p>
      )}
    </div>
  );
}
