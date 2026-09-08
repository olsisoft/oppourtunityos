import { Brand } from "@/components/layout/brand";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar, type SidebarWorkspace } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({
  user,
  workspaces,
  children,
}: {
  user: { id: string; name: string | null; email: string | null };
  workspaces: SidebarWorkspace[];
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="bg-background flex h-dvh flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <MobileNav workspaces={workspaces} />
            <Brand href="/app" className="text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <UserMenu user={user} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <Sidebar workspaces={workspaces} />
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
