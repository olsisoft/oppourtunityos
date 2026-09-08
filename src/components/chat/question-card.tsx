"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { QuestionCard as QuestionCardData } from "@/services/ai/schemas";

export function QuestionCard({
  card,
  onAnswer,
  disabled,
}: {
  card: QuestionCardData;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  if (!card.options.length) return null;
  return (
    <div className="bg-muted/50 rounded-lg border p-3">
      <p className="text-xs font-medium">{card.question}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {card.options.map((option) => (
          <Button
            key={option}
            size="sm"
            variant="outline"
            className="bg-background h-auto py-1.5 text-left whitespace-normal"
            onClick={() => onAnswer(option)}
            disabled={disabled}
          >
            {option}
          </Button>
        ))}
      </div>
      {card.allowFreeText && (
        <p className="text-muted-foreground mt-2 text-[11px]">{t("chat.question.freeTextHint")}</p>
      )}
    </div>
  );
}

export function SuggestedReplies({
  replies,
  onPick,
  disabled,
}: {
  replies: string[];
  onPick: (reply: string) => void;
  disabled?: boolean;
}) {
  if (!replies.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {replies.map((r) => (
        <Button
          key={r}
          size="sm"
          variant="secondary"
          className="h-auto py-1 text-left text-xs whitespace-normal"
          onClick={() => onPick(r)}
          disabled={disabled}
        >
          {r}
        </Button>
      ))}
    </div>
  );
}
