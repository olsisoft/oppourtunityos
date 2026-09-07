"use client";

import { useState } from "react";
import { Compass, Lightbulb } from "lucide-react";

import { NewWorkspaceDialog } from "@/components/layout/new-workspace-dialog";
import { Button } from "@/components/ui/button";

export function QuickStart({ intent }: { intent?: string }) {
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
          <span className="block font-medium">I don&apos;t know what to build</span>
          <span className="text-muted-foreground block text-xs font-normal">
            Start from your context and discover a market
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
          <span className="block font-medium">I already have an idea</span>
          <span className="text-muted-foreground block text-xs font-normal">
            Reverse-engineer it into ICP, variable, pain and evidence
          </span>
        </span>
      </Button>
      <NewWorkspaceDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
