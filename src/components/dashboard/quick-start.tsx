"use client";

import { useState } from "react";
import { Compass, Lightbulb } from "lucide-react";

import { NewWorkspaceDialog } from "@/components/layout/new-workspace-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function QuickStart({ intent }: { intent?: string }) {
  const t = useT();
  const [open, setOpen] = useState(Boolean(intent));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        variant="outline"
        className="h-auto justify-start gap-3 py-4 text-left"
        onClick={() => setOpen(true)}
      >
        <Compass className="size-5" />
        <span>
          <span className="block font-medium">{t("dashboard.quickStart.discoverTitle")}</span>
          <span className="text-muted-foreground block text-xs font-normal">
            {t("dashboard.quickStart.discoverBody")}
          </span>
        </span>
      </Button>
      <Button
        variant="outline"
        className="h-auto justify-start gap-3 py-4 text-left"
        onClick={() => setOpen(true)}
      >
        <Lightbulb className="size-5" />
        <span>
          <span className="block font-medium">{t("dashboard.quickStart.validateTitle")}</span>
          <span className="text-muted-foreground block text-xs font-normal">
            {t("dashboard.quickStart.validateBody")}
          </span>
        </span>
      </Button>
      <NewWorkspaceDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
