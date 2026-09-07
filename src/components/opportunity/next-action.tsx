import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { NextAction } from "@/services/scoring/next-action";

export function NextActionCard({
  action,
  others,
}: {
  action: NextAction | null;
  others?: NextAction[];
}) {
  if (!action) return <p className="text-muted-foreground text-sm">No recommendation yet.</p>;
  return (
    <div className="space-y-3">
      <div className="bg-foreground text-background rounded-lg p-4">
        <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
          Next best action
        </p>
        <p className="mt-1 flex items-start gap-2 text-sm font-medium">
          <ArrowRight className="mt-0.5 size-4 shrink-0" /> {action.title}
        </p>
        <p className="text-background/80 mt-1 text-xs leading-relaxed">{action.rationale}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="outline" className="border-background/30 text-background">
            {action.type.replace(/_/g, " ").toLowerCase()}
          </Badge>
          <Badge variant="outline" className="border-background/30 text-background">
            effort {action.effort}
          </Badge>
        </div>
      </div>
      {others && others.length > 0 && (
        <ol className="space-y-1.5">
          {others.map((a) => (
            <li key={a.title} className="rounded-md border p-2.5 text-xs">
              <p className="font-medium">{a.title}</p>
              <p className="text-muted-foreground mt-0.5">{a.rationale}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
