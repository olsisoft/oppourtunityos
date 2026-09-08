/**
 * Chaînes françaises — section « frontier » : Frontière de preuve, échelle
 * commerciale, périmètre de généralisation, comparaison de périmètres et
 * évaluation épistémique. Typée sur la section anglaise : toute clé manquante
 * ou en trop est une erreur de compilation. Espaces insécables avant ; : ? !
 */
import type { Section } from "@/i18n/dictionary";
import type { frontier as en } from "@/i18n/dictionaries/en/frontier";

export const frontier: Section<typeof en> = {
  plain: "{text}",
  list: {
    comma: "{head}, {tail}",
    and: "{head} et {tail}",
  },
  scope: {
    notRecorded: "périmètre non renseigné",
    join: "{head} · {tail}",
    organizations: "{count, plural, one {# organisation} other {# organisations}}",
    sampleSize: "n = {count}",
    configurations: "{count, plural, one {# configuration} other {# configurations}} ({systems})",
    dimension: {
      population: "population",
      icp: "ICP",
      geography: "géographie",
      industry: "secteur",
      companySize: "taille d’entreprise",
      systems: "systèmes / outils",
      workflow: "flux de travail",
      environment: "environnement",
      timePeriod: "période",
      sampleSize: "taille d’échantillon",
      organizationCount: "organisations",
      userCount: "utilisateurs",
      sourceDiversity: "sources indépendantes",
      conditions: "conditions",
      exclusions: "exclusions",
    },
  },
  scopeMatch: {
    claimUndeclared:
      "L’affirmation ne déclare aucun périmètre ; la preuve ne peut pas le contredire, mais rien ne confirme qu’elle s’applique.",
    evidenceUnknown:
      "La preuve n’enregistre aucun périmètre : où et dans quelles conditions elle a été observée reste inconnu.",
    match: "Le périmètre correspond sur {matched}.",
    partial:
      "{shape, select, MD {Correspond sur {matched} ; diffère sur {mismatched}.} MU {Correspond sur {matched} ; inconnu pour {unknown}.} MDU {Correspond sur {matched} ; diffère sur {mismatched} ; inconnu pour {unknown}.} D {Diffère sur {mismatched}.} U {Inconnu pour {unknown}.} other {Diffère sur {mismatched} ; inconnu pour {unknown}.}}",
  },
  rung: {
    inSentence: {
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
  },
  design: {
    none: "aucun",
    ANECDOTAL: "anecdotique",
    OBSERVATIONAL: "observationnel",
    BEFORE_AFTER: "avant / après",
    MATCHED_COMPARISON: "à comparaison appariée",
    CONTROLLED: "contrôlé",
    RANDOMIZED: "randomisé",
  },
  linkLabel: "{from} → {to}",
  blocker: {
    noEvidence: {
      rung: "{label} n’a aucune preuve liée ({status}).",
      link: "{label} : le lien causal « {statement} » n’a aucune preuve liée ({status}).",
    },
    notAdmissible: {
      rung: "{label} : {count, plural, one {# élément lié n’est pas une preuve admissible} other {# éléments liés ne sont pas des preuves admissibles}} pour cette affirmation.",
      link: "{label} : {count, plural, one {# élément lié n’est pas une preuve admissible} other {# éléments liés ne sont pas des preuves admissibles}} pour cette affirmation (« {statement} »).",
    },
    contradicted:
      "{label} : les preuves contraires l’emportent sur les preuves favorables ; cela bloque la progression.",
    mixed:
      "{label} : preuves contradictoires — des preuves de forte adéquation l’étayent et la contredisent à la fois ; une contradiction bloque la progression tant qu’elle n’est pas résolue, elle n’est jamais moyennée.",
    lowFitOnly: {
      rung: "{label} : seules des preuves de faible adéquation sont liées (meilleure adéquation {fit}/100, requis {requiredFit}) — les sources sont peu admissibles pour cette affirmation ; elles l’éclairent mais ne peuvent pas l’établir.",
      link: "{label} : seules des preuves de faible adéquation sont liées (meilleure adéquation {fit}/100, requis {requiredFit}) — les sources sont peu admissibles pour cette affirmation (« {statement} ») ; elles l’éclairent mais ne peuvent pas l’établir.",
    },
    lowFit: {
      rung: "{label} : meilleure adéquation des preuves {fit}/100, requis {requiredFit} — des preuves existent mais ne correspondent pas à cette affirmation.",
      link: "{label} : meilleure adéquation des preuves {fit}/100, requis {requiredFit} — des preuves existent mais ne correspondent pas à cette affirmation (« {statement} »).",
    },
    belowThreshold: "{label} : confiance {confidence}, seuil requis {required} ({status}).",
    contradictedAcrossContexts:
      "{label} : étayée dans un contexte et contredite dans un autre ; la frontière ne peut pas s’y appuyer.",
    broaderHypothesis:
      "{label} : observée dans {scope}, mais l’affirmation porte sur un périmètre plus large ; l’affirmation élargie reste une hypothèse.",
    differentScope: "un autre périmètre",
    untestedAssumption: {
      rung: "{label} : une hypothèse critique n’a jamais été testée : « {assumption} ».",
      link: "{label} : une hypothèse causale critique reste non testée : « {assumption} ».",
    },
    weakDesign:
      "{label} : {hasDesign, select, true {le protocole le plus solide est {design}} other {aucun protocole expérimental n’est enregistré}} ; attribuer {rung} exige au moins un protocole {requiredDesign}.",
    nonCritical: "{reason} (lien non critique, ne conditionne pas la frontière)",
    notStated: "{label} : ce niveau de l’argument de valeur n’a pas été formulé.",
    optionalNotStated: "Niveau facultatif, non formulé.",
    missingLink: "Aucun lien causal formulé de {from} vers {to}.",
    reachableLater: "Atteignable seulement une fois l’écart précédent comblé.",
    unknown: "Blocage inconnu.",
  },
  whyStops: {
    none: "Aucune affirmation n’est encore étayée par des preuves.",
    complete: "Chaque niveau formulé est étayé ; formulez le niveau suivant pour aller plus loin.",
  },
  frontierScope: {
    none: "aucun périmètre : rien n’est étayé",
    reported: "non observé directement ; étayé par des preuves rapportées",
  },
  explanation: {
    none: "Aucune affirmation n’est encore étayée par des preuves. Tout est hypothèse.",
    current:
      "Frontière de preuve actuelle : {level} · périmètre : {scope}{hasGeneralization, select, true { ({generalization})} other {}}. Tout ce qui se trouve au-delà reste une hypothèse produit ou causale.",
    whyStops: "Pourquoi la frontière s’arrête ici : {reason}",
    also: "Également : {reason}",
  },
  commercial: {
    question: {
      EXISTING_SPEND:
        "Que dépensent déjà les acheteurs cibles pour gérer ce problème (comptables, outils, temps du personnel) ?",
      PURCHASE_INTENT:
        "Les acheteurs cibles disent-ils qu’ils achèteraient quelque chose qui supprime ce problème ?",
      WILLINGNESS_TO_PAY:
        "Combien les acheteurs cibles disent-ils qu’ils paieraient, et pour quoi ?",
      PRICE_ACCEPTANCE:
        "Les acheteurs cibles acceptent-ils un prix annoncé lorsqu’il leur est réellement présenté ?",
      ACTUAL_PURCHASE:
        "Quelqu’un a-t-il payé de l’argent réel — un pilote payant, un abonnement, un contrat signé ?",
    },
    evidence: {
      EXISTING_SPEND:
        "Factures, documents financiers ou déclarations de ce qui est payé aujourd’hui pour des solutions partielles.",
      PURCHASE_INTENT:
        "Entretiens, conversations commerciales, inscriptions sur liste d’attente ou lettres d’intention.",
      WILLINGNESS_TO_PAY:
        "Tests de prix ou pilotes payants ; les montants déclarés en entretien comptent comme preuve moyenne.",
      PRICE_ACCEPTANCE: "Un test de prix ou un pilote payant au prix visé.",
      ACTUAL_PURCHASE:
        "Transactions, contrats, factures ou achats d’abonnement — jamais des déclarations.",
    },
    rungLine:
      "{label} : {status}{count, plural, =0 {} one { (# élément admissible, meilleure adéquation {fit})} other { (# éléments admissibles, meilleure adéquation {fit})}}",
    principle:
      "Chaque échelon est une affirmation à part entière : une dépense existante n’est pas un consentement à payer ; un consentement déclaré n’est pas un achat.",
  },
  generalization: {
    gap: {
      untested: "Aucune preuve d’adéquation moyenne ou forte n’étaye que {claim}.",
      caseOnly:
        "Observé dans un seul cas indépendant ({scope}) ; {missing, plural, one {# cas indépendant de plus le rendrait} other {# cas indépendants de plus le rendraient}} étayé sur échantillon.",
      sampleSupported:
        "Observé dans {origins} cas indépendants et {configurations, plural, one {# configuration} other {# configurations}} ({scope}) ; l’étayage sur segment exige ≥ {minOrigins} cas dans ≥ {minConfigurations} configurations{hasUncovered, select, true { et la couverture de {dimensions}} other {}}.",
      segmentSupported:
        "Observé dans {origins} cas indépendants et {configurations} configurations dans le périmètre de l’affirmation. Ce n’est toujours pas l’ensemble du marché.",
      broaderHypothesis:
        "Observé dans {scope}, mais l’affirmation porte sur un périmètre plus large (correspondance {match} %) : l’affirmation élargie est une hypothèse.",
      contradictedAcrossContexts: "Étayé dans {scope} et contredit dans un autre contexte.",
    },
    nextQuestion: {
      contradicted:
        "Qu’est-ce qui diffère entre les contextes où {claim} et celui où ce n’est pas le cas ?",
      uncovered:
        "Est-il toujours vrai que {claim} pour {dimensions}{targetScope, select, true { dans le périmètre cible} other {}} ?",
      elsewhere:
        "Est-il toujours vrai que {claim} dans {status, select, CASE_ONLY {d’autres organisations} other {d’autres configurations}} ({scope} jusqu’ici) ?",
    },
    otherDimensions:
      "{count, plural, one {d’autres valeurs de {first}} other {d’autres valeurs de {first} et de {second}}}",
    summary:
      "Généralisation : {status} — {origins, plural, one {# origine indépendante} other {# origines indépendantes}}, {configurations, plural, one {# configuration} other {# configurations}}{hasMatch, select, true {, correspondance de périmètre {match} %} other {, périmètre de l’affirmation non déclaré}}.",
  },
  inference: {
    none: "",
  },
  epistemic: {
    lowFitCapped:
      "Preuves de faible adéquation plafonnées : {before} → {after} (une preuve peu adéquate pour cette affirmation l’éclaire mais ne peut pas l’établir).",
  },
};
