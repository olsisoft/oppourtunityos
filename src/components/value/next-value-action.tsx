"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createExperimentAction } from "@/actions/value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ValueAction } from "@/services/value/next-value-action";

export function NextValueActionCard({
  action,
  frontierLabel,
  opportunityId,
  compact = false,
}: {
  action: ValueAction | null;
  frontierLabel: string;
  opportunityId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [planning, setPlanning] = useState(false);

  if (!action) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm">
        <p className="text-muted-foreground">
          No decision-relevant uncertainty identified yet. Form an opportunity and its value chain
          first.
        </p>
      </div>
    );
  }

  const plan = async () => {
    if (!action.experiment) return;
    setPlanning(true);
    const r = await createExperimentAction({
      opportunityId,
      causalLinkId: action.causalLinkId,
      assumptionId: action.assumptionId,
      title: action.what.slice(0, 180),
      hypothesis: action.what,
      design: action.experiment,
      successMetric: action.evidenceToMove,
    });
    setPlanning(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Experiment planned");
      router.refresh();
    }
  };

  return (
    <div className="bg-foreground text-background rounded-lg p-4">
      <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
        Next best action
      </p>
      <p className="mt-1 flex items-start gap-2 text-sm font-medium">
        <ArrowRight className="mt-0.5 size-4 shrink-0" /> {action.what}
      </p>
      <dl className={compact ? "mt-2 space-y-1 text-xs" : "mt-3 grid gap-2 text-xs sm:grid-cols-2"}>
        <Row label="Why this matters" value={action.why} />
        <Row label="Affects" value={action.affects} />
        <Row label="If false" value={action.ifFalse} />
        <Row label="Evidence that would move the frontier" value={action.evidenceToMove} />
        {!compact && action.experiment && (
          <Row label="Recommended experiment" value={action.experiment} className="sm:col-span-2" />
        )}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-background/30 text-background">
          Current Proof Frontier: {frontierLabel}
        </Badge>
        <Badge variant="outline" className="border-background/30 text-background">
          {action.type.replace(/_/g, " ").toLowerCase()}
        </Badge>
        {action.experiment && (
          <Button size="sm" variant="secondary" onClick={plan} disabled={planning}>
            {planning ? <Loader2 className="animate-spin" /> : <FlaskConical />} Plan this
            experiment
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-background/60 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </dt>
      <dd className="text-background/90 mt-0.5 leading-relaxed">{value}</dd>
    </div>
  );
}
