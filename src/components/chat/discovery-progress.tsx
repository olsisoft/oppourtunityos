"use client";

import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DiscoveryProgress } from "@/services/scoring/discovery-progress";

export function DiscoveryProgressBar({
  progress,
  compact = false,
}: {
  progress: DiscoveryProgress;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border", compact ? "p-3" : "p-4")}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider uppercase">Discovery progress</p>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {progress.overallPercent}%
        </span>
      </div>
      <ul
        className={cn(
          "grid gap-x-6 gap-y-1",
          compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-5",
        )}
      >
        {progress.steps.map((step) => (
          <li
            key={step.stage}
            className="flex items-center justify-between gap-2 text-xs"
            title={step.detail}
          >
            <span className={cn(step.status === "pending" && "text-muted-foreground")}>
              {step.label}
            </span>
            <span className="text-muted-foreground flex items-center font-mono tabular-nums">
              {step.status === "done" ? (
                <Check className="text-tone-positive size-3.5" />
              ) : step.status === "partial" ? (
                `${step.percent}%`
              ) : (
                <Minus className="size-3.5" />
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
