import { getDictionary, lookup, type Dictionary } from "./dictionary";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import {
  isSystemMessage,
  renderKey,
  renderMessage,
  type LocalizedText,
  type MessageParams,
} from "./messages";

/**
 * The translation function. Two forms:
 *   t("dashboard.title")                      → dictionary key (+ params)
 *   t(message)                                → SystemMessage, plain string, null
 * A plain string that is not a dictionary key is returned unchanged, so
 * engine output, legacy rows and user content can all go through t().
 */
export interface T {
  (key: string, params?: MessageParams): string;
  (value: LocalizedText | null | undefined): string;
  locale: Locale;
  dictionary: Dictionary;
  /** True when the key exists in this locale or in English. */
  has(key: string): boolean;
}

const cache = new Map<Locale, T>();

export function createT(locale: Locale): T {
  const cached = cache.get(locale);
  if (cached) return cached;
  const dictionary = getDictionary(locale);
  const fallback = getDictionary(DEFAULT_LOCALE);
  const has = (key: string) =>
    lookup(dictionary, key) !== undefined || lookup(fallback, key) !== undefined;
  const fn = (value: LocalizedText | null | undefined, params?: MessageParams): string => {
    if (value === null || value === undefined) return "";
    if (isSystemMessage(value)) return renderMessage(value, locale);
    if (has(value)) return renderKey(locale, value, params);
    return value;
  };
  const t = Object.assign(fn, { locale, dictionary, has }) as unknown as T;
  cache.set(locale, t);
  return t;
}
