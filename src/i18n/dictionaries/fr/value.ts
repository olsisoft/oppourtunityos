/** Chaînes françaises — section « value ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { value as en } from "@/i18n/dictionaries/en/value";

export const value: Section<typeof en> = {
  incomplete: "INCOMPLET",
  unknown: "INCONNU",
  fitBand: {
    HIGH: "FORTE",
    MEDIUM: "MOYENNE",
    LOW: "FAIBLE",
    NONE: "NON ADMISSIBLE",
  },
  panel: {
    emptyTitle: "Aucune opportunité pour l’instant",
    emptyDescription:
      "L’ingénierie de la valeur commence dès qu’une opportunité existe : une variable de valeur, une hypothèse de mécanisme, une chaîne causale et les preuves qui étayent (ou non) chaque lien.",
    intro:
      "Action × variable × cible, le chemin de valeur et là où les preuves s’arrêtent aujourd’hui. Cliquez sur un niveau ou une flèche pour lier une preuve, formuler une hypothèse ou planifier une expérimentation.",
    report: "Rapport",
    variable: {
      title: "Variable de valeur",
      type: "Type",
      typeWithPolarity: "{type} · {polarity}",
      target: "Cible",
      current: "Actuel",
      desired: "Souhaité",
      parent: "Variable économique parente",
      noParent: "INCONNU — aucune variable parente indiquée.",
    },
    path: {
      title: "Chemin de valeur",
      titleNamed: "Chemin de valeur · {name}",
      count: "{count, plural, one {# chemin} other {# chemins}}",
    },
    frontier: {
      title: "Frontière de preuve",
      scope: "Périmètre : {scope}",
      scopeNotComputed: "pas encore calculé",
      whyStops: "Pourquoi elle s’arrête : {reason}",
      notComputedYet: "Pas encore calculé.",
    },
    commercial: {
      title: "Échelle commerciale",
      rungStatement: "{statement}.",
      evidence:
        "{count, plural, one {# élément admissible} other {# éléments admissibles}}, meilleure adéquation {fit}/100.",
      noEvidence: "Aucune preuve admissible pour l’instant.",
      caveat:
        "Une dépense existante n’est pas un consentement à payer ; un consentement déclaré n’est pas un achat.",
      next: "Prochaine étape : {question}",
    },
    scores: {
      valueStrength: "Force de valeur",
      causalConfidence: "Confiance causale",
      incompleteWith: "INCOMPLET · {completeness}",
      incompleteLinks: "INCOMPLET · {completeness} liens",
      score: "{score}/100",
      missing: "Manquant : {missing}",
      dimensionValue: "{value}/10",
      dimensionRow: "{value} · {provenance}",
      completeness: "Complétude : {completeness}",
      blockingLink: "Lien bloquant : {label}",
      statusWithConfidence: "{status} {confidence}",
      criticalLinks:
        "Liens critiques : {total} · validés : {validated}{withBlocking, select, true { · bloquant : {blocking}} other {}}",
    },
    nextQuestion: {
      value: "Prochaine question de valeur",
      causal: "Prochaine question causale",
      action: "Prochaine meilleure action",
      withUncertainty: "{title} · {uncertainty}",
      couldChange: "Ce que cela pourrait changer : {text}",
    },
    experiments: {
      title: "Expérimentations",
      counts: "{planned} planifiées · {completed} terminées",
      plan: "Planifier une expérimentation",
    },
  },
  ladder: {
    frontierAria: "Frontière de preuve",
    frontierChip: "Frontière de preuve · {level}",
    frontierChipScoped: "Frontière de preuve · {level} · {scope}",
    level: "Niveau : {level}",
    scope: "Périmètre : {scope}",
    scopeWithGeneralization: "Périmètre : {scope} · {generalization}",
    scopeNotComputed: "non calculé",
    nothingSupported: "Rien n’est encore étayé par des preuves adéquates.",
    reachedWhere:
      "Ce qui a été atteint, et où cela a été observé. Au-delà de ce périmètre, l’affirmation est une hypothèse.",
    stateCausalAssumption: "formuler l’hypothèse causale",
    counts:
      "{evidence, plural, one {# preuve} other {# preuves}} · {assumptions, plural, one {# hypothèse} other {# hypothèses}}",
    bestFit: "meilleure adéquation {fit}",
    scopeRecorded: "périmètre : {scope}",
    recorded: "enregistré",
    notStated: "non formulé",
    addBusinessOutcome:
      "Résultat d’entreprise (facultatif — le plus éloigné de l’attribution au produit)",
    linkTitle: "{from} → {to}",
    nodeTitle: "{level} : {statement}",
    hover: {
      status: "Statut",
      fit: "Adéquation",
      scope: "Périmètre",
      statusConfidence: "{status} {confidence}/100",
      fitBest: "meilleure {fit}/100 ({band})",
      admissible: "{admissible}/{total} admissibles",
      independentOrigins:
        "{count, plural, one {# origine indépendante} other {# origines indépendantes}}",
      lowFitOnly: "faible adéquation uniquement",
      design: "protocole {design}",
      requiresDesign: "(exige ≥ {design})",
      noEvidence: "aucune preuve liée",
      observedIn: "observé dans {scope}",
      unrecordedScope: "un périmètre non enregistré",
      notObserved: "non observé directement",
    },
  },
  sheet: {
    toast: {
      failed: "Échec",
      levelStated: "Niveau formulé (NON PROUVÉ tant qu’aucune preuve n’est liée)",
      causalStated: "Hypothèse causale formulée",
      statementUpdated: "Énoncé mis à jour",
      evidenceLinked: "Preuve liée — statut recalculé",
      evidenceUnlinked: "Preuve détachée",
      assumptionAdded: "Hypothèse ajoutée",
      levelRemoved: "Niveau supprimé",
      causalUpdated: "Hypothèse causale mise à jour",
      linkRemoved: "Lien supprimé",
    },
    nodeDescription:
      "{help} Le statut est calculé à partir des preuves liées, pondérées par leur adéquation à cette affirmation ; d’ici là, l’énoncé lui-même est une hypothèse.",
    linkedEvidence: "Preuves liées",
    removeLevel: "Supprimer le niveau",
    causalLink: "Lien causal · {from} → {to}",
    linkDescription:
      "Cette flèche est elle-même une hypothèse qui peut échouer. De « {from} » à « {to} ». Un lien critique conditionne la Frontière de preuve ; une affirmation causale exige des preuves méthodologiques, pas des témoignages.",
    evidenceOnLink: "Preuves sur ce lien",
    removeLink: "Supprimer le lien",
    claim: {
      title: "Détail de l’affirmation",
      claim: "Affirmation",
      inference: "Inférence actuelle",
      fit: "Adéquation",
      fitSummary: "meilleure {fit}/100 · {admissible}/{total} admissibles",
      noEvidence: "aucune preuve",
      required:
        "requis : adéquation ≥ {fit} · confiance ≥ {confidence}{withDesign, select, true { · protocole ≥ {design}} other {}}",
      scope: "Périmètre",
      scopeNotRecorded: "non enregistré",
      scopeNotObserved: "non observé directement",
      origins:
        "{count, plural, one {# origine indépendante} other {# origines indépendantes}}{withDesign, select, true { · {design}} other {}}",
      generalization: "Généralisation",
      nextGeneralizationQuestion: "Prochaine question de généralisation",
      frontierEffect: "Effet sur la frontière",
      canCarry:
        "Étayée par des preuves adéquates : cette affirmation peut porter la Frontière de preuve.",
      reachableLater: "Atteignable seulement une fois les niveaux précédents étayés.",
      strengthen: "Ce qui renforcerait cette affirmation",
      highAdmissibility: "Preuves de forte admissibilité : {sources}.",
      noHighAdmissibility:
        "Aucun type de source n’est de forte admissibilité pour cette affirmation.",
      lowFitWarning:
        "Les preuves liées jusqu’ici sont de faible adéquation : en ajouter n’établira pas l’affirmation.",
      causalDesign: "L’attribution causale à ce niveau exige au minimum un protocole {design}.",
    },
    nodeForm: {
      title: "Formuler ce niveau",
      description: "{help} Une phrase. Elle restera NON PROUVÉE tant qu’aucune preuve n’est liée.",
      statement: "Énoncé",
      save: "Enregistrer",
    },
    linkForm: {
      title: "Formuler l’hypothèse causale",
      description:
        "Écrivez la croyance qui doit tenir pour que la flèche fonctionne, sous forme d’énoncé testable (« Si …, alors … »).",
      label: "Hypothèse causale",
      placeholder:
        "Si les réservations à risque reçoivent des rappels adaptatifs, le taux de non-présentation diminue.",
    },
    evidence: {
      title: "{title} ({count})",
      empty:
        "Aucune preuve liée. Cette affirmation est une hypothèse ; la Frontière de preuve ne peut pas la franchir.",
      direction: {
        SUPPORTS: "étaye",
        CONTRADICTS: "contredit",
        NEUTRAL: "neutre",
      },
      directionOption: {
        SUPPORTS: "Étaye",
        CONTRADICTS: "Contredit",
        NEUTRAL: "Neutre",
      },
      demo: "DÉMO",
      unlink: "détacher",
      choose: "Choisir une preuve à lier",
      link: "Lier",
      captureFirst: "Capturez d’abord une preuve dans l’onglet Preuves, puis liez-la ici.",
    },
    assumptions: {
      title: "Hypothèses ({count})",
      statusImportance: "{status} · {importance}",
      placeholder: "Ajoutez la croyance qui doit tenir ici…",
      importance: "Importance {importance}",
      add: "Ajouter",
    },
    planOnLink: "Planifier une expérimentation sur ce lien",
    experimentTitle: "Test : {statement}",
  },
  fit: {
    none: "adéquation —",
    badge: "adéquation {score} · {band}",
    fallback:
      "Adéquation de la preuve à cette affirmation, calculée de façon déterministe au dernier recalcul.",
  },
  epistemic: {
    withConfidence: "{label} {confidence}",
    confidenceHint: "Confiance issue des preuves liées : {confidence}/100.",
    distanceBadge: "{code} · {label}",
    distanceHelp:
      "Plus la distance causale est grande, plus l’incertitude d’attribution et la charge de preuve sont élevées. {help}",
  },
  scorecard: {
    potential: "Potentiel de l’opportunité",
    evidence: "Confiance dans les preuves",
    value: "Force de valeur",
    causal: "Confiance causale",
    question: {
      potential: "Potentiel de l’opportunité — le problème est-il structurellement attractif ?",
      evidence:
        "Confiance dans les preuves — avons-nous des preuves crédibles que le problème est réel ?",
      value:
        "Force de valeur — si nous faisons bouger la variable, quelle valeur pourrait être créée ?",
      causal:
        "Confiance causale — savons-nous que le mécanisme proposé peut réellement la faire bouger ?",
    },
    notComputedYet: "Pas encore calculé.",
    notComputed: "Non calculé",
    linksCompleteness: "{completeness} liens",
    missing: "Manquant : {missing}",
  },
  nextAction: {
    empty:
      "Aucune incertitude déterminante pour la décision n’a encore été identifiée. Formez d’abord une opportunité et sa chaîne de valeur.",
    title: "Prochaine meilleure action",
    whyNow: "Pourquoi ce test maintenant ?",
    why: "Pourquoi c’est important",
    affects: "Affecte",
    ifFalse: "Si c’est faux",
    evidenceToMove: "Preuve qui ferait avancer la frontière",
    whatThisCouldChange: "Ce que cela pourrait changer",
    experiment: "Expérimentation recommandée",
    scoring:
      "priorité {priority}/100 · impact {impact} · incertitude {uncertainty} · frontière {frontier} · criticité {criticality} ÷ effort {effort} · temps {time} · coût {cost}",
    assumed: "({assumed} supposé — planifiez l’expérimentation pour affiner)",
    assumedDimension: {
      effort: "effort",
      time: "temps",
      cost: "coût",
    },
    currentFrontier: "Frontière de preuve actuelle : {frontier}",
    type: {
      COLLAPSE_ASSUMPTION: "lever l’hypothèse",
      CAUSAL_LINK: "lien causal",
      EVIDENCE_FITNESS: "adéquation des preuves",
      GENERALIZATION: "généralisation",
      WTP_EVIDENCE: "preuve de consentement à payer",
      ECONOMIC_MAGNITUDE: "ampleur économique",
      MECHANISM_FEASIBILITY: "faisabilité du mécanisme",
      EVIDENCE_GAP: "lacune de preuves",
      SECONDARY: "secondaire",
    },
    plan: "Planifier cette expérimentation",
  },
  variableForm: {
    direct: "Variable directe",
    summary:
      "Action : {action} · Type : {type}{withPolarity, select, true { ({polarity})} other {}}",
    name: "Variable",
    action: "Action (verbe)",
    suggested: "{label} · suggéré",
    type: "Type de variable (ce qui est déplacé)",
    typePlaceholder: "Leakage, Churn, Downtime, Revenue… ou un type personnalisé",
    polarity: "Polarité de ce type personnalisé",
    noPolarity: "INCONNU — pas de vérification de compatibilité",
    category: "Catégorie économique",
    importance: "Importance {score}/10",
    target: "Cible (ce qui est déplacé exactement)",
    targetPlaceholder: "p. ex. rendez-vous réservés non honorés ou annulés le jour même",
    scope: "Périmètre (où cela s’applique)",
    scopePlaceholder: "p. ex. réservations aux heures de pointe, salons mono-site",
    currentState: "État actuel",
    desiredState: "État souhaité",
    unit: "Unité",
    unitPlaceholder: "% des rendez-vous",
    whoValuesIt: "Qui y accorde de la valeur",
    whoPlaceholder: "Propriétaire de salon indépendant",
    whyItMatters: "Pourquoi c’est important",
    whyPlaceholder:
      "Les créneaux vides aux heures de pointe ne peuvent pas toujours être revendus…",
    parent: "Variable économique parente",
    parentHelp:
      "Ce qui en bénéficie en aval quand cette variable bouge dans le sens souhaité. La relation reste une hypothèse tant que des preuves ne l’étayent pas ; elle n’entre jamais dans la vérification de compatibilité.",
    parentVariable: "Variable parente",
    none: "Aucune",
    parentDirection: "Mouvement attendu de la variable parente",
    footer:
      "Chaque champ conserve son propre statut. Les champs vides sont INCONNU et le restent ; l’enregistrement marque les champs que vous avez modifiés comme USER.",
    save: "Enregistrer la variable",
    saved: "Variable enregistrée (champs modifiés marqués USER)",
  },
  strength: {
    title: "Dimensions de la Force de valeur (0–10)",
    preview: "Aperçu",
    unknown: "inconnu",
    needsValidation: "À valider : {missing}. INCONNU n’est jamais estimé.",
    geometricMean:
      "Moyenne géométrique : une seule dimension faible tire fortement le score vers le bas.",
    save: "Enregistrer les dimensions",
    saved: "Dimensions enregistrées — Force de valeur recalculée",
  },
  movement: {
    title: "Résultat de l’expérimentation",
    observed: "Observé : {observed}",
    invalid: "Une exécution invalide ne fait jamais bouger la frontière : rien n’a changé.",
    inconclusive:
      "Un résultat non concluant est enregistré comme preuve neutre ; il n’étaye ni ne contredit l’affirmation, donc rien n’a bougé.",
    nothing:
      "Rien n’a changé : les preuves n’ont franchi aucun seuil. Elles comptent tout de même pour l’affirmation.",
    affected: "Affirmations affectées",
    statusConfidence: "{status} {confidence}",
    frontier: "Frontière de preuve",
    verdict: "Verdict",
    evidenceConfidence: "Confiance dans les preuves",
    causalConfidence: "Confiance causale",
    valueStrength: "Force de valeur",
    before: "Avant : {value}",
    after: "Après : {value}",
    nextAction: "Prochaine meilleure action",
  },
  history: {
    emptyTitle: "Aucun apprentissage enregistré pour l’instant",
    emptyDescription:
      "Chaque fois qu’une preuve ou un résultat d’expérimentation change une affirmation, un score, la Frontière de preuve ou le verdict, le changement est enregistré ici avec ce qui l’a causé.",
    meta: "{date} · {trigger}",
    frontierMoved: "frontière {from} → {to}",
    frontierUnchanged: "frontière inchangée",
    evidenceConfidence: "Confiance dans les preuves {before} → {after}",
    causalConfidence: "Confiance causale {before} → {after}",
    valueStrength: "Force de valeur {before} → {after}",
    verdict: "Verdict {before} → {after}",
  },
};
