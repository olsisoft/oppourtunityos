"use client";

import { useState } from "react";
import { Map as MapIcon, PanelRightClose, PanelRightOpen } from "lucide-react";

import {
  DiscoveryChat,
  type ChatMessage,
  type ProviderInfo,
} from "@/components/chat/discovery-chat";
import { OpportunityPanel } from "@/components/discovery/opportunity-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { WorkspaceGraph } from "@/db/workspaces";
import { cn } from "@/lib/utils";
import type { DiscoveryProgress } from "@/services/scoring/discovery-progress";

export function WorkspaceView({
  graph,
  messages,
  progress,
  provider,
  defaultIntent,
}: {
  graph: WorkspaceGraph;
  messages: ChatMessage[];
  progress: DiscoveryProgress;
  provider: ProviderInfo;
  defaultIntent?: "discover" | "validate";
}) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const conversation = graph.conversations[0];

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{graph.name}</h1>
            {graph.ideaStatement && (
              <p className="text-muted-foreground truncate text-xs">Idea: {graph.ideaStatement}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobilePanelOpen(true)}
              aria-label="Open opportunity map"
            >
              <MapIcon /> Map
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={() => setPanelOpen((v) => !v)}
              aria-label="Toggle opportunity map"
            >
              {panelOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <DiscoveryChat
            workspaceId={graph.id}
            initialMessages={messages}
            entryMode={graph.entryMode}
            stage={conversation?.stage ?? "START"}
            progress={progress}
            provider={provider}
            defaultIntent={defaultIntent}
          />
        </div>
      </section>
      <aside
        className={cn(
          "bg-muted/20 hidden shrink-0 border-l lg:block",
          panelOpen ? "w-[26rem] xl:w-[30rem]" : "lg:hidden",
        )}
      >
        {panelOpen && <OpportunityPanel graph={graph} />}
      </aside>
      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>Opportunity map</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <OpportunityPanel graph={graph} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
