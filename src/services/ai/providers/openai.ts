import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { logger } from "@/lib/logger";
import { BaseAIProvider, validateStructured } from "../base-provider";
import { AIProviderError, type ChatOptions, type StructuredOptions } from "../types";

/**
 * Optional OpenAI adapter. Same contract as the Anthropic adapter; only one
 * provider needs to be configured at a time.
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly name = "openai";
  readonly isMock = false;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async *chat(options: ChatOptions): AsyncIterable<string> {
    const start = Date.now();
    logger.info("ai.request", { provider: this.name, model: this.model, kind: "chat" });
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          stream: true,
          messages: [
            { role: "system", content: options.system },
            ...options.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
        { signal: options.signal },
      );
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
      logger.info("ai.response", {
        provider: this.name,
        model: this.model,
        kind: "chat",
        latencyMs: Date.now() - start,
      });
    } catch (error) {
      logger.error("ai.error", { provider: this.name, kind: "chat", error });
      throw new AIProviderError(describeError(error), this.name, error);
    }
  }

  async structuredOutput<T>(options: StructuredOptions<T>): Promise<T> {
    const start = Date.now();
    logger.info("ai.request", {
      provider: this.name,
      model: this.model,
      kind: "structured",
      schema: options.schemaName,
    });
    try {
      const response = await this.client.responses.parse({
        model: this.model,
        input: [
          { role: "system", content: options.system },
          ...options.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        text: { format: zodTextFormat(options.schema, options.schemaName) },
      });
      logger.info("ai.response", {
        provider: this.name,
        model: this.model,
        kind: "structured",
        schema: options.schemaName,
        latencyMs: Date.now() - start,
      });
      if (response.output_parsed == null) {
        throw new AIProviderError("The model returned no parseable structured output.", this.name);
      }
      return validateStructured(options.schema, response.output_parsed);
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === "StructuredValidationError") throw error;
      logger.error("ai.error", { provider: this.name, kind: "structured", error });
      throw new AIProviderError(describeError(error), this.name, error);
    }
  }
}

function describeError(error: unknown): string {
  if (error instanceof OpenAI.AuthenticationError) return "OpenAI API key is invalid.";
  if (error instanceof OpenAI.RateLimitError)
    return "OpenAI rate limit reached. Try again shortly.";
  if (error instanceof OpenAI.APIError) return `OpenAI API error (${error.status}).`;
  if (error instanceof Error) return error.message;
  return "Unknown AI provider error.";
}
