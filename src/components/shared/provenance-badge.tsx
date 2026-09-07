import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROVENANCE_LABELS, PROVENANCE_SHORT } from "@/domain/enums";
import type { Provenance } from "@/generated/prisma/enums";

const TONE: Record<Provenance, "muted" | "warning" | "positive" | "info" | "secondary"> = {
  USER: "secondary",
  AI_HYPOTHESIS: "warning",
  EXTERNAL_EVIDENCE: "positive",
  INTERVIEW: "positive",
  COMPUTED: "info",
};

const HELP: Record<Provenance, string> = {
  USER: "Stated by you in the conversation or edited manually.",
  AI_HYPOTHESIS: "Proposed by the analyst from reasoning. Not verified.",
  EXTERNAL_EVIDENCE: "Backed by captured external evidence.",
  INTERVIEW: "Comes from customer interview notes.",
  COMPUTED: "Calculated deterministically by the application.",
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={TONE[provenance]} className={className}>
          {short ? PROVENANCE_SHORT[provenance] : PROVENANCE_LABELS[provenance]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{HELP[provenance]}</TooltipContent>
    </Tooltip>
  );
}
