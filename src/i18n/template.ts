/**
 * Minimal ICU-style template renderer used by both dictionaries and system
 * messages:
 *   "{name} added {count, plural, =0 {no items} one {# item} other {# items}}"
 *   "{status, select, OBSERVED {observed} other {not observed}}"
 * Plural categories come from Intl.PluralRules for the locale, so French
 * treats 0 and 1 as "one". `#` inside a plural branch is the number.
 */
import type { Locale } from "./locales";

export type TemplateValue = string | number | boolean | null | undefined;
export type TemplateParams = Record<string, TemplateValue>;

const pluralRules = new Map<Locale, Intl.PluralRules>();
function rulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

/** Split "a {b {c}} d" style argument bodies at top-level commas. */
function splitTopLevel(body: string, separator: string, limit: number): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    if (ch === separator && depth === 0 && parts.length < limit - 1) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Parse "=0 {none} one {# item} other {# items}" into branches. */
function parseBranches(body: string): Record<string, string> {
  const branches: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i]!)) i += 1;
    let selector = "";
    while (i < body.length && body[i] !== "{" && !/\s/.test(body[i]!)) {
      selector += body[i];
      i += 1;
    }
    while (i < body.length && /\s/.test(body[i]!)) i += 1;
    if (body[i] !== "{") break;
    let depth = 0;
    let content = "";
    for (; i < body.length; i += 1) {
      const ch = body[i]!;
      if (ch === "{") {
        depth += 1;
        if (depth === 1) continue;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      content += ch;
    }
    if (selector) branches[selector] = content;
  }
  return branches;
}

function formatValue(value: TemplateValue, locale: Locale): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return new Intl.NumberFormat(locale).format(value);
  return String(value);
}

/** Find the matching closing brace for the opening brace at `start`. */
function closingBrace(template: string, start: number): number {
  let depth = 0;
  for (let i = start; i < template.length; i += 1) {
    if (template[i] === "{") depth += 1;
    else if (template[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function renderTemplate(template: string, params: TemplateParams, locale: Locale): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf("{", i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }
    const close = closingBrace(template, open);
    if (close === -1) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);
    const body = template.slice(open + 1, close);
    const [rawName, rawKind, rawRest] = splitTopLevel(body, ",", 3);
    const name = (rawName ?? "").trim();
    const kind = (rawKind ?? "").trim();
    const value = params[name];
    if (!kind) {
      out += formatValue(value, locale);
    } else if (kind === "plural") {
      const n = typeof value === "number" ? value : Number(value ?? 0);
      const branches = parseBranches(rawRest ?? "");
      const branch =
        branches[`=${n}`] ?? branches[rulesFor(locale).select(n)] ?? branches.other ?? "";
      out += renderTemplate(branch.replace(/#/g, formatValue(n, locale)), params, locale);
    } else if (kind === "select") {
      const branches = parseBranches(rawRest ?? "");
      const key = value === null || value === undefined ? "other" : String(value);
      out += renderTemplate(branches[key] ?? branches.other ?? "", params, locale);
    } else {
      out += formatValue(value, locale);
    }
    i = close + 1;
  }
  return out;
}
