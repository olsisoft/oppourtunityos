/** Chaînes françaises — section « layout ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { layout as en } from "@/i18n/dictionaries/en/layout";

export const layout: Section<typeof en> = en;
