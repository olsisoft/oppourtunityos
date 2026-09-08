import { scoreTone } from "@/components/shared/score-pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  label: string;
  question: string;
  value: number | null;
  lines: string[];
  /** e.g. "4/5" — shown next to INCOMPLETE. */
  completeness?: string | null;
  /** e.g. "Population affected" — shown under INCOMPLETE. */
  missing?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("cursor-help", className)}>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {label}
          </p>
          {value === null ? (
            <>
              <p
                className={cn(
                  "text-tone-warning font-mono font-semibold tracking-wide",
                  size === "lg" ? "text-xl" : size === "md" ? "text-sm" : "text-xs",
                )}
              >
                INCOMPLETE
                {completeness ? (
                  <span className="text-muted-foreground font-normal"> · {completeness}</span>
                ) : null}
              </p>
              {missing && (
                <p
                  className={cn("text-muted-foreground", size === "lg" ? "text-xs" : "text-[10px]")}
                >
                  Missing: {missing}
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
              <span className="text-muted-foreground text-[0.6em] font-normal">/100</span>
            </p>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p className="mb-1 font-medium">{question}</p>
        <ul className="space-y-0.5">
          {lines.slice(0, 12).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
