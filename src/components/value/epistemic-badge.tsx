import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EPISTEMIC_DESCRIPTIONS, EPISTEMIC_LABELS, EPISTEMIC_TONE } from "@/domain/enums";
import type { EpistemicStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { CAUSAL_DISTANCE_LABELS, causalDistanceHelp } from "@/services/value/epistemic";
import { FIELD_STATUS_LABELS, type FieldStatus } from "@/services/value/variable-semantics";

export function EpistemicBadge({
  status,
  confidence,
  className,
}: {
  status: EpistemicStatus;
  confidence?: number | null;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={EPISTEMIC_TONE[status]}
          className={cn("font-mono text-[10px] tracking-wide", className)}
        >
          {EPISTEMIC_LABELS[status]}
          {typeof confidence === "number" &&
          (status === "OBSERVED" ||
            status === "STRONGLY_SUPPORTED" ||
            status === "SUPPORTED" ||
            status === "MIXED" ||
            status === "CONTRADICTED" ||
            status === "UNPROVEN") &&
          confidence > 0
            ? ` ${confidence}`
            : ""}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {EPISTEMIC_DESCRIPTIONS[status]}
        {typeof confidence === "number"
          ? ` Confidence from linked evidence: ${confidence}/100.`
          : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function CausalDistanceBadge({
  distance,
  className,
}: {
  distance: number;
  className?: string;
}) {
  const meta = CAUSAL_DISTANCE_LABELS[distance] ?? CAUSAL_DISTANCE_LABELS[5];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("font-mono text-[10px]", className)}>
          {meta.code} · {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{causalDistanceHelp(distance)}</TooltipContent>
    </Tooltip>
  );
}

const FIELD_TONE: Record<FieldStatus, "secondary" | "positive" | "warning" | "info" | "muted"> = {
  USER: "secondary",
  INTERVIEW: "positive",
  EXTERNAL_EVIDENCE: "positive",
  AI_HYPOTHESIS: "warning",
  COMPUTED: "info",
  UNKNOWN: "muted",
};

export function FieldStatusBadge({
  status,
  className,
}: {
  status: FieldStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={FIELD_TONE[status]}
      className={cn("px-1.5 py-0 font-mono text-[10px]", className)}
    >
      {FIELD_STATUS_LABELS[status]}
    </Badge>
  );
}
