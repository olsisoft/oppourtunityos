/** Chaînes françaises — section « frontier ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { frontier as en } from "@/i18n/dictionaries/en/frontier";

export const frontier: Section<typeof en> = en;
