/** Chaînes françaises — section « evidence ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { evidence as en } from "@/i18n/dictionaries/en/evidence";

export const evidence: Section<typeof en> = {
  panel: {
    count:
      "{count, plural, one {# élément} other {# éléments}}. Uniquement du matériau externe — les hypothèses n’apparaissent jamais ici.",
    research: "Recherche",
    add: "Ajouter une preuve",
    emptyTitle: "Aucune preuve pour l’instant.",
    emptyStrong:
      "Hypothèse à fort potentiel (« {title} », {score}/100), mais rien n’a été vérifié. Ajoutez des preuves avant de faire avancer cette opportunité.",
    emptyDefault:
      "Les hypothèses ne sont pas des preuves. Capturez des citations, des avis, des entretiens et des notes ; la Confiance dans les preuves est calculée à partir d’eux.",
    addFirst: "Ajouter la première preuve",
  },
  item: {
    flag: {
      directCustomer: "client direct",
      explicitPain: "douleur explicite",
      economicImpact: "impact économique",
      workaround: "solution de contournement",
      purchaseIntent: "intention d’achat",
    },
    deleteConfirm: "Supprimer cette preuve ? Les scores seront recalculés.",
    mocked: "SIMULÉ",
    interview: "Entretien",
    experiment: "Expérimentation",
    experimentTitled: "Expérimentation : {title}",
    openSource: "Ouvrir la source",
    delete: "Supprimer la preuve",
    less: "moins",
    more: "plus",
    sampleSize: "n = {n}",
    limitations: "Limites : {text}",
    scope: "Périmètre",
    origin: "origine : {id}",
    strength: "force {score}/10",
    relevance: "pertinence {score}/10",
    fitTitle: "Adéquation à l’affirmation",
    notLinked:
      "Non liée à une affirmation précise. Elle compte pour la douleur ou l’opportunité à laquelle elle est rattachée ; liez-la à une affirmation pour voir à quel point elle lui correspond — une preuve qui existe n’est pas une preuve qui convient.",
    claimTarget: "{label} : {statement}",
  },
  dialog: {
    title: "Ajouter une preuve",
    description:
      "Collez une citation client, un message de forum, un avis, des notes d’entretien ou une URL. Une preuve est un matériau externe — elle n’est jamais générée par l’analyste. Son contenu est traité comme des données, jamais comme des instructions.",
    sourceType: "Type de source",
    sourceTypeHelp:
      "Ce qu’*est* la preuve détermine les affirmations qu’elle peut établir. Un entretien établit une douleur ; il n’établit ni une causalité ni un achat.",
    sourceTitle: "Titre de la source",
    sourceTitlePlaceholder: "ex. Entretien — gérante de salon, Lyon",
    url: "URL (facultatif, http/https uniquement)",
    date: "Date",
    author: "Auteur",
    excerpt: "Extrait / citation / notes",
    excerptPlaceholder: "Citation textuelle ou notes. Conservez les mots du client.",
    signalsHelp:
      "Les signaux ci-dessous déterminent la Confiance dans les preuves. Ne cochez que ce que la source montre réellement.",
    suggest: "Suggérer les signaux",
    excerptFirst: "Collez d’abord l’extrait.",
    suggestionNote:
      "{mock, select, true {Suggestion du fournisseur simulé} other {Suggestion de l’IA}} — {summary} Confirmez chaque signal avant d’enregistrer.",
    signal: {
      isDirectCustomer: "Client direct / utilisateur de l’ICP",
      hasExplicitPain: "Énonce la douleur explicitement",
      hasEconomicImpact: "Quantifie l’impact économique",
      hasWorkaround: "Décrit une solution de contournement",
      hasPurchaseIntent: "Montre une intention d’achat / une dépense",
      isInterview: "Ceci est une note d’entretien",
    },
    sentiment: "Position vis-à-vis de l’hypothèse",
    strength: "Force {score}/10",
    relevance: "Pertinence {score}/10",
    linkedPain: "Douleur liée",
    linkedOpportunity: "Opportunité liée",
    scopeLegend: "Où cela a-t-il été observé ? (périmètre)",
    scopeHelp:
      "Une preuve compte dans le périmètre où elle a été observée. Le renseigner permet au moteur de juger la correspondance de périmètre et la portée de généralisation d’une affirmation.",
    hideScope: "Masquer",
    recordScope: "Renseigner le périmètre",
    origin: "Origine de la source (lignée)",
    originPlaceholder:
      "ex. interview:owner-a — les dérivés d’une même source ne comptent qu’une fois",
    organizations: "Organisations",
    sampleSize: "Taille d’échantillon",
    population: "Population",
    populationPlaceholder: "salons de coiffure indépendants, 8 à 12 fauteuils",
    systems: "Systèmes / outils (séparés par des virgules)",
    systemsPlaceholder: "Caisse A, Outil de réservation B",
    environment: "Environnement / conditions",
    environmentPlaceholder: "assisté par le fondateur, sans assistance…",
    timePeriod: "Période",
    timePeriodPlaceholder: "un mois, T2 2026",
    geography: "Géographie",
    conditions: "Autres conditions",
    claimsLegend: "Quelle affirmation cette preuve concerne-t-elle ?",
    claimsChooseOpportunity:
      "Choisissez une opportunité liée pour rattacher cette preuve à des affirmations précises : la douleur, son ampleur, le consentement à payer, un niveau de la chaîne de valeur ou un lien causal. Un même élément peut concerner plusieurs affirmations.",
    noClaims: "Aucune affirmation disponible.",
    claimsHelp:
      "Cochez chaque affirmation et indiquez si la source l’étaye, la contredit ou reste neutre. Le badge indique l’admissibilité d’une source de type « {source} » pour cette affirmation ; le moteur calcule l’adéquation et réévalue l’affirmation — rien ne devient prouvé automatiquement.",
    affectsClaim: "Concerne {claim}",
    stored:
      "Enregistrée comme PREUVE EXTERNE, jamais comme hypothèse{count, plural, =0 {} one { · concerne # affirmation} other { · concerne # affirmations}}",
    save: "Enregistrer la preuve",
    savedClaims:
      "Preuve capturée — {count, plural, one {# affirmation réévaluée} other {# affirmations réévaluées}}",
    savedScores: "Preuve capturée — scores recalculés",
  },
  claimTargets: {
    group: {
      PROBLEM: "Problème",
      COMMERCIAL: "Commercial",
      ACCESS: "Accès",
      VALUE_CHAIN: "Chaîne de valeur",
      CAUSAL_LINKS: "Liens causaux",
      OTHER: "Autre",
    },
    link: "{from} → {to}",
    detail: {
      EXISTING_SPEND:
        "Ce que les acheteurs paient déjà pour gérer ce problème (pas le consentement à payer pour une nouveauté)",
      PURCHASE_INTENT: "Les acheteurs disent qu’ils achèteraient",
      WILLINGNESS_TO_PAY:
        "Les acheteurs indiquent un prix qu’ils paieraient (déclaré, pas observé)",
      PRICE_ACCEPTANCE: "Les acheteurs acceptent un prix réel qui leur est présenté",
      ACTUAL_PURCHASE: "De l’argent a réellement changé de mains",
    },
  },
  research: {
    title: "Recherche",
    description:
      "Recherchez des signaux sur la douleur dans des sources externes. Les résultats sont du contenu non fiable : relisez-les, définissez la position, puis importez les plus utiles comme preuves.",
    placeholder: "ex. politique d’acompte contre les rendez-vous manqués en salon",
    linkToPain: "Lier à une douleur",
    noPainLink: "Aucune douleur liée",
    search: "Rechercher",
    mockedTitle: "Données de recherche simulées.",
    mockedBody:
      "Le fournisseur « {provider} » renvoie des résultats synthétiques pour vous permettre de tester le parcours. Rien ici n’est une source réelle. Les éléments importés restent étiquetés SIMULÉ et doivent être supprimés avant toute analyse réelle.",
    noResults: "Aucun résultat.",
    mock: "SIMULÉ",
    meta: "{date} · indice de pertinence {hint}/10",
    undated: "non daté",
    import: "Importer comme preuve",
    imported: "Importée comme preuve (étiquetée selon son origine)",
  },
};
