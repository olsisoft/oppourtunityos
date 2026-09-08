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
import { msg, type SystemMessage } from "@/i18n/messages";
import { clamp } from "@/lib/utils";
import {
  admissibility,
  ADMISSIBILITY_FIT_CAP,
  ADMISSIBILITY_VALUE,
  ADMISSIBILITY_VERSION,
} from "./admissibility";
import { claimNature, type ClaimNature } from "./claim-taxonomy";
import {
  IMPLIED_DESIGN_LEVEL,
  METHOD_QUALITY_BASE,
  sourceFamily,
  THIRD_PARTY_FAMILIES,
} from "./evidence-sources";
import { DESIGN_CAUSAL_FACTOR, VALIDITY_FACTOR } from "./experimental-validity";
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
  /** The dimension's label (`labels.fitDimension.<key>`). */
  label: SystemMessage;
  value: number;
  weight: number;
  points: number;
  /** Short note on what drove the value ("relevance 8/10", "n = 12"…). */
  note: SystemMessage;
}

export interface EvidenceFit {
  version: string;
  claimType: ClaimType;
  admissibility: EvidenceAdmissibility;
  admissibilityExplanation: SystemMessage;
  dimensions: FitDimension[];
  limitationsPenalty: number;
  fitScore: number;
  band: FitBand;
  cap: number;
  originId: string;
  duplicateOfOrigin: boolean;
  scope: ScopeMatchResult;
  designLevel: ExperimentDesignLevel;
  explanation: SystemMessage[];
  /** One line: "HIGH fit (82/100) for 'the pain exists' — …". */
  summary: SystemMessage;
  /** The tail of `summary`: what most limits (or makes) the fit. */
  reason: SystemMessage;
}

export function originOf(item: Pick<EvidenceFitInput, "id" | "sourceOriginId">): string {
  const o = item.sourceOriginId?.trim();
  return o && o.length > 0 ? o : item.id;
}

function recencyValue(
  date: Date | string | null | undefined,
  now: Date,
): { value: number; note: SystemMessage } {
  if (!date) return { value: 0.5, note: msg("validity.fit.note.recency.undated") };
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime()))
    return { value: 0.5, note: msg("validity.fit.note.recency.undated") };
  const months = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= RECENT_MONTHS) return { value: 1, note: msg("validity.fit.note.recency.recent") };
  if (months <= RECENT_MONTHS * 2)
    return { value: 0.5, note: msg("validity.fit.note.recency.aging") };
  return { value: 0.2, note: msg("validity.fit.note.recency.old") };
}

function sampleValue(
  item: EvidenceFitInput,
  nature: ClaimNature,
): { value: number; note: SystemMessage } {
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
    return { value: v, note: msg("validity.fit.note.sample.organizations", { count: orgs }) };
  }
  if (n !== null && n > 0) {
    const v = n >= 100 ? 1 : n >= 30 ? 0.9 : n >= 10 ? 0.7 : n >= 5 ? 0.6 : 0.5;
    return { value: v, note: msg("validity.fit.note.sample.units", { count: n }) };
  }
  if (family === "SELF_REPORTED" && item.sourceType !== "SURVEY")
    return {
      value: nature === "EXISTENCE" ? 0.6 : 0.45,
      note: msg("validity.fit.note.sample.singleRespondent"),
    };
  if (family === "MARKET") return { value: 0.6, note: msg("validity.fit.note.sample.aggregate") };
  return { value: 0.5, note: msg("validity.fit.note.sample.unknown") };
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
  const statement = msg(`labels.claimStatement.${ctx.claimType}`);
  const source = msg(`validity.sourceTypeLower.${item.sourceType}`);

  if (adm.level === "NOT_ADMISSIBLE") {
    const reason = msg("validity.fit.summary.notAdmissible", { what: statement });
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
        msg("validity.fit.explanation.notAdmissible", {
          source,
          what: statement,
          version: ADMISSIBILITY_VERSION,
        }),
      ],
      summary: reason,
      reason,
    };
  }

  const dims: FitDimension[] = [];
  const add = (key: FitDimensionKey, value: number, note: SystemMessage) => {
    const v = clamp(round2(value), 0, 1);
    dims.push({
      key,
      label: msg(`labels.fitDimension.${key}`),
      value: v,
      weight: weights[key],
      points: round1(v * weights[key]),
      note,
    });
  };

  add(
    "admissibility",
    ADMISSIBILITY_VALUE[adm.level],
    msg("validity.fit.note.admissibility", {
      level: msg(`labels.admissibility.${adm.level}`),
      explanation: adm.explanation,
    }),
  );

  const relevance = clamp(Number(item.relevanceScore) || 0, 0, 10) / 10;
  const thirdParty = THIRD_PARTY_FAMILIES.has(family) && !item.isDirectCustomer;
  add(
    "directness",
    relevance * (thirdParty ? 0.85 : 1),
    msg(`validity.fit.note.${thirdParty ? "directnessThirdParty" : "directness"}`, {
      relevance: Math.round(relevance * 10),
    }),
  );

  const strength = clamp(Number(item.strengthScore) || 0, 0, 10) / 10;
  let method = 0.5 * (METHOD_QUALITY_BASE[item.sourceType] ?? 0.3) + 0.5 * strength;
  const methodParams: Record<string, SystemMessage | number | boolean | null> = {
    source,
    base: METHOD_QUALITY_BASE[item.sourceType] ?? 0.3,
    strength: Math.round(strength * 10),
    hasDesign: false,
    design: null,
    designFactor: null,
    hasValidity: false,
    validity: null,
    validityFactor: null,
  };
  if (nature === "CAUSAL") {
    method *= DESIGN_CAUSAL_FACTOR[designLevel];
    methodParams.hasDesign = true;
    methodParams.design = msg(`validity.designLevelLower.${designLevel}`);
    methodParams.designFactor = DESIGN_CAUSAL_FACTOR[designLevel];
  }
  if (item.internalValidity) {
    method *= VALIDITY_FACTOR[item.internalValidity];
    methodParams.hasValidity = true;
    methodParams.validity = msg(`validity.internalValidityLower.${item.internalValidity}`);
    methodParams.validityFactor = VALIDITY_FACTOR[item.internalValidity];
  }
  add("methodQuality", method, msg("validity.fit.note.method", methodParams));

  add(
    "independence",
    duplicate ? DUPLICATE_INDEPENDENCE : 1,
    duplicate
      ? msg("validity.fit.note.duplicate", { origin: originId })
      : msg("validity.fit.note.independent"),
  );

  // The scope engine explains the match itself; the note passes it through.
  add(
    "scopeMatch",
    scope.score,
    msg("validity.fit.note.scopeMatch", { explanation: scope.explanation }),
  );

  const sample = sampleValue(item, nature);
  add("sampleRelevance", sample.value, sample.note);

  const rec = recencyValue(item.sourceDate, now);
  add("recency", rec.value, rec.note);

  let penalty = 0;
  let penaltyNote: SystemMessage | null = null;
  if (item.internalValidity === "LOW") {
    penalty += 8;
    penaltyNote = msg("validity.fit.penalty.lowValidity");
  } else if (item.internalValidity === "INDETERMINATE") {
    penalty += 5;
    penaltyNote = msg("validity.fit.penalty.indeterminateValidity");
  } else if (item.internalValidity === "MEDIUM") {
    penalty += 3;
    penaltyNote = msg("validity.fit.penalty.mediumValidity");
  } else if (item.limitations && item.limitations.trim().length > 0) {
    penalty += 2;
    penaltyNote = msg("validity.fit.penalty.limitations");
  }
  penalty = Math.min(10, penalty);

  const cap = ADMISSIBILITY_FIT_CAP[adm.level];
  const raw = dims.reduce((s, d) => s + d.points, 0) - penalty;
  const fitScore = Math.round(clamp(raw, 0, cap));
  const band = fitBand(fitScore);
  const weakest = [...dims].sort((a, b) => a.value - b.value)[0];

  const explanation: SystemMessage[] = [
    msg("validity.fit.explanation.score", { score: fitScore, band, what: statement }),
    ...dims.map((d) =>
      msg("validity.fit.explanation.dimension", {
        label: d.label,
        percent: Math.round(d.value * 100),
        weight: d.weight,
        points: d.points,
        note: d.note,
      }),
    ),
    penalty > 0
      ? msg("validity.fit.explanation.penalty", { penalty, note: penaltyNote })
      : msg("validity.fit.explanation.noPenalty"),
    ...(cap < 100
      ? [
          msg("validity.fit.explanation.cap", {
            cap,
            level: msg(`validity.admissibilityLower.${adm.level}`),
          }),
        ]
      : []),
  ];

  const reason =
    adm.level === "LOW"
      ? msg("validity.fit.reason.lowAdmissibility", { source })
      : adm.level === "MEDIUM"
        ? msg("validity.fit.reason.mediumAdmissibility", { source })
        : duplicate
          ? msg("validity.fit.reason.duplicate")
          : weakest && weakest.value < 0.6
            ? msg("validity.fit.reason.weakDimension", {
                dimension: msg(`validity.fitDimensionLower.${weakest.key}`),
                note: weakest.note,
              })
            : msg("validity.fit.reason.strong");
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
    summary: msg("validity.fit.summary.line", { band, score: fitScore, what: statement, reason }),
    reason,
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
