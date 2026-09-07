import type { ProviderInfo } from "@/components/chat/discovery-chat";
import { getAIProvider } from "@/services/ai";
import { getEnv } from "@/lib/env";

/** Safe, key-free description of the configured AI provider for the UI. */
export function getProviderInfo(): ProviderInfo {
  try {
    const p = getAIProvider();
    return { name: `${p.name} · ${p.model}`, isMock: p.isMock, error: null };
  } catch (error) {
    return {
      name: getEnv().AI_PROVIDER,
      isMock: false,
      error: error instanceof Error ? error.message : "AI provider not configured",
    };
  }
}
