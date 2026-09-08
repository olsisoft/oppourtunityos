"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { generateInterviewGuideAction } from "@/actions/opportunities";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { LocalizedText } from "@/i18n/messages";

/**
 * An interview guide as rendered: the template guide's sentences may be
 * system messages, the AI guide's are plain strings.
 */
export interface InterviewGuideView {
  title: LocalizedText;
  targetProfile: LocalizedText;
  sections: Array<{ name: LocalizedText; questions: LocalizedText[] }>;
  listenFor: LocalizedText[];
  avoid: LocalizedText[];
  source?: string;
  generatedAt?: string;
}

export function InterviewGuideSection({
  opportunityId,
  guide,
  verdict,
}: {
  opportunityId: string;
  guide: InterviewGuideView | null;
  verdict: string;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const r = await generateInterviewGuideAction(opportunityId);
    setLoading(false);
    if (!r.ok) toast.error(t(r.error));
    else {
      toast.success(t("opportunity.guide.ready"));
      router.refresh();
    }
  };

  if (!guide) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={
          verdict === "INTERVIEW" || verdict === "TEST"
            ? t("opportunity.guide.empty.readyTitle")
            : t("opportunity.guide.empty.title")
        }
        description={t("opportunity.guide.empty.description")}
        action={
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} {t("opportunity.guide.generate")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{t(guide.title)}</p>
          <p className="text-muted-foreground text-xs">{t(guide.targetProfile)}</p>
        </div>
        <div className="flex items-center gap-2">
          {guide.source && (
            <Badge variant="muted">
              {guide.source === "ai"
                ? t("opportunity.guide.source.ai")
                : t("opportunity.guide.source.template")}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} {t("opportunity.guide.regenerate")}
          </Button>
        </div>
      </div>
      {guide.sections.map((s, si) => (
        <div key={si}>
          <p className="text-xs font-semibold tracking-wider uppercase">{t(s.name)}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {s.questions.map((q, qi) => (
              <li key={qi}>{t(q)}</li>
            ))}
          </ol>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold">{t("opportunity.guide.listenFor")}</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {guide.listenFor.map((x, i) => (
              <li key={i}>{t(x)}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold">{t("opportunity.guide.avoid")}</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {guide.avoid.map((x, i) => (
              <li key={i}>{t(x)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
