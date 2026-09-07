/**
 * Domain-level AI operations built on top of the two provider primitives.
 * Any adapter that implements `chat` and `structuredOutput` inherits these.
 */
import { z } from "zod";
import { wrapUntrusted } from "@/lib/sanitize";
import {
  ANALYST_SYSTEM_PROMPT,
  EXTRACTION_INSTRUCTIONS,
  INTERVIEW_GUIDE_PROMPT,
  RESEARCH_SUMMARY_PROMPT,
} from "@/prompts/system";
import {
  DiscoveryExtractionSchema,
  EvidenceSummarySchema,
  IcpMapSchema,
  InterviewGuideSchema,
  MarketMapSchema,
  MechanismListSchema,
  PainAnalysisSchema,
  VariableMapSchema,
  type DiscoveryExtraction,
  type EvidenceSummary,
  type InterviewGuide,
} from "./schemas";
import type { AIMessage, AIProvider, ChatOptions, StructuredOptions, TurnHints } from "./types";

export interface ExtractionRequest {
  workspaceSummary: string;
  hints: TurnHints;
  history: AIMessage[];
  assistantReply: string;
}

export interface InterviewGuideRequest {
  opportunityTitle: string;
  icp: string;
  variable: string;
  pain: string;
  trigger: string | null;
  alternatives: string[];
}

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly model: string;
  abstract readonly isMock: boolean;
  abstract chat(options: ChatOptions): AsyncIterable<string>;
  abstract structuredOutput<T>(options: StructuredOptions<T>): Promise<T>;

  async extractDiscovery(req: ExtractionRequest): Promise<DiscoveryExtraction> {
    const tail = req.history.slice(-6);
    const user = [
      "<workspace_state>",
      req.workspaceSummary,
      "</workspace_state>",
      "",
      `<current_stage>${req.hints.stage}</current_stage>`,
      `<entry_mode>${req.hints.entryMode ?? "UNKNOWN"}</entry_mode>`,
      "",
      "<latest_user_message>",
      req.hints.userMessage,
      "</latest_user_message>",
      "",
      "<assistant_reply>",
      req.assistantReply,
      "</assistant_reply>",
      "",
      EXTRACTION_INSTRUCTIONS,
    ].join("\n");

    return this.structuredOutput({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [...tail, { role: "user", content: user }],
      schema: DiscoveryExtractionSchema,
      schemaName: "discovery_extraction",
      hints: req.hints,
    });
  }

  async generateMarketMap(userContext: string) {
    return this.structuredOutput({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `User context:\n${userContext}\n\nPropose 3-5 candidate markets as HYPOTHESES with attractiveness notes. source must be AI_HYPOTHESIS.`,
        },
      ],
      schema: MarketMapSchema,
      schemaName: "market_map",
    });
  }

  async generateICPMap(marketName: string, context: string) {
    return this.structuredOutput({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Market: ${marketName}\nContext:\n${context}\n\nPropose 1-3 ICPs for this market with economic buyer and reachability. Say UNKNOWN when not established.`,
        },
      ],
      schema: IcpMapSchema,
      schemaName: "icp_map",
    });
  }

  async generateVariableMap(icpName: string, context: string) {
    return this.structuredOutput({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `ICP: ${icpName}\nContext:\n${context}\n\nPropose 4-6 valuable variables with category, desired direction and 0-10 importance HYPOTHESIS.`,
        },
      ],
      schema: VariableMapSchema,
      schemaName: "variable_map",
    });
  }

  async analyzePain(variableName: string, context: string) {
    return this.structuredOutput({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Variable: ${variableName}\nContext:\n${context}\n\nDescribe the pains, triggers and current alternatives. Use UNKNOWN for unmeasured states.`,
        },
      ],
      schema: PainAnalysisSchema,
      schemaName: "pain_analysis",
    });
  }

  async generateMechanisms(painDescription: string, context: string) {
    return this.structuredOutput({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Pain: ${painDescription}\nContext:\n${context}\n\nPropose 4-6 distinct mechanisms that could move the variable. Problem is not product; explore widely.`,
        },
      ],
      schema: MechanismListSchema,
      schemaName: "mechanisms",
    });
  }

  async summarizeEvidence(
    sourceTitle: string,
    excerpt: string,
    hypothesis: string,
  ): Promise<EvidenceSummary> {
    const content = [
      `Hypothesis under evaluation: ${hypothesis}`,
      "",
      wrapUntrusted(sourceTitle, excerpt),
    ].join("\n");
    return this.structuredOutput({
      system: RESEARCH_SUMMARY_PROMPT,
      messages: [{ role: "user", content }],
      schema: EvidenceSummarySchema,
      schemaName: "evidence_summary",
    });
  }

  async generateInterviewGuide(req: InterviewGuideRequest): Promise<InterviewGuide> {
    const content = [
      `Opportunity: ${req.opportunityTitle}`,
      `ICP: ${req.icp}`,
      `Variable: ${req.variable}`,
      `Pain: ${req.pain}`,
      `Trigger: ${req.trigger ?? "UNKNOWN"}`,
      `Current alternatives: ${req.alternatives.length ? req.alternatives.join(", ") : "UNKNOWN"}`,
    ].join("\n");
    return this.structuredOutput({
      system: INTERVIEW_GUIDE_PROMPT,
      messages: [{ role: "user", content }],
      schema: InterviewGuideSchema,
      schemaName: "interview_guide",
    });
  }
}

/** Utility for adapters: validate raw JSON against the schema with a clear error. */
export function validateStructured<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new StructuredValidationError(parsed.error.issues);
  }
  return parsed.data;
}

export class StructuredValidationError extends Error {
  constructor(public readonly issues: unknown) {
    super("LLM output failed schema validation");
    this.name = "StructuredValidationError";
  }
}
