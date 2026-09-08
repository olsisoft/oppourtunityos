/** Chaînes françaises — section « scoring ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { scoring as en } from "@/i18n/dictionaries/en/scoring";

export const scoring: Section<typeof en> = en;
