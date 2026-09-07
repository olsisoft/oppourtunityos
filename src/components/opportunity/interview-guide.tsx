"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { generateInterviewGuideAction } from "@/actions/opportunities";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InterviewGuide } from "@/services/ai/schemas";

export function InterviewGuideSection({
  opportunityId,
  guide,
  verdict,
}: {
  opportunityId: string;
  guide: (InterviewGuide & { source?: string; generatedAt?: string }) | null;
  verdict: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const r = await generateInterviewGuideAction(opportunityId);
    setLoading(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Interview guide ready");
      router.refresh();
    }
  };

  if (!guide) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={
          verdict === "INTERVIEW" || verdict === "TEST"
            ? "Ready for customer discovery"
            : "No interview guide yet"
        }
        description="Questions focus on past behavior: the last time it happened, what it cost, what they bought. Never “would you pay for this?”. Save notes as evidence afterwards."
        action={
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Generate interview guide
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{guide.title}</p>
          <p className="text-muted-foreground text-xs">{guide.targetProfile}</p>
        </div>
        <div className="flex items-center gap-2">
          {guide.source && (
            <Badge variant="muted">{guide.source === "ai" ? "AI-assisted" : "template"}</Badge>
          )}
          <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Regenerate
          </Button>
        </div>
      </div>
      {guide.sections.map((s) => (
        <div key={s.name}>
          <p className="text-xs font-semibold tracking-wider uppercase">{s.name}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {s.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold">Listen for</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {guide.listenFor.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold">Avoid</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {guide.avoid.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
