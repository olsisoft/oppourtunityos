/** Chaînes françaises — section « nextAction ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { nextAction as en } from "@/i18n/dictionaries/en/nextAction";

export const nextAction: Section<typeof en> = en;
