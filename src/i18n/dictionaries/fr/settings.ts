/** Chaînes françaises — section « settings ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { settings as en } from "@/i18n/dictionaries/en/settings";

export const settings: Section<typeof en> = en;
