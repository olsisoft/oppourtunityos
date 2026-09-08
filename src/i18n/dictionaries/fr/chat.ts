/** Chaînes françaises — section « chat ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { chat as en } from "@/i18n/dictionaries/en/chat";

export const chat: Section<typeof en> = {
  header: {
    stage: "Étape",
    entryMode: {
      HAS_IDEA: "Rétro-ingénierie d’une idée",
      NO_IDEA: "Découverte de marché",
    },
    mockProvider: "Fournisseur IA simulé — réponses types",
  },
  error: {
    requestFailed: "Requête échouée ({status})",
    generic: "Une erreur est survenue.",
  },
  composer: {
    placeholder: "Répondez, ajoutez du contexte ou interrogez l’analyste…",
    placeholderWorking: "L’analyste travaille…",
    messageLabel: "Message",
    send: "Envoyer",
    footer:
      "Les hypothèses restent étiquetées comme hypothèses. Les preuves sont ajoutées via l’onglet Preuves, jamais inventées par l’analyste.",
  },
  progress: {
    title: "Progression de la découverte",
    percent: "{value} %",
  },
  entry: {
    title: "Comment voulez-vous commencer ?",
    subtitle:
      "Dans les deux cas, nous partons d’un problème, jamais d’un produit. La conversation construit un modèle d’opportunité structuré sur la droite.",
    noIdea: {
      title: "Je ne sais pas quoi construire",
      description:
        "Partez des secteurs que vous comprenez et des personnes que vous pouvez joindre. Nous cartographions marchés, ICP et variables de valeur avant toute solution.",
      submit: "Lancer la découverte de marché",
      message: "Je ne sais pas quoi construire",
    },
    hasIdea: {
      title: "J’ai déjà une idée",
      description:
        "Nous la rétro-analysons : produit → résultat visé → variable → ICP → douleur → déclencheur → preuve. L’idée peut se révéler faible.",
      placeholder:
        "Décrivez l’idée en une phrase, p. ex. « réceptionniste IA pour cliniques dentaires »",
      submit: "Décomposer l’idée",
    },
  },
  applied: {
    summary: "Ajouté à l’espace de travail : {summary}",
    markets: "{count, plural, one {# marché} other {# marchés}}",
    icps: "{count, plural, one {# ICP} other {# ICP}}",
    variables: "{count, plural, one {# variable} other {# variables}}",
    pains: "{count, plural, one {# douleur} other {# douleurs}}",
    triggers: "{count, plural, one {# déclencheur} other {# déclencheurs}}",
    alternatives: "{count, plural, one {# alternative} other {# alternatives}}",
    mechanisms: "{count, plural, one {# mécanisme} other {# mécanismes}}",
    opportunities: "{count, plural, one {# opportunité} other {# opportunités}}",
    valueChainNodes:
      "{count, plural, one {# niveau de chaîne de valeur} other {# niveaux de chaîne de valeur}}",
    causalLinks: "{count, plural, one {# lien causal} other {# liens causaux}}",
    experiments: "{count, plural, one {# expérimentation} other {# expérimentations}}",
    assumptions: "{count, plural, one {# hypothèse} other {# hypothèses}}",
  },
  mockBadge: "fournisseur simulé",
  question: {
    freeTextHint: "Ou saisissez votre propre réponse ci-dessous.",
  },
};
