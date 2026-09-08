/** Chaînes françaises — section « auth ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { auth as en } from "@/i18n/dictionaries/en/auth";

export const auth: Section<typeof en> = {
  login: {
    metaTitle: "Se connecter",
    title: "Se connecter",
    description: "Poursuivez votre découverte d’opportunités.",
    demoAccountBefore: "Compte de démo (après",
    demoAccountAfter: ") :",
  },
  register: {
    metaTitle: "Créer un compte",
    title: "Créez votre compte",
    description:
      "Découvrez des problèmes qui valent la peine d’être résolus. Les hypothèses restent séparées des preuves.",
  },
  form: {
    name: "Nom",
    email: "E-mail",
    password: "Mot de passe",
    signIn: "Se connecter",
    createAccount: "Créer un compte",
    noAccount: "Pas de compte ?",
    createOne: "Créez-en un",
    alreadyRegistered: "Déjà inscrit ?",
  },
  errors: {
    emailTaken: "Un compte existe déjà avec cette adresse e-mail.",
    missingCredentials: "Saisissez votre e-mail et votre mot de passe.",
    invalidCredentials: "E-mail ou mot de passe invalide.",
  },
};
