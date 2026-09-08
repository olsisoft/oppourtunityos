"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EvidenceAdmissibility, GeneralizationStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { ADMISSIBILITY_LABELS } from "@/services/value/admissibility";
import { fitBand, type FitBand } from "@/services/value/evidence-fit";
import { GENERALIZATION_DESCRIPTIONS, GENERALIZATION_LABELS } from "@/services/value/language-gate";

/** The persisted fit of one evidence → claim link, as the UI reads it. */
export interface FitView {
  fitScore: number | null;
  admissibility: EvidenceAdmissibility | null;
  band: FitBand | null;
  summary: string | null;
  explanation: string[];
  duplicateOfOrigin: boolean;
}

export function readFit(link: {
  fitScore: number | null;
  admissibility: EvidenceAdmissibility | null;
  fitBreakdown: unknown;
}): FitView {
  const b = (link.fitBreakdown ?? null) as {
    summary?: string;
    explanation?: string[];
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

export const FIT_BAND_LABELS: Record<FitBand, string> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NONE: "NOT ADMISSIBLE",
};

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
    | { fitScore: number; band?: FitBand | null; summary?: string | null; explanation?: string[] };
  compact?: boolean;
  className?: string;
}) {
  const score = fit.fitScore;
  if (score === null || score === undefined) {
    return (
      <Badge variant="muted" className={cn("font-mono text-[10px]", className)}>
        fit —
      </Badge>
    );
  }
  const band = fit.band ?? fitBand(score);
  const explanation = "explanation" in fit ? (fit.explanation ?? []) : [];
  const summary = "summary" in fit ? (fit.summary ?? null) : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={FIT_TONE[band]} className={cn("font-mono text-[10px]", className)}>
          {compact ? FIT_BAND_LABELS[band] : `fit ${score} · ${FIT_BAND_LABELS[band]}`}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        {summary && <p className="font-medium">{summary}</p>}
        {explanation.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[11px]">
            {explanation.slice(0, 10).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {!summary && explanation.length === 0 && (
          <p>Evidence fitness for this claim, computed deterministically at the last recompute.</p>
        )}
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
      {ADMISSIBILITY_LABELS[level].toUpperCase()}
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
          {GENERALIZATION_LABELS[status].toUpperCase()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{GENERALIZATION_DESCRIPTIONS[status]}</TooltipContent>
    </Tooltip>
  );
}
