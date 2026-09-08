"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Provenance } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";

const TONE: Record<Provenance, "muted" | "warning" | "positive" | "info" | "secondary"> = {
  USER: "secondary",
  AI_HYPOTHESIS: "warning",
  EXTERNAL_EVIDENCE: "positive",
  INTERVIEW: "positive",
  COMPUTED: "info",
};

export function ProvenanceBadge({
  provenance,
  short = true,
  className,
}: {
  provenance: Provenance;
  short?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={TONE[provenance]} className={className}>
          {short
            ? t(`shared.provenanceBadge.short.${provenance}`)
            : t(`labels.provenance.${provenance}`)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t(`shared.provenanceBadge.help.${provenance}`)}</TooltipContent>
    </Tooltip>
  );
}
