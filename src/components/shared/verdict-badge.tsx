"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VERDICT_TONE } from "@/domain/enums";
import type { Verdict } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const t = useT();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={VERDICT_TONE[verdict]} className={className}>
          {t(`labels.verdict.${verdict}`).toUpperCase()}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t(`labels.verdictDescription.${verdict}`)}</TooltipContent>
    </Tooltip>
  );
}
