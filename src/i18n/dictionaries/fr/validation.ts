/** Chaînes françaises — section « validation ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { validation as en } from "@/i18n/dictionaries/en/validation";

export const validation: Section<typeof en> = {
  required: "Ce champ est obligatoire",
  tooShort: "Utilisez au moins 3 caractères",
  nameRequired: "Le nom est obligatoire",
  email: "Saisissez une adresse e-mail valide",
  passwordRequired: "Saisissez votre mot de passe",
  passwordMin: "Utilisez au moins 8 caractères",
  excerptRequired: "Collez la citation, la note ou l’extrait",
  checkHighlighted: "Vérifiez les champs signalés.",
  checkFields: "Vérifiez les champs.",
  invalidInput: "Saisie invalide",
};
