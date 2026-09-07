import type { z } from "zod";
import type { DiscoveryStage, EntryMode } from "@/generated/prisma/enums";
import type { ProgressCounts } from "@/services/scoring/discovery-progress";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UserContext {
  industries: string[];
  audiences: string[];
  businessModel: "B2B" | "B2C" | "EITHER" | "UNKNOWN";
  productPreferences: string[];
  avoidIndustries: string[];
  technicalStrengths: string[];
}

/**
 * Structured hints about the current turn. Real providers receive the same
 * information inside the prompt; the mock provider uses the hints directly.
 */
export interface TurnHints {
  workspaceName: string;
  stage: DiscoveryStage;
  entryMode: EntryMode | null;
  ideaStatement: string | null;
  userMessage: string;
  turnIndex: number;
  counts: ProgressCounts;
  userContext: UserContext | null;
  existing: {
    markets: string[];
    icps: string[];
    variables: string[];
    pains: string[];
    mechanisms: string[];
  };
}

export interface ChatOptions {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  hints?: TurnHints;
  signal?: AbortSignal;
}

export interface StructuredOptions<T> {
  system: string;
  messages: AIMessage[];
  schema: z.ZodType<T>;
  schemaName: string;
  maxTokens?: number;
  hints?: TurnHints;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message);
    this.name = "AIValidationError";
  }
}

/**
 * Provider abstraction. Adapters implement the two primitives; domain-level
 * helpers live in `BaseAIProvider` so any provider gets them for free.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly isMock: boolean;
  chat(options: ChatOptions): AsyncIterable<string>;
  structuredOutput<T>(options: StructuredOptions<T>): Promise<T>;
}
