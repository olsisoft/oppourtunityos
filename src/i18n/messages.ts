/**
 * Structured system messages.
 *
 * Deterministic engines (proof frontier, next best action, experimental
 * validity, knowledge changes…) explain themselves in sentences that are
 * persisted with the opportunity. To stay inspectable in both languages,
 * every such sentence is a SystemMessage: a dictionary key, its parameters
 * and the canonical English rendering. The UI renders the key in the current
 * locale and falls back to the stored text when a key no longer exists.
 *
 * Plain strings are still accepted everywhere (legacy rows, user content).
 */
import { DICTIONARIES, lookup } from "./dictionary";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { renderTemplate, type TemplateParams } from "./template";

export interface SystemMessage {
  key: string;
  params?: MessageParams;
  /** Canonical English text — what tests assert on and what legacy readers show. */
  text: string;
}

export type MessageParam = string | number | boolean | null | undefined | SystemMessage;
export type MessageParams = Record<string, MessageParam>;

/** Text that may come from a dictionary key, an engine, a legacy row or the user. */
export type LocalizedText = string | SystemMessage;

export function isSystemMessage(value: unknown): value is SystemMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SystemMessage).key === "string" &&
    typeof (value as SystemMessage).text === "string"
  );
}

/** Resolve a key in the locale dictionary, then in English. */
export function findTemplate(locale: Locale, key: string): string | undefined {
  return lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES[DEFAULT_LOCALE], key);
}

function resolveParams(locale: Locale, params: MessageParams | undefined): TemplateParams {
  const out: TemplateParams = {};
  if (!params) return out;
  for (const [name, value] of Object.entries(params)) {
    out[name] = isSystemMessage(value) ? renderMessage(value, locale) : value;
  }
  return out;
}

/** Render a dictionary key with parameters; an unknown key renders as itself. */
export function renderKey(locale: Locale, key: string, params?: MessageParams): string {
  const template = findTemplate(locale, key);
  if (template === undefined) return key;
  return renderTemplate(template, resolveParams(locale, params), locale);
}

/** Render a system message (or plain text) in the locale. */
export function renderMessage(value: LocalizedText | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  const template = findTemplate(locale, value.key);
  if (template === undefined) return value.text;
  return renderTemplate(template, resolveParams(locale, value.params), locale);
}

/**
 * Build a system message. The English text is rendered immediately so the
 * engines stay testable and legacy consumers keep working.
 */
export function msg(key: string, params?: MessageParams): SystemMessage {
  const message: SystemMessage = { key, text: "" };
  if (params && Object.keys(params).length) message.params = params;
  message.text = renderMessage(message, DEFAULT_LOCALE);
  return message;
}

/** Canonical English text of a localized value — for logs, markdown and tests. */
export function textOf(value: LocalizedText | null | undefined): string {
  return renderMessage(value, DEFAULT_LOCALE);
}
