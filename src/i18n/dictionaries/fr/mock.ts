/** Chaînes françaises — section « mock ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { mock as en } from "@/i18n/dictionaries/en/mock";

export const mock: Section<typeof en> = en;
