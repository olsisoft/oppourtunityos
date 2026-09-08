/** Chaînes françaises — section « discovery ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { discovery as en } from "@/i18n/dictionaries/en/discovery";

export const discovery: Section<typeof en> = en;
