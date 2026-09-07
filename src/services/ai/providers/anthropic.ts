import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { logger } from "@/lib/logger";
import { BaseAIProvider, validateStructured } from "../base-provider";
import { AIProviderError, type ChatOptions, type StructuredOptions } from "../types";

export class AnthropicProvider extends BaseAIProvider {
  readonly name = "anthropic";
  readonly isMock = false;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async *chat(options: ChatOptions): AsyncIterable<string> {
    const start = Date.now();
    logger.info("ai.request", { provider: this.name, model: this.model, kind: "chat" });
    try {
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: options.maxTokens ?? 4096,
          system: [{ type: "text", text: options.system, cache_control: { type: "ephemeral" } }],
          messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        },
        { signal: options.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
      const final = await stream.finalMessage();
      logger.info("ai.response", {
        provider: this.name,
        model: this.model,
        kind: "chat",
        latencyMs: Date.now() - start,
        stopReason: final.stop_reason,
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cacheReadTokens: final.usage.cache_read_input_tokens,
      });
      if (final.stop_reason === "refusal") {
        throw new AIProviderError("The model declined to answer this request.", this.name);
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
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
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: options.maxTokens ?? 16000,
        system: [{ type: "text", text: options.system, cache_control: { type: "ephemeral" } }],
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        output_config: { format: zodOutputFormat(options.schema) },
      });
      logger.info("ai.response", {
        provider: this.name,
        model: this.model,
        kind: "structured",
        schema: options.schemaName,
        latencyMs: Date.now() - start,
        stopReason: response.stop_reason,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
      if (response.stop_reason === "refusal") {
        throw new AIProviderError("The model declined to answer this request.", this.name);
      }
      if (response.parsed_output == null) {
        throw new AIProviderError("The model returned no parseable structured output.", this.name);
      }
      // Defense in depth: re-validate against our schema before anything is persisted.
      return validateStructured(options.schema, response.parsed_output);
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof Error && error.name === "StructuredValidationError") {
        logger.warn("ai.validation_failed", { provider: this.name, schema: options.schemaName });
        throw error;
      }
      logger.error("ai.error", { provider: this.name, kind: "structured", error });
      throw new AIProviderError(describeError(error), this.name, error);
    }
  }
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "Anthropic API key is invalid.";
  if (error instanceof Anthropic.RateLimitError)
    return "Anthropic rate limit reached. Try again shortly.";
  if (error instanceof Anthropic.APIError) return `Anthropic API error (${error.status}).`;
  if (error instanceof Error) return error.message;
  return "Unknown AI provider error.";
}
