/** Chaînes françaises — section « shared ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { shared as en } from "@/i18n/dictionaries/en/shared";

export const shared: Section<typeof en> = en;
