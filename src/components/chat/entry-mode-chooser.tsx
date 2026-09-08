"use client";

import { useState } from "react";
import { Compass, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EntryMode } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function EntryModeChooser({
  onChoose,
  disabled,
  defaultIntent,
}: {
  onChoose: (mode: EntryMode, message: string) => void;
  disabled?: boolean;
  defaultIntent?: "discover" | "validate";
}) {
  const t = useT();
  const [mode, setMode] = useState<EntryMode | null>(
    defaultIntent === "validate" ? "HAS_IDEA" : null,
  );
  const [idea, setIdea] = useState("");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("chat.entry.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("chat.entry.subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          icon={<Compass className="size-5" />}
          title={t("chat.entry.noIdea.title")}
          description={t("chat.entry.noIdea.description")}
          selected={mode === "NO_IDEA"}
          onClick={() => setMode("NO_IDEA")}
          disabled={disabled}
        />
        <ChoiceCard
          icon={<Lightbulb className="size-5" />}
          title={t("chat.entry.hasIdea.title")}
          description={t("chat.entry.hasIdea.description")}
          selected={mode === "HAS_IDEA"}
          onClick={() => setMode("HAS_IDEA")}
          disabled={disabled}
        />
      </div>
      {mode === "HAS_IDEA" && (
        <div className="space-y-2">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={t("chat.entry.hasIdea.placeholder")}
            rows={3}
            autoFocus
            disabled={disabled}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => onChoose("HAS_IDEA", idea.trim())}
              disabled={disabled || idea.trim().length < 5}
            >
              {t("chat.entry.hasIdea.submit")}
            </Button>
          </div>
        </div>
      )}
      {mode === "NO_IDEA" && (
        <div className="flex justify-end">
          <Button
            onClick={() => onChoose("NO_IDEA", t("chat.entry.noIdea.message"))}
            disabled={disabled}
          >
            {t("chat.entry.noIdea.submit")}
          </Button>
        </div>
      )}
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  selected,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "bg-card flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors disabled:opacity-50",
        selected ? "border-foreground ring-foreground/10 ring-2" : "hover:bg-accent",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
    </button>
  );
}
