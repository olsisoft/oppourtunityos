/**
 * Chaînes françaises — section « mock ». Typée sur la section anglaise : toute
 * clé manquante ou en trop est une erreur de compilation.
 *
 * Le vocabulaire de statut de l’analyste (UNKNOWN, HYPOTHESIS, FACT, EVIDENCE)
 * et les valeurs d’énumération restent tels quels, comme dans les réponses du
 * vrai fournisseur. {icpPlural} est le pluriel de l’ICP (calculé par le
 * fournisseur simulé) ; {variableLower} le nom de la variable en minuscules.
 */
import type { Section } from "@/i18n/dictionary";
import type { mock as en } from "@/i18n/dictionaries/en/mock";

export const mock: Section<typeof en> = {
  label: "[FOURNISSEUR SIMULÉ — réponse type, pas une analyse]",
  fallback: {
    icp: "l’ICP",
    variable: "la variable",
    intervention: "l’intervention",
    opportunity: "l’opportunité",
    automation: "Automatisation",
    problem: "le problème",
  },
  variables: {
    missedCalls: {
      name: "Appels manqués",
      type: "Perte",
      target: "Appels entrants restés sans réponse",
      unit: "appels par jour",
      parent: "Chiffre d’affaires nouveaux patients",
    },
    bookingConversion: {
      name: "Conversion des demandes en rendez-vous",
      type: "Conversion",
      target: "Demandes qui deviennent des rendez-vous pris",
      unit: "% des demandes",
      parent: "Chiffre d’affaires nouveaux patients",
    },
    frontDeskLaborCost: {
      name: "Coût de main-d’œuvre à l’accueil",
      type: "Coût",
      target: "Heures de personnel passées au téléphone",
      unit: "heures par semaine",
      parent: "Coût d’exploitation",
    },
    responseTime: {
      name: "Délai de réponse",
      type: "Temps de traitement",
      target: "Temps entre la demande et la réponse",
      unit: "minutes",
      parent: "Conversion des demandes en rendez-vous",
    },
    noShowRate: {
      name: "Taux de rendez-vous non honorés",
      type: "Taux de rendez-vous non honorés",
      target: "Rendez-vous pris qui deviennent de la capacité inutilisée",
      unit: "% des rendez-vous",
      parent: "Chiffre d’affaires par heure-fauteuil disponible",
    },
    idleChairCapacity: {
      name: "Capacité de fauteuil inutilisée",
      type: "Capacité inutilisée",
      target: "Heures-fauteuil payées mais non vendues",
      unit: "heures-fauteuil par semaine",
      parent: "Chiffre d’affaires par heure-fauteuil disponible",
    },
    employeeRevenueLeakage: {
      name: "Fuite de chiffre d’affaires par les employés",
      type: "Fuite",
      target: "Prestations réalisées mais non enregistrées ou non payées",
      unit: "% du chiffre d’affaires",
      parent: "Chiffre d’affaires net",
    },
    clientRetention: {
      name: "Fidélisation des clients",
      type: "Fidélisation",
      target: "Clients qui reviennent sous 90 jours",
      unit: "% des clients",
      parent: "Valeur vie client",
    },
    inventoryShrinkage: {
      name: "Démarque inconnue",
      type: "Démarque",
      target: "Produits qui disparaissent sans vente",
      unit: "€ par mois",
      parent: "Marge brute",
    },
    kitchenLaborCost: {
      name: "Coût de main-d’œuvre",
      type: "Coût",
      target: "Heures de personnel par couvert",
      unit: "% du chiffre d’affaires",
      parent: "Marge d’exploitation",
    },
    foodWaste: {
      name: "Gaspillage alimentaire",
      type: "Gaspillage",
      target: "Ingrédients achetés mais non vendus",
      unit: "% des achats",
      parent: "Marge brute",
    },
    tableUtilization: {
      name: "Taux d’occupation des tables",
      type: "Taux d’utilisation",
      target: "Heures-places vendues",
      unit: "% des heures-places",
      parent: "Chiffre d’affaires par heure-place",
    },
    noShows: {
      name: "Réservations non honorées",
      type: "Taux de rendez-vous non honorés",
      target: "Réservations qui ne se présentent pas",
      unit: "% des réservations",
      parent: "Chiffre d’affaires par heure-place",
    },
    repeatVisits: {
      name: "Visites répétées",
      type: "Fidélisation",
      target: "Clients qui reviennent sous 60 jours",
      unit: "% des clients",
      parent: "Valeur vie client",
    },
    fuelCostPerDelivery: {
      name: "Coût de carburant par livraison",
      type: "Coût",
      target: "Carburant consommé par livraison effectuée",
      unit: "€ par livraison",
      parent: "Coût par livraison",
    },
    idleVehicleTime: {
      name: "Temps d’immobilisation des véhicules",
      type: "Capacité inutilisée",
      target: "Heures-véhicule sans transport de fret",
      unit: "heures par véhicule et par semaine",
      parent: "Utilisation des actifs",
    },
    lateDeliveries: {
      name: "Livraisons en retard",
      type: "Retard",
      target: "Livraisons hors du créneau promis",
      unit: "% des livraisons",
      parent: "Fidélisation des clients",
    },
    driverChurn: {
      name: "Rotation des chauffeurs",
      type: "Attrition",
      target: "Chauffeurs qui partent chaque année",
      unit: "% par an",
      parent: "Coût d’exploitation",
    },
    damageClaims: {
      name: "Réclamations pour dommages",
      type: "Perte",
      target: "Expéditions endommagées en transit",
      unit: "réclamations pour 1 000 expéditions",
      parent: "Coût par livraison",
    },
    incidentResolutionTime: {
      name: "Délai de résolution des incidents",
      type: "Temps de traitement",
      target: "Temps entre l’alerte et la clôture de l’incident",
      unit: "heures",
      parent: "Exposition au risque d’intrusion",
    },
    alertFatigue: {
      name: "Fatigue liée aux alertes",
      type: "Volume",
      target: "Alertes triées par analyste et par jour",
      unit: "alertes par analyste",
      parent: "Productivité des analystes",
    },
    auditPreparationTime: {
      name: "Temps de préparation des audits",
      type: "Effort manuel",
      target: "Heures passées à préparer les preuves d’audit",
      unit: "heures par audit",
      parent: "Coût de conformité",
    },
    breachRiskExposure: {
      name: "Exposition au risque d’intrusion",
      type: "Exposition",
      target: "Vulnérabilités critiques non corrigées",
      unit: "constats critiques ouverts",
      parent: "Perte attendue",
    },
    analystTurnover: {
      name: "Rotation des analystes",
      type: "Attrition",
      target: "Analystes qui partent chaque année",
      unit: "% par an",
      parent: "Coût d’exploitation",
    },
    revenueLeakage: {
      name: "Fuite de chiffre d’affaires",
      type: "Fuite",
      target: "Chiffre d’affaires gagné mais non encaissé",
      unit: "% du chiffre d’affaires",
      parent: "Chiffre d’affaires net",
    },
    manualLaborCost: {
      name: "Coût de main-d’œuvre",
      type: "Coût",
      target: "Heures de personnel consacrées au travail manuel",
      unit: "heures par semaine",
      parent: "Marge d’exploitation",
    },
    customerRetention: {
      name: "Fidélisation des clients",
      type: "Fidélisation",
      target: "Clients qui renouvellent ou reviennent",
      unit: "% des clients",
      parent: "Valeur vie client",
    },
    timeToResolution: {
      name: "Délai de résolution",
      type: "Temps de cycle",
      target: "Temps entre la demande et la résolution",
      unit: "heures",
      parent: "Fidélisation des clients",
    },
    errorRate: {
      name: "Taux d’erreur",
      type: "Erreur",
      target: "Livrables à reprendre",
      unit: "% des livrables",
      parent: "Coût d’exploitation",
    },
  },
  context: {
    industries: {
      question: "Quels secteurs connaissez-vous ou pouvez-vous atteindre ?",
      options: {
        localServices: "Services de proximité (salons, cliniques, restaurants)",
        b2bSoftware: "Équipes logicielles B2B",
        logistics: "Logistique",
        healthcare: "Santé",
      },
    },
    audiences: {
      question:
        "À quel type de personnes pouvez-vous réellement parler dans les deux prochaines semaines ?",
      options: {
        smallBusinessOwners: "Dirigeants de petites entreprises",
        engineeringManagers: "Responsables d’ingénierie",
        operationsStaff: "Personnel des opérations",
        nobody: "Personne pour l’instant",
      },
    },
    businessModel: {
      question: "Cherchez-vous du B2B, du B2C, ou les deux ?",
      options: { b2b: "B2B", b2c: "B2C", either: "Les deux" },
    },
    productPreferences: {
      question:
        "Préférez-vous le logiciel, l’IA, le matériel, une place de marché, ou êtes-vous ouvert ?",
      options: { software: "Logiciel", ai: "IA", marketplace: "Place de marché", open: "Ouvert" },
    },
    technicalStrengths: {
      question: "Quelles sont vos forces techniques ?",
      options: {
        backend: "Backend et données",
        fullStack: "Web full-stack",
        machineLearning: "Apprentissage automatique",
        mobile: "Mobile",
      },
    },
    reasoning: "Collecte du contexte de l’utilisateur.",
    kickoff: "Bien. Nous partons de votre contexte, pas d’un produit.",
    noted: "Noté.",
    yourNetwork: "votre réseau",
  },
  start: {
    reasoning: "Mode d’entrée non choisi.",
    question: "Comment voulez-vous commencer ?",
    options: { noIdea: "Je ne sais pas quoi construire", hasIdea: "J’ai déjà une idée" },
    reply:
      "Avant toute chose : avez-vous déjà une idée à rétro-concevoir, ou devons-nous découvrir un marché à partir de votre contexte ? Dans les deux cas, je ne partirai pas d’un produit.",
  },
  idea: {
    unknownIcp: "ICP UNKNOWN (à préciser)",
    unknownMarket: "Marché UNKNOWN",
    reasoning: "Idée décomposée en marché, ICP et variables candidates.",
    marketDescription: "Marché impliqué par l’idée « {idea} ».",
    marketNotes: "UNKNOWN — l’attractivité n’a pas été évaluée avec des preuves.",
    icpRole: "Propriétaire / exploitant (HYPOTHESIS)",
    icpEconomicBuyer: "UNKNOWN — valider qui contrôle les achats",
    icpNotes: "Dérivé de l’énoncé de l’idée. Solution mentionnée : {mechanism}.",
    variableDescription:
      "Variable que la solution « {mechanism} » pourrait faire bouger. L’importance est une HYPOTHESIS ; l’état actuel et l’état souhaité sont UNKNOWN.",
    mechanismDescription:
      "Le mécanisme proposé par l’utilisateur. Mis de côté tant que le problème n’est pas compris.",
    assumptionValue:
      "Les {icpPlural} perdent un chiffre d’affaires ou une capacité significatifs à cause de la variable « {variableLower} ».",
    assumptionAccess: "Les {icpPlural} contrôlent leurs décisions d’achat de logiciels.",
    assumptionGeneric:
      "Les processus actuels autour de la variable « {variableLower} » sont insuffisants.",
    question: "Quelle variable l’idée est-elle vraiment censée faire bouger ?",
    factFromStatement: "FACT d’après votre énoncé",
    reply: {
      intro: "Je n’évaluerai pas encore « {mechanism} ». D’abord la décomposition :",
      icp: "- ICP ({basis}) : {icp}",
      market: "- Marché : {market}",
      variables:
        "- Variables que la solution pourrait faire bouger (HYPOTHESIS, importance 0–10) : {variables}",
      variableItem: "{name} {importance}",
      unknowns:
        "- État actuel et état souhaité de chaque variable : UNKNOWN. Acheteur économique : UNKNOWN. Accessibilité : UNKNOWN.",
      outro:
        "Trois hypothèses ont été ajoutées au registre (valeur, accès, générique). De quelle variable l’idée parle-t-elle vraiment ?",
    },
  },
  market: {
    candidateName: "{industry} — indépendants",
    candidateDescription:
      "Petites entreprises gérées par leur propriétaire dans le secteur « {industry} », que vous pouvez atteindre via {audience}.",
    candidateNotes:
      "HYPOTHESIS : acheteurs fragmentés, le propriétaire est à la fois utilisateur et acheteur, mal servis par les outils génériques. Rien n’est encore vérifié.",
    fallbackName: "Commerces de services de proximité",
    fallbackDescription: "Salons, cliniques et ateliers de réparation de 5 à 20 employés.",
    fallbackNotes:
      "HYPOTHESIS : forte densité de douleur autour de la planification et de la capacité. Non vérifié.",
    reasoning: "Contexte complet ; marchés candidats proposés.",
    question: "Quel marché devons-nous explorer en premier ?",
    reply: {
      context:
        "Contexte capturé : secteurs {industries} ; personnes joignables {audiences} ; modèle {model}.",
      heading: "Marchés candidats (chacun reste une HYPOTHESIS tant qu’aucune preuve n’existe) :",
      item: "- {name} : {notes}",
      outro: "Lequel devons-nous explorer en premier ?",
    },
  },
  icp: {
    reasoning: "Marché sélectionné ; carte des ICP proposée.",
    userMarketDescription: "Marché nommé par l’utilisateur.",
    ownerName: "Propriétaire {de}{baseLower}",
    ownerRole: "Propriétaire-exploitant",
    ownerCompanySize: "1 à 20 employés (HYPOTHESIS)",
    ownerResponsibilities: "Chiffre d’affaires, effectifs, planification, expérience client",
    ownerEconomicBuyer: "Propriétaire (HYPOTHESIS — à valider)",
    ownerUserRole: "Propriétaire et personnel d’accueil",
    ownerNotes: "Le propriétaire est probablement à la fois utilisateur et acheteur.",
    managerName: "Responsable {de}{baseLower} (multi-sites)",
    managerRole: "Responsable des opérations",
    managerCompanyType: "{market} avec plusieurs sites",
    managerCompanySize: "20 à 200 employés (HYPOTHESIS)",
    managerResponsibilities: "Taux d’utilisation, productivité du personnel, reporting",
    managerEconomicBuyer: "UNKNOWN — probablement le propriétaire ou le directeur régional",
    managerUserRole: "Responsable",
    question: "Quel ICP compte le plus pour vous ?",
    reply:
      "Marché : {market}.\n\nCarte des ICP (HYPOTHESIS) :\n- {owner} : le propriétaire est utilisateur et acheteur ; accessibilité UNKNOWN.\n- {manager} : le responsable utilise, l’acheteur est UNKNOWN.\n\nQuel ICP compte le plus ?",
  },
  variable: {
    reasoning: "ICP sélectionné ; carte des variables proposée.",
    description:
      "Variable de valeur pour {icp}. L’importance est une HYPOTHESIS ; l’état actuel et l’état souhaité sont UNKNOWN.",
    question: "Quelle variable devons-nous explorer en premier ?",
    line: "- {action} × {name} × {target} — {importance}",
    reply:
      "ICP : {icp}.\n\nCarte des variables (action × variable × cible ; importance 0–10, HYPOTHESIS) :\n{lines}\n\nL’état actuel et l’état souhaité sont UNKNOWN pour chacune d’elles. Quelle variable devons-nous explorer en premier ?",
  },
  pain: {
    reasoning: "Variable sélectionnée ; douleurs décrites.",
    description:
      "La variable « {variableLower} » est pire qu’elle ne devrait l’être pour les {icpPlural}, et personne ne la mesure précisément.",
    currentState:
      "UNKNOWN (HYPOTHESIS : nettement au-dessus de ce que le propriétaire accepterait)",
    desiredState: "UNKNOWN (HYPOTHESIS : mesurable, maîtrisée, sous un objectif)",
    gap: "L’écart reste une hypothèse tant que l’état actuel n’est pas mesuré avec des données réelles.",
    assumption:
      "La variable « {variableLower} » coûte chaque mois une somme significative aux {icpPlural}.",
    question:
      "Parlez-moi de la dernière fois où la variable « {variableLower} » a fait mal. Que s’est-il passé ?",
    options: {
      weekly: "Ça arrive chaque semaine et coûte vraiment de l’argent",
      tolerated: "Ça arrive mais ils le tolèrent",
      unknown: "Je ne sais pas encore",
    },
    reply:
      "Variable : {variable}.\n\nÉtat actuel : UNKNOWN. État souhaité : UNKNOWN. Tout ce qui concerne cet écart est une HYPOTHESIS tant que rien n’est mesuré.\n\n{question}",
  },
  trigger: {
    reasoning: "Déclencheurs et alternatives proposés ; des preuves sont nécessaires ensuite.",
    spike:
      "Un pic visible sur la variable « {variableLower} » pendant une période de forte demande.",
    weekly: "Hebdomadaire (déclaré par l’utilisateur)",
    complaint:
      "Un employé ou un client clé se plaint assez fort pour que cela remonte au propriétaire.",
    manual: {
      name: "Suivi manuel par le personnel",
      description: "Quelqu’un traite le problème à la main quand il y pense.",
      cost: "Temps du personnel, UNKNOWN heures/semaine",
      weakness: "Irrégulier, aucune anticipation, dépend d’une seule personne.",
    },
    spreadsheet: {
      name: "Suivi dans un tableur",
      description: "Une feuille partagée mise à jour de façon irrégulière.",
      cost: "Gratuit",
      weakness: "Données périmées, aucune alerte, personne ne s’y fie.",
    },
    software: {
      name: "Logiciel générique de réservation / CRM",
      description: "Les outils existants couvrent une partie du processus.",
      weakness: "Pas conçu autour de cette variable ; adoption UNKNOWN.",
    },
    question:
      "Rien ici n’est vérifié. Ajouter des preuves via le panneau Preuves, ou passer aux mécanismes avec des hypothèses seulement ?",
    options: {
      hypotheses: "Continuer avec des hypothèses pour l’instant",
      evidence: "J’ai ajouté des preuves, continuer",
    },
    reply: {
      tolerated:
        "Vous avez dit que la douleur est tolérée ou inconnue — cela réduit l’urgence (urgence du déclencheur 4/10).",
      fact: "Noté comme FACT venant de vous : cela arrive chaque semaine et coûte de l’argent. L’ampleur économique reste UNKNOWN tant qu’un chiffre n’est pas capturé comme preuve.",
      triggers:
        "Déclencheurs (HYPOTHESIS) : pics en période de forte demande ; plaintes bruyantes qui remontent au propriétaire.",
      alternatives:
        "Alternatives actuelles (HYPOTHESIS) : suivi manuel (faiblesse 7), tableur (6), logiciel générique (5).",
      evidence:
        "La Confiance dans les preuves est calculée uniquement à partir des preuves capturées. Recherches utiles : fils de forum où des propriétaires décrivent ce problème, avis sur des concurrents qui le mentionnent, et offres d’emploi qui paient quelqu’un pour s’en occuper.",
    },
  },
  mechanism: {
    reasoning: "Mécanismes explorés.",
    reminders: {
      name: "Rappels et relances automatisés ({variableLower})",
      description: "Supprime les relances manuelles.",
    },
    prediction: {
      name: "Prédiction du risque ({variableLower})",
      description: "Prédit quels cas vont mal tourner et les priorise.",
    },
    policy: {
      name: "Changement de politique (acomptes, règles d’annulation, incitations)",
      description: "Mécanisme non logiciel qui change les comportements.",
    },
    dashboard: {
      name: "Tableau de bord de suivi ({variableLower})",
      description: "Rend la variable visible chaque semaine.",
    },
    service: {
      name: "Service clé en main",
      description:
        "Une personne ou une agence s’en charge contre rémunération — candidat à un test de conciergerie.",
    },
    question: "Quel mécanisme doit ancrer la première hypothèse d’opportunité ?",
    line: "- {name} ({category})",
    reply:
      "Problème ≠ produit. Cinq mécanismes qui pourraient faire bouger la variable « {variableLower} » :\n{lines}\n\nLequel doit ancrer la première hypothèse d’opportunité ?",
  },
  opportunity: {
    title: "{variable} pour les {icpPlural}",
    reasoning:
      "Opportunité formée avec son échelle de causalité de la valeur ; les scores et la frontière sont calculés par l’application.",
    problemStatement:
      "Les {icpPlural} ne maîtrisent pas la variable « {variableLower} » ; l’état actuel est UNKNOWN et les alternatives sont manuelles.",
    productHypothesis: "Une couche « {mechanismLower} » pour les {icpPlural}.",
    valueProposition:
      "Faire bouger de façon mesurable la variable « {variableLower} » pour les {icpPlural} sans ajouter de personnel.",
    metric: "{variable} par mois",
    inputJustification:
      "Toutes les entrées sont des hypothèses (HYPOTHESIS) proposées à partir de la conversation ; modifiez-les et ajoutez des preuves.",
    risks: {
      buyer: "L’acheteur économique est UNKNOWN",
      currentState: "L’état actuel n’a jamais été mesuré",
      alternatives: "Les alternatives sont peut-être suffisantes",
    },
    nextSteps: {
      evidence: "Ajouter des preuves externes",
      interviews: "Interviewer 5 ICP sur la dernière occurrence",
      measure: "Mesurer l’état actuel",
    },
    ladder: {
      capability:
        "Les {icpPlural} peuvent identifier les cas qui alimentent la variable « {variableLower} » et agir avant que le résultat ne soit perdu.",
      transformation:
        "Moins de cas liés à la variable « {variableLower} » se terminent par un résultat irrécupérable.",
      operationalValue:
        "La variable « {variableLower} » évolue dans la direction souhaitée dans les opérations quotidiennes.",
      economicValue:
        "La conséquence économique de la variable « {variableLower} » diminue (capacité, chiffre d’affaires ou coût).",
      strategicOutcome:
        "La variable économique parente de « {variableLower} » s’améliore pour les {icpPlural}.",
      linkMechanismCapability:
        "{mechanism} fait effectivement remonter les bons cas assez tôt pour agir.",
      linkCapabilityTransformation:
        "Agir sur les cas identifiés change concrètement le résultat ({variableLower}).",
      linkTransformationOperational:
        "Les résultats modifiés sur des cas individuels s’additionnent en un mouvement mesurable de la variable « {variableLower} ».",
      linkOperationalEconomic:
        "Le mouvement de la variable « {variableLower} » se traduit en argent, en capacité ou en coût pour les {icpPlural}.",
      linkEconomicStrategic:
        "L’effet économique est assez important et durable pour faire bouger la variable parente.",
    },
    dimensionsJustification:
      "L’importance reflète l’importance supposée de la variable. L’ampleur, la fréquence, la population et l’attribuabilité sont UNKNOWN : rien n’a été mesuré.",
    assumptions: {
      causal:
        "Si « {mechanismLower} » est appliqué aux cas qui alimentent la variable « {variableLower} », le résultat de ces cas change.",
      value:
        "Le mouvement de la variable « {variableLower} » vaut assez d’argent pour justifier un produit.",
      feasibility:
        "Les données nécessaires pour « {mechanismLower} » existent et peuvent être obtenues.",
      wtp: "Les {icpPlural} paieraient pour une solution de type « {mechanismLower} ».",
    },
    question:
      "La première incertitude au-delà du problème est le lien causal mécanisme → résultat. Planifier une expérimentation pour le tester ?",
    options: {
      plan: "Planifier l’expérimentation pilote",
      report: "Montrer le rapport d’opportunité",
      anotherVariable: "Explorer une autre variable",
    },
    reply: {
      formed: "Hypothèse d’opportunité formée : « {title} », ancrée sur « {mechanism} ».",
      ladderHeading:
        "Échelle de causalité de la valeur (chaque niveau est une HYPOTHESIS tant qu’aucune preuve n’est liée) :",
      mechanism: "- Mécanisme : {mechanism}",
      capability:
        "- Capacité : identifier les cas qui alimentent la variable « {variableLower} » et agir tôt",
      transformation: "- Transformation : moins de cas se terminent par un résultat irrécupérable",
      operationalValue:
        "- Valeur opérationnelle : la variable « {variableLower} » évolue dans la direction souhaitée",
      economicValue: "- Valeur économique : la conséquence économique diminue",
      strategicOutcome: "- Résultat stratégique : la variable parente s’améliore",
      inputs:
        "Entrées proposées (0–10, HYPOTHESIS) : importance 7, douleur 6, fréquence 6, écart 6, consentement à payer 5, faiblesse des alternatives 6. Force de valeur : importance 7 ; ampleur, fréquence, population et attribuabilité UNKNOWN — la Force de valeur est donc au statut INCOMPLET.",
      computed:
        "Quatre hypothèses typées ont été ajoutées (causale, valeur, faisabilité, consentement à payer). L’application calcule de façon déterministe le Potentiel de l’opportunité, la Confiance dans les preuves, la Force de valeur, la Confiance causale, la Frontière de preuve et le verdict — voir le Radar et l’onglet Valeur.",
    },
  },
  experiment: {
    reasoning: "Expérimentation conçue pour le premier lien causal non prouvé.",
    title: "Pilote contrôlé : {mechanism} vs pratique actuelle",
    hypothesis:
      "Si « {mechanismLower} » est appliqué aux cas qui alimentent la variable « {variableLower} », celle-ci évolue dans la direction souhaitée par rapport à des cas comparables traités comme aujourd’hui.",
    design:
      "Avec des {icpPlural} qui acceptent un pilote de quatre semaines, répartir des cas comparables en deux groupes : l’un traité comme aujourd’hui, l’autre avec « {mechanismLower} ». Relever la variable « {variableLower} » pour les deux groupes chaque semaine.",
    successMetric:
      "{variable} dans le groupe d’intervention par rapport au groupe témoin, avec une différence assez grande pour compter économiquement pour les {icpPlural}.",
    options: {
      report: "Montrer le rapport d’opportunité",
      anotherVariable: "Explorer une autre variable",
      whichEvidence: "Quelles preuves collecter en premier ?",
      plan: "Planifier l’expérimentation pilote",
      addEvidence: "Ajouter des preuves",
    },
    reply: {
      planned:
        "Expérimentation planifiée pour le lien causal Capacité → Transformation de « {title} » :",
      hypothesis: "- Hypothèse : {hypothesis}",
      design: "- Protocole : {design}",
      successMetric: "- Métrique de succès : {metric}",
      outro:
        "Quand le pilote produit des résultats, capturez-les comme preuves liées à ce lien causal. La Frontière de preuve n’avance que lorsque les preuves liées atteignent le seuil « étayé ».",
    },
    recommendationReasoning: "Passage à la recommandation.",
    recommendationReply:
      "L’échelle de « {title} » est entièrement hypothétique au-delà du problème. Le Radar affiche les scores déterministes et la Frontière de preuve actuelle ; l’onglet Valeur montre quel lien causal tester en premier.",
  },
  followUp: {
    reasoning: "Discussion de suivi.",
    options: {
      anotherVariable: "Explorer une autre variable",
      addEvidence: "Ajouter des preuves",
      interviewGuide: "Générer le guide d’entretien",
    },
    nextVariableQuestion: "Quelle variable devons-nous explorer ensuite ?",
    reply:
      "L’espace de travail contient maintenant des hypothèses structurées et une échelle de causalité de la valeur. Les scores, la Frontière de preuve et les verdicts sont calculés à partir de vos entrées et des preuves que vous capturez — rien ici ne vaut validation pour l’instant. La prochaine meilleure action figure sur chaque opportunité. Vous pouvez explorer une autre variable, ajouter des preuves ou générer un guide d’entretien.",
  },
  interview: {
    title: "Entretiens de découverte — {title}",
    targetProfile:
      "{icp} ayant fait face à « {pain} » au cours des 90 derniers jours. Visez 5 entretiens ; arrêtez de vendre, commencez à écouter.",
    context: {
      name: "Contexte",
      week: "Décrivez-moi une semaine normale. Où passe l’essentiel de votre temps ?",
      tracking: "Comment suivez-vous aujourd’hui « {variable} » ?",
      involved: "Qui d’autre est impliqué quand quelque chose tourne mal à ce sujet ?",
    },
    lastOccurrence: {
      name: "Dernière occurrence",
      lastTime: "Parlez-moi de la dernière fois où « {pain} » s’est produit.",
      steps: "Qu’avez-vous fait, étape par étape ?",
      duration: "Combien de temps cela vous a-t-il pris, à vous et à votre équipe ?",
      trigger:
        "Vous avez mentionné des situations comme « {trigger} ». À quand remonte la dernière ?",
      unignorable: "Qu’est-ce qui l’a rendu impossible à ignorer cette fois-là ?",
    },
    cost: {
      name: "Coût et impact",
      cost: "Que cela vous a-t-il coûté — en argent, en capacité ou en clients ?",
      unsolved: "Que s’est-il passé quand le problème n’a pas été résolu ?",
      frequency: "À quelle fréquence cela arrive-t-il par mois ?",
    },
    alternatives: {
      name: "Alternatives actuelles",
      known: "Vous utilisez {alternatives} aujourd’hui. Qu’est-ce qui est frustrant là-dedans ?",
      unknown:
        "Qu’utilisez-vous aujourd’hui pour y faire face ? Qu’est-ce qui est frustrant là-dedans ?",
      tried: "Qu’avez-vous essayé qui n’a pas fonctionné ?",
    },
    buying: {
      name: "Comportement d’achat",
      purchased: "Avez-vous acheté quelque chose pour résoudre ce problème ? Quoi ?",
      trigger: "Qu’est-ce qui a déclenché cet achat ?",
      signoff: "Qui l’a validé, et combien de temps cela a-t-il pris ?",
    },
    listenFor: {
      numbers: "Des chiffres, des dates et des noms précis — le flou signale une douleur faible.",
      workarounds: "Les contournements qu’ils ont construits eux-mêmes (preuve forte de douleur).",
      budget: "Qui contrôle réellement le budget, par opposition à qui ressent la douleur.",
    },
    avoid: {
      wouldPay: "Paieriez-vous pour cela ?",
      wouldUse: "Utiliseriez-vous un produit qui… ?",
      pitching: "Décrire votre solution avant la dernière question.",
    },
  },
  research: {
    forum: {
      title: "[SIMULÉ] Fil de forum : « Comment gérez-vous {topic} ? »",
      excerpt:
        "[DONNÉES SIMULÉES] Message de forum synthétique. Un propriétaire décrit ses difficultés avec {topic} et son suivi dans un tableur. Remplacez-le par une vraie source avant de lui faire confiance.",
    },
    review: {
      title: "[SIMULÉ] Avis sur un concurrent mentionnant {topic}",
      excerpt:
        "[DONNÉES SIMULÉES] Avis synthétique : « L’outil aide un peu avec {topic}, mais nous perdons encore de l’argent chaque mois. » Aucun produit réel n’est cité.",
    },
    job: {
      title: "[SIMULÉ] Offre d’emploi : coordinateur chargé de « {topic} »",
      excerpt:
        "[DONNÉES SIMULÉES] Offre synthétique pour un poste dont les missions incluent la gestion de « {topic} ». Signale un contournement par la main-d’œuvre, si elle est réelle.",
    },
    reddit: {
      title: "[SIMULÉ] Commentaire Reddit contredisant l’hypothèse sur « {topic} »",
      excerpt:
        "[DONNÉES SIMULÉES] Commentaire synthétique : « Franchement, {topic}, ce n’est pas un gros problème pour nous, les rappels que nous envoyons déjà suffisent. » Exemple de signal contradictoire.",
    },
    report: {
      title: "[SIMULÉ] Note sectorielle sur « {topic} »",
      excerpt:
        "[DONNÉES SIMULÉES] Note de marché synthétique. Ne contient volontairement aucune statistique réelle. À utiliser uniquement pour tester le flux de preuves.",
    },
  },
  opportunityAction: {
    checkFields: "Vérifiez les champs signalés.",
  },
};
