/**
 * Supported locales. The platform is bilingual (English, French); the locale
 * is resolved from an explicit choice (cookie, then the account preference)
 * and otherwise negotiated from the browser's Accept-Language header.
 * No URL prefix: every route is the same in both languages.
 */
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the explicit language choice (one year, lax, path=/). */
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Native names shown in the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", fr: "Français" };

/** BCP 47 tags used for Intl formatting and <html lang>. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en", fr: "fr" };

/** Language name written in that language, for the analyst prompt. */
export const LOCALE_LANGUAGE_NAMES: Record<Locale, string> = { en: "English", fr: "French" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Pick the best supported locale from an Accept-Language header, honouring
 * q-weights and language prefixes ("fr-CA" → "fr"). Falls back to the default.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const weight = q === undefined ? 1 : Number.parseFloat(q);
      return {
        tag: (tag ?? "").trim().toLowerCase(),
        weight: Number.isNaN(weight) ? 0 : weight,
        index,
      };
    })
    .filter((entry) => entry.tag && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of ranked) {
    if (tag === "*") return DEFAULT_LOCALE;
    const base = tag.split("-")[0] ?? tag;
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
