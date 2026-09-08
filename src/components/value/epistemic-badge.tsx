"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EPISTEMIC_TONE } from "@/domain/enums";
import type { EpistemicStatus } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { CAUSAL_DISTANCE_LABELS } from "@/services/value/epistemic";
import type { FieldStatus } from "@/services/value/variable-semantics";

export function EpistemicBadge({
  status,
  confidence,
  className,
}: {
  status: EpistemicStatus;
  confidence?: number | null;
  className?: string;
}) {
  const t = useT();
  const label = t(`labels.epistemic.${status}`);
  const showConfidence =
    typeof confidence === "number" &&
    (status === "OBSERVED" ||
      status === "STRONGLY_SUPPORTED" ||
      status === "SUPPORTED" ||
      status === "MIXED" ||
      status === "CONTRADICTED" ||
      status === "UNPROVEN") &&
    confidence > 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={EPISTEMIC_TONE[status]}
          className={cn("font-mono text-[10px] tracking-wide", className)}
        >
          {showConfidence ? t("value.epistemic.withConfidence", { label, confidence }) : label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {t(`labels.epistemicDescription.${status}`)}
        {typeof confidence === "number"
          ? ` ${t("value.epistemic.confidenceHint", { confidence })}`
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
  const t = useT();
  const known = CAUSAL_DISTANCE_LABELS[distance] !== undefined;
  const d = known ? distance : 5;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("font-mono text-[10px]", className)}>
          {t("value.epistemic.distanceBadge", {
            code: t(`labels.causalDistance.${d}.code`),
            label: t(`labels.causalDistance.${d}.label`),
          })}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {t("value.epistemic.distanceHelp", {
          help: known ? t(`labels.causalDistance.${distance}.help`) : "",
        }).trim()}
      </TooltipContent>
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
  const t = useT();
  return (
    <Badge
      variant={FIELD_TONE[status]}
      className={cn("px-1.5 py-0 font-mono text-[10px]", className)}
    >
      {t(`labels.fieldStatus.${status}`)}
    </Badge>
  );
}
