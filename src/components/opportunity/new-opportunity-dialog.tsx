"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createOpportunityAction } from "@/actions/opportunities";
import { InputsEditor } from "@/components/opportunity/opportunity-inputs-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import type { OpportunityScoreInputs } from "@/services/scoring/opportunity-score";

const DEFAULT_INPUTS: OpportunityScoreInputs = {
  importance: 5,
  painIntensity: 5,
  frequency: 5,
  gap: 5,
  willingnessToPay: 5,
  alternativeWeakness: 5,
};

export function NewOpportunityDialog({
  open,
  onOpenChange,
  workspaceId,
  pains,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaceId: string;
  pains: Array<{ id: string; label: string; icpId: string; variableId: string }>;
}) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [painId, setPainId] = useState<string>(pains[0]?.id ?? "");
  const [problemStatement, setProblemStatement] = useState("");
  const [metric, setMetric] = useState("");
  const [inputs, setInputs] = useState<OpportunityScoreInputs>(DEFAULT_INPUTS);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const pain = pains.find((p) => p.id === painId);
    const r = await createOpportunityAction({
      workspaceId,
      title,
      painId: pain?.id,
      icpId: pain?.icpId,
      variableId: pain?.variableId,
      problemStatement,
      metric,
      inputs,
    });
    setSaving(false);
    if (!r.ok) {
      toast.error(t(r.error));
      return;
    }
    toast.success(t("opportunity.new.created"));
    onOpenChange(false);
    router.push(`/app/w/${workspaceId}/opportunities/${r.data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("opportunity.new.title")}</DialogTitle>
            <DialogDescription>{t("opportunity.new.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="opp-title">{t("opportunity.new.titleLabel")}</Label>
            <Input
              id="opp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder={t("opportunity.new.titlePlaceholder")}
            />
          </div>
          {pains.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("opportunity.new.pain")}</Label>
              <Select value={painId} onValueChange={setPainId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("opportunity.new.selectPain")} />
                </SelectTrigger>
                <SelectContent>
                  {pains.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label.slice(0, 90)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="opp-problem">{t("opportunity.new.problemStatement")}</Label>
            <Textarea
              id="opp-problem"
              rows={2}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="opp-metric">{t("opportunity.new.metric")}</Label>
            <Input
              id="opp-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder={t("opportunity.new.metricPlaceholder")}
            />
          </div>
          <InputsEditor value={inputs} onChange={setInputs} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving && <Loader2 className="animate-spin" />} {t("opportunity.new.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
