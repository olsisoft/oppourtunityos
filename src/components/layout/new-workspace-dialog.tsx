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

export function NewWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createWorkspaceAction, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New opportunity discovery</DialogTitle>
            <DialogDescription>
              A workspace holds one discovery project: market, ICPs, variables, pains, evidence and
              opportunities. You choose how to start inside the conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              name="name"
              placeholder="e.g. Dental clinics, Restaurants, Cybersecurity"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-desc">Notes (optional)</Label>
            <Textarea
              id="ws-desc"
              name="description"
              placeholder="Why this space? Any access or constraints?"
              rows={3}
            />
          </div>
          {state && !state.ok && <p className="text-destructive text-sm">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Create workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
