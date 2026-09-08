/** Chaînes françaises — section « marketing ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { marketing as en } from "@/i18n/dictionaries/en/marketing";

export const marketing: Section<typeof en> = en;
