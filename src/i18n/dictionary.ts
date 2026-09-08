/**
 * Dictionaries: one nested object per locale. English is the reference: the
 * French dictionary is typed against it, so a missing or extra key is a type
 * error. Keys are dot paths ("dashboard.title", "labels.verdict.KILL").
 */
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import type { Locale } from "./locales";

/** Same shape as T, every leaf a string (getters and literals alike). */
export type Section<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends object ? Section<T[K]> : T[K];
};

export type Dictionary = Section<typeof en>;

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Walk a dot path; returns undefined for a missing key or a non-string leaf. */
export function lookup(dictionary: object, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}
