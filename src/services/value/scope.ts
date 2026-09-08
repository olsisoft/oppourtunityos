/**
 * Scope — where a claim is made for (ClaimScope) and where an observation
 * was actually made (ValidityScope). Both share one shape so they can be
 * compared. Scope comparison is deterministic and dimension by dimension:
 * every mismatch and every unknown is reported, never averaged away silently.
 *
 * Text: `scopeMessage(scope)` builds the compact description as a
 * SystemMessage (English text + key/params, so engines can embed it in their
 * own sentences); `describeScope(scope, locale)` renders it for display.
 */
import type { Locale } from "@/i18n/locales";
import {
  isSystemMessage,
  msg,
  renderMessage,
  type LocalizedText,
  type SystemMessage,
} from "@/i18n/messages";

export interface Scope {
  population?: string | null;
  icp?: string | null;
  geography?: string | null;
  industry?: string | null;
  companySize?: string | null;
  /** Systems, tools or configurations involved (e.g. POS vendors). */
  systems?: string[] | null;
  workflow?: string | null;
  environment?: string | null;
  timePeriod?: string | null;
  sampleSize?: number | null;
  organizationCount?: number | null;
  userCount?: number | null;
  /** Number of independent sources the scope was built from. */
  sourceDiversity?: number | null;
  conditions?: string | null;
  exclusions?: string | null;
}

export type ScopeDimension = keyof Scope;

export type ScopeTextDimension =
  | "population"
  | "icp"
  | "geography"
  | "industry"
  | "companySize"
  | "workflow"
  | "environment"
  | "timePeriod"
  | "conditions"
  | "exclusions";

export const SCOPE_TEXT_DIMENSIONS: ScopeTextDimension[] = [
  "population",
  "icp",
  "geography",
  "industry",
  "companySize",
  "workflow",
  "environment",
  "timePeriod",
  "conditions",
  "exclusions",
];

export const SCOPE_LABELS: Record<ScopeDimension, string> = {
  population: "Population",
  icp: "ICP",
  geography: "Geography",
  industry: "Industry",
  companySize: "Company size",
  systems: "Systems / tools",
  workflow: "Workflow",
  environment: "Environment",
  timePeriod: "Time period",
  sampleSize: "Sample size",
  organizationCount: "Organizations",
  userCount: "Users",
  sourceDiversity: "Independent sources",
  conditions: "Conditions",
  exclusions: "Exclusions",
};

/** Dimensions compared for scope match, in order of importance. */
const COMPARED: Array<{ key: ScopeDimension; weight: number }> = [
  { key: "population", weight: 3 },
  { key: "icp", weight: 2 },
  { key: "industry", weight: 2 },
  { key: "companySize", weight: 1.5 },
  { key: "systems", weight: 1.5 },
  { key: "geography", weight: 1 },
  { key: "workflow", weight: 1 },
  { key: "environment", weight: 1.5 },
  { key: "conditions", weight: 1 },
];

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "and",
  "or",
  "with",
  "for",
  "to",
  "at",
  "by",
  "from",
  "using",
  "who",
  "that",
  "using",
  "our",
  "their",
  "all",
  "any",
  "de",
  "la",
  "le",
  "les",
  "des",
  "du",
  "et",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ\s-]/g, " ")
      .split(/[\s-]+/)
      .map((t) => t.replace(/s$/, ""))
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

function overlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function isEmptyScope(scope: Scope | null | undefined): boolean {
  if (!scope) return true;
  return (Object.keys(scope) as ScopeDimension[]).every((k) => isBlank(scope[k]));
}

/** Parse an untyped JSON value into a Scope (unknown keys dropped, blanks removed). */
export function parseScope(value: unknown): Scope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const out: Scope = {};
  for (const key of SCOPE_TEXT_DIMENSIONS) {
    const t = v[key];
    if (typeof t === "string" && t.trim()) out[key] = t.trim();
  }
  if (Array.isArray(v.systems)) {
    const systems = v.systems.filter(
      (s): s is string => typeof s === "string" && s.trim().length > 0,
    );
    if (systems.length) out.systems = systems.map((s) => s.trim());
  } else if (typeof v.systems === "string" && v.systems.trim()) {
    out.systems = v.systems
      .split(/[,;/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  for (const key of ["sampleSize", "organizationCount", "userCount", "sourceDiversity"] as const) {
    const n = v[key];
    if (typeof n === "number" && Number.isFinite(n)) out[key] = n;
    else if (typeof n === "string" && n.trim() && Number.isFinite(Number(n))) out[key] = Number(n);
  }
  return isEmptyScope(out) ? null : out;
}

export type DimensionMatch = "MATCH" | "PARTIAL" | "MISMATCH" | "UNKNOWN";

export interface ScopeDimensionResult {
  key: ScopeDimension;
  label: SystemMessage;
  claim: string | null;
  evidence: string | null;
  result: DimensionMatch;
}

export interface ScopeMatchResult {
  /** 0–1: 1 = evidence scope covers the claim scope on every compared dimension. */
  score: number;
  status: "MATCH" | "PARTIAL" | "MISMATCH" | "CLAIM_SCOPE_UNDECLARED" | "EVIDENCE_SCOPE_UNKNOWN";
  dimensions: ScopeDimensionResult[];
  matched: ScopeDimension[];
  mismatched: ScopeDimension[];
  unknown: ScopeDimension[];
  explanation: SystemMessage;
}

export const SCOPE_MATCH_DEFAULTS = {
  /** Claim declares no scope: nothing can mismatch, but nothing is confirmed either. */
  claimUndeclared: 0.75,
  /** Evidence declares no scope: its context is unknown. */
  evidenceUnknown: 0.5,
  /** Value of an unknown dimension inside a comparison. */
  unknownDimension: 0.6,
  partialDimension: 0.7,
} as const;

function text(v: Scope[ScopeDimension]): string | null {
  if (isBlank(v)) return null;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

/** How well an observation's scope covers the scope a claim is made for. */
export function scopeMatch(
  evidence: Scope | null | undefined,
  claim: Scope | null | undefined,
): ScopeMatchResult {
  const dims: ScopeDimensionResult[] = [];
  const claimEmpty = isEmptyScope(claim);
  const evidenceEmpty = isEmptyScope(evidence);
  if (claimEmpty) {
    return {
      score: SCOPE_MATCH_DEFAULTS.claimUndeclared,
      status: "CLAIM_SCOPE_UNDECLARED",
      dimensions: dims,
      matched: [],
      mismatched: [],
      unknown: [],
      explanation: msg("frontier.scopeMatch.claimUndeclared"),
    };
  }
  if (evidenceEmpty) {
    return {
      score: SCOPE_MATCH_DEFAULTS.evidenceUnknown,
      status: "EVIDENCE_SCOPE_UNKNOWN",
      dimensions: dims,
      matched: [],
      mismatched: [],
      unknown: COMPARED.map((c) => c.key),
      explanation: msg("frontier.scopeMatch.evidenceUnknown"),
    };
  }
  let weightSum = 0;
  let scoreSum = 0;
  const matched: ScopeDimension[] = [];
  const mismatched: ScopeDimension[] = [];
  const unknown: ScopeDimension[] = [];
  for (const { key, weight } of COMPARED) {
    const c = text(claim![key]);
    const e = text(evidence![key]);
    if (c === null) continue; // the claim does not constrain this dimension
    weightSum += weight;
    let result: DimensionMatch;
    if (e === null) {
      result = "UNKNOWN";
      scoreSum += weight * SCOPE_MATCH_DEFAULTS.unknownDimension;
      unknown.push(key);
    } else {
      const o =
        key === "systems"
          ? systemsOverlap(evidence!.systems ?? [], claim!.systems ?? [])
          : overlap(e, c);
      if (o >= 0.5) {
        result = "MATCH";
        scoreSum += weight;
        matched.push(key);
      } else if (o > 0) {
        result = "PARTIAL";
        scoreSum += weight * SCOPE_MATCH_DEFAULTS.partialDimension;
        matched.push(key);
      } else {
        result = "MISMATCH";
        mismatched.push(key);
      }
    }
    dims.push({ key, label: msg(`labels.scopeDimension.${key}`), claim: c, evidence: e, result });
  }
  const score =
    weightSum === 0 ? SCOPE_MATCH_DEFAULTS.claimUndeclared : round2(scoreSum / weightSum);
  const status =
    mismatched.length > 0 && score < 0.5
      ? "MISMATCH"
      : mismatched.length > 0 || unknown.length > 0
        ? "PARTIAL"
        : "MATCH";
  const dimensionList = (keys: ScopeDimension[]) => listMessage(keys.map(dimensionInSentence));
  const explanation =
    status === "MATCH"
      ? msg("frontier.scopeMatch.match", { matched: dimensionList(matched) })
      : msg("frontier.scopeMatch.partial", {
          shape: `${matched.length ? "M" : ""}${mismatched.length ? "D" : ""}${unknown.length ? "U" : ""}`,
          ...(matched.length ? { matched: dimensionList(matched) } : {}),
          ...(mismatched.length ? { mismatched: dimensionList(mismatched) } : {}),
          ...(unknown.length ? { unknown: dimensionList(unknown) } : {}),
        });
  return { score, status, dimensions: dims, matched, mismatched, unknown, explanation };
}

/** A dimension name as it reads inside a sentence ("company size"). */
export function dimensionInSentence(key: ScopeDimension): SystemMessage {
  return msg(`frontier.scope.dimension.${key}`);
}

/**
 * Join translated items into one message by nesting pairs ("{head}, {tail}"),
 * so the list renders in any locale. `items` must not be empty.
 */
export function listMessage(items: LocalizedText[], key = "frontier.list.comma"): SystemMessage {
  const last = items[items.length - 1] ?? "";
  let out: SystemMessage = isSystemMessage(last) ? last : msg("frontier.plain", { text: last });
  for (let i = items.length - 2; i >= 0; i -= 1) out = msg(key, { head: items[i], tail: out });
  return out;
}

function systemsOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const norm = (s: string) => s.trim().toLowerCase();
  const sb = new Set(b.map(norm));
  const shared = a.map(norm).filter((s) => sb.has(s)).length;
  return shared / Math.min(a.length, b.length);
}

/** Merge observation scopes into the scope actually observed (union). */
export function mergeScopes(scopes: Array<Scope | null | undefined>): Scope | null {
  const list = scopes.filter((s): s is Scope => !isEmptyScope(s));
  if (list.length === 0) return null;
  const out: Scope = {};
  const uniq = (values: Array<string | null | undefined>) =>
    Array.from(
      new Set(values.filter((v): v is string => !!v && v.trim().length > 0).map((v) => v.trim())),
    );
  for (const key of SCOPE_TEXT_DIMENSIONS) {
    const values = uniq(list.map((s) => s[key] ?? null));
    if (values.length) out[key] = joinValues(values);
  }
  const systems = uniq(list.flatMap((s) => s.systems ?? []));
  if (systems.length) out.systems = systems;
  const sum = (key: "sampleSize" | "organizationCount" | "userCount") => {
    const nums = list.map((s) => s[key]).filter((n): n is number => typeof n === "number");
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  };
  const sampleSize = sum("sampleSize");
  const organizationCount = sum("organizationCount");
  const userCount = sum("userCount");
  if (sampleSize !== null) out.sampleSize = sampleSize;
  if (organizationCount !== null) out.organizationCount = organizationCount;
  if (userCount !== null) out.userCount = userCount;
  out.sourceDiversity = list.length;
  return out;
}

/**
 * Compact description of a scope as a message: "5 organizations · independent
 * hair salons · 3 configurations (POS A, POS B, POS C) · founder-assisted".
 * User values are carried verbatim; counts and the "scope not recorded"
 * fallback are translated. Engines embed it in their own sentences.
 */
export function scopeMessage(scope: Scope | null | undefined, max = 6): SystemMessage {
  if (isEmptyScope(scope)) return msg("frontier.scope.notRecorded");
  const s = scope!;
  const parts: LocalizedText[] = [];
  if (s.organizationCount)
    parts.push(msg("frontier.scope.organizations", { count: s.organizationCount }));
  else if (s.sampleSize) parts.push(msg("frontier.scope.sampleSize", { count: s.sampleSize }));
  if (s.population)
    parts.push(s.population.length > 90 ? `${s.population.slice(0, 87)}…` : s.population);
  else if (s.icp) parts.push(s.icp);
  if (s.systems?.length)
    parts.push(
      s.systems.length === 1
        ? s.systems[0]
        : msg("frontier.scope.configurations", {
            count: s.systems.length,
            systems: s.systems.join(", "),
          }),
    );
  if (s.environment) parts.push(s.environment);
  if (s.conditions) parts.push(s.conditions);
  if (s.timePeriod) parts.push(s.timePeriod);
  if (s.geography) parts.push(s.geography);
  if (s.companySize && !s.population) parts.push(s.companySize);
  if (s.industry && !s.population) parts.push(s.industry);
  return listMessage(parts.slice(0, max), "frontier.scope.join");
}

/** Compact, human description rendered in the locale (display time). */
export function describeScope(
  scope: Scope | null | undefined,
  locale: Locale = "en",
  max = 6,
): string {
  return renderMessage(scopeMessage(scope, max), locale);
}

/** Number of distinct configurations across observation scopes (for diversity thresholds). */
export function configurationDiversity(scopes: Array<Scope | null | undefined>): number {
  const signatures = new Set<string>();
  for (const s of scopes) {
    if (!s) continue;
    // Each distinct system is a configuration of its own; the other
    // dimensions distinguish configurations that share a system.
    const rest = [
      s.environment ? `env:${s.environment.toLowerCase()}` : "",
      s.companySize ? `size:${s.companySize.toLowerCase()}` : "",
      s.geography ? `geo:${s.geography.toLowerCase()}` : "",
    ]
      .filter(Boolean)
      .join("|");
    // A scope that records no configuration dimension does not count as one.
    const systems = s.systems?.length ? s.systems : [];
    if (systems.length === 0 && !rest) continue;
    if (systems.length === 0) signatures.add(`sys:|${rest}`);
    for (const sys of systems) signatures.add(`sys:${sys.toLowerCase()}|${rest}`);
  }
  return signatures.size;
}

/**
 * Join distinct text values compactly: values that share a prefix before the
 * first comma ("independent hair salon, 8 chairs" / "…, 12 chairs") collapse
 * into "independent hair salon: 8 chairs, 12 chairs".
 */
function joinValues(values: string[]): string {
  if (values.length === 1) return values[0];
  const groups = new Map<string, string[]>();
  for (const v of values) {
    const i = v.indexOf(",");
    const prefix = (i > 0 ? v.slice(0, i) : v).trim();
    const suffix = i > 0 ? v.slice(i + 1).trim() : "";
    const key = prefix.toLowerCase().replace(/s$/, "");
    const g = groups.get(key) ?? [];
    if (g.length === 0) g.push(prefix);
    if (suffix) g.push(suffix);
    groups.set(key, g);
  }
  return Array.from(groups.values())
    .map(([prefix, ...suffixes]) =>
      suffixes.length ? `${prefix}: ${suffixes.join(", ")}` : prefix,
    )
    .join(" · ");
}

/** Default claim scope of an opportunity, from its ICP and market. */
export function scopeFromContext(ctx: {
  icpName?: string | null;
  companyType?: string | null;
  companySize?: string | null;
  marketName?: string | null;
}): Scope | null {
  return parseScope({
    icp: ctx.icpName ?? null,
    population: ctx.companyType ?? ctx.icpName ?? null,
    companySize: ctx.companySize ?? null,
    industry: ctx.marketName ?? null,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
