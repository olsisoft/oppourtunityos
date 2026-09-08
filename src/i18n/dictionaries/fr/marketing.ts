/** Chaînes françaises — section « marketing ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { marketing as en } from "@/i18n/dictionaries/en/marketing";

export const marketing: Section<typeof en> = {
  metaDescription:
    "Arrêtez de demander des idées de startup à l’IA. Découvrez des problèmes qui valent la peine d’être résolus : marchés, variables de valeur, douleur, preuves et un verdict déterministe.",
  nav: {
    method: "Méthode",
    radar: "Radar",
    openWorkspace: "Ouvrir l’espace de travail",
    signIn: "Se connecter",
    getStarted: "Commencer",
  },
  hero: {
    eyebrow: "Découverte d’opportunités fondée sur les preuves",
    title: "Sachez ce qui vaut la peine d’être construit avant d’y passer des mois.",
    subtitle:
      "OpportunityOS transforme des hypothèses de marché en opportunités falsifiables, étayées par des preuves — et montre précisément ce qui reste à prouver.",
    body: "Arrêtez de demander des idées de startup à l’IA. Cartographiez les marchés, identifiez les variables de valeur, analysez la douleur et les preuves, tracez la chaîne causale du mécanisme à la valeur, testez le maillon le plus faible et regardez votre confiance évoluer.",
    findOpportunity: "Trouver une opportunité",
    validateIdea: "Valider une idée",
    note: "Hypothèse ≠ Preuve. Chaque opportunité porte quatre scores indépendants et une Frontière de preuve. Ce n’est pas l’IA qui décide de ce qui est vrai : ce sont les preuves. Et une preuve n’est pas qu’une source : elle doit être adéquate à l’affirmation.",
  },
  footer: {
    tagline: "OpportunityOS — découvrez des anomalies économiques, pas des idées.",
    motto: "Ne générez pas d’idées. Découvrez des anomalies économiques.",
  },
  whyFail: {
    title: "Pourquoi les générateurs d’idées échouent",
    body: "Ils partent d’un produit et le justifient après coup. Ils encensent tout. Ils confondent une histoire plausible avec un client qui perd de l’argent chaque semaine. Le résultat ressemble à du progrès et vous coûte des mois.",
    generatorsLabel: "La plupart des générateurs d’idées par IA",
    generatorsFlow: "Idée → justification",
    ourLabel: "OpportunityOS",
    ourFlow:
      "Marché → ICP → Variable de valeur → Douleur → Preuves → Opportunité → Mécanisme → Frontière de preuve → Expérimentation",
    productFirst: {
      title: "Le produit d’abord",
      body: "Idée → justification au lieu de marché → ICP → variable → problème.",
    },
    reasoningAsProof: {
      title: "Le raisonnement comme preuve",
      body: "La confiance d’un LLM n’est pas une preuve. Rien n’est vérifié.",
    },
    noKillSwitch: {
      title: "Pas de bouton d’arrêt",
      body: "Les idées faibles ne sont jamais abandonnées, car rien n’est noté selon une règle.",
    },
    noCausalChain: {
      title: "Pas de chaîne causale",
      body: "Si vous ne pouvez pas dire comment un mécanisme déplace une variable — et prouver chaque étape — vous ne pouvez pas la vendre.",
    },
  },
  method: {
    title: "Méthodologie de découverte d’opportunités",
    bodyBefore:
      "Chaque conversation suit le même pipeline et produit un artefact structuré, pas une transcription. Les produits déplacent des variables de valeur :",
    formula: "ICP × Variable × Mouvement souhaité",
    bodyAfter:
      ". Ensuite, l’échelle de causalité de la valeur dit comment — et la Frontière de preuve dit quelle part en est réellement étayée.",
    pipeline: {
      market: "Marché",
      icp: "ICP",
      variable: "Variable de valeur",
      pain: "Douleur",
      evidence: "Preuves",
      opportunity: "Opportunité",
      mechanism: "Mécanisme",
      causalChain: "Chaîne causale",
      proofFrontier: "Frontière de preuve",
      experiment: "Expérimentation",
    },
  },
  evidenceDecides: {
    title: "Ce n’est pas l’IA qui décide de ce qui est vrai. Ce sont les preuves.",
    body: "L’analyste propose des hypothèses et pose des questions. Quatre scores indépendants, le statut épistémique de chaque affirmation, la Frontière de preuve et le verdict sont calculés de façon déterministe à partir des preuves que vous saisissez. UNKNOWN reste UNKNOWN. Et toute preuve ne peut pas prouver toute affirmation.",
    questions: {
      potential: {
        title: "Potentiel de l’opportunité",
        question: "Le problème est-il structurellement attractif ?",
      },
      evidence: {
        title: "Confiance dans les preuves",
        question: "Avons-nous des preuves crédibles que le problème est réel ?",
      },
      value: {
        title: "Force de valeur",
        question: "Si nous déplaçons la variable, quelle valeur pourrait être créée ?",
      },
      causal: {
        title: "Confiance causale",
        question: "Savons-nous que le mécanisme proposé peut réellement la déplacer ?",
      },
    },
    verdictNote: {
      lowEvidence: "Un potentiel élevé avec peu de preuves donne",
      untestedMechanism:
        ", jamais BUILD. Un problème solide dont le mécanisme n’a jamais été testé donne",
      experiment: "— une expérimentation sur le premier lien causal non prouvé.",
    },
  },
  fit: {
    title: "Toutes les preuves ne prouvent pas la même chose",
    body: "Une preuve n’est pas qu’une source. Elle doit être adéquate à l’affirmation. Chaque preuve est jugée au regard de l’affirmation précise à laquelle elle est liée — admissibilité, caractère direct, méthode, indépendance, périmètre, échantillon, fraîcheur — et une affirmation n’est établie qu’à hauteur de sa preuve la plus adéquate, dans le périmètre où elle a été observée.",
    establishes: "établit",
    cannot: "pas {claim}",
    examples: {
      interview: {
        source: "Entretien",
        proves: "qu’une douleur existe et comment elle est décrite",
        cannot: "son ampleur, ni la causalité",
      },
      operationalData: {
        source: "Données opérationnelles",
        proves: "la fréquence et l’ampleur, telles que mesurées",
        cannot: "qu’un mécanisme a causé un changement",
      },
      controlledTest: {
        source: "Test contrôlé",
        proves: "un effet causal dans le périmètre testé",
        cannot: "l’ensemble du marché",
      },
      purchase: {
        source: "Achat",
        proves: "le consentement à payer et l’achat réel",
        cannot: "que le produit a créé de la valeur",
      },
    },
    footnote:
      "Les entretiens ne peuvent pas établir la causalité. Une dépense existante n’est pas un consentement à payer. Un changement avant/après est compatible avec un effet, pas la preuve d’un effet. Observé dans cinq salons signifie observé dans cinq salons.",
  },
  decision: {
    title: "De l’hypothèse à la décision",
    body: "OpportunityOS ne se contente pas de vous dire quoi tester. Il enregistre ce qui s’est passé, met à jour le modèle causal et montre précisément comment votre confiance a changé — quelles affirmations ont bougé, où se situe désormais la Frontière de preuve et ce qu’est devenu le verdict. Aucune certitude automatique : un résultat étaye, contredit ou reste non concluant, et conserve ses limites.",
    loop: {
      assumption: "Hypothèse",
      experiment: "Expérimentation",
      result: "Résultat",
      evidence: "Preuves",
      proofFrontier: "Frontière de preuve",
      decision: "Décision",
    },
    discoveryLoopLabel: "Boucle de découverte",
    discoveryLoop:
      "Marché → ICP → Variable de valeur → Douleur → Preuves → Opportunité → Mécanisme → Chaîne de valeur → Frontière de preuve",
    validationLoopLabel: "Boucle de validation",
    validationLoop:
      "Hypothèse → Expérimentation → Résultat → Preuves → Mise à jour des connaissances → Mouvement de la Frontière de preuve → Verdict → Prochaine meilleure action",
  },
  radar: {
    title: "Exemple de Radar d’opportunités",
    badge: "Données d’exemple — illustratives, non mesurées",
    columns: {
      opportunity: "Opportunité",
      potential: "Potentiel",
      evidence: "Preuves",
      value: "Valeur",
      causal: "Causal",
      proofFrontier: "Frontière de preuve",
      verdict: "Verdict",
    },
    incomplete: "INCOMPLET",
    rows: {
      leakage: "Fuite de revenus par les employés",
      noShow: "Prévention des rendez-vous manqués en salon",
      idleCapacity: "Capacité inutilisée",
      shrinkage: "Démarque inconnue",
      dynamicPricing: "Tarification dynamique",
    },
    note: "INCOMPLET signifie qu’une donnée est inconnue, pas nulle. La frontière est là où s’arrête aujourd’hui la connaissance étayée ; tout ce qui est au-delà est une hypothèse produit ou causale.",
  },
  how: {
    title: "Comment ça marche",
    steps: {
      talk: {
        title: "Discuter",
        body: "Partez de votre contexte ou décomposez une idée existante. L’analyste pose une question ciblée à la fois.",
      },
      structure: {
        title: "Structurer",
        body: "Chaque réponse met à jour un modèle structuré : ICP, variables de valeur, douleurs, mécanismes et chaîne causale du mécanisme à la valeur.",
      },
      evidence: {
        title: "Prouver",
        body: "Saisissez citations, URL, entretiens et notes, et dites quelle affirmation chacun étaye ou contredit. Hypothèses et preuves ne se mélangent jamais.",
      },
      decide: {
        title: "Décider",
        body: "Des scores déterministes, une Frontière de preuve et une règle de verdict vous disent quoi ignorer, abandonner, rechercher, interviewer ou tester ensuite.",
      },
    },
  },
  cta: {
    title: "Décidez ce qui mérite des mois de votre vie.",
    body: "Ouvrez l’espace de travail de démo ou lancez votre propre découverte. Pas de carte bancaire, pas de pitch deck, pas de générateur de logo.",
  },
};
