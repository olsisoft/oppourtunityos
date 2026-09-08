/** Chaînes françaises — section « common » : mots partagés par plusieurs écrans. */
import type { Section } from "@/i18n/dictionary";
import type { common as en } from "@/i18n/dictionaries/en/common";

export const common: Section<typeof en> = {
  language: "Langue",
  loading: "Chargement…",
  save: "Enregistrer",
  cancel: "Annuler",
  close: "Fermer",
  delete: "Supprimer",
  edit: "Modifier",
  done: "Terminé",
  back: "Retour",
  retry: "Réessayer",
  yes: "Oui",
  no: "Non",
  unknown: "Inconnu",
  notRecorded: "non renseigné",
  none: "Aucun",
  optional: "facultatif",
  demo: "démo",
  demoData: "DONNÉES DE DÉMO",
  justNow: "à l’instant",
  outOf100: "/100",
  invalidInput: "Saisie invalide",
};
