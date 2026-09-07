"use client";

import { Bot, User } from "lucide-react";

import { SimpleMarkdown } from "@/components/chat/simple-markdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AppliedCounts {
  markets?: number;
  icps?: number;
  variables?: number;
  pains?: number;
  triggers?: number;
  alternatives?: number;
  mechanisms?: number;
  assumptions?: number;
  opportunities?: number;
}

const APPLIED_LABELS: Array<[keyof AppliedCounts, string]> = [
  ["markets", "market"],
  ["icps", "ICP"],
  ["variables", "variable"],
  ["pains", "pain"],
  ["triggers", "trigger"],
  ["alternatives", "alternative"],
  ["mechanisms", "mechanism"],
  ["opportunities", "opportunity"],
  ["assumptions", "assumption"],
];

export function appliedSummaryText(applied: AppliedCounts | null | undefined): string | null {
  if (!applied) return null;
  const parts = APPLIED_LABELS.filter(([k]) => (applied[k] ?? 0) > 0).map(([k, label]) => {
    const n = applied[k] ?? 0;
    if (n === 1) return `1 ${label}`;
    return `${n} ${label === "opportunity" ? "opportunities" : `${label}s`}`;
  });
  if (!parts.length) return null;
  return parts.join(", ");
}

export function MessageBubble({
  role,
  content,
  streaming,
  applied,
  isMock,
}: {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  streaming?: boolean;
  applied?: AppliedCounts | null;
  isMock?: boolean;
}) {
  const isUser = role === "USER";
  const summary = appliedSummaryText(applied);
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
          isUser ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={cn("max-w-[85%] min-w-0 space-y-2", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-lg px-3.5 py-2.5 text-left",
            isUser ? "bg-foreground text-background" : "bg-card border",
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <>
              <SimpleMarkdown text={content || (streaming ? "…" : "")} />
              {streaming && (
                <span className="bg-foreground/60 ml-0.5 inline-block h-3.5 w-1.5 animate-pulse align-middle" />
              )}
            </>
          )}
        </div>
        {!isUser && (summary || isMock) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {summary && (
              <Badge variant="info" className="font-normal">
                Added to workspace: {summary}
              </Badge>
            )}
            {isMock && (
              <Badge variant="muted" className="font-normal">
                mock provider
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
