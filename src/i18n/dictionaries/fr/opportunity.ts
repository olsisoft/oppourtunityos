/** Chaînes françaises — section « opportunity ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { opportunity as en } from "@/i18n/dictionaries/en/opportunity";

export const opportunity: Section<typeof en> = en;
