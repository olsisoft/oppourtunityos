import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="bg-foreground text-background flex size-6 items-center justify-center rounded-md text-[11px] font-bold">
        O
      </span>
      <span>OpportunityOS</span>
    </Link>
  );
}
