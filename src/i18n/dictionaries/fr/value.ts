/** Chaînes françaises — section « value ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { value as en } from "@/i18n/dictionaries/en/value";

export const value: Section<typeof en> = en;
