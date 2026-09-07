/**
 * One discovery turn:
 *   persist user message → stream analyst reply → structured extraction →
 *   apply to workspace state → resolve stage → persist assistant message.
 *
 * Emits NDJSON-friendly events so the route handler can stream them.
 */
import type { DiscoveryStage, EntryMode } from "@/generated/prisma/enums";
import { prisma } from "@/db/prisma";
import { getOrCreateConversation, getWorkspaceCounts, getWorkspaceGraph } from "@/db/workspaces";
import { logger } from "@/lib/logger";
import { cleanText } from "@/lib/sanitize";
import { ANALYST_SYSTEM_PROMPT, stageInstructions } from "@/prompts/system";
import { getAIProvider } from "@/services/ai";
import type { QuestionCard } from "@/services/ai/schemas";
import type { UserContext } from "@/services/ai/types";
import {
  computeDiscoveryProgress,
  type DiscoveryProgress,
} from "@/services/scoring/discovery-progress";
import { applyExtraction, sanitizeUserContext, type AppliedSummary } from "./apply-extraction";
import { buildHints, buildWorkspaceSummary, historyToMessages } from "./context";
import { resolveNextStage } from "./state-machine";

export type TurnEvent =
  | {
      type: "meta";
      conversationId: string;
      stage: DiscoveryStage;
      provider: string;
      isMock: boolean;
    }
  | { type: "text"; delta: string }
  | { type: "applied"; summary: AppliedSummary }
  | {
      type: "state";
      stage: DiscoveryStage;
      previousStage: DiscoveryStage;
      stageReason: string;
      progress: DiscoveryProgress;
      suggestedReplies: string[];
      questionCard: QuestionCard | null;
      messageId: string;
    }
  | { type: "error"; message: string }
  | { type: "done" };

export interface TurnInput {
  workspaceId: string;
  message: string;
  entryMode?: EntryMode;
  signal?: AbortSignal;
}

export async function* runDiscoveryTurn(input: TurnInput): AsyncGenerator<TurnEvent> {
  const provider = getAIProvider();
  const message = cleanText(input.message, 4000);

  if (input.entryMode) {
    await prisma.workspace.update({
      where: { id: input.workspaceId },
      data: {
        entryMode: input.entryMode,
        ideaStatement: input.entryMode === "HAS_IDEA" ? message : undefined,
      },
    });
  }

  const conversation = await getOrCreateConversation(input.workspaceId);
  const previousStage = conversation.stage;
  const turnIndex = conversation.messages.filter((m) => m.role === "USER").length;

  yield {
    type: "meta",
    conversationId: conversation.id,
    stage: previousStage,
    provider: provider.name,
    isMock: provider.isMock,
  };

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  });

  const graph = await getWorkspaceGraph(input.workspaceId);
  const counts = await getWorkspaceCounts(input.workspaceId);
  const userContext = (conversation.userContext as UserContext | null) ?? null;
  const hints = buildHints(graph, counts, message, turnIndex, userContext);
  const summary = buildWorkspaceSummary(graph);
  const history = historyToMessages(conversation.messages);

  const system = [
    ANALYST_SYSTEM_PROMPT,
    "",
    stageInstructions(previousStage, graph.entryMode),
    "",
    "<workspace_state>",
    summary,
    "</workspace_state>",
  ].join("\n");

  const messages = [...history, { role: "user" as const, content: message }];

  let reply = "";
  try {
    for await (const delta of provider.chat({ system, messages, hints, signal: input.signal })) {
      reply += delta;
      yield { type: "text", delta };
    }
  } catch (error) {
    logger.error("discovery.turn_chat_failed", { workspaceId: input.workspaceId, error });
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "AI provider failed.",
    };
    return;
  }

  // Structured extraction — validated by the provider (Zod) before we see it.
  let applied: AppliedSummary | null = null;
  let suggestedStage: DiscoveryStage | null = null;
  let aiReady = false;
  let suggestedReplies: string[] = [];
  let questionCard: QuestionCard | null = null;
  let contextUpdated = false;

  try {
    const extraction = await provider.extractDiscovery({
      workspaceSummary: summary,
      hints,
      history: messages,
      assistantReply: reply,
    });
    suggestedStage = extraction.stage.suggestedStage;
    aiReady = extraction.stage.readyToAdvance;
    suggestedReplies = extraction.suggestedReplies
      .map((s) => cleanText(s, 160))
      .filter(Boolean)
      .slice(0, 4);
    questionCard = extraction.questionCard
      ? {
          question: cleanText(extraction.questionCard.question, 300),
          options: extraction.questionCard.options
            .map((o) => cleanText(o, 160))
            .filter(Boolean)
            .slice(0, 6),
          allowFreeText: extraction.questionCard.allowFreeText,
        }
      : null;

    applied = await applyExtraction(input.workspaceId, extraction);

    const ctx = sanitizeUserContext(extraction.userContext);
    if (ctx) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { userContext: ctx },
      });
      contextUpdated = true;
    }
    yield { type: "applied", summary: applied };
  } catch (error) {
    logger.warn("discovery.extraction_failed", { workspaceId: input.workspaceId, error });
    // The reply is still valuable; state simply does not advance this turn.
  }

  const newCounts = await getWorkspaceCounts(input.workspaceId);
  const resolution = resolveNextStage(previousStage, suggestedStage, {
    counts: newCounts,
    entryMode: input.entryMode ?? graph.entryMode,
    aiReady,
  });

  if (resolution.changed) {
    logger.info("discovery.stage_transition", {
      workspaceId: input.workspaceId,
      from: previousStage,
      to: resolution.stage,
      reason: resolution.reason,
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { stage: resolution.stage },
    });
  }

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: reply,
      payload: {
        suggestedReplies,
        questionCard,
        applied: applied ? { ...applied, opportunityIds: undefined } : null,
        stage: resolution.stage,
        provider: provider.name,
        isMock: provider.isMock,
        contextUpdated,
      },
    },
  });

  const progress = computeDiscoveryProgress(newCounts);

  yield {
    type: "state",
    stage: resolution.stage,
    previousStage,
    stageReason: resolution.reason,
    progress,
    suggestedReplies,
    questionCard,
    messageId: assistantMessage.id,
  };
  yield { type: "done" };
}
