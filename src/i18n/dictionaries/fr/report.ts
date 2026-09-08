/** Chaînes françaises — section « report ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { report as en } from "@/i18n/dictionaries/en/report";

export const report: Section<typeof en> = en;
