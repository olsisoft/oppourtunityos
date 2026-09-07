"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createAssumptionAction } from "@/actions/assumptions";
import {
  createExperimentAction,
  deleteCausalLinkAction,
  deleteValueChainNodeAction,
  linkEvidenceClaimAction,
  unlinkEvidenceClaimAction,
  upsertCausalLinkAction,
  upsertValueChainNodeAction,
} from "@/actions/value";
import { CausalDistanceBadge, EpistemicBadge } from "@/components/value/epistemic-badge";
import type { LadderSelection } from "@/components/value/value-ladder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { OpportunityWithRelations, WorkspaceGraph } from "@/db/workspaces";
import {
  ASSUMPTION_KIND_LABELS,
  AssumptionKind,
  CRITICALITY_LABELS,
  Criticality,
  VALUE_CHAIN_LEVEL_HELP,
  VALUE_CHAIN_LEVEL_LABELS,
} from "@/domain/enums";
import { CAUSAL_DISTANCE_BY_LEVEL } from "@/services/value/epistemic";

export function ValueNodeSheet({
  selection,
  opportunity,
  graph,
  onClose,
}: {
  selection: LadderSelection | null;
  opportunity: OpportunityWithRelations;
  graph: WorkspaceGraph;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(selection)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {selection && (
          <Body selection={selection} opportunity={opportunity} graph={graph} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  selection,
  opportunity,
  graph,
  onClose,
}: {
  selection: LadderSelection;
  opportunity: OpportunityWithRelations;
  graph: WorkspaceGraph;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const run = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    close = false,
  ) => {
    setSaving(true);
    const r = await fn();
    setSaving(false);
    if (!r.ok) toast.error(r.error ?? "Failed");
    else {
      toast.success(success);
      router.refresh();
      if (close) onClose();
    }
  };

  if (selection.kind === "add-node") {
    return (
      <NodeForm
        level={selection.level}
        initial=""
        saving={saving}
        onSave={(statement) =>
          run(
            () =>
              upsertValueChainNodeAction({
                opportunityId: opportunity.id,
                level: selection.level,
                statement,
              }),
            "Level stated (UNPROVEN until evidence is linked)",
            true,
          )
        }
      />
    );
  }

  if (selection.kind === "add-link") {
    return (
      <LinkForm
        fromLevel={selection.fromLevel}
        toLevel={selection.toLevel}
        initial=""
        criticality="CRITICAL"
        saving={saving}
        onSave={(statement, criticality) =>
          run(
            () =>
              upsertCausalLinkAction({
                opportunityId: opportunity.id,
                fromLevel: selection.fromLevel,
                toLevel: selection.toLevel,
                statement,
                criticality,
              }),
            "Causal assumption stated",
            true,
          )
        }
      />
    );
  }

  if (selection.kind === "node") {
    const node = selection.node;
    return (
      <div className="space-y-5 p-4 pt-10">
        <SheetHeader className="p-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase">
              {VALUE_CHAIN_LEVEL_LABELS[node.level]}
            </span>
            <EpistemicBadge status={node.status} confidence={node.confidence} />
            <CausalDistanceBadge distance={node.causalDistance} />
          </div>
          <SheetTitle className="text-base">{node.statement}</SheetTitle>
          <SheetDescription>
            {VALUE_CHAIN_LEVEL_HELP[node.level]} Status is computed from linked evidence; the
            statement itself is a hypothesis until then.
          </SheetDescription>
        </SheetHeader>
        <NodeForm
          level={node.level}
          initial={node.statement}
          saving={saving}
          inline
          onSave={(statement) =>
            run(
              () =>
                upsertValueChainNodeAction({
                  opportunityId: opportunity.id,
                  level: node.level,
                  statement,
                }),
              "Statement updated",
            )
          }
        />
        <ClaimEvidence
          title="Linked evidence"
          links={node.evidenceLinks}
          graph={graph}
          onLink={(evidenceId, direction) =>
            run(
              () =>
                linkEvidenceClaimAction({
                  evidenceId,
                  claimType: "VALUE_CHAIN_NODE",
                  valueChainNodeId: node.id,
                  direction,
                }),
              "Evidence linked — status recomputed",
            )
          }
          onUnlink={(id) => run(() => unlinkEvidenceClaimAction(id), "Evidence unlinked")}
          saving={saving}
        />
        <LinkedAssumptions
          assumptions={node.assumptions}
          onAdd={(statement, kind, importance) =>
            run(
              () =>
                createAssumptionAction({
                  workspaceId: graph.id,
                  opportunityId: opportunity.id,
                  valueChainNodeId: node.id,
                  statement,
                  kind,
                  importance,
                }),
              "Assumption added",
            )
          }
          saving={saving}
        />
        <div className="flex justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => run(() => deleteValueChainNodeAction(node.id), "Level removed", true)}
          >
            <Trash2 /> Remove level
          </Button>
        </div>
      </div>
    );
  }

  const link = selection.link;
  return (
    <div className="space-y-5 p-4 pt-10">
      <SheetHeader className="p-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase">
            Causal link · {VALUE_CHAIN_LEVEL_LABELS[link.fromNode.level]} →{" "}
            {VALUE_CHAIN_LEVEL_LABELS[link.toNode.level]}
          </span>
          <EpistemicBadge status={link.status} confidence={link.confidence} />
          <Badge variant="outline">{CRITICALITY_LABELS[link.criticality]}</Badge>
        </div>
        <SheetTitle className="text-base">{link.statement}</SheetTitle>
        <SheetDescription>
          This arrow is itself an assumption that can fail. From “{link.fromNode.statement}” to “
          {link.toNode.statement}”. A critical link gates the Proof Frontier.
        </SheetDescription>
      </SheetHeader>
      <LinkForm
        fromLevel={link.fromNode.level}
        toLevel={link.toNode.level}
        initial={link.statement}
        criticality={link.criticality}
        saving={saving}
        inline
        onSave={(statement, criticality) =>
          run(
            () =>
              upsertCausalLinkAction({
                opportunityId: opportunity.id,
                fromLevel: link.fromNode.level,
                toLevel: link.toNode.level,
                statement,
                criticality,
              }),
            "Causal assumption updated",
          )
        }
      />
      <ClaimEvidence
        title="Evidence on this link"
        links={link.evidenceLinks}
        graph={graph}
        onLink={(evidenceId, direction) =>
          run(
            () =>
              linkEvidenceClaimAction({
                evidenceId,
                claimType: "CAUSAL_LINK",
                causalLinkId: link.id,
                direction,
              }),
            "Evidence linked — status recomputed",
          )
        }
        onUnlink={(id) => run(() => unlinkEvidenceClaimAction(id), "Evidence unlinked")}
        saving={saving}
      />
      <LinkedAssumptions
        assumptions={link.assumptions}
        defaultKind="CAUSAL"
        onAdd={(statement, kind, importance) =>
          run(
            () =>
              createAssumptionAction({
                workspaceId: graph.id,
                opportunityId: opportunity.id,
                causalLinkId: link.id,
                statement,
                kind,
                importance,
              }),
            "Assumption added",
          )
        }
        saving={saving}
      />
      <PlanExperiment
        defaultTitle={`Test: ${link.statement.slice(0, 60)}`}
        defaultHypothesis={link.statement}
        saving={saving}
        onPlan={(title, hypothesis, design, successMetric) =>
          run(
            () =>
              createExperimentAction({
                opportunityId: opportunity.id,
                causalLinkId: link.id,
                title,
                hypothesis,
                design,
                successMetric,
              }),
            "Experiment planned",
          )
        }
      />
      <div className="flex justify-between border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => run(() => deleteCausalLinkAction(link.id), "Link removed", true)}
        >
          <Trash2 /> Remove link
        </Button>
      </div>
    </div>
  );
}

function NodeForm({
  level,
  initial,
  onSave,
  saving,
  inline = false,
}: {
  level: keyof typeof VALUE_CHAIN_LEVEL_LABELS;
  initial: string;
  onSave: (statement: string) => void;
  saving: boolean;
  inline?: boolean;
}) {
  const [statement, setStatement] = useState(initial);
  return (
    <form
      className={inline ? "space-y-2" : "space-y-3 p-4 pt-10"}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(statement.trim());
      }}
    >
      {!inline && (
        <SheetHeader className="p-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase">
              {VALUE_CHAIN_LEVEL_LABELS[level]}
            </span>
            <CausalDistanceBadge distance={CAUSAL_DISTANCE_BY_LEVEL[level]} />
          </div>
          <SheetTitle>State this level</SheetTitle>
          <SheetDescription>
            {VALUE_CHAIN_LEVEL_HELP[level]} One sentence. It will be UNPROVEN until evidence is
            linked.
          </SheetDescription>
        </SheetHeader>
      )}
      <Label className="text-xs">Statement</Label>
      <Textarea
        rows={3}
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        required
        minLength={3}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={saving || statement.trim().length < 3 || statement.trim() === initial}
        >
          {saving && <Loader2 className="animate-spin" />} Save
        </Button>
      </div>
    </form>
  );
}

function LinkForm({
  fromLevel,
  toLevel,
  initial,
  criticality: initialCriticality,
  onSave,
  saving,
  inline = false,
}: {
  fromLevel: keyof typeof VALUE_CHAIN_LEVEL_LABELS;
  toLevel: keyof typeof VALUE_CHAIN_LEVEL_LABELS;
  initial: string;
  criticality: Criticality;
  onSave: (statement: string, criticality: Criticality) => void;
  saving: boolean;
  inline?: boolean;
}) {
  const [statement, setStatement] = useState(initial);
  const [criticality, setCriticality] = useState<Criticality>(initialCriticality);
  return (
    <form
      className={inline ? "space-y-2" : "space-y-3 p-4 pt-10"}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(statement.trim(), criticality);
      }}
    >
      {!inline && (
        <SheetHeader className="p-0">
          <span className="text-muted-foreground text-xs uppercase">
            Causal link · {VALUE_CHAIN_LEVEL_LABELS[fromLevel]} →{" "}
            {VALUE_CHAIN_LEVEL_LABELS[toLevel]}
          </span>
          <SheetTitle>State the causal assumption</SheetTitle>
          <SheetDescription>
            Write the belief that must hold for the arrow to work, as a testable statement (“If …,
            then …”).
          </SheetDescription>
        </SheetHeader>
      )}
      <Label className="text-xs">Causal assumption</Label>
      <Textarea
        rows={3}
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        required
        minLength={3}
        placeholder="If high-risk bookings receive adaptive reminders, the no-show rate decreases."
      />
      <div className="flex items-center justify-between gap-3">
        <Select value={criticality} onValueChange={(v) => setCriticality(v as Criticality)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(Criticality).map((c) => (
              <SelectItem key={c} value={c}>
                {CRITICALITY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="sm"
          disabled={
            saving ||
            statement.trim().length < 3 ||
            (statement.trim() === initial && criticality === initialCriticality)
          }
        >
          {saving && <Loader2 className="animate-spin" />} Save
        </Button>
      </div>
    </form>
  );
}

function ClaimEvidence({
  title,
  links,
  graph,
  onLink,
  onUnlink,
  saving,
}: {
  title: string;
  links: Array<{
    id: string;
    direction: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
    evidence: { id: string; sourceTitle: string; type: string; isDemo: boolean; isMocked: boolean };
  }>;
  graph: WorkspaceGraph;
  onLink: (evidenceId: string, direction: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL") => void;
  onUnlink: (claimLinkId: string) => void;
  saving: boolean;
}) {
  const [evidenceId, setEvidenceId] = useState("");
  const [direction, setDirection] = useState<"SUPPORTS" | "CONTRADICTS" | "NEUTRAL">("SUPPORTS");
  const available = graph.evidence.filter((e) => !links.some((l) => l.evidence.id === e.id));
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">
        {title} ({links.length})
      </p>
      {links.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No evidence linked. This claim is a hypothesis; the Proof Frontier cannot pass it.
        </p>
      )}
      <ul className="space-y-1">
        {links.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
          >
            <span className="min-w-0 truncate">
              <span
                className={
                  l.direction === "SUPPORTS"
                    ? "text-tone-positive"
                    : l.direction === "CONTRADICTS"
                      ? "text-tone-negative"
                      : "text-muted-foreground"
                }
              >
                {l.direction.toLowerCase()}
              </span>{" "}
              · {l.evidence.sourceTitle}
              {l.evidence.isDemo && (
                <Badge variant="warning" className="ml-1 px-1 py-0 text-[9px]">
                  DEMO
                </Badge>
              )}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => onUnlink(l.id)}
              disabled={saving}
            >
              unlink
            </button>
          </li>
        ))}
      </ul>
      {available.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={evidenceId} onValueChange={setEvidenceId}>
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue placeholder="Choose evidence to link" />
            </SelectTrigger>
            <SelectContent>
              {available.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.sourceTitle.slice(0, 70)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUPPORTS">Supports</SelectItem>
              <SelectItem value="CONTRADICTS">Contradicts</SelectItem>
              <SelectItem value="NEUTRAL">Neutral</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!evidenceId || saving}
            onClick={() => {
              onLink(evidenceId, direction);
              setEvidenceId("");
            }}
          >
            <Link2 /> Link
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-[11px]">
          Capture evidence in the Evidence tab first, then link it here.
        </p>
      )}
    </div>
  );
}

function LinkedAssumptions({
  assumptions,
  onAdd,
  saving,
  defaultKind = "GENERIC",
}: {
  assumptions: Array<{
    id: string;
    statement: string;
    kind: AssumptionKind;
    status: string;
    importance: number;
  }>;
  onAdd: (statement: string, kind: AssumptionKind, importance: number) => void;
  saving: boolean;
  defaultKind?: AssumptionKind;
}) {
  const [statement, setStatement] = useState("");
  const [kind, setKind] = useState<AssumptionKind>(defaultKind);
  const [importance, setImportance] = useState(8);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">Assumptions ({assumptions.length})</p>
      <ul className="space-y-1">
        {assumptions.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
          >
            <span>
              <Badge variant="outline" className="mr-1 px-1 py-0 text-[9px]">
                {ASSUMPTION_KIND_LABELS[a.kind]}
              </Badge>
              {a.statement}
            </span>
            <Badge
              variant={
                a.status === "SUPPORTED"
                  ? "positive"
                  : a.status === "CONTRADICTED"
                    ? "negative"
                    : "muted"
              }
              className="shrink-0"
            >
              {a.status} · {a.importance}
            </Badge>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(statement.trim(), kind, importance);
          setStatement("");
        }}
      >
        <Input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Add the belief that must hold here…"
          minLength={3}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as AssumptionKind)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AssumptionKind).map((k) => (
                <SelectItem key={k} value={k}>
                  {ASSUMPTION_KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-xs whitespace-nowrap">Importance {importance}</Label>
          <input
            type="range"
            min={0}
            max={10}
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
            className="w-24 accent-current"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={saving || statement.trim().length < 3}
          >
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}

function PlanExperiment({
  defaultTitle,
  defaultHypothesis,
  onPlan,
  saving,
}: {
  defaultTitle: string;
  defaultHypothesis: string;
  onPlan: (title: string, hypothesis: string, design: string, successMetric: string) => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [hypothesis, setHypothesis] = useState(defaultHypothesis);
  const [design, setDesign] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FlaskConical /> Plan an experiment on this link
      </Button>
    );
  }
  return (
    <form
      className="space-y-2 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onPlan(title.trim(), hypothesis.trim(), design.trim(), successMetric.trim());
        setOpen(false);
      }}
    >
      <p className="text-xs font-semibold">Experiment</p>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
      />
      <Textarea
        rows={2}
        value={hypothesis}
        onChange={(e) => setHypothesis(e.target.value)}
        placeholder="Falsifiable hypothesis"
        required
      />
      <Textarea
        rows={2}
        value={design}
        onChange={(e) => setDesign(e.target.value)}
        placeholder="Design: with/without or before/after comparison…"
      />
      <Input
        value={successMetric}
        onChange={(e) => setSuccessMetric(e.target.value)}
        placeholder="Success metric"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Plan
        </Button>
      </div>
    </form>
  );
}
