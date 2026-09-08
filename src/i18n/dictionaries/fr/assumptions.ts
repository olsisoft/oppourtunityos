/** Chaînes françaises — section « assumptions ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { assumptions as en } from "@/i18n/dictionaries/en/assumptions";

export const assumptions: Section<typeof en> = en;
