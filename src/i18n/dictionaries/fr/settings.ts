/** Chaînes françaises — section « settings ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { settings as en } from "@/i18n/dictionaries/en/settings";

export const settings: Section<typeof en> = {
  metaTitle: "Paramètres",
  title: "Paramètres",
  description: "Configuration du compte et de l’exécution. Les secrets ne sont jamais affichés.",
  account: {
    title: "Compte",
    name: "Nom",
    email: "E-mail",
  },
  language: {
    title: "Langue",
    description:
      "Langue de l’interface. Le choix est enregistré sur votre compte et vous suit sur votre prochain navigateur.",
    current: "Langue actuelle",
  },
  provider: {
    title: "Fournisseur d’IA",
    descriptionBefore: "Configuré par variables d’environnement (",
    descriptionAfter: "). Les scores et les verdicts ne dépendent jamais du fournisseur.",
    provider: "Fournisseur",
    model: "Modèle",
    modelTemplates: "réponses types",
    status: "Statut",
    mock: "Fournisseur simulé — réponses types, pas une analyse",
    configured: "Configuré",
    keyMissing: "Clé API manquante",
    rateLimit: "Limite de débit",
    rateLimitValue: "{max} tours de conversation par {minutes} minutes et par utilisateur",
  },
  research: {
    title: "Fournisseurs de recherche",
    description:
      "La V1 prend en charge la saisie manuelle de preuves, les URL collées, les citations et les notes, ainsi qu’un fournisseur de recherche simulé clairement signalé. Web, Reddit, sites d’avis et sites d’emploi se brancheront plus tard sur la même interface.",
    activeProvider: "Fournisseur actif",
    mockResearch: "mock-research (signalé MOCK)",
  },
};
