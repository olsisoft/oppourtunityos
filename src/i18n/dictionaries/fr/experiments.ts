/** Chaînes françaises — section « experiments ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { experiments as en } from "@/i18n/dictionaries/en/experiments";

export const experiments: Section<typeof en> = en;
