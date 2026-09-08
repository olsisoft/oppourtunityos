/** Locale-aware formatting helpers (dates, numbers, relative time). */
import { LOCALE_TAGS, type Locale } from "./locales";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], options).format(toDate(value));
}

export function formatDateTime(value: DateInput, locale: Locale): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], options).format(value);
}

export function formatPercent(value: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(value);
}

const RELATIVE_STEPS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
];

/** "3 min ago" / "il y a 3 min"; anything under a minute is "now". */
export function formatRelative(
  value: DateInput,
  locale: Locale,
  now: DateInput = new Date(),
): string {
  const diffSeconds = Math.round((toDate(value).getTime() - toDate(now).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAGS[locale], {
    numeric: "auto",
    style: "narrow",
  });
  for (const { unit, seconds } of RELATIVE_STEPS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return rtf.format(0, "second");
}
