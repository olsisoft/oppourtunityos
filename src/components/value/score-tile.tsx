"use client";

import { scoreTone } from "@/components/shared/score-pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * A score with its explanation on hover. `null` renders INCOMPLETE together
 * with its completeness (e.g. 4/5) and what is missing — a missing input is
 * shown as missing, never as a number.
 */
export function ScoreTile({
  label,
  question,
  value,
  lines,
  completeness,
  missing,
  size = "md",
  className,
}: {
  label: LocalizedText;
  question: LocalizedText;
  value: number | null;
  lines: LocalizedText[];
  /** e.g. "4/5" — shown next to INCOMPLETE. */
  completeness?: LocalizedText | null;
  /** e.g. "Population affected" (or a list of items) — shown under INCOMPLETE. */
  missing?: LocalizedText | LocalizedText[] | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useT();
  const missingText = Array.isArray(missing)
    ? missing.map((m) => t(m)).join(", ")
    : missing
      ? t(missing)
      : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("cursor-help", className)}>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t(label)}
          </p>
          {value === null ? (
            <>
              <p
                className={cn(
                  "text-tone-warning font-mono font-semibold tracking-wide",
                  size === "lg" ? "text-xl" : size === "md" ? "text-sm" : "text-xs",
                )}
              >
                {t("value.incomplete")}
                {completeness ? (
                  <span className="text-muted-foreground font-normal"> · {t(completeness)}</span>
                ) : null}
              </p>
              {missingText && (
                <p
                  className={cn("text-muted-foreground", size === "lg" ? "text-xs" : "text-[10px]")}
                >
                  {t("value.scorecard.missing", { missing: missingText })}
                </p>
              )}
            </>
          ) : (
            <p
              className={cn(
                "font-mono font-semibold tabular-nums",
                size === "lg" ? "text-3xl" : size === "md" ? "text-base" : "text-sm",
                scoreTone(value),
              )}
            >
              {value}
              <span className="text-muted-foreground text-[0.6em] font-normal">
                {t("common.outOf100")}
              </span>
            </p>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p className="mb-1 font-medium">{t(question)}</p>
        <ul className="space-y-0.5">
          {lines.slice(0, 12).map((l, i) => (
            <li key={i}>{t(l)}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
