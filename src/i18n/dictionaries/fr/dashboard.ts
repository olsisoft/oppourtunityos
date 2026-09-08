/** Chaînes françaises — section « dashboard ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { dashboard as en } from "@/i18n/dictionaries/en/dashboard";

export const dashboard: Section<typeof en> = {
  metaTitle: "Tableau de bord",
  title: "Que devrais-je investiguer ensuite ?",
  summary:
    "{workspaces, plural, one {# espace de travail actif} other {# espaces de travail actifs}} · {opportunities, plural, one {# opportunité} other {# opportunités}} · {evidence, plural, one {# preuve} other {# preuves}} · {assumptions, plural, one {# hypothèse non testée} other {# hypothèses non testées}}",
  why: "Pourquoi",
  incomplete: "INCOMPLET",
  firstDiscovery: {
    title: "Lancez votre première découverte",
    descriptionBefore:
      "Créez un espace de travail, puis choisissez comment commencer dans la conversation. Lancez",
    descriptionAfter: "pour ajouter l’espace de travail de démo Beauty Salons.",
  },
  nextAction: {
    label: "Prochaine meilleure action",
    ifFalse: "Si c’est faux : {consequence}",
    open: "Ouvrir l’opportunité",
    emptyTitle: "Aucune opportunité formée pour l’instant",
    emptyDescription:
      "Poursuivez une conversation jusqu’à connaître un ICP, une variable et une douleur. Le tableau de bord vous dira alors quoi rechercher en premier.",
  },
  frontier: {
    notComputed: "Non calculée",
    label: "Frontière de preuve : {frontier}",
  },
  strongest: {
    title: "Opportunités les plus solides",
    description:
      "Classées par Potentiel de l’opportunité. Preuves dit si le problème est réel, Valeur ce que vaut le déplacement de la variable, Causal si le mécanisme peut la déplacer. Survolez le titre pour voir la Frontière de preuve.",
    empty: "Rien n’est encore noté.",
    demoWorkspace: "{name} (démo)",
  },
  columns: {
    opportunity: "Opportunité",
    workspace: "Espace de travail",
    potential: "Potentiel",
    evidence: "Preuves",
    value: "Valeur",
    causal: "Causal",
    verdict: "Verdict",
  },
  scoreQuestions: {
    potential: "Potentiel de l’opportunité — le problème est-il structurellement attractif ?",
    evidence:
      "Confiance dans les preuves — avons-nous des preuves crédibles que le problème est réel ?",
    value: "Force de valeur — si nous déplaçons la variable, quelle valeur pourrait être créée ?",
    causal:
      "Confiance causale — savons-nous que le mécanisme proposé peut réellement la déplacer ?",
  },
  byVerdict: {
    title: "Opportunités par verdict",
  },
  learning: {
    title: "Apprentissages récents",
    description:
      "Ce que les dernières preuves et résultats d’expérimentation ont changé : affirmations, scores, Frontière de preuve, verdict.",
    empty:
      "Rien n’a encore changé. Enregistrez un résultat d’expérimentation ou liez une preuve à une affirmation.",
    frontierMoved: "Frontière de preuve déplacée : {from} → {to}",
    verdictChanged: "Verdict {from} → {to}",
    reasonExperiment: "{title} (résultat d’expérimentation)",
    reasonEvidence: "{title} (preuve)",
    meta: "{summary} · Raison : {reason} · {date}",
  },
  stalled: {
    title: "Opportunités dont l’apprentissage stagne",
    description:
      "Aucune expérimentation terminée depuis {days} jours alors que des hypothèses critiques restent UNKNOWN.",
    empty: "Aucune opportunité active ne stagne.",
    detail:
      "{status, select, NEVER {Aucune expérimentation terminée pour l’instant} other {Aucune expérimentation terminée depuis {days} jours}} · {critical, plural, one {# hypothèse critique reste UNKNOWN} other {# hypothèses critiques restent UNKNOWN}}{planned, plural, =0 {} one { · # planifiée} other { · # planifiées}}",
  },
  weakest: {
    title: "Hypothèses les plus fragiles",
    description:
      "Non testées, importance élevée. Les hypothèses causales et de valeur passent en premier : si l’une est fausse, l’opportunité s’effondre.",
    empty: "Aucune hypothèse non testée. Soit tout est vérifié, soit rien n’a été noté.",
    onLevel: "sur {level}",
    onCausalLink: "sur un lien causal",
    evidenceCount: "{count, plural, one {# preuve} other {# preuves}}",
    importance: "importance {value}",
  },
  gaps: {
    title: "Lacunes de preuves",
    description:
      "Quel type de preuve manque : le problème lui-même, son ampleur économique, la chaîne causale, le consentement à payer ou la faisabilité du mécanisme.",
    empty: "Aucune lacune de preuves ouverte sur une opportunité active.",
    kinds: {
      PROBLEM: "Lacune de preuve du problème",
      MAGNITUDE: "Lacune d’ampleur économique",
      CAUSAL: "Lacune de preuve causale",
      WTP: "Lacune de consentement à payer",
      FEASIBILITY: "Lacune de faisabilité du mécanisme",
    },
    problemDetail: "potentiel {potential} · preuves {evidence} · {gap}",
    noEvidenceCaptured: "aucune preuve saisie",
    magnitudeDetail: "L’ampleur économique est inconnue : rien de mesuré, rien de déclaré.",
    causalNoEvidence: "Un lien causal critique n’a aucune preuve.",
    causalWeak:
      "Confiance causale {confidence} : le lien critique le plus faible est à peine étayé.",
    wtpDetail: "Aucune preuve d’intention d’achat ni de dépense pour une alternative.",
    feasibilityDetail: "Une hypothèse de faisabilité du mécanisme n’est pas testée.",
  },
  fitness: {
    title: "Lacunes d’adéquation des preuves",
    description:
      "Là où la Frontière de preuve est bloquée par des preuves qui existent mais ne peuvent pas établir l’affirmation : non admissibles, peu adéquates, ou un protocole trop faible pour la causalité. Davantage des mêmes preuves n’y changera rien.",
    empty: "Aucune opportunité active n’est bloquée par des preuves inadéquates.",
    kinds: {
      NOT_ADMISSIBLE: "Preuve non admissible",
      LOW_FIT: "Preuve inadéquate à l’affirmation",
      WEAK_DESIGN: "Protocole trop faible pour la causalité",
    },
  },
  generalization: {
    title: "Lacunes de généralisation",
    description:
      "Niveaux observés dans un seul cas ou un petit échantillon. Observé sur un échantillon ne veut pas dire prouvé pour le marché ; la question suivante élargit le périmètre.",
    empty: "Aucun niveau observé n’attend de généralisation.",
  },
  workspaces: {
    title: "Espaces de travail",
    counts:
      "{opportunities, plural, one {# opportunité} other {# opportunités}} · {evidence, plural, one {# preuve} other {# preuves}}",
  },
  quickStart: {
    discoverTitle: "Je ne sais pas quoi construire",
    discoverBody: "Partez de votre contexte et découvrez un marché",
    validateTitle: "J’ai déjà une idée",
    validateBody: "Décomposez-la en ICP, variable, douleur et preuves",
  },
};
