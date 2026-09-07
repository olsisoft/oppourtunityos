import { getEnv } from "@/lib/env";
import type { BaseAIProvider } from "./base-provider";
import { AnthropicProvider } from "./providers/anthropic";
import { MockProvider } from "./providers/mock";
import { OpenAIProvider } from "./providers/openai";
import { AIProviderError } from "./types";

let cached: BaseAIProvider | null = null;

/**
 * Resolve the configured AI provider. Anthropic is the primary provider,
 * OpenAI is optional, and the mock provider keeps the product fully usable
 * (and testable) without any API key.
 */
export function getAIProvider(): BaseAIProvider {
  if (cached) return cached;
  const env = getEnv();
  switch (env.AI_PROVIDER) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) {
        throw new AIProviderError(
          "AI_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set.",
          "anthropic",
        );
      }
      cached = new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
      break;
    }
    case "openai": {
      if (!env.OPENAI_API_KEY) {
        throw new AIProviderError(
          "AI_PROVIDER is 'openai' but OPENAI_API_KEY is not set.",
          "openai",
        );
      }
      cached = new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
      break;
    }
    default:
      cached = new MockProvider();
  }
  return cached;
}

export function resetAIProviderCache() {
  cached = null;
}

export type { BaseAIProvider } from "./base-provider";
export * from "./types";
export * from "./schemas";
