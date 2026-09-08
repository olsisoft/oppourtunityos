/** Chaînes françaises — section « dashboard ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { dashboard as en } from "@/i18n/dictionaries/en/dashboard";

export const dashboard: Section<typeof en> = en;
