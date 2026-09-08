/** Chaînes françaises — section « validity ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { validity as en } from "@/i18n/dictionaries/en/validity";

export const validity: Section<typeof en> = en;
