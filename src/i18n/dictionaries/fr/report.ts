/** Chaînes françaises — section « report ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { report as en } from "@/i18n/dictionaries/en/report";

export const report: Section<typeof en> = {
  meta: {
    title: "Rapport d’opportunité",
  },
  page: {
    confidence: "Confiance {confidence}",
    title: "Rapport d’opportunité",
    description:
      "L’artefact de cette découverte. Les hypothèses restent étiquetées ; UNKNOWN est une réponse honnête. Chaque champ de la variable de valeur porte son propre statut.",
    section: {
      icp: "A · ICP",
      variable: "B · Variable de valeur",
      pain: "C · Douleur / conséquence économique",
      trigger: "D · Déclencheur",
      alternatives: "E · Alternatives actuelles",
      mechanisms: "F · Mécanismes explorés",
      productHypothesis: "G · Hypothèse produit",
      valueProposition: "H · Proposition de valeur",
      metric: "Métrique qui prouve la valeur",
      risks: "Risques",
      ladder: "I · Échelle de causalité de la valeur",
      frontier: "J · Frontière de preuve",
      riskiest: "L · Hypothèse la plus risquée",
      killCriteria: "N · Critères d’abandon",
    },
    variable: {
      actionType:
        "Action : {direction} · Type : {type}{hasPolarity, select, true { ({polarity})} other {}}",
      parentLabel: "Variable économique parente :",
      field: {
        type: "Type",
        target: "Cible",
        scope: "Périmètre",
        currentState: "État actuel",
        desiredState: "État souhaité",
        unit: "Unité",
        importance: "Importance",
        parentVariable: "Variable économique parente",
        whoValuesIt: "Qui y accorde de la valeur",
        whyItMatters: "Pourquoi c’est important",
      },
    },
    alternatives: {
      weakness: "faiblesse {weakness}/10",
    },
    mechanisms: {
      empty: "Aucun exploré pour l’instant. Problème ≠ produit.",
    },
    risks: {
      empty: "Aucun enregistré.",
    },
    ladder: {
      description:
        "Mécanisme → Capacité → Transformation → Valeur opérationnelle → Valeur économique → Résultat stratégique. Chaque niveau affiche son statut épistémique ; chaque flèche est une hypothèse causale testable. Cliquez pour lier une preuve, ajouter une hypothèse ou planifier une expérimentation.",
    },
    frontier: {
      scopeLabel: "Périmètre :",
      scopeLine: "{scope}{hasGeneralization, select, true { · {generalization}} other {}}",
      scopeHint: "— ce qui a été atteint, et où cela a été observé.",
      whyStopsLabel: "Pourquoi la frontière s’arrête ici :",
    },
    riskiest: {
      description:
        "{count, plural, =0 {Liez des preuves pour étayer ou contredire chaque hypothèse.} one {# hypothèse reste non testée. Les hypothèses causales et de valeur passent en premier.} other {# hypothèses restent non testées. Les hypothèses causales et de valeur passent en premier.}}",
      importance: "importance {importance}/10",
      collapse: "Si cette hypothèse est fausse, l’opportunité s’effondre. Elle n’a pas été testée.",
      empty:
        "Aucune hypothèse non testée enregistrée. Soit tout est vérifié, soit rien n’a été noté.",
    },
    commercial: {
      title: "Échelle commerciale",
      description:
        "Dépense existante → intention d’achat → consentement à payer déclaré → acceptation du prix → achat réel. Chaque barreau est une affirmation à part entière avec ses propres preuves ; étayer un barreau ne fait jamais bouger ceux du dessus.",
      rung: "{status}{hasEvidence, select, true { · {count} admissibles · adéquation {fit}} other {}}",
    },
    experiments: {
      title: "Expérimentations",
      description:
        "Hypothèse → expérimentation → résultat → preuve → mise à jour des connaissances → mouvement de la frontière → verdict. Enregistrez un résultat et voyez exactement ce qu’il a changé. Chaque résultat porte son niveau de protocole, sa validité interne et une interprétation soumise au garde-fou de formulation.",
    },
    learning: {
      title: "Historique d’apprentissage",
      description:
        "Comment nous en sommes venus à croire ce que nous croyons : chaque changement d’une affirmation, d’un score, de la Frontière de preuve ou du verdict, avec ce qui l’a provoqué.",
    },
    interview: {
      title: "Guide d’entretien",
      description:
        "Généré lorsqu’une opportunité mérite des entretiens de découverte client. Enregistrez ce que vous entendez comme preuve.",
    },
    then: {
      title: "Ensuite",
      description: "Incertitudes de moindre priorité, dans l’ordre.",
      item: "{priority} · {score}",
    },
    verdict: {
      title: "Pourquoi ce verdict",
      description:
        "Règles déterministes sur les quatre scores et la frontière. L’analyste ne décide jamais de cela.",
    },
    valueStrength: {
      title: "Pourquoi cette Force de valeur",
      description:
        "Moyenne géométrique de l’importance, de l’ampleur, de la fréquence, de la population et de l’attribuabilité. Une dimension manquante rend le score INCOMPLET, jamais nul.",
    },
    causal: {
      title: "Pourquoi cette Confiance causale",
      description:
        "Le lien causal critique le plus faible décide. Un lien sans preuve rend le score INCOMPLET{hasCompleteness, select, true { · {completeness} liens de la chaîne validés} other {}}{hasBlocking, select, true { · bloqué par {blocking}} other {}}.",
      notComputed: "Pas encore calculé — énoncez d’abord la chaîne de valeur.",
    },
    potential: {
      title: "Pourquoi ce Potentiel de l’opportunité",
      description:
        "Importance 20 % · Douleur 20 % · Fréquence 15 % · Écart 15 % · Consentement à payer 20 % · Faiblesse des alternatives 10 %",
      inputs: "Entrées",
      editInputs: "Modifier les entrées",
      inputsOrigin:
        "Les entrées ont été {origin, select, USER {définies par vous} other {proposées par l’analyste (hypothèse)}}. Modifiez-les pour refléter ce que vous savez réellement.",
    },
    evidenceConfidence: {
      title: "Pourquoi cette Confiance dans les preuves",
      description:
        "Client direct 25 · Douleur explicite 20 · Impact économique 20 · Contournement 10 · Intention d’achat 15 · Diversité 5 · Récence 5. Les contradictions retranchent.",
    },
    evidence: {
      title: "Preuves",
      description:
        "Éléments liés à cette opportunité, à sa douleur ou à l’une de ses affirmations. Chaque élément indique quelles affirmations il étaye ou contredit ; le moteur décide de ce que cela prouve.",
    },
  },
  model: {
    detailsUnknown: "détails UNKNOWN",
    triggerUnknown: "UNKNOWN — aucun déclencheur identifié",
    failureUnknown: "Défaillance UNKNOWN",
    notFormed: "Pas encore formulée",
    metricUnknown: "UNKNOWN — aucun résultat mesurable défini",
    frontierNotComputed: "Pas encore calculé.",
    scopeNotComputed: "non calculé",
    validityNotAssessed: "non évaluée",
    frontierNone:
      "Frontière de preuve actuelle : rien n’est encore étayé. Chaque affirmation, y compris le problème lui-même, reste une hypothèse.",
    frontierAt:
      "Frontière de preuve actuelle : {label}. Tout ce qui se trouve au-delà de cette ligne reste une hypothèse produit ou causale.",
  },
  md: {
    title: "Rapport d’opportunité — {title}",
    generated:
      "Généré le {date} par OpportunityOS. Les hypothèses sont étiquetées ; rien ci-dessous n’est validé sans preuve à l’appui. Les scores, les statuts et la Frontière de preuve sont calculés de façon déterministe.",
    heading: {
      icp: "A. ICP",
      variable: "B. Variable de valeur",
      pain: "C. Douleur / conséquence économique",
      trigger: "D. Déclencheur",
      alternatives: "E. Alternatives actuelles",
      mechanisms: "F. Mécanismes explorés",
      productHypothesis: "G. Hypothèse produit",
      valueProposition: "H. Proposition de valeur",
      ladder: "I. Échelle de causalité de la valeur",
      frontier: "J. Frontière de preuve",
      commercial: "Échelle commerciale",
      experimentalValidity: "Validité expérimentale",
      scorecard: "K. Tableau de scores",
      riskiest: "L. Hypothèse la plus risquée",
      nextAction: "M. Prochaine meilleure action",
      killCriteria: "N. Critères d’abandon",
      assumptions: "Hypothèses",
      evidence: "Preuves ({count})",
      risks: "Risques",
    },
    icp: "{name} — {description} _({provenance})_",
    variable: {
      name: "Variable : {name} _({provenance})_",
      direction: "Direction : {direction}",
      type: "Type (ce qui bouge) : {value} _({status})_",
      target: "Cible : {value} _({status})_",
      scope: "Périmètre : {value} _({status})_",
      currentState: "État actuel : {value} _({status})_",
      desiredState: "État souhaité : {value} _({status})_",
      unit: "Unité : {value} _({status})_",
      importance: "Importance : {value} _({status})_",
      parentVariable: "Variable économique parente : {value} _({status})_",
    },
    alternative: "{name} (faiblesse {weakness}/10) : {failure}",
    mechanismsEmpty: "Aucun exploré pour l’instant",
    metric: "Métrique qui prouve la valeur : {metric}",
    ladder: {
      empty: "Aucune chaîne de valeur énoncée pour l’instant.",
      node: "**{level}** [{status}{hasConfidence, select, true { {confidence}} other {}} · {distance}] — {statement}",
      nodeCounts:
        "_({evidence, plural, one {# preuve} other {# preuves}}, {admissible, plural, one {# admissible} other {# admissibles}}{hasFit, select, true {, meilleure adéquation {fit}} other {}}, {assumptions, plural, one {# hypothèse} other {# hypothèses}})_",
      nodeScope: "Périmètre : {scope} · {generalization}",
      nodeInference: "Inférence : {inference}",
      linksTitle: "Liens causaux (hypothèses testables) :",
      link: "{from} → {to} [{status}, {criticality}{hasFit, select, true {, meilleure adéquation {fit}} other {}}{hasDesign, select, true {, protocole {design}} other {}}] : {statement}{hasInference, select, true { — {inference}} other {}}",
    },
    frontier: {
      scope:
        "Périmètre : {scope}{hasGeneralization, select, true { ({generalization})} other {}}. Observé sur un échantillon ne veut pas dire prouvé pour le marché.",
      whyStops: "Pourquoi la frontière s’arrête ici : {whyStops}",
    },
    commercial: {
      rung: "{label} : {status}{hasEvidence, select, true { ({count, plural, one {# admissible} other {# admissibles}}, meilleure adéquation {fit})} other {}}",
      note: "Chaque barreau est une affirmation à part entière : une dépense existante n’est pas un consentement à payer ; un consentement déclaré n’est pas un achat.",
    },
    experimentValidity: {
      line: "**{title}** — {outcome} ; protocole {design} ; validité interne {validity} ; périmètre {scope}.",
      threats: "Menaces : {threats}",
    },
    scorecard: {
      score: "{score}/100",
      incomplete: "INCOMPLET",
      valueIncomplete:
        "INCOMPLET · {completeness}{hasMissing, select, true { (manquant : {missing})} other {}}",
      causalIncomplete:
        "INCOMPLET · {completeness} liens validés{hasBlocking, select, true { (bloqué par {blocking})} other {}}",
      opportunityPotential:
        "Potentiel de l’opportunité : **{score}** — le problème est-il structurellement attractif ?",
      evidenceConfidence:
        "Confiance dans les preuves : **{score}** (confiance {confidence}) — le problème est-il réel ?",
      valueStrength:
        "Force de valeur : **{score}** — si la variable bouge, quelle valeur est créée ?",
      causalConfidence: "Confiance causale : **{score}** — le mécanisme peut-il la faire bouger ?",
      verdict: "Verdict : **{verdict}**",
    },
    riskiest: {
      line: "[{kind}, importance {importance}/10] {statement}",
      collapse: "Si cette hypothèse est fausse, l’opportunité s’effondre.",
      empty: "Aucune hypothèse non testée enregistrée.",
    },
    nextAction: {
      value:
        "**{what}**\n- Pourquoi : {why}\n- Affecte : {affects}\n- Si faux : {ifFalse}\n- Preuve qui ferait bouger la frontière : {evidence}{hasExperiment, select, true {\n- Expérimentation : {experiment}} other {}}",
      simple: "**{title}**\n{rationale}",
    },
    kill: {
      line: "[{severity}] {message}",
      empty: "Aucune alerte déclenchée.",
    },
    assumptions: {
      line: "{index}. [{kind} · {status}] {statement} (importance {importance}/10)",
      empty: "Aucune hypothèse enregistrée.",
    },
    evidence: {
      line: "{title} — {type}, {sentiment}, force {strength}, pertinence {relevance}{isDemo, select, true { [DONNÉES DE DÉMO]} other {}}{isMocked, select, true { [SIMULÉ]} other {}}",
      empty: "Aucune preuve capturée. Tout ce qui précède est une hypothèse.",
    },
    risksEmpty: "Aucun enregistré.",
    listSeparator: ", ",
  },
};
