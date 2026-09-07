"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Menu, Plus, Settings } from "lucide-react";

import { NewWorkspaceDialog } from "@/components/layout/new-workspace-dialog";
import type { SidebarWorkspace } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav({ workspaces }: { workspaces: SidebarWorkspace[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Workspaces</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 px-4">
            <Button
              size="sm"
              className="mb-2 w-full justify-start"
              onClick={() => {
                setOpen(false);
                setNewOpen(true);
              }}
            >
              <Plus /> New discovery
            </Button>
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                pathname === "/app" && "bg-accent",
              )}
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/app/w/${w.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                  pathname.startsWith(`/app/w/${w.id}`) && "bg-accent",
                )}
              >
                <span className="truncate">{w.name}</span>
                {w.isDemo && (
                  <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                    Demo
                  </Badge>
                )}
              </Link>
            ))}
            <Link
              href="/app/settings"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                pathname === "/app/settings" && "bg-accent",
              )}
            >
              <Settings className="size-4" /> Settings
            </Link>
          </div>
        </SheetContent>
      </Sheet>
      <NewWorkspaceDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
