"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Plus, Settings } from "lucide-react";

import { NewWorkspaceDialog } from "@/components/layout/new-workspace-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EntryMode } from "@/generated/prisma/enums";
import { cn, relativeTime } from "@/lib/utils";

export interface SidebarWorkspace {
  id: string;
  name: string;
  isDemo: boolean;
  entryMode: EntryMode | null;
  opportunities: number;
  evidence: number;
  updatedAt: string;
}

export function Sidebar({ workspaces }: { workspaces: SidebarWorkspace[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const recent = [...workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <aside className="bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="p-3">
        <Button className="w-full justify-start" size="sm" onClick={() => setOpen(true)}>
          <Plus /> New discovery
        </Button>
      </div>
      <nav className="px-3">
        <NavLink href="/app" active={pathname === "/app"} icon={<LayoutDashboard />}>
          Dashboard
        </NavLink>
      </nav>
      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        <p className="text-muted-foreground px-2 pb-2 text-[11px] font-medium tracking-wider uppercase">
          Workspaces
        </p>
        <ul className="space-y-0.5">
          {workspaces.length === 0 && (
            <li className="text-muted-foreground px-2 py-2 text-xs">
              No workspaces yet. Start a new discovery.
            </li>
          )}
          {workspaces.map((w) => {
            const active = pathname.startsWith(`/app/w/${w.id}`);
            return (
              <li key={w.id}>
                <Link
                  href={`/app/w/${w.id}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-foreground/80 hover:bg-sidebar-accent/70",
                  )}
                >
                  <span className="truncate">{w.name}</span>
                  {w.isDemo && (
                    <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                      Demo
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {recent.length > 0 && (
          <>
            <p className="text-muted-foreground px-2 pt-5 pb-2 text-[11px] font-medium tracking-wider uppercase">
              Recent discoveries
            </p>
            <ul className="space-y-0.5">
              {recent.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/app/w/${w.id}`}
                    className="text-muted-foreground hover:text-foreground flex items-center justify-between rounded-md px-2 py-1 text-xs"
                  >
                    <span className="truncate">{w.name}</span>
                    <span className="shrink-0 tabular-nums">{relativeTime(w.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </ScrollArea>
      <div className="border-t p-3">
        <NavLink href="/app/settings" active={pathname === "/app/settings"} icon={<Settings />}>
          Settings
        </NavLink>
      </div>
      <NewWorkspaceDialog open={open} onOpenChange={setOpen} />
    </aside>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors [&_svg]:size-4",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-foreground/80 hover:bg-sidebar-accent/70",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
