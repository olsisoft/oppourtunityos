"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { createWorkspaceAction } from "@/actions/workspaces";
import type { ActionResult } from "@/actions/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";

export function NewWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createWorkspaceAction, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("layout.newWorkspace.title")}</DialogTitle>
            <DialogDescription>{t("layout.newWorkspace.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">{t("layout.newWorkspace.name")}</Label>
            <Input
              id="ws-name"
              name="name"
              placeholder={t("layout.newWorkspace.namePlaceholder")}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-desc">{t("layout.newWorkspace.notes")}</Label>
            <Textarea
              id="ws-desc"
              name="description"
              placeholder={t("layout.newWorkspace.notesPlaceholder")}
              rows={3}
            />
          </div>
          {state && !state.ok && <p className="text-destructive text-sm">{t(state.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {t("layout.newWorkspace.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
