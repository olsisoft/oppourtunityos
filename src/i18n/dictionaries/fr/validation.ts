/** Chaînes françaises — section « validation ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { validation as en } from "@/i18n/dictionaries/en/validation";

export const validation: Section<typeof en> = en;
