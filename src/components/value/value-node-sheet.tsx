"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createAssumptionAction } from "@/actions/assumptions";
import {
  deleteCausalLinkAction,
  deleteValueChainNodeAction,
  linkEvidenceClaimAction,
  unlinkEvidenceClaimAction,
  upsertCausalLinkAction,
  upsertValueChainNodeAction,
} from "@/actions/value";
import { CausalDistanceBadge, EpistemicBadge } from "@/components/value/epistemic-badge";
import { ExperimentPlanDialog } from "@/components/value/experiment-plan-dialog";
import { FitBadge, GeneralizationBadge, readFit } from "@/components/value/fit-badge";
import { deriveOpportunityInsights } from "@/services/scoring/opportunity-insights";
import type { LadderSelection } from "@/components/value/value-ladder";
import { highAdmissibilitySources } from "@/services/value/admissibility";
import { claimTypeForLevel, claimTypeForLink } from "@/services/value/claim-taxonomy";
import {
  FRONTIER_DESIGN_REQUIRED,
  FRONTIER_FIT_THRESHOLDS,
  FRONTIER_THRESHOLDS,
  type FrontierClaimSummary,
  type FrontierRungState,
  type ProofRung,
} from "@/services/value/proof-frontier";
import { describeScope } from "@/services/value/scope";
import type {
  ClaimType,
  EvidenceAdmissibility,
  EvidenceSourceType,
  ExperimentDesignLevel,
  GeneralizationStatus,
  ValueChainLevel,
} from "@/generated/prisma/enums";
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
import { AssumptionKind, Criticality } from "@/domain/enums";
import { useLocale, useT } from "@/i18n/client";
import { isSystemMessage, type LocalizedText } from "@/i18n/messages";
import { CAUSAL_DISTANCE_BY_LEVEL } from "@/services/value/epistemic";

/** The persisted inference of a claim: the structured message when present, else the text. */
function inferenceOf(row: {
  inference: string | null;
  inferenceMessage?: unknown;
}): LocalizedText | null {
  return isSystemMessage(row.inferenceMessage) ? row.inferenceMessage : row.inference;
}

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
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const level = (l: ValueChainLevel) => t(`labels.valueChainLevel.${l}`);

  const run = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    close = false,
  ) => {
    setSaving(true);
    const r = await fn();
    setSaving(false);
    if (!r.ok) toast.error(r.error ? t(r.error) : t("value.sheet.toast.failed"));
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
            t("value.sheet.toast.levelStated"),
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
            t("value.sheet.toast.causalStated"),
            true,
          )
        }
      />
    );
  }

  const insights = deriveOpportunityInsights(opportunity, graph.mechanisms.length);
  const rungOf = (rung: ProofRung): FrontierRungState | undefined =>
    insights.frontier?.rungs.find((r) => r.rung === rung);

  if (selection.kind === "node") {
    const node = selection.node;
    const claimType = claimTypeForLevel(node.level);
    const rung = rungOf(node.level as ProofRung);
    return (
      <div className="space-y-5 p-4 pt-10">
        <SheetHeader className="p-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase">{level(node.level)}</span>
            <EpistemicBadge status={node.status} confidence={node.confidence} />
            <CausalDistanceBadge distance={node.causalDistance} />
            <GeneralizationBadge status={node.generalization} />
          </div>
          <SheetTitle className="text-base">{node.statement}</SheetTitle>
          <SheetDescription>
            {t("value.sheet.nodeDescription", {
              help: t(`labels.valueChainLevelHelp.${node.level}`),
            })}
          </SheetDescription>
        </SheetHeader>
        <ClaimDetail
          claimType={claimType}
          rung={node.level as ProofRung}
          summary={rung?.summary ?? null}
          eligible={rung?.eligible ?? false}
          blockers={rung?.eligible ? [] : (rung?.reasons ?? [])}
          inference={inferenceOf(node)}
          generalization={node.generalization}
        />
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
              t("value.sheet.toast.statementUpdated"),
            )
          }
        />
        <ClaimEvidence
          title={t("value.sheet.linkedEvidence")}
          links={node.evidenceLinks}
          graph={graph}
          onLink={(evidenceId, direction) =>
            run(
              () =>
                linkEvidenceClaimAction({
                  evidenceId,
                  claimType,
                  valueChainNodeId: node.id,
                  direction,
                }),
              t("value.sheet.toast.evidenceLinked"),
            )
          }
          onUnlink={(id) =>
            run(() => unlinkEvidenceClaimAction(id), t("value.sheet.toast.evidenceUnlinked"))
          }
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
              t("value.sheet.toast.assumptionAdded"),
            )
          }
          saving={saving}
        />
        <div className="flex justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() =>
              run(
                () => deleteValueChainNodeAction(node.id),
                t("value.sheet.toast.levelRemoved"),
                true,
              )
            }
          >
            <Trash2 /> {t("value.sheet.removeLevel")}
          </Button>
        </div>
      </div>
    );
  }

  const link = selection.link;
  const linkClaimType = claimTypeForLink(link.fromNode.level, link.toNode.level);
  const linkRung = rungOf(link.toNode.level as ProofRung);
  const linkState = linkRung?.linkFromPrevious ?? null;
  return (
    <div className="space-y-5 p-4 pt-10">
      <SheetHeader className="p-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase">
            {t("value.sheet.causalLink", {
              from: level(link.fromNode.level),
              to: level(link.toNode.level),
            })}
          </span>
          <EpistemicBadge status={link.status} confidence={link.confidence} />
          <Badge variant="outline">{t(`labels.criticality.${link.criticality}`)}</Badge>
          <GeneralizationBadge status={link.generalization} />
        </div>
        <SheetTitle className="text-base">{link.statement}</SheetTitle>
        <SheetDescription>
          {t("value.sheet.linkDescription", {
            from: link.fromNode.statement,
            to: link.toNode.statement,
          })}
        </SheetDescription>
      </SheetHeader>
      <ClaimDetail
        claimType={linkClaimType}
        rung={link.toNode.level as ProofRung}
        summary={linkState?.summary ?? null}
        eligible={linkState?.eligible ?? false}
        blockers={linkState?.eligible ? [] : (linkState?.reasons ?? [])}
        inference={inferenceOf(link)}
        generalization={link.generalization}
        isLink
      />
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
            t("value.sheet.toast.causalUpdated"),
          )
        }
      />
      <ClaimEvidence
        title={t("value.sheet.evidenceOnLink")}
        links={link.evidenceLinks}
        graph={graph}
        onLink={(evidenceId, direction) =>
          run(
            () =>
              linkEvidenceClaimAction({
                evidenceId,
                claimType: linkClaimType,
                causalLinkId: link.id,
                direction,
              }),
            t("value.sheet.toast.evidenceLinked"),
          )
        }
        onUnlink={(id) =>
          run(() => unlinkEvidenceClaimAction(id), t("value.sheet.toast.evidenceUnlinked"))
        }
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
            t("value.sheet.toast.assumptionAdded"),
          )
        }
        saving={saving}
      />
      <PlanExperimentButton
        opportunity={opportunity}
        graph={graph}
        causalLinkId={link.id}
        statement={link.statement}
      />
      <div className="flex justify-between border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() =>
            run(() => deleteCausalLinkAction(link.id), t("value.sheet.toast.linkRemoved"), true)
          }
        >
          <Trash2 /> {t("value.sheet.removeLink")}
        </Button>
      </div>
    </div>
  );
}

/**
 * CLAIM DETAIL — the claim, its type, status, evidence fitness, current
 * inference, scope, generalization, frontier effect and what would
 * strengthen it. Everything shown here is computed; nothing is editable.
 */
function ClaimDetail({
  claimType,
  rung,
  summary,
  eligible,
  blockers,
  inference,
  generalization,
  isLink = false,
}: {
  claimType: ClaimType;
  rung: ProofRung;
  summary: FrontierClaimSummary | null;
  eligible: boolean;
  blockers: LocalizedText[];
  inference: LocalizedText | null;
  generalization: GeneralizationStatus;
  isLink?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const requiredDesign = isLink ? FRONTIER_DESIGN_REQUIRED[rung] : undefined;
  const strengthen = highAdmissibilitySources(claimType).slice(0, 5);
  const designLabel = (d: ExperimentDesignLevel) => t(`labels.designLevel.${d}`).toLowerCase();
  const sourceLabel = (s: EvidenceSourceType) => t(`labels.evidenceSourceType.${s}`).toLowerCase();
  const scope = summary?.scope
    ? describeScope(summary.scope, locale)
    : summary?.scopeText
      ? t(summary.scopeText)
      : null;
  return (
    <div className="space-y-2 rounded-md border p-3 text-xs">
      <p className="text-[10px] font-semibold tracking-wider uppercase">
        {t("value.sheet.claim.title")}
      </p>
      <p>
        <span className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("value.sheet.claim.claim")}
        </span>{" "}
        {t(`labels.claimStatement.${claimType}`).replace(/^./, (c) => c.toUpperCase())}
        <span className="text-muted-foreground">
          {" "}
          · {t(`labels.claimType.${claimType}`).toLowerCase()}
        </span>
      </p>
      {inference && (
        <p className="bg-muted/60 rounded px-2 py-1.5">
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("value.sheet.claim.inference")}
          </span>{" "}
          {t(inference)}
        </p>
      )}
      <div className="grid gap-x-3 gap-y-1 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("value.sheet.claim.fit")}
          </p>
          <p>
            {summary && summary.total > 0
              ? t("value.sheet.claim.fitSummary", {
                  fit: summary.bestFit,
                  admissible: summary.admissible,
                  total: summary.total,
                })
              : t("value.sheet.claim.noEvidence")}
          </p>
          <p className="text-muted-foreground">
            {t("value.sheet.claim.required", {
              fit: FRONTIER_FIT_THRESHOLDS[rung],
              confidence: FRONTIER_THRESHOLDS[rung],
              withDesign: Boolean(requiredDesign),
              design: requiredDesign ? designLabel(requiredDesign) : "",
            })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("value.sheet.claim.scope")}
          </p>
          <p>
            {scope ??
              (summary?.observed
                ? t("value.sheet.claim.scopeNotRecorded")
                : t("value.sheet.claim.scopeNotObserved"))}
          </p>
          <p className="text-muted-foreground">
            {t("value.sheet.claim.origins", {
              count: summary?.independentOrigins ?? 0,
              withDesign: Boolean(summary?.designLevel),
              design: summary?.designLevel ? designLabel(summary.designLevel) : "",
            })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("value.sheet.claim.generalization")}
          </p>
          <GeneralizationBadge status={generalization} className="mt-0.5" />
          {summary?.generalizationGap && (
            <p className="text-muted-foreground mt-0.5">{t(summary.generalizationGap)}</p>
          )}
        </div>
      </div>
      {summary?.nextGeneralizationQuestion && (
        <p>
          <span className="text-muted-foreground font-mono text-[10px] uppercase">
            {t("value.sheet.claim.nextGeneralizationQuestion")}
          </span>{" "}
          {t(summary.nextGeneralizationQuestion)}
        </p>
      )}
      <div>
        <p className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("value.sheet.claim.frontierEffect")}
        </p>
        {eligible ? (
          <p>{t("value.sheet.claim.canCarry")}</p>
        ) : blockers.length ? (
          <ul className="list-disc space-y-0.5 pl-4">
            {blockers.slice(0, 3).map((b, i) => (
              <li key={i}>{t(b)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("value.sheet.claim.reachableLater")}</p>
        )}
      </div>
      <div>
        <p className="text-muted-foreground font-mono text-[10px] uppercase">
          {t("value.sheet.claim.strengthen")}
        </p>
        <p>
          {strengthen.length
            ? t("value.sheet.claim.highAdmissibility", {
                sources: strengthen.map(sourceLabel).join(", "),
              })
            : t("value.sheet.claim.noHighAdmissibility")}
          {summary?.lowFitOnly ? ` ${t("value.sheet.claim.lowFitWarning")}` : ""}
          {requiredDesign
            ? ` ${t("value.sheet.claim.causalDesign", { design: designLabel(requiredDesign) })}`
            : ""}
        </p>
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
  level: ValueChainLevel;
  initial: string;
  onSave: (statement: string) => void;
  saving: boolean;
  inline?: boolean;
}) {
  const t = useT();
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
              {t(`labels.valueChainLevel.${level}`)}
            </span>
            <CausalDistanceBadge distance={CAUSAL_DISTANCE_BY_LEVEL[level]} />
          </div>
          <SheetTitle>{t("value.sheet.nodeForm.title")}</SheetTitle>
          <SheetDescription>
            {t("value.sheet.nodeForm.description", {
              help: t(`labels.valueChainLevelHelp.${level}`),
            })}
          </SheetDescription>
        </SheetHeader>
      )}
      <Label className="text-xs">{t("value.sheet.nodeForm.statement")}</Label>
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
          {saving && <Loader2 className="animate-spin" />} {t("value.sheet.nodeForm.save")}
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
  fromLevel: ValueChainLevel;
  toLevel: ValueChainLevel;
  initial: string;
  criticality: Criticality;
  onSave: (statement: string, criticality: Criticality) => void;
  saving: boolean;
  inline?: boolean;
}) {
  const t = useT();
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
            {t("value.sheet.causalLink", {
              from: t(`labels.valueChainLevel.${fromLevel}`),
              to: t(`labels.valueChainLevel.${toLevel}`),
            })}
          </span>
          <SheetTitle>{t("value.sheet.linkForm.title")}</SheetTitle>
          <SheetDescription>{t("value.sheet.linkForm.description")}</SheetDescription>
        </SheetHeader>
      )}
      <Label className="text-xs">{t("value.sheet.linkForm.label")}</Label>
      <Textarea
        rows={3}
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        required
        minLength={3}
        placeholder={t("value.sheet.linkForm.placeholder")}
      />
      <div className="flex items-center justify-between gap-3">
        <Select value={criticality} onValueChange={(v) => setCriticality(v as Criticality)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(Criticality).map((c) => (
              <SelectItem key={c} value={c}>
                {t(`labels.criticality.${c}`)}
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
          {saving && <Loader2 className="animate-spin" />} {t("value.sheet.nodeForm.save")}
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
    fitScore: number | null;
    admissibility: EvidenceAdmissibility | null;
    fitBreakdown: unknown;
    evidence: {
      id: string;
      sourceTitle: string;
      type: string;
      sourceType: EvidenceSourceType;
      isDemo: boolean;
      isMocked: boolean;
    };
  }>;
  graph: WorkspaceGraph;
  onLink: (evidenceId: string, direction: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL") => void;
  onUnlink: (claimLinkId: string) => void;
  saving: boolean;
}) {
  const t = useT();
  const [evidenceId, setEvidenceId] = useState("");
  const [direction, setDirection] = useState<"SUPPORTS" | "CONTRADICTS" | "NEUTRAL">("SUPPORTS");
  const available = graph.evidence.filter((e) => !links.some((l) => l.evidence.id === e.id));
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">
        {t("value.sheet.evidence.title", { title, count: links.length })}
      </p>
      {links.length === 0 && (
        <p className="text-muted-foreground text-xs">{t("value.sheet.evidence.empty")}</p>
      )}
      <ul className="space-y-1">
        {links.map((l) => {
          const fit = readFit(l);
          const summary = fit.summary
            ? t(fit.summary).replace(/^[A-Z ]+ fit \(\d+\/100\) for "[^"]*" — /, "")
            : null;
          return (
            <li key={l.id} className="space-y-0.5 rounded-md border px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
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
                    {t(`value.sheet.evidence.direction.${l.direction}`)}
                  </span>{" "}
                  · {l.evidence.sourceTitle}
                  {l.evidence.isDemo && (
                    <Badge variant="warning" className="ml-1 px-1 py-0 text-[9px]">
                      {t("value.sheet.evidence.demo")}
                    </Badge>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <FitBadge fit={fit} />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => onUnlink(l.id)}
                    disabled={saving}
                  >
                    {t("value.sheet.evidence.unlink")}
                  </button>
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                {t(`labels.evidenceSourceType.${l.evidence.sourceType}`)}
                {summary ? ` — ${summary}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
      {available.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={evidenceId} onValueChange={setEvidenceId}>
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue placeholder={t("value.sheet.evidence.choose")} />
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
              <SelectItem value="SUPPORTS">
                {t("value.sheet.evidence.directionOption.SUPPORTS")}
              </SelectItem>
              <SelectItem value="CONTRADICTS">
                {t("value.sheet.evidence.directionOption.CONTRADICTS")}
              </SelectItem>
              <SelectItem value="NEUTRAL">
                {t("value.sheet.evidence.directionOption.NEUTRAL")}
              </SelectItem>
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
            <Link2 /> {t("value.sheet.evidence.link")}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-[11px]">
          {t("value.sheet.evidence.captureFirst")}
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
  const t = useT();
  const [statement, setStatement] = useState("");
  const [kind, setKind] = useState<AssumptionKind>(defaultKind);
  const [importance, setImportance] = useState(8);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">
        {t("value.sheet.assumptions.title", { count: assumptions.length })}
      </p>
      <ul className="space-y-1">
        {assumptions.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
          >
            <span>
              <Badge variant="outline" className="mr-1 px-1 py-0 text-[9px]">
                {t(`labels.assumptionKind.${a.kind}`)}
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
              {t("value.sheet.assumptions.statusImportance", {
                status: t.has(`labels.assumptionStatus.${a.status}`)
                  ? t(`labels.assumptionStatus.${a.status}`).toUpperCase()
                  : a.status,
                importance: a.importance,
              })}
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
          placeholder={t("value.sheet.assumptions.placeholder")}
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
                  {t(`labels.assumptionKind.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-xs whitespace-nowrap">
            {t("value.sheet.assumptions.importance", { importance })}
          </Label>
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
            {t("value.sheet.assumptions.add")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PlanExperimentButton({
  opportunity,
  graph,
  causalLinkId,
  statement,
}: {
  opportunity: OpportunityWithRelations;
  graph: WorkspaceGraph;
  causalLinkId: string;
  statement: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const insights = deriveOpportunityInsights(opportunity, graph.mechanisms.length);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FlaskConical /> {t("value.sheet.planOnLink")}
      </Button>
      {open && (
        <ExperimentPlanDialog
          open={open}
          onOpenChange={setOpen}
          opportunity={opportunity}
          insights={insights}
          prefill={{
            causalLinkId,
            hypothesis: statement,
            title: t("value.sheet.experimentTitle", { statement: statement.slice(0, 80) }),
            experimentType: "MANUAL_WORKFLOW_TEST",
          }}
        />
      )}
    </>
  );
}
