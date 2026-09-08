"use client";

import { AlertOctagon, AlertTriangle, ShieldCheck } from "lucide-react";

import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { KillWarning } from "@/services/scoring/kill-criteria";

export function KillCriteria({
  warnings,
  className,
}: {
  warnings: KillWarning[];
  className?: string;
}) {
  const t = useT();
  if (warnings.length === 0) {
    return (
      <div
        className={cn(
          "bg-tone-positive-bg text-tone-positive flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          className,
        )}
      >
        <ShieldCheck className="size-4" /> {t("opportunity.kill.none")}
      </div>
    );
  }
  const critical = warnings.filter((w) => w.severity === "critical");
  const advisory = warnings.filter((w) => w.severity === "warning");
  return (
    <div className={cn("space-y-2", className)}>
      {critical.length > 0 && (
        <p className="text-tone-negative text-xs font-medium">
          {t("opportunity.kill.critical", { count: critical.length })}
        </p>
      )}
      <ul className="space-y-2">
        {[...critical, ...advisory].map((w) => (
          <li
            key={w.code}
            className={cn(
              "rounded-lg border p-3 text-sm",
              w.severity === "critical"
                ? "border-tone-negative/30 bg-tone-negative-bg/60"
                : "border-tone-warning/30 bg-tone-warning-bg/60",
            )}
          >
            <div className="flex items-start gap-2">
              {w.severity === "critical" ? (
                <AlertOctagon className="text-tone-negative mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertTriangle className="text-tone-warning mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="font-medium">{t(w.message)}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{t(w.suggestion)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
