/** Chaînes françaises — section « evidence ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { evidence as en } from "@/i18n/dictionaries/en/evidence";

export const evidence: Section<typeof en> = en;
