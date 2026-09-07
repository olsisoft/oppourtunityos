import { listWorkspacesForUser } from "@/db/workspaces";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspaces = await listWorkspacesForUser(user.id);
  return (
    <AppShell
      user={user}
      workspaces={workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        isDemo: w.isDemo,
        entryMode: w.entryMode,
        opportunities: w._count.opportunities,
        evidence: w._count.evidence,
        updatedAt: w.updatedAt.toISOString(),
      }))}
    >
      {children}
    </AppShell>
  );
}
