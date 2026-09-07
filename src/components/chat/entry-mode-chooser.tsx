"use client";

import { useState } from "react";
import { Compass, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EntryMode } from "@/generated/prisma/enums";
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
  const [mode, setMode] = useState<EntryMode | null>(
    defaultIntent === "validate" ? "HAS_IDEA" : null,
  );
  const [idea, setIdea] = useState("");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">How do you want to start?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Either way we start from a problem, never from a product. The conversation builds a
          structured opportunity model on the right.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          icon={<Compass className="size-5" />}
          title="I don't know what to build"
          description="Start from the industries you understand and the people you can reach. We map markets, ICPs and valuable variables before any solution."
          selected={mode === "NO_IDEA"}
          onClick={() => setMode("NO_IDEA")}
          disabled={disabled}
        />
        <ChoiceCard
          icon={<Lightbulb className="size-5" />}
          title="I already have an idea"
          description="We reverse-engineer it: product → intended outcome → variable → ICP → pain → trigger → evidence. The idea may turn out weak."
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
            placeholder='Describe the idea in one sentence, e.g. "AI receptionist for dental clinics"'
            rows={3}
            autoFocus
            disabled={disabled}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => onChoose("HAS_IDEA", idea.trim())}
              disabled={disabled || idea.trim().length < 5}
            >
              Decompose the idea
            </Button>
          </div>
        </div>
      )}
      {mode === "NO_IDEA" && (
        <div className="flex justify-end">
          <Button
            onClick={() => onChoose("NO_IDEA", "I don't know what to build")}
            disabled={disabled}
          >
            Start market discovery
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
