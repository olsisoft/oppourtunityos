/** Chaînes françaises — section « opportunity ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { opportunity as en } from "@/i18n/dictionaries/en/opportunity";

export const opportunity: Section<typeof en> = {
  score: {
    incomplete: "INCOMPLET",
    notComputed: "Non calculé",
    notComputedYet: "Pas encore calculé.",
  },
  report: {
    copy: "Copier le rapport en Markdown",
    copied: "Copié",
  },
  guide: {
    ready: "Guide d’entretien prêt",
    empty: {
      readyTitle: "Prêt pour la découverte client",
      title: "Aucun guide d’entretien pour l’instant",
      description:
        "Les questions portent sur le comportement passé : la dernière fois que c’est arrivé, ce que cela a coûté, ce qu’ils ont acheté. Jamais « paieriez-vous pour cela ? ». Enregistrez ensuite vos notes comme preuves.",
    },
    generate: "Générer le guide d’entretien",
    regenerate: "Régénérer",
    source: {
      ai: "assisté par IA",
      template: "modèle",
    },
    listenFor: "À écouter",
    avoid: "À éviter",
  },
  kill: {
    none: "Aucun critère d’abandon déclenché.",
    critical:
      "{count, plural, one {# signal critique} other {# signaux critiques}} — à résoudre avant de faire confiance à un verdict positif.",
  },
  new: {
    created: "Opportunité créée et notée",
    title: "Nouvelle opportunité",
    description:
      "Une opportunité est ICP × variable × mouvement, ancrée sur une douleur. Les scores sont calculés à partir des entrées 0–10 ; les preuves sont notées séparément.",
    titleLabel: "Titre",
    titlePlaceholder: "p. ex. Prévention des rendez-vous manqués en salon",
    pain: "Douleur",
    selectPain: "Choisir une douleur",
    problemStatement: "Énoncé du problème",
    metric: "Métrique qui prouve la valeur",
    metricPlaceholder: "p. ex. taux de rendez-vous manqués par mois",
    submit: "Créer et noter",
  },
  nextAction: {
    none: "Aucune recommandation pour l’instant.",
    title: "Prochaine meilleure action",
    effort: "effort {effort, select, low {faible} medium {moyen} high {élevé} other {{effort}}}",
    type: {
      KILL: "abandonner",
      IGNORE: "ignorer",
      RESOLVE_WARNING: "résoudre l’alerte",
      VALIDATE_ASSUMPTION: "valider l’hypothèse",
      RESEARCH: "rechercher",
      COMPARE_ALTERNATIVES: "comparer les alternatives",
      EXPLORE_MECHANISMS: "explorer les mécanismes",
      INTERVIEW: "interviewer",
      TEST: "tester",
      DEFINE: "définir",
    },
  },
  card: {
    icp: "ICP",
    variable: "Variable de valeur",
    pain: "Douleur",
    trigger: "Déclencheur",
    alternative: "Alternative",
    alternativeValue: "{name} — {failure}",
    failureUnknown: "défaillance UNKNOWN",
    mechanism: "Mécanisme",
    valueProposition: "Proposition de valeur",
    frontier: "Frontière de preuve",
    frontierValue: "{frontier} — tout ce qui se trouve au-delà reste une hypothèse",
    killCriteria: "Critères d’abandon",
    assumptions: "Hypothèses ({count})",
    noAssumptions: "Aucune hypothèse enregistrée.",
    nextStep: "Prochaine étape",
  },
  inputs: {
    title: "Entrées de notation (0–10)",
    preview: "Aperçu du potentiel",
    weight: "{value} %",
    saved: "Entrées enregistrées — scores recalculés",
    note: "Modifier les entrées les marque comme les vôtres (provenance USER). Le verdict est recalculé par le moteur de règles.",
    save: "Enregistrer les entrées",
  },
  radar: {
    intro:
      "Quatre questions indépendantes, un verdict déterministe. Survolez un score pour voir sa décomposition ; INCOMPLET signifie qu’une entrée est UNKNOWN, pas zéro.",
    add: "Opportunité",
    empty: {
      title: "Aucune opportunité pour l’instant",
      description:
        "Les opportunités se forment une fois un ICP, une variable et une douleur connus. Vous pouvez aussi en créer une manuellement et définir ses entrées.",
    },
    create: "Créer une opportunité",
    column: {
      opportunity: "Opportunité",
      potential: "Potentiel",
      potentialShort: "Pot.",
      evidence: "Preuves",
      evidenceShort: "Preuv.",
      value: "Valeur",
      causal: "Causal",
      frontier: "Frontière de preuve",
      verdict: "Verdict",
    },
    question: {
      potential: "Potentiel de l’opportunité — le problème est-il structurellement attractif ?",
      evidence:
        "Confiance dans les preuves — avons-nous des preuves crédibles que le problème est réel ?",
      value:
        "Force de valeur — si nous faisons bouger la variable, quelle valeur pourrait être créée ?",
      causal:
        "Confiance causale — savons-nous que le mécanisme proposé peut réellement la faire bouger ?",
      frontier:
        "Là où s’arrête actuellement la connaissance étayée. Déterministe : dérivée des preuves liées et des liens causaux critiques, jamais de l’analyste.",
    },
    movedRecently: "↑ frontière avancée récemment",
    frontierLine: "frontière · {frontier}",
    hover: {
      dimension: "{label} : {known, select, true {{value}/10} other {UNKNOWN}} · {provenance}",
      completeness: "Complétude : {completeness}",
      next: "Suite : {question}",
      criticalLinks: "Liens critiques : {total} · validés : {validated}",
      blocking: "Bloquant : {label}",
      frontier: "Frontière de preuve : {frontier}",
      frontierWithScope: "Frontière de preuve : {frontier} · périmètre : {scope}",
      linkMissing: "{label} : UNKNOWN",
      link: "{label} : {statusLabel}",
      linkWithConfidence: "{label} : {statusLabel} {confidence}",
      incomplete: "INCOMPLET — une entrée est UNKNOWN ; ce n’est pas un zéro.",
      frontierTitle: "Frontière de preuve",
    },
  },
  breakdown: {
    weight: "{value}/10 × {weight} %",
    points: "{points} pts",
    weakest: "Entrées les plus faibles : {inputs}.",
    noEvidence:
      "Aucune preuve capturée. Tout ce qui concerne cette opportunité reste une hypothèse.",
    fill: "{fill} % de {weight} · {count, plural, one {# élément} other {# éléments}}",
    contradictory:
      "Preuves contradictoires ({count, plural, one {# élément} other {# éléments}}) −{points} pts",
    gaps: "Lacunes dans les preuves",
    fallback:
      "Cette paire de scores tombe entre les règles principales ; la grille de repli documentée s’est appliquée.",
  },
};
