/** Chaînes françaises — section « auth ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { auth as en } from "@/i18n/dictionaries/en/auth";

export const auth: Section<typeof en> = en;
