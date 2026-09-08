/** Chaînes françaises — section « chat ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import { chat as en } from "@/i18n/dictionaries/en/chat";

export const chat: Section<typeof en> = en;
