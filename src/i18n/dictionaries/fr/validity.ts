/** Chaînes françaises — section « validity ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type {
  AssignmentMethod,
  ClaimType,
  EvidenceAdmissibility,
  EvidenceSourceType,
  ExperimentDesignLevel,
  InternalValidity,
} from "@/generated/prisma/enums";
import type { Section } from "@/i18n/dictionary";
import { capitalizeLabels, lowerFirstLabels } from "@/i18n/dictionaries/en/validity";
import type { validity as en } from "@/i18n/dictionaries/en/validity";
import type { FitDimensionKey } from "@/services/value/evidence-fit";
import { labels } from "./labels";

export const validity: Section<typeof en> = {
  // --- variantes de casse des libellés français, pour l’intérieur des phrases
  get designLevelLower(): Record<ExperimentDesignLevel, string> {
    return lowerFirstLabels(labels.designLevel);
  },
  get internalValidityLower(): Record<InternalValidity, string> {
    return lowerFirstLabels(labels.internalValidity);
  },
  get admissibilityLower(): Record<EvidenceAdmissibility, string> {
    return lowerFirstLabels(labels.admissibility);
  },
  get assignmentMethodLower(): Record<AssignmentMethod, string> {
    return lowerFirstLabels(labels.assignmentMethod);
  },
  get fitDimensionLower(): Record<FitDimensionKey, string> {
    return lowerFirstLabels(labels.fitDimension);
  },
  get sourceTypeLower(): Record<EvidenceSourceType, string> {
    return lowerFirstLabels(labels.evidenceSourceType);
  },
  get claimStatementCap(): Record<ClaimType, string> {
    return capitalizeLabels(labels.claimStatement);
  },

  downgrade: {
    noComparisonGroup:
      "Protocole « {declared} » déclaré, mais aucun groupe de comparaison n’existe : traité comme « {level} ».",
    notRandomlyAssigned:
      "Protocole « {declared} » déclaré, mais les unités n’ont pas été réparties au hasard : traité comme « {level} ».",
    singleGroup:
      "Protocole « {declared} » déclaré, mais il n’y a qu’un seul groupe : traité comme « {level} ».",
    notMatched:
      "Protocole « {declared} » déclaré, mais les unités de comparaison n’ont pas été appariées : traité comme « {level} ».",
    notIsolated:
      "Protocole « {declared} » déclaré, mais l’intervention n’a pas été isolée : traité comme « {level} ».",
    noBaseline:
      "Protocole « {declared} » déclaré, mais aucune mesure de référence n’a été faite : traité comme « {level} ».",
  },

  check: {
    baselineMeasured: {
      ok: "Une mesure de référence a été faite avant l’intervention.",
      fail: "Pas de mesure de référence : un changement ne peut pas être montré sans point de départ.",
      unknown: "Mesure de référence non renseignée.",
    },
    comparisonGroup: {
      ok: "Un groupe de comparaison existe.",
      fail: "Pas de groupe de comparaison : ce qui se serait passé sans l’intervention n’est pas observé.",
      unknown: "Groupe de comparaison non renseigné.",
    },
    assignmentMethod: {
      recorded: "Répartition : {method}.",
      unknown: "Méthode de répartition non renseignée.",
    },
    sameMeasurement: {
      ok: "La même mesure a été utilisée du début à la fin.",
      fail: "La mesure a changé : l’avant et l’après ne sont pas comparables.",
      unknown: "Constance de la mesure non renseignée.",
    },
    interventionIsolated: {
      ok: "Seule l’intervention a changé.",
      fail: "D’autres choses ont changé avec l’intervention : l’effet ne peut pas lui être attribué.",
      unknown: "Isolement de l’intervention non renseigné.",
    },
    confoundersControlled: {
      ok: "Les facteurs de confusion connus ont été contrôlés.",
      fail: "Les facteurs de confusion connus n’ont pas été contrôlés.",
      unknown: "Facteurs de confusion non renseignés.",
    },
    attritionPercent: {
      unknown: "Attrition non renseignée.",
      high: "Attrition {percent} % : plus de 30 % des unités ont été perdues.",
      moderate: "Attrition {percent} %.",
      negligible: "Attrition {percent} % : négligeable.",
    },
    instrumentationChanged: {
      ok: "Instrumentation inchangée.",
      fail: "L’instrumentation a changé pendant l’expérimentation.",
      unknown: "Instrumentation non renseignée.",
    },
    sampleSize: {
      organizations: "{count, plural, one {# organisation} other {# organisations}}.",
      organizationsSmall:
        "{count, plural, one {# organisation} other {# organisations}} : très petit échantillon.",
      units: "n = {count}.",
      unitsSmall: "n = {count} : très petit échantillon.",
      unknown: "Taille d’échantillon non renseignée.",
    },
    durationDays: {
      unknown: "Durée non renseignée.",
      short: "{count, plural, one {# jour} other {# jours}} : période courte.",
      ok: "{count} jours.",
    },
    dataCompletenessPercent: {
      unknown: "Complétude des données non renseignée.",
      recorded: "{percent} % des données attendues sont présentes.",
    },
    contaminationRisk: {
      ok: "Pas de contamination entre les groupes.",
      fail: "Les unités de comparaison ont pu être exposées à l’intervention.",
      unknown: "Contamination non renseignée.",
    },
    seasonalityRisk: {
      ok: "Aucun effet de saisonnalité attendu.",
      fail: "La saisonnalité peut expliquer une partie du changement.",
      unknown: "Saisonnalité non renseignée.",
    },
    concurrentChanges: {
      ok: "Pas de changements concomitants.",
      fail: "D’autres changements ont eu lieu pendant l’expérimentation.",
      unknown: "Changements concomitants non renseignés.",
    },
  },

  explanation: {
    design: "Protocole : {level}.",
    designDeclared: "Protocole : {level} (déclaré {declared}).",
    validityCriticalThreats:
      "Validité interne : {validity} — {count, plural, one {# menace critique} other {# menaces critiques}}.",
    validityCriticalUnknown:
      "Validité interne : {validity} — {count} faits critiques non renseignés.",
    validityModerateThreats:
      "Validité interne : {validity} — {count, plural, one {# menace modérée} other {# menaces modérées}}.",
    validityNoThreats: "Validité interne : {validity} — aucune menace enregistrée.",
    measuresOnly: "Un protocole « {level} » mesure ; il ne teste pas ce qui cause quoi.",
  },

  preview: {
    note: "Quel que soit le protocole, le résultat n’est observé que dans le périmètre testé ; il ne se généralise jamais automatiquement.",
    reason: {
      notAdmissible: "ce type de résultat n’est pas une preuve admissible pour l’affirmation.",
      beforeAfter:
        "un changement avant/après est compatible avec un effet causal mais ne l’établit pas.",
      designCannotCausal: "un protocole {level} ne peut pas établir de causalité.",
      high: "le résultat est une preuve d’admissibilité forte pour cette affirmation dans le périmètre testé.",
      medium:
        "le résultat est une preuve d’admissibilité moyenne : il étaye l’affirmation mais ne peut pas l’établir seul.",
      low: "le résultat est une preuve d’admissibilité faible pour cette affirmation : il peut informer, pas établir.",
    },
    ANECDOTAL: {
      strongly: {
        painDescribed: "Qu’une douleur existe et comment les clients la décrivent",
        statedIntent: "L’intention déclarée et le consentement à payer déclaré",
      },
      partially: { reportedState: "L’état actuel et les alternatives, tels que rapportés" },
      cannot: {
        magnitude: "L’ampleur ou la fréquence",
        mechanismEffect: "Que le mécanisme change quoi que ce soit",
        actualPurchase: "L’achat réel",
      },
    },
    OBSERVATIONAL: {
      strongly: {
        measuredState: "La fréquence, l’ampleur et l’état actuel, tels que mesurés",
        technicalFeasibility: "La faisabilité, quand l’observation est technique",
      },
      partially: { association: "Une association entre le mécanisme et la variable" },
      cannot: {
        causation: "Que le mécanisme cause le changement",
        beyondScope: "Quoi que ce soit au-delà du périmètre observé",
      },
    },
    BEFORE_AFTER: {
      strongly: {
        feasibilityInScope: "La faisabilité et la capacité dans le périmètre testé",
        variableChanged: "Que la variable a changé après l’intervention",
      },
      partially: { causalConsistent: "Un effet causal (compatible, non prouvé)" },
      cannot: {
        causalityConfounders: "La causalité face aux facteurs de confusion et au temps",
        generalizationUnits: "La généralisation au-delà des unités testées",
      },
    },
    MATCHED_COMPARISON: {
      strongly: {
        occurrenceInScope: "La faisabilité, la capacité et l’occurrence dans le périmètre",
        treatedImproved:
          "Que les unités traitées se sont améliorées davantage que des unités similaires non traitées",
      },
      partially: { causalInScope: "Un effet causal dans le périmètre testé" },
      cannot: {
        unobservedDifferences: "La causalité face aux différences non observées entre les groupes",
        generalizationSegment: "La généralisation au-delà du segment",
      },
    },
    CONTROLLED: {
      strongly: { causalInScope: "Un effet causal du mécanisme dans le périmètre testé" },
      partially: { magnitudeElsewhere: "L’ampleur de l’effet dans d’autres contextes" },
      cannot: {
        generalizationMarket: "La généralisation à l’ensemble du marché",
        willingnessToPay: "Le consentement à payer, sauf si le protocole fait payer",
      },
    },
    RANDOMIZED: {
      strongly: {
        causalInPopulation: "Un effet causal du mécanisme dans la population testée",
      },
      partially: { effectSizeElsewhere: "La taille de l’effet ailleurs" },
      cannot: {
        generalizationScope: "La généralisation au-delà du périmètre testé",
        willingnessToPay: "Le consentement à payer, sauf si le protocole fait payer",
      },
    },
  },

  gate: {
    default: {
      mechanism: "l’intervention",
      mechanismCap: "L’intervention",
      outcome: "la variable a changé",
      outcomeCap: "La variable a changé",
      scope: "le périmètre testé",
    },
    caveat: {
      low: "La validité interne est faible : la formulation est abaissée de trois niveaux.",
      indeterminate:
        "La validité interne est indéterminée (faits critiques non renseignés) : la formulation est abaissée d’un niveau.",
      medium:
        "La validité interne est moyenne : la conclusion tient, avec des menaces enregistrées.",
    },
    sentence: {
      ANECDOTAL: {
        supports:
          "Les clients rapportent que {outcome} après {mechanism} ({scope}). Non établi au-delà de ce périmètre.",
        contradicts:
          "Les clients rapportent que {outcome} n’a pas suivi {mechanism} ({scope}). Non établi au-delà de ce périmètre.",
      },
      OBSERVATIONAL: {
        supports:
          "{mechanismCap} est associé à {outcome} dans {scope}. Non établi au-delà de ce périmètre.",
        contradicts:
          "{mechanismCap} n’est pas associé à {outcome} dans {scope}. Non établi au-delà de ce périmètre.",
      },
      BEFORE_AFTER: {
        supports:
          "{outcomeCap} a changé après {mechanism} dans {scope} ; l’observation est compatible avec un effet, sans en être la preuve. Non établi au-delà de ce périmètre.",
        contradicts:
          "{outcomeCap} n’a pas changé après {mechanism} dans {scope} ; l’observation n’étaye pas un effet. Non établi au-delà de ce périmètre.",
      },
      MATCHED_COMPARISON: {
        supports:
          "Les unités traitées se sont améliorées davantage que le groupe de comparaison apparié dans {scope} ; les preuves étayent un effet causal dans ce périmètre. Non établi au-delà de ce périmètre.",
        contradicts:
          "Les unités traitées ne se sont pas améliorées davantage que le groupe de comparaison apparié dans {scope} ; les preuves n’étayent pas un effet causal. Non établi au-delà de ce périmètre.",
      },
      CONTROLLED: {
        supports:
          "L’expérimentation contrôlée étaye la conclusion que {mechanism} cause {outcome} dans {scope}. Non établi au-delà de ce périmètre.",
        contradicts:
          "L’expérimentation contrôlée n’étaye pas la conclusion que {mechanism} cause {outcome} dans {scope}. Non établi au-delà de ce périmètre.",
      },
      RANDOMIZED: {
        supports:
          "{mechanismCap} a causé {outcome} dans la population testée ({scope}). Non établi au-delà de ce périmètre.",
        contradicts:
          "L’expérimentation randomisée montre que {mechanism} n’a pas causé {outcome} dans la population testée ({scope}). Non établi au-delà de ce périmètre.",
      },
    },
  },

  inference: {
    defaultClaim: "l’affirmation tient",
    defaultClaimCap: "L’affirmation tient",
    tail: {
      SEGMENT_SUPPORTED:
        "Observé sur assez de cas indépendants pour étayer le segment ; pas l’ensemble du marché.",
      SAMPLE_SUPPORTED: "Observé sur un échantillon ; non établi pour le marché.",
      CASE_ONLY: "Un seul cas ; non établi ailleurs.",
      BROADER_HYPOTHESIS: "L’affirmation plus large reste une hypothèse.",
      CONTRADICTED_ACROSS_CONTEXTS: "Contredit dans d’autres contextes.",
    },
    observed:
      "{what} : observé {hasScope, select, true {dans {scope}} other {dans le périmètre observé}}.{hasTail, select, true { {tail}} other {}}",
    stronglySupportedDesign:
      "Les preuves étayent fortement que {what}{hasScope, select, true { ({scope})} other {}}, à la force d’un protocole {level}. Rien ne l’a mesuré directement.{hasTail, select, true { {tail}} other {}}",
    stronglySupported:
      "Les preuves étayent fortement que {what}{hasScope, select, true { ({scope})} other {}}. Rien ne l’a mesuré directement.{hasTail, select, true { {tail}} other {}}",
    supportedLowFit:
      "Témoignage pertinent, mais preuve faible que {what} : les preuves liées ont une adéquation faible à cette affirmation.",
    supported:
      "Les preuves étayent que {what}{hasScope, select, true { ({scope})} other {}} ; elles ne l’établissent pas.{hasTail, select, true { {tail}} other {}}",
    mixed:
      "Preuves contradictoires : des preuves de forte adéquation étayent et contredisent à la fois que {what}. Rien ne peut être conclu tant que la contradiction n’est pas résolue.",
    contradicted: "Les preuves contredisent que {what}.",
    unprovenLowFit:
      "Énoncé, avec des preuves qui ne correspondent pas à l’affirmation : rien d’admissible n’établit que {what}.",
    unproven: "Énoncé ; les preuves liées ne suffisent pas à établir que {what}.",
    hypothesis: "Hypothèse : rien n’a testé si {what}.",
    notStated: "Non énoncé.",
  },

  interpretation: {
    invalid:
      "L’expérimentation a été déclarée invalide : on ne peut pas s’y fier et elle n’établit rien.",
    inconclusive:
      "Non concluant : {outcome} dans {scope} ne tranche rien dans un sens ni dans l’autre. L’affirmation reste où elle était.",
    caveat: {
      low: "La validité interne est faible : l’observation est à prendre avec prudence.",
      indeterminate:
        "La validité interne est indéterminée : des faits critiques sur l’expérimentation n’ont pas été renseignés.",
    },
    observed: {
      supports:
        "{outcomeCap} a été observé dans {scope}.{hasNote, select, true { {note}} other {}} Observé dans ce périmètre seulement ; non établi au-delà.",
      contradicts:
        "{outcomeCap} a été observé dans {scope} ; cela n’étaye pas l’affirmation.{hasNote, select, true { {note}} other {}} Non établi au-delà de ce périmètre.",
    },
  },

  fit: {
    note: {
      admissibility: "{level} — {explanation}",
      directness: "pertinence {relevance}/10",
      directnessThirdParty: "pertinence {relevance}/10, source tierce",
      method:
        "{source} : base {base}, force {strength}/10{hasDesign, select, true {, protocole {design} ×{designFactor}} other {}}{hasValidity, select, true {, validité interne {validity} ×{validityFactor}} other {}}",
      independent: "origine indépendante",
      duplicate: "dérivé d’une source déjà comptée sur cette affirmation ({origin})",
      scopeMatch: "{explanation}",
      sample: {
        organizations: "{count, plural, one {# organisation} other {# organisations}}",
        units: "n = {count}",
        singleRespondent: "un seul répondant",
        aggregate: "source agrégée, échantillon non précisé",
        unknown: "échantillon non renseigné",
      },
      recency: {
        undated: "non daté (demi-crédit)",
        recent: "moins de 12 mois",
        aging: "de 12 à 24 mois",
        old: "plus de 24 mois",
      },
    },
    penalty: {
      lowValidity: "validité interne faible (−8)",
      indeterminateValidity: "validité interne indéterminée (−5)",
      mediumValidity: "validité interne moyenne (−3)",
      limitations: "limites enregistrées (−2)",
    },
    explanation: {
      notAdmissible:
        "Non admissible : une source « {source} » ne peut pas être une preuve que {what} (matrice {version}).",
      score: "Adéquation {score}/100 ({band}) pour « {what} ».",
      dimension: "{label} : {percent} % de {weight} → {points} pts ({note})",
      penalty: "Pénalité de limites : −{penalty} ({note})",
      noPenalty: "Aucune pénalité de limites.",
      cap: "Plafonné à {cap} : une preuve d’admissibilité {level} ne peut pas mieux correspondre à l’affirmation.",
    },
    reason: {
      lowAdmissibility:
        "une source « {source} » est une preuve d’admissibilité faible pour cette affirmation",
      mediumAdmissibility:
        "une source « {source} » est une preuve d’admissibilité moyenne pour cette affirmation",
      duplicate: "elle dérive d’une source déjà comptée",
      weakDimension: "« {dimension} » est faible ({note})",
      strong: "admissibilité forte, directe et indépendante",
    },
    summary: {
      notAdmissible: "Non admissible pour « {what} ».",
      line: "Adéquation {band} ({score}/100) pour « {what} » — {reason}.",
    },
  },

  admissibility: {
    explanation: {
      unknownProvenance:
        "{level} : une source de provenance inconnue ne peut pas être plus qu’une preuve d’admissibilité faible.",
      source: "{level} : règle propre à la source pour ce type d’affirmation (matrice {version}).",
      family:
        "{level} : règle de famille (sources {family, select, SELF_REPORTED {déclaratives} BEHAVIORAL {comportementales} OPERATIONAL {opérationnelles} MARKET {de marché} EXPERIMENTAL {expérimentales} TECHNICAL {techniques} COMMERCIAL {commerciales} other {de provenance inconnue}}) pour ce type d’affirmation.",
      default:
        "{level} : valeur par défaut pour ce type d’affirmation ; aucune règle de famille ni de source ne s’applique.",
    },
  },

  complete: {
    outcome: {
      invalid:
        "Déclaré INVALID par vous : l’expérimentation n’est pas fiable et ne produit aucune preuve.",
      userClassified: "Aucun seuil déterministe n’a pu trancher ; classé explicitement par vous.",
      inconclusive: "Ni seuils ni classification explicite : le résultat reste INCONCLUSIVE.",
    },
  },

  action: {
    checkFields: "Vérifiez les champs.",
    opportunityNotFound: "Opportunité introuvable",
    nodeNotFound: "Niveau introuvable",
    ladderLevelsMustExist: "Les deux niveaux de l’échelle doivent exister avant de les relier.",
    linkNeedsTwoLevels: "Un lien causal relie deux niveaux différents.",
    linkNotFound: "Lien introuvable",
    evidenceNotFound: "Preuve introuvable",
    nodeNotInWorkspace: "Niveau introuvable dans l’espace de travail",
    linkNotInWorkspace: "Lien introuvable dans l’espace de travail",
    opportunityNotInWorkspace: "Opportunité introuvable dans l’espace de travail",
    variableNotFound: "Variable introuvable",
    parentVariableNotInWorkspace: "Variable parente introuvable dans l’espace de travail",
    causalLinkNotOnOpportunity: "Lien causal introuvable sur cette opportunité",
    assumptionNotOnOpportunity: "Hypothèse introuvable sur cette opportunité",
    ladderLevelNotOnOpportunity: "Niveau de l’échelle de valeur introuvable sur cette opportunité",
    experimentNotFound: "Expérimentation introuvable",
    experimentHasResult: "Cette expérimentation a déjà un résultat",
  },
};
