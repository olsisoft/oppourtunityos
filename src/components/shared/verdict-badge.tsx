import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VERDICT_DESCRIPTIONS, VERDICT_TONE } from "@/domain/enums";
import type { Verdict } from "@/generated/prisma/enums";

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={VERDICT_TONE[verdict]} className={className}>
          {verdict}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{VERDICT_DESCRIPTIONS[verdict]}</TooltipContent>
    </Tooltip>
  );
}
