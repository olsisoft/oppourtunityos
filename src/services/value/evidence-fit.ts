/**
 * Evidence Fitness — "does this evidence fit THIS claim?" Existence of
 * evidence never implies fitness; fitness is claim-specific, decomposable and
 * deterministic. The fit score bounds how much a piece of evidence can move
 * a claim: low-fit evidence informs, it never dominates.
 *
 *   fit = Σ weight_i × dimension_i − limitations penalty, capped by admissibility
 *
 * Dimensions (0–1): admissibility, directness, method quality, source
 * independence, scope match, sample relevance, recency. Weights depend on the
 * nature of the claim (existence, quantitative, outcome, causal, behavioral).
 */
import type {
  ClaimType,
  EvidenceAdmissibility,
  EvidenceSourceType,
  ExperimentDesignLevel,
  InternalValidity,
} from "@/generated/prisma/enums";
import { clamp } from "@/lib/utils";
import {
  admissibility,
  ADMISSIBILITY_FIT_CAP,
  ADMISSIBILITY_LABELS,
  ADMISSIBILITY_VALUE,
  ADMISSIBILITY_VERSION,
} from "./admissibility";
import { claimNature, CLAIM_STATEMENTS, type ClaimNature } from "./claim-taxonomy";
import {
  IMPLIED_DESIGN_LEVEL,
  METHOD_QUALITY_BASE,
  sourceFamily,
  THIRD_PARTY_FAMILIES,
} from "./evidence-sources";
import {
  DESIGN_CAUSAL_FACTOR,
  DESIGN_LEVEL_LABELS,
  INTERNAL_VALIDITY_LABELS,
  VALIDITY_FACTOR,
} from "./experimental-validity";
import { scopeMatch, type Scope, type ScopeMatchResult } from "./scope";

export const FIT_VERSION = `fit-1.0/matrix-${ADMISSIBILITY_VERSION}`;

export type FitDimensionKey =
  | "admissibility"
  | "directness"
  | "methodQuality"
  | "independence"
  | "scopeMatch"
  | "sampleRelevance"
  | "recency";

export const FIT_DIMENSION_LABELS: Record<FitDimensionKey, string> = {
  admissibility: "Admissibility",
  directness: "Directness",
  methodQuality: "Method quality",
  independence: "Source independence",
  scopeMatch: "Scope match",
  sampleRelevance: "Sample relevance",
  recency: "Recency",
};

/** Weights per claim nature (sum = 100). */
export const FIT_WEIGHTS: Record<ClaimNature, Record<FitDimensionKey, number>> = {
  EXISTENCE: {
    admissibility: 35,
    directness: 20,
    methodQuality: 15,
    independence: 10,
    scopeMatch: 10,
    sampleRelevance: 5,
    recency: 5,
  },
  QUANTITATIVE: {
    admissibility: 30,
    directness: 15,
    methodQuality: 20,
    independence: 10,
    scopeMatch: 10,
    sampleRelevance: 10,
    recency: 5,
  },
  OUTCOME: {
    admissibility: 30,
    directness: 15,
    methodQuality: 20,
    independence: 10,
    scopeMatch: 10,
    sampleRelevance: 10,
    recency: 5,
  },
  CAUSAL: {
    admissibility: 35,
    directness: 10,
    methodQuality: 25,
    independence: 10,
    scopeMatch: 10,
    sampleRelevance: 5,
    recency: 5,
  },
  BEHAVIORAL: {
    admissibility: 40,
    directness: 15,
    methodQuality: 15,
    independence: 10,
    scopeMatch: 10,
    sampleRelevance: 5,
    recency: 5,
  },
  OTHER: {
    admissibility: 30,
    directness: 20,
    methodQuality: 15,
    independence: 10,
    scopeMatch: 10,
    sampleRelevance: 10,
    recency: 5,
  },
};

export const FIT_BANDS = { high: 70, medium: 40 } as const;
export type FitBand = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export function fitBand(score: number): FitBand {
  if (score <= 0) return "NONE";
  if (score >= FIT_BANDS.high) return "HIGH";
  if (score >= FIT_BANDS.medium) return "MEDIUM";
  return "LOW";
}

/**
 * Weight factor a fit score applies to an evidence item's weight inside a
 * claim assessment: HIGH-fit evidence counts fully, lower fit scales down,
 * not-admissible evidence counts nothing.
 */
export function fitFactor(score: number | null | undefined): number {
  if (score === null || score === undefined) return 1;
  return clamp(score / FIT_BANDS.high, 0, 1);
}

const RECENT_MONTHS = 12;
const DUPLICATE_INDEPENDENCE = 0.25;

export interface EvidenceFitInput {
  /** Stable id of the evidence item (used as its origin when none is set). */
  id: string;
  sourceType: EvidenceSourceType;
  strengthScore: number;
  relevanceScore: number;
  isDirectCustomer?: boolean;
  sourceDate?: Date | string | null;
  scope?: Scope | null;
  sampleSize?: number | null;
  organizationCount?: number | null;
  userCount?: number | null;
  /** Origin key: derivatives of one source share it and count once. */
  sourceOriginId?: string | null;
  limitations?: string | null;
  /** Experimental validity of the run this evidence comes from, if any. */
  designLevel?: ExperimentDesignLevel | null;
  internalValidity?: InternalValidity | null;
}

export interface EvidenceFitContext {
  claimType: ClaimType;
  claimScope?: Scope | null;
  now?: Date;
  /** Origin keys of evidence already counted on this claim (earlier items). */
  priorOrigins?: Iterable<string>;
}

export interface FitDimension {
  key: FitDimensionKey;
  label: string;
  value: number;
  weight: number;
  points: number;
  note: string;
}

export interface EvidenceFit {
  version: string;
  claimType: ClaimType;
  admissibility: EvidenceAdmissibility;
  admissibilityExplanation: string;
  dimensions: FitDimension[];
  limitationsPenalty: number;
  fitScore: number;
  band: FitBand;
  cap: number;
  originId: string;
  duplicateOfOrigin: boolean;
  scope: ScopeMatchResult;
  designLevel: ExperimentDesignLevel;
  explanation: string[];
  /** One line: "HIGH fit (82/100) for 'the pain exists' — …". */
  summary: string;
}

export function originOf(item: Pick<EvidenceFitInput, "id" | "sourceOriginId">): string {
  const o = item.sourceOriginId?.trim();
  return o && o.length > 0 ? o : item.id;
}

function recencyValue(
  date: Date | string | null | undefined,
  now: Date,
): { value: number; note: string } {
  if (!date) return { value: 0.5, note: "undated (half credit)" };
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return { value: 0.5, note: "undated (half credit)" };
  const months = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= RECENT_MONTHS) return { value: 1, note: "within 12 months" };
  if (months <= RECENT_MONTHS * 2) return { value: 0.5, note: "12–24 months old" };
  return { value: 0.2, note: "older than 24 months" };
}

function sampleValue(item: EvidenceFitInput, nature: ClaimNature): { value: number; note: string } {
  const orgs = item.organizationCount ?? item.scope?.organizationCount ?? null;
  const n = item.sampleSize ?? item.scope?.sampleSize ?? null;
  const family = sourceFamily(item.sourceType);
  if (orgs !== null && orgs > 0) {
    const v =
      orgs >= 30
        ? 1
        : orgs >= 10
          ? 0.9
          : orgs >= 5
            ? 0.8
            : orgs >= 3
              ? 0.65
              : orgs === 2
                ? 0.55
                : 0.45;
    return { value: v, note: `${orgs} organization${orgs === 1 ? "" : "s"}` };
  }
  if (n !== null && n > 0) {
    const v = n >= 100 ? 1 : n >= 30 ? 0.9 : n >= 10 ? 0.7 : n >= 5 ? 0.6 : 0.5;
    return { value: v, note: `n = ${n}` };
  }
  if (family === "SELF_REPORTED" && item.sourceType !== "SURVEY")
    return { value: nature === "EXISTENCE" ? 0.6 : 0.45, note: "single respondent" };
  if (family === "MARKET") return { value: 0.6, note: "aggregate source, sample not stated" };
  return { value: 0.5, note: "sample not recorded" };
}

/** Fitness of one evidence item for one claim. */
export function computeEvidenceFit(item: EvidenceFitInput, ctx: EvidenceFitContext): EvidenceFit {
  const now = ctx.now ?? new Date();
  const nature = claimNature(ctx.claimType);
  const weights = FIT_WEIGHTS[nature];
  const adm = admissibility(item.sourceType, ctx.claimType);
  const family = sourceFamily(item.sourceType);
  const originId = originOf(item);
  const prior = new Set(ctx.priorOrigins ?? []);
  const duplicate = prior.has(originId);
  const designLevel = item.designLevel ?? IMPLIED_DESIGN_LEVEL[item.sourceType] ?? "ANECDOTAL";
  const scope = scopeMatch(item.scope ?? null, ctx.claimScope ?? null);
  const statement = CLAIM_STATEMENTS[ctx.claimType];

  if (adm.level === "NOT_ADMISSIBLE") {
    return {
      version: FIT_VERSION,
      claimType: ctx.claimType,
      admissibility: adm.level,
      admissibilityExplanation: adm.explanation,
      dimensions: [],
      limitationsPenalty: 0,
      fitScore: 0,
      band: "NONE",
      cap: 0,
      originId,
      duplicateOfOrigin: duplicate,
      scope,
      designLevel,
      explanation: [
        `Not admissible: a ${label(item.sourceType)} cannot be evidence that ${statement} (matrix ${ADMISSIBILITY_VERSION}).`,
      ],
      summary: `Not admissible for "${statement}".`,
    };
  }

  const dims: FitDimension[] = [];
  const add = (key: FitDimensionKey, value: number, note: string) => {
    const v = clamp(round2(value), 0, 1);
    dims.push({
      key,
      label: FIT_DIMENSION_LABELS[key],
      value: v,
      weight: weights[key],
      points: round1(v * weights[key]),
      note,
    });
  };

  add(
    "admissibility",
    ADMISSIBILITY_VALUE[adm.level],
    `${ADMISSIBILITY_LABELS[adm.level]} — ${adm.explanation}`,
  );

  const relevance = clamp(Number(item.relevanceScore) || 0, 0, 10) / 10;
  const thirdParty = THIRD_PARTY_FAMILIES.has(family) && !item.isDirectCustomer;
  add(
    "directness",
    relevance * (thirdParty ? 0.85 : 1),
    `relevance ${Math.round(relevance * 10)}/10${thirdParty ? ", third-party source" : ""}`,
  );

  const strength = clamp(Number(item.strengthScore) || 0, 0, 10) / 10;
  let method = 0.5 * (METHOD_QUALITY_BASE[item.sourceType] ?? 0.3) + 0.5 * strength;
  const methodNotes = [
    `${label(item.sourceType)} baseline ${METHOD_QUALITY_BASE[item.sourceType] ?? 0.3}`,
    `strength ${Math.round(strength * 10)}/10`,
  ];
  if (nature === "CAUSAL") {
    method *= DESIGN_CAUSAL_FACTOR[designLevel];
    methodNotes.push(
      `${DESIGN_LEVEL_LABELS[designLevel].toLowerCase()} design ×${DESIGN_CAUSAL_FACTOR[designLevel]}`,
    );
  }
  if (item.internalValidity) {
    method *= VALIDITY_FACTOR[item.internalValidity];
    methodNotes.push(
      `internal validity ${INTERNAL_VALIDITY_LABELS[item.internalValidity].toLowerCase()} ×${VALIDITY_FACTOR[item.internalValidity]}`,
    );
  }
  add("methodQuality", method, methodNotes.join(", "));

  add(
    "independence",
    duplicate ? DUPLICATE_INDEPENDENCE : 1,
    duplicate
      ? `derivative of a source already counted on this claim (${originId})`
      : "independent origin",
  );

  add("scopeMatch", scope.score, scope.explanation);

  const sample = sampleValue(item, nature);
  add("sampleRelevance", sample.value, sample.note);

  const rec = recencyValue(item.sourceDate, now);
  add("recency", rec.value, rec.note);

  let penalty = 0;
  const penaltyNotes: string[] = [];
  if (item.internalValidity === "LOW") {
    penalty += 8;
    penaltyNotes.push("low internal validity (−8)");
  } else if (item.internalValidity === "INDETERMINATE") {
    penalty += 5;
    penaltyNotes.push("indeterminate internal validity (−5)");
  } else if (item.internalValidity === "MEDIUM") {
    penalty += 3;
    penaltyNotes.push("medium internal validity (−3)");
  } else if (item.limitations && item.limitations.trim().length > 0) {
    penalty += 2;
    penaltyNotes.push("recorded limitations (−2)");
  }
  penalty = Math.min(10, penalty);

  const cap = ADMISSIBILITY_FIT_CAP[adm.level];
  const raw = dims.reduce((s, d) => s + d.points, 0) - penalty;
  const fitScore = Math.round(clamp(raw, 0, cap));
  const band = fitBand(fitScore);
  const weakest = [...dims].sort((a, b) => a.value - b.value)[0];

  const explanation = [
    `Fit ${fitScore}/100 (${band}) for "${statement}".`,
    ...dims.map(
      (d) =>
        `${d.label}: ${Math.round(d.value * 100)}% of ${d.weight} → ${d.points} pts (${d.note})`,
    ),
    penalty > 0
      ? `Limitations penalty: −${penalty} (${penaltyNotes.join(", ")})`
      : "No limitations penalty.",
    cap < 100
      ? `Capped at ${cap}: ${ADMISSIBILITY_LABELS[adm.level].toLowerCase()}-admissibility evidence cannot fit better than this for the claim.`
      : "",
  ].filter(Boolean);

  const why =
    adm.level === "LOW"
      ? `a ${label(item.sourceType)} is low-admissibility evidence for this claim`
      : adm.level === "MEDIUM"
        ? `a ${label(item.sourceType)} is medium-admissibility evidence for this claim`
        : duplicate
          ? "it derives from a source already counted"
          : weakest && weakest.value < 0.6
            ? `${weakest.label.toLowerCase()} is weak (${weakest.note})`
            : "high-admissibility, direct and independent";
  return {
    version: FIT_VERSION,
    claimType: ctx.claimType,
    admissibility: adm.level,
    admissibilityExplanation: adm.explanation,
    dimensions: dims,
    limitationsPenalty: penalty,
    fitScore,
    band,
    cap,
    originId,
    duplicateOfOrigin: duplicate,
    scope,
    designLevel,
    explanation,
    summary: `${band} fit (${fitScore}/100) for "${statement}" — ${why}.`,
  };
}

/**
 * Fitness of a set of evidence items for one claim. Independence is judged
 * within the set: the first item of each origin is independent, later
 * derivatives of the same origin are not. Order is deterministic (strongest
 * item of each origin first).
 */
export function computeClaimFits(
  items: EvidenceFitInput[],
  ctx: Omit<EvidenceFitContext, "priorOrigins">,
): Map<string, EvidenceFit> {
  const sorted = [...items].sort(
    (a, b) =>
      b.strengthScore * b.relevanceScore - a.strengthScore * a.relevanceScore ||
      a.id.localeCompare(b.id),
  );
  const seen = new Set<string>();
  const out = new Map<string, EvidenceFit>();
  for (const item of sorted) {
    const fit = computeEvidenceFit(item, { ...ctx, priorOrigins: seen });
    seen.add(fit.originId);
    out.set(item.id, fit);
  }
  return out;
}

function label(type: EvidenceSourceType): string {
  return type.toLowerCase().replace(/_/g, " ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
