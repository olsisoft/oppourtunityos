"use client";

import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";
import type { NextAction } from "@/services/scoring/next-action";

export function NextActionCard({
  action,
  others,
}: {
  action: NextAction | null;
  others?: NextAction[];
}) {
  const t = useT();
  if (!action) {
    return <p className="text-muted-foreground text-sm">{t("opportunity.nextAction.none")}</p>;
  }
  const typeKey = `opportunity.nextAction.type.${action.type}`;
  return (
    <div className="space-y-3">
      <div className="bg-foreground text-background rounded-lg p-4">
        <p className="text-background/70 text-[10px] font-medium tracking-wider uppercase">
          {t("opportunity.nextAction.title")}
        </p>
        <p className="mt-1 flex items-start gap-2 text-sm font-medium">
          <ArrowRight className="mt-0.5 size-4 shrink-0" /> {t(action.title)}
        </p>
        <p className="text-background/80 mt-1 text-xs leading-relaxed">{t(action.rationale)}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="outline" className="border-background/30 text-background">
            {t.has(typeKey) ? t(typeKey) : action.type.replace(/_/g, " ").toLowerCase()}
          </Badge>
          <Badge variant="outline" className="border-background/30 text-background">
            {t("opportunity.nextAction.effort", { effort: action.effort })}
          </Badge>
        </div>
      </div>
      {others && others.length > 0 && (
        <ol className="space-y-1.5">
          {others.map((a, i) => (
            <li key={i} className="rounded-md border p-2.5 text-xs">
              <p className="font-medium">{t(a.title)}</p>
              <p className="text-muted-foreground mt-0.5">{t(a.rationale)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
