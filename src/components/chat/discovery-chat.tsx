"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { DiscoveryProgressBar } from "@/components/chat/discovery-progress";
import { EntryModeChooser } from "@/components/chat/entry-mode-chooser";
import { MessageBubble, type AppliedCounts } from "@/components/chat/message-bubble";
import { QuestionCard, SuggestedReplies } from "@/components/chat/question-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DiscoveryStage, EntryMode } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";
import type { QuestionCard as QuestionCardData } from "@/services/ai/schemas";
import type { TurnEvent } from "@/services/discovery/turn";
import type { DiscoveryProgress } from "@/services/scoring/discovery-progress";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  payload?: {
    suggestedReplies?: string[];
    questionCard?: QuestionCardData | null;
    applied?: AppliedCounts | null;
    isMock?: boolean;
  } | null;
}

export interface ProviderInfo {
  name: string;
  isMock: boolean;
  error?: LocalizedText | null;
}

export function DiscoveryChat({
  workspaceId,
  initialMessages,
  entryMode,
  stage,
  progress: initialProgress,
  provider,
  defaultIntent,
}: {
  workspaceId: string;
  initialMessages: ChatMessage[];
  entryMode: EntryMode | null;
  stage: DiscoveryStage;
  progress: DiscoveryProgress;
  provider: ProviderInfo;
  defaultIntent?: "discover" | "validate";
}) {
  const t = useT();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<LocalizedText | null>(null);
  const [currentStage, setCurrentStage] = useState<DiscoveryStage>(stage);
  const [progress, setProgress] = useState(initialProgress);
  const [pendingEntryMode, setPendingEntryMode] = useState<EntryMode | null>(entryMode);
  const lastRequest = useRef<{ message: string; entryMode?: EntryMode } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Adjust local state when the server re-renders with fresh props
  // (after router.refresh()). Render-phase adjustment avoids effect cascades.
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  const [prevProgress, setPrevProgress] = useState(initialProgress);
  const [prevStage, setPrevStage] = useState(stage);
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    if (!streaming) setMessages(initialMessages);
  }
  if (initialProgress !== prevProgress) {
    setPrevProgress(initialProgress);
    setProgress(initialProgress);
  }
  if (stage !== prevStage) {
    setPrevStage(stage);
    setCurrentStage(stage);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "ASSISTANT"),
    [messages],
  );

  const send = useCallback(
    async (message: string, mode?: EntryMode) => {
      const text = message.trim();
      if (!text || streaming) return;
      setError(null);
      setStreaming(true);
      lastRequest.current = { message: text, entryMode: mode };
      if (mode) setPendingEntryMode(mode);

      const userId = `local-user-${Date.now()}`;
      const assistantId = `local-assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "USER", content: text },
        { id: assistantId, role: "ASSISTANT", content: "", payload: null },
      ]);
      setInput("");

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, entryMode: mode }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? t("chat.error.requestFailed", { status: res.status }));
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";
        let failed: LocalizedText | null = null;

        const handle = (event: TurnEvent) => {
          switch (event.type) {
            case "text":
              content += event.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
              );
              break;
            case "applied":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, payload: { ...(m.payload ?? {}), applied: event.summary } }
                    : m,
                ),
              );
              break;
            case "state":
              setCurrentStage(event.stage);
              setProgress(event.progress);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        id: event.messageId,
                        payload: {
                          ...(m.payload ?? {}),
                          suggestedReplies: event.suggestedReplies,
                          questionCard: event.questionCard,
                          isMock: provider.isMock,
                        },
                      }
                    : m,
                ),
              );
              break;
            case "error":
              failed = event.message;
              break;
            default:
              break;
          }
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (line) handle(JSON.parse(line) as TurnEvent);
          }
        }
        if (buffer.trim()) handle(JSON.parse(buffer) as TurnEvent);
        if (failed) {
          setError(failed);
          if (!content) setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
        router.refresh();
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const message = e instanceof Error ? e.message : t("chat.error.generic");
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        toast.error(t(message));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [provider.isMock, router, streaming, t, workspaceId],
  );

  const retry = () => {
    if (!lastRequest.current) return;
    // Remove the failed user message so it is not duplicated.
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "USER");
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== realIdx);
    });
    void send(lastRequest.current.message, lastRequest.current.entryMode);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const showChooser = !pendingEntryMode && messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{t("chat.header.stage")}</span>
          <Badge variant="outline">{t(`labels.stage.${currentStage}`)}</Badge>
          {pendingEntryMode && (
            <Badge variant="muted">{t(`chat.header.entryMode.${pendingEntryMode}`)}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {provider.isMock ? (
            <Badge variant="warning" className="font-normal">
              {t("chat.header.mockProvider")}
            </Badge>
          ) : provider.error ? (
            <Badge variant="negative" className="font-normal">
              {t(provider.error)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">{provider.name}</span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length > 0 && <DiscoveryProgressBar progress={progress} />}
          {showChooser ? (
            <EntryModeChooser
              onChoose={(mode, message) => void send(message, mode)}
              disabled={streaming || Boolean(provider.error)}
              defaultIntent={defaultIntent}
            />
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                streaming={streaming && i === messages.length - 1 && m.role === "ASSISTANT"}
                applied={m.payload?.applied ?? null}
                isMock={m.payload?.isMock}
              />
            ))
          )}
          {!streaming && lastAssistant?.payload?.questionCard && (
            <QuestionCard
              card={lastAssistant.payload.questionCard}
              onAnswer={(a) => void send(a)}
              disabled={streaming}
            />
          )}
          {!streaming &&
          !lastAssistant?.payload?.questionCard &&
          lastAssistant?.payload?.suggestedReplies?.length ? (
            <SuggestedReplies
              replies={lastAssistant.payload.suggestedReplies}
              onPick={(r) => void send(r)}
              disabled={streaming}
            />
          ) : null}
          {error && (
            <div className="bg-tone-negative-bg text-tone-negative flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4" /> {t(error)}
              </span>
              <Button size="sm" variant="outline" onClick={retry}>
                <RotateCcw /> {t("common.retry")}
              </Button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {!showChooser && (
        <form onSubmit={onSubmit} className="border-t p-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={
                streaming ? t("chat.composer.placeholderWorking") : t("chat.composer.placeholder")
              }
              rows={1}
              className="max-h-40 min-h-10 resize-none"
              disabled={streaming || Boolean(provider.error)}
              aria-label={t("chat.composer.messageLabel")}
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || !input.trim() || Boolean(provider.error)}
              aria-label={t("chat.composer.send")}
            >
              {streaming ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
            </Button>
          </div>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-3xl text-[11px]">
            {t("chat.composer.footer")}
          </p>
        </form>
      )}
    </div>
  );
}
