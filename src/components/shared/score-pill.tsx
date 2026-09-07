import { cn } from "@/lib/utils";

export function scoreTone(value: number): string {
  if (value >= 75) return "text-tone-positive";
  if (value >= 50) return "text-tone-info";
  if (value >= 30) return "text-tone-warning";
  return "text-tone-negative";
}

export function ScorePill({
  value,
  label,
  size = "md",
  className,
}: {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", size === "lg" ? "items-start" : "items-end", className)}>
      {label && (
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </span>
      )}
      <span
        className={cn(
          "font-mono font-semibold tabular-nums",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-3xl",
          scoreTone(value),
        )}
      >
        {value}
        <span className="text-muted-foreground text-[0.6em] font-normal">/100</span>
      </span>
    </div>
  );
}

export function TenScale({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
        <div
          className="bg-foreground h-full"
          style={{ width: `${(Math.max(0, Math.min(10, value)) / 10) * 100}%` }}
        />
      </div>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">{value}/10</span>
    </div>
  );
}
