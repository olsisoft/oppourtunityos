/** Chaînes françaises — section « scoring ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { scoring as en } from "@/i18n/dictionaries/en/scoring";

export const scoring: Section<typeof en> = {
  total: "Total : {score}/100",

  valueStrength: {
    incomplete:
      "Force de valeur INCOMPLÈTE · {known}/{total} : une dimension requise est UNKNOWN et n’est jamais devinée (UNKNOWN ≠ 0).",
    missing:
      "Manquant : {count, plural, =1 {{d1}} =2 {{d1}, {d2}} =3 {{d1}, {d2}, {d3}} =4 {{d1}, {d2}, {d3}, {d4}} other {{d1}, {d2}, {d3}, {d4}, {d5}}}.",
    dimensionLine: "{label} : {value}/10 ({provenance})",
    dimensionUnknown: "{label} : UNKNOWN ({provenance})",
    nextQuestion: "Prochaine question de valeur : {question}",
    geometricMean: "Moyenne géométrique des dimensions normalisées × 100 = {score}/100.",
    weakest: "Dimension la plus faible : {label}.",
    question: {
      population:
        "Quelle part de l’activité de {icp} (capacité, chiffre d’affaires ou transactions) est réellement affectée par {variable} ?",
      magnitude:
        "De combien {variable} varie — ou coûte — par occurrence, en chiffres (argent, heures, capacité) ?",
      frequency:
        "À quelle fréquence {variable} survient réellement chez {icp} (par semaine ou par mois) ?",
      importance:
        "Quelle importance {icp} accorde-t-il à {variable} par rapport à ses autres problèmes ?",
      attributability:
        "Dans quelle mesure {mechanism} pourrait-il causer directement la variation de {variable}, par rapport à d’autres facteurs ?",
    },
    defaultVariable: "la variable",
    defaultIcp: "le client",
    defaultMechanism: "le mécanisme proposé",
  },

  causal: {
    linkLabel: "{from} → {to}",
    missing: {
      notStated: "{from} → {to} : lien causal non formulé",
      noEvidence: "{from} → {to} : aucune preuve sur un lien critique (« {statement} »)",
      noAdmissibleEvidence:
        "{from} → {to} : aucune preuve admissible sur un lien critique (« {statement} »)",
    },
    cappedBy: {
      contradicted: "contredit",
      mixed: "preuves contradictoires",
      design: "protocole {design}, plafond {ceiling}",
    },
    designWord: {
      ANECDOTAL: "anecdotique",
      OBSERVATIONAL: "observationnel",
      BEFORE_AFTER: "avant/après",
      MATCHED_COMPARISON: "à comparaison appariée",
      CONTROLLED: "contrôlé",
      RANDOMIZED: "randomisé",
    },
    criticalityWord: {
      CRITICAL: "critique",
      IMPORTANT: "important",
      MINOR: "mineur",
    },
    question: {
      missingLink: "Quelle est l’hypothèse causale qui relie {from} à {to} ?",
      verify: "Est-ce vraiment vrai que {statement} ?",
    },
    incomplete:
      "Confiance causale INCOMPLÈTE · {validated}/{total} liens critiques validés. Un lien sans preuve est UNKNOWN, pas zéro ; aucun nombre n’est fabriqué.",
    coverageMissing:
      "{label} : UNKNOWN (non formulé){informative, select, true { (informatif, hors score)} other {}}",
    coverageLine:
      "{label} : {status}{confidence, plural, =0 {} other { #}}{informative, select, true { (informatif, hors score)} other {}}",
    blockedBy: "Bloqué par : {label}.",
    nextQuestion: "Prochaine question causale : {question}",
    missingLine: "Manquant : {reason}",
    validated: "{validated}/{total} liens de la chaîne validés.",
    linkLine:
      "{label} : {status}, confiance {confidence}/100{capped, select, true { → {effective}, plafonné : {cappedBy}} other {}} ({evidenceCount, plural, one {# preuve admissible} other {# preuves admissibles}}, meilleure adéquation {bestFit}{hasDesign, select, true {, {design}} other {}}{critical, select, true {} other {, {criticality}}}{informative, select, true {, informatif} other {}})",
    score: "Score = lien critique le plus faible ({label}) = {score}/100.",
    noLinks: "Aucun lien.",
  },

  verdict: {
    name: {
      IGNORE: "IGNORER",
      KILL: "ABANDONNER",
      RESEARCH: "RECHERCHER",
      INVESTIGATE: "INVESTIGUER",
      INTERVIEW: "INTERVIEWER",
      TEST: "TESTER",
    },
    condition: {
      TEST: "Opportunité ≥ 75 et Preuves ≥ 75",
      INTERVIEW: "Opportunité ≥ 70 et Preuves ≥ 60",
      RESEARCH: "Opportunité ≥ 70 et Preuves < 50",
      INVESTIGATE: "Opportunité 60–79 et Preuves 40–69",
      KILL: "Opportunité < 50 et Preuves ≥ 60",
      IGNORE: "Opportunité < 40 et Preuves < 40",
      FALLBACK_RESEARCH_GAP: "Opportunité ≥ 70 et Preuves 50–59",
      FALLBACK_RESEARCH_MID: "Opportunité 50–69 et Preuves < 40",
      FALLBACK_INVESTIGATE_PROVEN: "Opportunité 60–69 et Preuves ≥ 70",
      FALLBACK_INVESTIGATE_MID: "Opportunité 50–59 et Preuves ≥ 40",
      FALLBACK_IGNORE_WEAK: "Opportunité < 50 et Preuves < 60",
      UNMATCHED: "Aucune règle ne correspond",
    },
    meaning: {
      TEST: "Structure solide et preuves solides : lancez un test de marché léger avant de construire.",
      INTERVIEW: "Assez solide pour justifier des entretiens de découverte client.",
      RESEARCH: "Hypothèse prometteuse, preuves insuffisantes. Recherchez avant toute chose.",
      INVESTIGATE: "Potentiel modéré avec des preuves partielles. Approfondissez l’analyse.",
      KILL: "Nous avons la preuve que l’opportunité est structurellement faible.",
      IGNORE: "Faible et non prouvée. Ne vaut pas le temps investi.",
      FALLBACK_RESEARCH_GAP:
        "Attractive, mais les preuves restent minces. Comblez le déficit de preuves.",
      FALLBACK_RESEARCH_MID:
        "Potentiel modéré et presque aucune preuve. Une recherche peu coûteuse d’abord.",
      FALLBACK_INVESTIGATE_PROVEN:
        "Bien étayée mais seulement modérément attractive. Cherchez un ICP ou une variable plus précis.",
      FALLBACK_INVESTIGATE_MID:
        "Structure limite avec quelques preuves. Affinez avant d’investir davantage.",
      FALLBACK_IGNORE_WEAK:
        "Structurellement faible, avec peu de preuves dans un sens comme dans l’autre. Mettez-la de côté.",
      UNMATCHED: "Recherche par défaut.",
    },
    reason: {
      opportunity: "Le Potentiel de l’opportunité est de {score}/100.",
      evidence: "La Confiance dans les preuves est de {score}/100.",
      ruleApplies: "La règle « {condition} » s’applique → {verdict}.",
      neverBuild: "Un fort potentiel avec peu de preuves signifie RECHERCHER, jamais CONSTRUIRE.",
      unmatched:
        "Opportunité {opportunity}/100, Preuves {evidence}/100 : aucune règle ne correspond.",
    },
    extension: {
      rule: {
        LOW_VALUE_KILL:
          "Force de valeur < 40 avec Preuves ≥ 60 → ABANDONNER (le problème est réel, mais faire bouger la variable ne vaut pas grand-chose).",
        CRITICAL_CONTRADICTION:
          "Contradiction critique avec un verdict de base TESTER/INTERVIEWER → INVESTIGUER.",
        TEST_MECHANISM:
          "Problème validé (Preuves ≥ 60) et Confiance causale < 40 → TESTER, centré sur le mécanisme.",
        CRITICAL_CUSTOMER_QUESTION:
          "INTERVIEWER avec une hypothèse client critique non testée → INTERVIEWER, centré sur cette question.",
      },
      lowValueKill:
        "La Force de valeur est de {valueStrength}/100 alors que la Confiance dans les preuves est de {evidenceScore}/100 : les preuves étayent le problème, mais même un mouvement réussi de la variable crée peu de valeur. À déprioriser.",
      criticalContradiction:
        "Une affirmation critique est contredite par les preuves. Résolvez la contradiction avant la découverte client ou les tests.",
      testMechanism:
        "Le problème est validé (Preuves {evidenceScore}/100), mais pas le mécanisme (Confiance causale {causalConfidence}/100). Testez le mécanisme, pas le problème.",
      criticalCustomerQuestion:
        "Une question client critique (consentement à payer, accès ou valeur) reste non testée : placez-la au centre des entretiens.",
      causalIncomplete:
        "La Confiance causale est INCOMPLÈTE : la chaîne mécanisme → valeur comporte des liens non testés. Les règles de verdict qui en dépendent ne se sont pas déclenchées.",
      valueIncomplete:
        "La Force de valeur est INCOMPLÈTE : certaines dimensions de valeur sont UNKNOWN. Les règles de verdict qui en dépendent ne se sont pas déclenchées.",
    },
  },

  kill: {
    LOW_PAIN: {
      message:
        "L’intensité de la douleur est de {value}/10. En dessous de 5, le problème est une gêne, pas une priorité.",
      suggestion:
        "Trouvez des preuves que l’écart fait réellement mal (argent, temps ou clients perdus), ou passez à autre chose.",
    },
    LOW_WTP: {
      message:
        "Le consentement à payer est de {value}/10. Personne n’a montré qu’il dépenserait de l’argent pour cela.",
      suggestion:
        "Cherchez une dépense existante : outils, personnel, consultants ou contournements que l’ICP paie déjà.",
    },
    NO_TRIGGER: {
      message: "Aucun déclencheur identifiable. Sans déclencheur, il n’y a aucune urgence à agir.",
      suggestion:
        "Demandez : quand ce problème devient-il impossible à ignorer ? Quel événement force une décision ?",
    },
    RARE: {
      message:
        "Le problème survient rarement (fréquence {value}/10). Les problèmes rares sont difficiles à vendre et faciles à tolérer.",
      suggestion: "Confirmez avec de vrais clients la fréquence par semaine ou par mois.",
    },
    ALTERNATIVE_ADEQUATE: {
      message:
        "Les alternatives actuelles résolvent déjà le problème de façon satisfaisante (faiblesse {value}/10).",
      suggestion:
        "Identifiez une défaillance précise de l’alternative qui coûte de l’argent, ou choisissez une autre variable.",
    },
    NOT_ECONOMIC: {
      message: "La variable n’a pas de portée économique pour l’ICP (importance {value}/10).",
      suggestion:
        "Reliez la variable au chiffre d’affaires, aux coûts, au risque ou à la capacité. Si vous n’y parvenez pas, choisissez une autre variable.",
    },
    NO_METRIC: {
      message:
        "Aucun résultat mesurable n’est défini. Sans métrique, vous ne pouvez pas prouver la valeur.",
      suggestion:
        "Définissez la métrique que le produit fait bouger (p. ex. taux de no-show, minutes par ticket).",
    },
    ICP_UNREACHABLE: {
      message: "Atteindre l’ICP semble difficile : « {reachability} ».",
      messageUnknown: "On ignore si vous pouvez atteindre l’ICP pour l’interviewer ou lui vendre.",
      suggestion:
        "Listez 5 personnes ou canaux concrets par lesquels vous pouvez atteindre l’ICP ce mois-ci.",
    },
    BUYER_UNKNOWN: {
      message:
        "L’acheteur économique n’est pas identifié. Les utilisateurs qui ressentent la douleur ne contrôlent pas forcément le budget.",
      suggestion:
        "Vérifiez si c’est le propriétaire, un responsable ou quelqu’un d’autre qui contrôle les achats.",
    },
    PERSONAL_CURIOSITY: {
      message:
        "Cela ressemble à de la curiosité personnelle plutôt qu’à une douleur métier que quelqu’un paie pour faire disparaître.",
      suggestion:
        "Nommez l’ICP qui perd de l’argent à cause de ce problème. Si personne n’en perd, considérez-le comme un passe-temps.",
    },
    SOLUTION_TOO_BIG: {
      message:
        "La dépendance de la solution (complexité {complexity}/10) est bien plus grande que la valeur perçue (importance {importance}/10).",
      suggestion:
        "Cherchez d’abord un mécanisme plus petit (service, script, tableur) qui fait bouger la variable.",
    },
    NO_ECONOMIC_EVIDENCE: {
      message: "Des preuves existent, mais aucune ne quantifie l’impact économique.",
      suggestion:
        "Demandez aux clients ce que le problème leur a coûté la dernière fois qu’il est survenu.",
    },
  },

  progress: {
    step: {
      MARKET_SELECTION: "Marché",
      ICP_DISCOVERY: "ICP",
      VARIABLE_DISCOVERY: "Variables",
      PAIN_DISCOVERY: "Douleur",
      TRIGGER_DISCOVERY: "Déclencheur",
      ALTERNATIVE_DISCOVERY: "Alternative",
      EVIDENCE_DISCOVERY: "Preuves",
      MECHANISM_DISCOVERY: "Mécanismes",
      OPPORTUNITY_FORMATION: "Opportunité",
      VALUE_CAUSALITY: "Chaîne de valeur",
      EXPERIMENT_DESIGN: "Expérimentation",
      RECOMMENDATION: "Décision",
    },
    detail: {
      markets: "{count, plural, one {# marché} other {# marchés}}",
      icps: "{count, plural, one {# ICP} other {# ICP}}",
      variables: "{count, plural, one {# variable} other {# variables}}",
      pains: "{count, plural, one {# douleur} other {# douleurs}}",
      triggers: "{count, plural, one {# déclencheur} other {# déclencheurs}}",
      alternatives: "{count, plural, one {# alternative} other {# alternatives}}",
      evidence: "{count} sur {target} éléments visés",
      mechanisms: "{count} sur {target} explorés",
      opportunities: "{count, plural, one {# formée} other {# formées}}",
      valueChain: "{count} sur {target} niveaux de l’échelle",
      experiments: "{count, plural, one {# planifiée} other {# planifiées}}",
      verdictComputed: "Verdict calculé",
      noVerdict: "Pas encore de verdict",
    },
  },

  semantics: {
    unknownType:
      "Le type de variable est UNKNOWN, le verbe d’action ne peut donc pas être vérifié. Choisissez un type (ou définissez la polarité d’un type personnalisé).",
    decreasingPositive:
      "« {verb} × {type} » revient à réduire une chose souhaitable. Vouliez-vous dire {first}, {second}, {third} ? Vous pouvez le conserver si c’est voulu.",
    increasingNegative:
      "« {verb} × {type} » revient à augmenter une chose indésirable. Vouliez-vous dire {first}, {second}, {third} ? Vous pouvez le conserver si c’est voulu.",
    polarityWord: {
      POSITIVE: "positive",
      NEGATIVE: "négative",
      NEUTRAL: "neutre",
    },
    verbSentence: "{verb} {name}",
  },

  evidence: {
    noEvidence:
      "Aucune preuve capturée. Tout ce qui concerne cette opportunité reste une hypothèse.",
    noAdmissible: "Aucune preuve admissible n’est liée à cette affirmation.",
    componentLine:
      "{label} : {fill} % de {weight} pts → {points} pts ({count, plural, one {# élément} other {# éléments}})",
    contradiction:
      "Preuves contradictoires : {count, plural, one {# élément} other {# éléments}} → −{penalty} pts",
    gap: {
      noDirect: "Aucune preuve client directe (entretien, citation ou sondage).",
      noPain: "Aucune source n’exprime la douleur explicitement.",
      noEconomic: "Aucune preuve d’impact économique (argent, temps ou capacité perdus).",
      noWorkaround:
        "Aucune preuve de contournement (des gens qui essaient déjà de résoudre le problème).",
      noIntent: "Aucune preuve de consentement à payer ni d’intention d’achat.",
      contradictionOutweighs: "Les preuves contradictoires l’emportent sur les preuves favorables.",
      noSupport: "Aucune preuve favorable.",
      singleOrigin: "Une seule source indépendante : pas encore de corroboration.",
      noMeasurement:
        "Rien n’est mesuré ni observé directement : l’affirmation repose sur des témoignages.",
    },
  },

  opportunity: {
    componentLine: "{label} : {value}/10 × {weight} % → {points} pts",
  },
};
