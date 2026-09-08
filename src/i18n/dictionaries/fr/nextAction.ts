/** Chaînes françaises — section « nextAction ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { nextAction as en } from "@/i18n/dictionaries/en/nextAction";

export const nextAction: Section<typeof en> = {
  verbatim: "{text}",
  list: "{count, plural, =1 {{a}} =2 {{a}, {b}} =3 {{a}, {b}, {c}} other {{a}, {b}, {c}, {d}}}",
  link: "{from} → {to}",
  fallback: {
    icp: "clients cibles",
    variable: "la variable",
    problem: "ce problème",
    problemOf: "ce problème",
    intervention: "l’intervention",
    proposedMechanism: "le mécanisme proposé",
    wholeOpportunity: "Toute l’opportunité",
    observedScope: "ce qui a été observé",
    admissibleSource: "une source à forte admissibilité pour cette affirmation",
    designNone: "aucun",
    generalizationNone: "—",
  },
  lower: {
    rung: {
      NONE: "rien d’étayé encore",
      VARIABLE_IMPORTANCE: "l’importance de la variable",
      PAIN: "la douleur",
      ECONOMIC_PAIN: "la douleur économique",
      MECHANISM: "le mécanisme",
      CAPABILITY: "la capacité",
      TRANSFORMATION: "la transformation",
      OPERATIONAL_VALUE: "la valeur opérationnelle",
      ECONOMIC_VALUE: "la valeur économique",
      STRATEGIC_OUTCOME: "le résultat stratégique",
      BUSINESS_OUTCOME: "le résultat d’entreprise",
    },
    generalization: {
      UNTESTED: "non observé",
      CASE_ONLY: "un cas isolé",
      SAMPLE_SUPPORTED: "étayé sur échantillon",
      SEGMENT_SUPPORTED: "étayé sur segment",
      BROADER_HYPOTHESIS: "une hypothèse pour l’affirmation plus large",
      CONTRADICTED_ACROSS_CONTEXTS: "contredit selon le contexte",
    },
    dimension: {
      importance: "importance",
      magnitude: "ampleur",
      frequency: "fréquence",
      population: "population concernée",
      attributability: "attribuabilité",
    },
    commercialRung: {
      EXISTING_SPEND: "dépense existante",
      PURCHASE_INTENT: "intention d’achat",
      WILLINGNESS_TO_PAY: "consentement à payer déclaré",
      PRICE_ACCEPTANCE: "acceptation du prix",
      ACTUAL_PURCHASE: "achat réel",
    },
    status: {
      UNKNOWN: "inconnu",
      HYPOTHESIS: "hypothèse",
      UNPROVEN: "non prouvé",
      SUPPORTED: "étayé",
      STRONGLY_SUPPORTED: "fortement étayé",
      OBSERVED: "observé",
      MIXED: "contradictoire",
      CONTRADICTED: "contredit",
    },
    design: {
      ANECDOTAL: "anecdotique",
      OBSERVATIONAL: "observationnel",
      BEFORE_AFTER: "avant/après",
      MATCHED_COMPARISON: "comparaison appariée",
      CONTROLLED: "contrôlé",
      RANDOMIZED: "randomisé",
    },
    sourceType: {
      INTERVIEW: "entretien",
      SURVEY: "sondage",
      CUSTOMER_QUOTE: "citation client",
      FORUM_POST: "message de forum",
      REDDIT_POST: "message Reddit",
      SALES_CONVERSATION: "conversation commerciale",
      OBSERVED_WORKFLOW: "flux de travail observé",
      PRODUCT_USAGE: "données d’usage produit",
      CLICKSTREAM: "flux de clics",
      PURCHASE_BEHAVIOR: "comportement d’achat",
      CRM_DATA: "données CRM",
      TRANSACTION_RECORDS: "relevés de transactions",
      FINANCIAL_RECORDS: "documents financiers",
      SYSTEM_LOGS: "journaux système",
      BOOKING_DATA: "données de réservation",
      POS_DATA: "données de caisse",
      ERP_DATA: "données ERP",
      SUPPORT_TICKETS: "tickets de support",
      TIME_TRACKING_DATA: "données de suivi du temps",
      COMPETITOR_REVIEW: "avis sur un concurrent",
      PRICING_PAGE: "page de tarifs",
      JOB_POSTING: "offre d’emploi",
      PUBLIC_FINANCIALS: "comptes publiés",
      INDUSTRY_REPORT: "rapport sectoriel",
      GOVERNMENT_DATA: "données publiques",
      MARKET_DATASET: "jeu de données de marché",
      PROTOTYPE_TEST: "test de prototype",
      CONCIERGE_TEST: "test concierge",
      BEFORE_AFTER_TEST: "test avant / après",
      MATCHED_COMPARISON: "comparaison appariée",
      CONTROLLED_EXPERIMENT: "expérimentation contrôlée",
      AB_TEST: "test A/B",
      RANDOMIZED_EXPERIMENT: "expérimentation randomisée",
      PRICING_EXPERIMENT: "expérimentation tarifaire",
      LANDING_PAGE_EXPERIMENT: "expérimentation de page d’atterrissage",
      TECHNICAL_SPIKE: "spike technique",
      BENCHMARK: "benchmark",
      DATA_FEASIBILITY_STUDY: "étude de faisabilité des données",
      INTEGRATION_TEST: "test d’intégration",
      LOAD_TEST: "test de charge",
      SIGNED_LOI: "lettre d’intention signée",
      PAID_PILOT: "pilote payant",
      CONTRACT: "contrat",
      INVOICE: "facture",
      SUBSCRIPTION_PURCHASE: "achat d’abonnement",
      RENEWAL: "renouvellement",
      EXPANSION: "extension",
      OTHER: "autre / provenance inconnue",
    },
  },
  evidence: {
    CAUSAL:
      "Une comparaison contrôlée (avec ou sans l’intervention) sur des cas comparables, la variable étant mesurée avant et après.",
    VALUE:
      "Des chiffres avant/après quantifiés issus d’opérations réelles : de combien la variable a bougé et ce que cela valait.",
    FEASIBILITY:
      "Un spike technique ou un audit des données prouvant que les entrées requises existent et peuvent être obtenues.",
    WTP: "Un comportement d’achat observé : pilotes payants, acomptes, lettres d’intention signées ou dépense existante pour des solutions partielles.",
    ACCESS:
      "Un test de prise de contact : combien d’acheteurs cibles ont pu être réellement joints et accepteraient de parler sous deux semaines.",
    GENERIC:
      "Des preuves clients directes (entretiens, citations, sondages) qui portent sur l’énoncé.",
  },
  experiment: {
    CAUSAL:
      "Menez un pilote contrôlé : appliquez l’intervention à la moitié de cas comparables et comparez la variable entre les deux groupes.",
    VALUE:
      "Instrumentez cinq clients pendant un mois ; mesurez la variable et traduisez son évolution en argent ou en heures.",
    FEASIBILITY:
      "Construisez le prototype le plus mince possible du chemin de données et vérifiez les entrées sur de vraies données clients.",
    WTP: "Proposez une version concierge payante (ou une liste d’attente avec acompte) à dix clients cibles et comptez qui paie.",
    ACCESS:
      "Contactez vingt acheteurs cibles par le canal prévu et mesurez les taux de réponse et de rendez-vous.",
    GENERIC:
      "Interviewez cinq clients cibles sur la dernière fois où cela s’est produit et consignez leurs propos comme preuves.",
  },
  collapse: {
    ifFalse: {
      CAUSAL: "L’hypothèse produit s’effondre : le mécanisme ne ferait pas bouger la variable.",
      VALUE:
        "L’opportunité s’effondre : faire bouger la variable ne créerait pas assez de valeur pour justifier un produit.",
      FEASIBILITY:
        "Le mécanisme ne peut pas être construit tel qu’imaginé ; il faut un autre mécanisme.",
      WTP: "Le problème est peut-être réel, mais personne ne paie pour le supprimer ; le dossier économique s’effondre.",
      ACCESS:
        "Les acheteurs ne peuvent pas être joints efficacement ; la mise sur le marché s’effondre même si le produit fonctionne.",
      GENERIC: "Une croyance porteuse est fausse et l’opportunité doit être réexaminée.",
    },
    consequence: {
      CAUSAL: "l’hypothèse produit s’effondre : le mécanisme ne ferait pas bouger la variable.",
      VALUE:
        "l’opportunité s’effondre : faire bouger la variable ne créerait pas assez de valeur pour justifier un produit.",
      FEASIBILITY:
        "le mécanisme ne peut pas être construit tel qu’imaginé ; il faut un autre mécanisme.",
      WTP: "le problème est peut-être réel, mais personne ne paie pour le supprimer ; le dossier économique s’effondre.",
      ACCESS:
        "les acheteurs ne peuvent pas être joints efficacement ; la mise sur le marché s’effondre même si le produit fonctionne.",
      GENERIC: "une croyance porteuse est fausse et l’opportunité doit être réexaminée.",
    },
  },
  whyNow: {
    collapse:
      "C’est le test {cheap, select, true {le moins cher} other {le plus abordable}} capable de lever l’incertitude au plus fort impact : si cette hypothèse est fausse, l’opportunité s’effondre, donc rien d’autre ne mérite d’être testé avant.",
    causalLink:
      "C’est le test {cheap, select, true {le moins cher} other {le plus abordable}} capable de faire avancer la Frontière de preuve : il vise le premier lien critique non prouvé, dont tout l’aval dépend.",
    wtp: "Le consentement à payer reste une hypothèse indépendante tant qu’il n’est pas testé ; un problème fort et un mécanisme qui fonctionne ne prouvent pas que quelqu’un paie.",
    economicMagnitude:
      "Sans l’ampleur économique, la Force de valeur reste à l’état INCOMPLET et le dossier économique ne peut pas être dimensionné.",
    mechanismFeasibility:
      "Si le mécanisme ne peut pas être construit, toute affirmation en aval est sans objet ; c’est le moyen le moins cher de le savoir.",
    other:
      "Lève l’incertitude au plus fort impact actuellement accessible à coût {cheap, select, true {faible} other {modéré}}.",
  },
  change: {
    CAUSAL_LINK:
      "Si étayé, la Frontière de preuve avance d’un niveau et la Confiance causale gagne un lien validé ; si contredit, l’argument de valeur se brise ici et tout l’aval reste une hypothèse.",
    WTP_EVIDENCE:
      "Si étayé, l’Échelle commerciale monte d’un barreau et le dossier économique gagne un signal de prix fondé sur des preuves ; si contredit, le problème est peut-être réel mais ne vaut pas d’argent pour l’acheteur.",
    ECONOMIC_MAGNITUDE:
      "Si mesurée, la Force de valeur cesse d’être à l’état INCOMPLET et le verdict peut dimensionner le dossier économique ; si elle est faible, l’opportunité ne justifie peut-être pas un produit.",
    MECHANISM_FEASIBILITY:
      "Si faisable, le mécanisme devient OBSERVÉ dans le périmètre testé ; sinon, le mécanisme doit changer avant tout autre test.",
    EVIDENCE_GAP:
      "Combler la lacune augmente la Confiance dans les preuves ; ne pas la combler signifie que le problème est plus faible qu’on ne le croyait.",
    other:
      "Lève une dimension ouverte de l’argument de valeur sans faire avancer la Frontière de preuve à elle seule.",
  },
  draft: {
    COLLAPSE_ASSUMPTION: {
      change:
        "Si étayée, la croyance non testée la plus importante devient fondée sur des preuves ; si fausse : {consequence}",
      what: "{kind, select, CAUSAL {Valider l’hypothèse causale} VALUE {Valider l’hypothèse de valeur} FEASIBILITY {Valider l’hypothèse de faisabilité} WTP {Valider l’hypothèse de consentement à payer} ACCESS {Valider l’hypothèse d’accès} other {Valider l’hypothèse}} : « {statement} »",
      why: "Importance {importance}/10 avec {count, plural, one {# élément de preuve lié} other {# éléments de preuve liés}}. C’est la croyance non testée la plus importante. Frontière de preuve actuelle : {frontier}.",
    },
    CAUSAL_LINK: {
      change:
        "Si étayé, la Frontière de preuve passe de {frontier} à {target} ; si contredit, l’argument de valeur se brise à {from} → {to} et le verdict est réexaminé.",
      what: "Tester le lien causal : « {statement} »",
      why: "{target} est le premier niveau au-delà de la Frontière de preuve ({frontier}) ; le lien qui y mène a le statut « {status} » avec {count, plural, one {# élément de preuve} other {# éléments de preuve}}.",
      ifFalse:
        "L’argument de valeur se brise à ce lien : tout l’aval, y compris la valeur économique, reste une hypothèse.",
      evidenceToMove:
        "Des preuves que {statement} en conditions réelles, idéalement une comparaison avant/après ou avec/sans ; assez pour atteindre le seuil « étayé » (40/100) sans contradiction non résolue.",
      experiment:
        "Menez un pilote contrôlé auprès de {icp} : comparez des cas comparables avec et sans {mechanism} et mesurez {variable}.",
    },
    EVIDENCE_FITNESS: {
      change:
        "Si des preuves adaptées l’étayent, {level} devient fondé sur des preuves et la Frontière de preuve peut avancer ; les preuves existantes restent du contexte, elles ne deviennent jamais une preuve par accumulation.",
      whatWeakDesign:
        "Obtenir des preuves d’un protocole plus solide pour {level} : le protocole le plus solide est « {design} » ; attribuer {levelLower} exige au moins un protocole « {required} ».",
      whatWeakDesignDetail:
        "Obtenir des preuves d’un protocole plus solide pour {level} : {detail}",
      whatSources: "Obtenir des preuves adaptées à {level} : {sources}",
      whyNotAdmissible:
        "Les preuves liées à {level} ne sont pas admissibles pour cette affirmation : elles existent, mais ne peuvent pas l’établir.",
      whyWeakDesign:
        "Les preuves liées sont admissibles mais leur protocole est trop faible pour attribuer {levelLower}.",
      whyLowFit:
        "La meilleure adéquation des preuves pour {level} est de {fit}/100 ; la frontière exige {required}. Davantage des mêmes preuves n’y changera rien.",
      ifFalse:
        "L’affirmation reste non prouvée quel que soit le volume de preuves peu adaptées ; la frontière ne bouge pas.",
      evidenceToMoveSources:
        "Des preuves à forte admissibilité pour cette affirmation : {sources}.",
      evidenceToMoveGeneric:
        "Des preuves dont le type de source est admissible pour cette affirmation.",
      experiment:
        "Concevoir un test dont le résultat est admissible pour « {statement} » au niveau de protocole requis.",
    },
    GENERALIZATION: {
      change:
        "Si cela tient dans d’autres contextes, {level} passe de « {generalization} » vers un appui au niveau du segment et le verdict peut s’y appuyer pour les {icp} ; sinon, l’observation reste un cas et le périmètre cible se resserre.",
      what: "Tester si {levelLower} tient au-delà de {scope}",
      why: "{level} est {generalization} ({count, plural, one {# origine indépendante} other {# origines indépendantes}}, périmètre : {scope}). Observé sur un échantillon ne veut pas dire prouvé pour le marché.",
      affects: "{level} — périmètre de généralisation",
      ifFalse:
        "L’affirmation ne tient que dans le contexte observé ; le périmètre cible doit se resserrer ou le mécanisme s’adapter.",
      evidenceToMove:
        "La même observation répétée dans d’autres organisations et configurations (systèmes, tailles ou conditions différents), avec le périmètre consigné.",
      experiment:
        "Répétez l’observation dans {generalization, select, CASE_ONLY {deux autres} other {cinq}} organisations aux configurations différentes et consignez le périmètre de chaque passage.",
    },
    WTP_EVIDENCE: {
      whatNext: "{question} — établir « {rung} » auprès de {icp}",
      what: "Trouver des preuves de consentement à payer auprès de {icp}",
      ladder:
        "{EXISTING_SPEND} · {PURCHASE_INTENT} · {WILLINGNESS_TO_PAY} · {PRICE_ACCEPTANCE} · {ACTUAL_PURCHASE}",
      rung: "{label} ({state})",
      whyLadder: "Échelle commerciale : {ladder}. {note}",
      note: {
        EXISTING_SPEND:
          "Une dépense existante pour une alternative n’est pas un consentement à payer pour ceci.",
        PURCHASE_INTENT:
          "Une intention déclarée n’est pas un prix déclaré, et aucun des deux n’est un achat.",
        other: "Aucun barreau de l’Échelle commerciale n’est encore fondé sur des preuves.",
      },
      why: "Aucune preuve ne montre quelqu’un payant, ou ayant l’intention de payer, pour faire bouger cette variable.",
      affects: "Échelle commerciale → dossier économique",
      ifFalse: "Le problème est peut-être réel mais ne vaut pas d’argent pour l’acheteur.",
    },
    ECONOMIC_MAGNITUDE: {
      what: "Quantifier l’ampleur économique de {pain}",
      whyMissing:
        "La dimension « Ampleur » de la Force de valeur est UNKNOWN, donc la Force de valeur est à l’état INCOMPLET.",
      why: "Aucune preuve ne quantifie ce que coûte le problème.",
      affects: "Douleur économique et Force de valeur (ampleur)",
      ifFalse: "La valeur est peut-être trop faible pour compter, même si le mécanisme fonctionne.",
      evidenceToMove:
        "Des déclarations ou des relevés clients chiffrés : argent, heures ou capacité perdus par semaine ou par mois.",
      experiment:
        "Demandez à cinq clients ce que la dernière occurrence leur a coûté et collectez un mois de leurs propres relevés.",
    },
    MECHANISM_FEASIBILITY: {
      what: "Établir si le mécanisme est faisable : {mechanism}",
      why: "Rien ne montre que les données, intégrations ou comportements requis existent.",
      affects: "Mécanisme → Capacité",
      ifFalse: "Le mécanisme doit changer avant que tout autre test vaille la peine.",
    },
    EVIDENCE_GAP: {
      why: "Cette lacune maintient la Confiance dans les preuves à un niveau bas.",
      affects: "Preuves du problème",
      ifFalse: "Le problème lui-même est peut-être plus faible qu’on ne le croyait.",
      evidenceToMove: "Des preuves clients directes qui comblent la lacune.",
    },
    SECONDARY: {
      what: "Valider la dimension « {dimension} » de la Force de valeur",
      why: "{dimension} est UNKNOWN ; la Force de valeur reste à l’état INCOMPLET tant que cette dimension n’est pas validée, jamais estimée en silence.",
      affects: "Force de valeur",
      ifFalse: "La Force de valeur est peut-être plus faible qu’espéré.",
      evidenceToMove: "Des données clients ou opérationnelles qui établissent cette dimension.",
    },
    WEAKEST_LINK: {
      what: "Renforcer le lien causal le plus faible : « {statement} »",
      why: "La Confiance causale est égale à son lien critique le plus faible ({score}/100).",
      ifFalse: "La Confiance causale reste plafonnée par ce lien.",
      evidenceToMove: "Des preuves contrôlées supplémentaires sur ce lien.",
    },
  },
  mvp: {
    KILL: {
      title: "Noter pourquoi cette opportunité est morte et l’archiver",
      rationale:
        "La Confiance dans les preuves est de {evidenceScore}/100 alors que le Potentiel de l’opportunité n’est que de {opportunityScore}/100 : les preuves disent que la structure est faible.",
    },
    IGNORE: {
      title:
        "Mettre cette opportunité de côté ; n’y revenir que si de nouvelles preuves apparaissent",
      rationale:
        "Le potentiel et les preuves sont faibles. Y consacrer du temps de recherche a une faible valeur espérée.",
    },
    RESOLVE_WARNING: {
      title: "{suggestion}",
      rationale: "{message}",
    },
    VALIDATE_ASSUMPTION: {
      title: "Valider l’hypothèse la plus risquée : « {statement} »",
      rationale:
        "Importance {importance}/10 avec {count, plural, one {# élément de preuve lié} other {# éléments de preuve liés}}. Si elle est fausse, l’opportunité s’effondre.",
    },
    ECONOMIC_IMPACT: {
      title: "Déterminer l’impact économique de {pain}",
      rationale:
        "Aucune preuve ne quantifie ce que coûte le problème. Les scores restent hypothétiques tant que ce n’est pas fait.",
    },
    DIRECT_CUSTOMER: {
      title: "Parler à 3 {icp} et consigner leurs propos comme preuves",
      rationale: "Il n’y a pas encore de preuve client directe. Tout repose sur du raisonnement.",
    },
    EXPLICIT_PAIN: {
      title: "Trouver des preuves que cette douleur survient au moins chaque semaine",
      rationale:
        "La fréquence est supposée élevée mais aucune source n’énonce la douleur explicitement.",
    },
    ALTERNATIVES: {
      title: "Cartographier ce que font aujourd’hui les {icp} et où cela échoue",
      rationale:
        "Aucune alternative actuelle n’est documentée. La faiblesse des alternatives ne peut pas être tenue pour acquise.",
    },
    TRIGGER: {
      title: "Identifier le déclencheur qui rend le problème urgent",
      rationale: "Sans déclencheur, il n’y a pas de moment d’achat.",
    },
    RESEARCH: {
      title: "Recueillir au moins 5 preuves externes avant de penser aux solutions",
      rationale:
        "Potentiel de l’opportunité {opportunityScore}/100 avec une Confiance dans les preuves de {evidenceScore}/100 : prometteur mais non prouvé.",
    },
    INVESTIGATE: {
      title: "Affiner l’ICP et la variable, puis ajouter des preuves directes",
      rationale:
        "Potentiel modéré avec des preuves partielles. Un ICP plus étroit fait souvent monter les deux scores.",
    },
    EXPLORE_MECHANISMS: {
      title: "Explorer au moins 3 mécanismes avant de choisir une hypothèse produit",
      rationale:
        "{count, plural, one {# mécanisme documenté} other {# mécanismes documentés}}. Problème ≠ produit.",
    },
    INTERVIEW: {
      title: "Interviewer 5 {icp} sur la dernière fois où {pain} s’est produit",
      rationale:
        "Les scores justifient une découverte client. Utilisez le guide d’entretien généré et enregistrez vos notes comme preuves.",
    },
    TEST: {
      title: "Mener un test concierge ou une page d’atterrissage avant d’écrire du logiciel",
      rationale:
        "Les deux scores sont solides. Un test léger valide la demande à moindre coût que du code.",
    },
    DEFINE: {
      title: "Définir l’ICP, la variable et la douleur avant toute chose",
      rationale: "L’opportunité n’est pas encore assez structurée pour recommander une action.",
    },
  },
  knowledge: {
    state: {
      withConfidence: "{status} {confidence}",
      statusOnly: "{status}",
    },
    score: {
      incomplete: "INCOMPLET · {completeness}",
      incompleteBare: "INCOMPLET",
    },
    delta: {
      plain: "{label} : {before} → {after}",
      scoped: "{label} : {before} → {after} (dans le périmètre testé : {scope})",
      generalized: "{label} : {before} → {after} · généralisation {genBefore} → {genAfter}",
      scopedGeneralized:
        "{label} : {before} → {after} (dans le périmètre testé : {scope}) · généralisation {genBefore} → {genAfter}",
    },
    frontier: {
      forward: "La Frontière de preuve a avancé : {before} → {after}",
      backward: "La Frontière de preuve a reculé : {before} → {after}",
    },
    line: {
      evidenceConfidence: "Confiance dans les preuves {before} → {after}",
      valueStrength: "Force de valeur {before} → {after}",
      causalConfidence: "Confiance causale {before} → {after}",
      verdict: "Verdict {before} → {after}",
    },
    summary: {
      nothing: "Rien n’a changé.",
      contradicted:
        "{count, plural, one {# affirmation contredite} other {# affirmations contredites}} : {label}",
    },
  },
  outcome: {
    supported:
      "Valeur observée {observed} {higherIsBetter, select, true {≥} other {≤}} seuil de succès {threshold}.",
    contradicted:
      "Valeur observée {observed} {higherIsBetter, select, true {≤} other {≥}} seuil d’échec {threshold}.",
    inconclusive:
      "La valeur observée {observed} se situe entre le seuil d’échec {failure} et le seuil de succès {success}.",
    warning: {
      noDecisionQuestion:
        "Pas de question de décision. Chaque expérimentation doit dire quelle décision devient plus facile une fois menée.",
      noTarget:
        "L’expérimentation ne cible rien : rattachez-la à une hypothèse, à un lien causal ou à un niveau de la chaîne de valeur pour que son résultat puisse faire bouger une affirmation.",
      singleThreshold:
        "Un seul seuil est défini. Un seuil de succès et un seuil d’échec sont nécessaires pour que le résultat soit décidé de façon déterministe ; sinon, vous le classerez vous-même.",
      noThresholds:
        "Pas de seuils : le résultat devra être classé explicitement, sinon il reste NON CONCLUANT.",
      noUnit: "Des seuils sans unité sont difficiles à interpréter plus tard.",
    },
  },
  prefill: {
    decisionQuestion:
      "Devons-nous continuer à investir dans « {title} » compte tenu de {affects} ? Si faux : {ifFalse}",
  },
};
