import { notFound } from "next/navigation";

import type { ChatMessage } from "@/components/chat/discovery-chat";
import { WorkspaceView } from "@/components/discovery/workspace-view";
import { assertWorkspaceAccess, getWorkspaceCounts, getWorkspaceGraph } from "@/db/workspaces";
import { ForbiddenError, requireUser } from "@/lib/session";
import { getProviderInfo } from "@/lib/provider-info";
import { computeDiscoveryProgress } from "@/services/scoring/discovery-progress";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ intent?: string }>;
}) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const { intent } = await searchParams;
  try {
    await assertWorkspaceAccess(user.id, workspaceId);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const [graph, counts] = await Promise.all([
    getWorkspaceGraph(workspaceId),
    getWorkspaceCounts(workspaceId),
  ]);
  const progress = computeDiscoveryProgress(counts);
  const provider = getProviderInfo();

  const messages: ChatMessage[] = (graph.conversations[0]?.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    payload: (m.payload as ChatMessage["payload"]) ?? null,
  }));

  return (
    <WorkspaceView
      graph={graph}
      messages={messages}
      progress={progress}
      provider={provider}
      defaultIntent={
        intent === "validate" ? "validate" : intent === "discover" ? "discover" : undefined
      }
    />
  );
}
