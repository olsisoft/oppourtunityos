"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EvidenceAdmissibility, GeneralizationStatus } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { fitBand, type FitBand } from "@/services/value/evidence-fit";

/** The persisted fit of one evidence → claim link, as the UI reads it. */
export interface FitView {
  fitScore: number | null;
  admissibility: EvidenceAdmissibility | null;
  band: FitBand | null;
  summary: LocalizedText | null;
  explanation: LocalizedText[];
  duplicateOfOrigin: boolean;
}

export function readFit(link: {
  fitScore: number | null;
  admissibility: EvidenceAdmissibility | null;
  fitBreakdown: unknown;
}): FitView {
  const b = (link.fitBreakdown ?? null) as {
    summary?: LocalizedText;
    explanation?: LocalizedText[];
    duplicateOfOrigin?: boolean;
  } | null;
  return {
    fitScore: link.fitScore,
    admissibility: link.admissibility,
    band: link.fitScore === null ? null : fitBand(link.fitScore),
    summary: b?.summary ?? null,
    explanation: b?.explanation ?? [],
    duplicateOfOrigin: b?.duplicateOfOrigin ?? false,
  };
}

const FIT_TONE: Record<FitBand, "positive" | "info" | "warning" | "negative"> = {
  HIGH: "positive",
  MEDIUM: "info",
  LOW: "warning",
  NONE: "negative",
};

/** "fit 82 · HIGH" with the deterministic explanation on hover. */
export function FitBadge({
  fit,
  compact = false,
  className,
}: {
  fit:
    | FitView
    | {
        fitScore: number;
        band?: FitBand | null;
        summary?: LocalizedText | null;
        explanation?: LocalizedText[];
      };
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const score = fit.fitScore;
  if (score === null || score === undefined) {
    return (
      <Badge variant="muted" className={cn("font-mono text-[10px]", className)}>
        {t("value.fit.none")}
      </Badge>
    );
  }
  const band = fit.band ?? fitBand(score);
  const bandLabel = t(`value.fitBand.${band}`);
  const explanation = "explanation" in fit ? (fit.explanation ?? []) : [];
  const summary = "summary" in fit ? (fit.summary ?? null) : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={FIT_TONE[band]} className={cn("font-mono text-[10px]", className)}>
          {compact ? bandLabel : t("value.fit.badge", { score, band: bandLabel })}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        {summary && <p className="font-medium">{t(summary)}</p>}
        {explanation.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[11px]">
            {explanation.slice(0, 10).map((line, i) => (
              <li key={i}>{t(line)}</li>
            ))}
          </ul>
        )}
        {!summary && explanation.length === 0 && <p>{t("value.fit.fallback")}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function AdmissibilityBadge({
  level,
  className,
}: {
  level: EvidenceAdmissibility;
  className?: string;
}) {
  const t = useT();
  const tone =
    level === "HIGH"
      ? "positive"
      : level === "MEDIUM"
        ? "info"
        : level === "LOW"
          ? "warning"
          : "negative";
  return (
    <Badge variant={tone} className={cn("px-1 py-0 font-mono text-[9px]", className)}>
      {t(`labels.admissibility.${level}`).toUpperCase()}
    </Badge>
  );
}

export function GeneralizationBadge({
  status,
  className,
}: {
  status: GeneralizationStatus | null | undefined;
  className?: string;
}) {
  const t = useT();
  if (!status) return null;
  const tone =
    status === "SEGMENT_SUPPORTED"
      ? "positive"
      : status === "SAMPLE_SUPPORTED"
        ? "info"
        : status === "CASE_ONLY"
          ? "outline"
          : status === "UNTESTED"
            ? "muted"
            : "warning";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={tone} className={cn("font-mono text-[10px]", className)}>
          {t(`labels.generalization.${status}`).toUpperCase()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {t(`labels.generalizationDescription.${status}`)}
      </TooltipContent>
    </Tooltip>
  );
}
