/** Chaînes françaises — section « discovery ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { discovery as en } from "@/i18n/dictionaries/en/discovery";

export const discovery: Section<typeof en> = {
  workspace: {
    idea: "Idée : {idea}",
    mapButton: "Carte",
    openMap: "Ouvrir la carte des opportunités",
    toggleMap: "Afficher ou masquer la carte des opportunités",
    sheetTitle: "Carte des opportunités",
  },
  tabs: {
    map: "Carte",
    variables: "Variables",
    value: "Valeur",
    radar: "Radar",
    evidence: "Preuves",
    assumptions: "Hypothèses",
    mapHelp:
      "Marché → ICP → Variable → Douleur → Opportunité → Mécanisme → Chaîne de valeur. Cliquez sur un nœud pour l’inspecter ou le modifier ; dépliez une opportunité pour voir son échelle et sa Frontière de preuve. Les badges indiquent d’où vient chaque fait.",
    variablesHelp:
      "Variables de valeur classées par importance (0–100 = importance × 10). L’importance est une hypothèse tant qu’aucune preuve ne l’étaye.",
  },
  map: {
    empty: {
      title: "Aucun marché pour l’instant",
      description:
        "La carte se remplit au fil de la conversation : Marché → ICP → Variables → Douleurs → Opportunités → Mécanisme → Chaîne de valeur.",
    },
    noOpportunity:
      "Aucune opportunité formée pour l’instant. Les opportunités apparaissent une fois l’ICP, la variable et la douleur connus.",
    node: {
      market: "Marché",
      icp: "ICP",
      variable: "Variable de valeur",
      pain: "Douleur",
      opportunity: "Opportunité",
      mechanism: "Mécanisme",
    },
    pending: {
      icp: "ICP en attente",
      variables: "Variables en attente",
    },
    valueChain: "Chaîne de valeur",
    experiments:
      "{count, plural, =0 {Aucune expérimentation planifiée} one {# expérimentation} other {# expérimentations}}",
    variableLine:
      "{direction} · {type} · importance {importance}/10 · {current} · {desired}{hasParent, select, true { · variable parente {parent}} other {}}",
    typeKnown: "type {type}",
    typeUnknown: "type UNKNOWN",
    currentKnown: "actuel {value} ({statusLabel})",
    currentUnknown: "actuel UNKNOWN",
    desiredKnown: "souhaité {value} ({statusLabel})",
    desiredUnknown: "souhaité UNKNOWN",
    painLine:
      "sévérité {severity} · fréquence {frequency} · {triggers, plural, one {# déclencheur} other {# déclencheurs}} · {alternatives, plural, one {# alternative} other {# alternatives}} · {evidence, plural, one {# preuve} other {# preuves}}",
    collapse: "Replier",
    expand: "Déplier",
    collapseChain: "Replier la chaîne de valeur",
    expandChain: "Déplier la chaîne de valeur",
    scores: {
      potential: "potentiel {value}",
      evidence: "preuves {value}",
      value: "valeur {value}",
      causal: "causal {value}",
    },
    frontier: "Frontière de preuve · {frontier}",
    mechanismUnknown: "UNKNOWN — aucun mécanisme choisi pour l’instant. Problème ≠ produit.",
    noChain:
      "Aucune chaîne de valeur formulée pour l’instant. Ouvrez l’onglet Valeur pour expliquer comment le mécanisme crée de la valeur : Mécanisme → Capacité → Transformation → Opérationnel → Économique → Stratégique.",
  },
  variables: {
    empty: {
      title: "Aucune variable pour l’instant",
      description:
        "Les variables de valeur sont ce qu’un produit doit faire bouger : coût de main-d’œuvre, rendez-vous manqués, rétention, taux d’utilisation. Elles apparaissent une fois un ICP défini.",
    },
    evidenceCount: "{count, plural, =0 {Aucune preuve} one {# preuve} other {# preuves}}",
  },
  detail: {
    confirmDelete: "Supprimer cet élément et tout ce qui en dépend ? Les scores seront recalculés.",
    deleted: "Supprimé",
    saved: "Enregistré",
    failed: "Échec",
    market: {
      kind: "Marché",
      noDescription: "Aucune description.",
      attractiveness: "Notes d’attractivité",
      delete: "Supprimer le marché",
    },
    icp: {
      kind: "ICP",
      description:
        "Modifiez n’importe quel champ. Les modifications manuelles marquent l’ICP comme déclaré par vous. Indiquez UNKNOWN quand vous ne savez pas.",
      name: "Nom",
      role: "Rôle",
      companyType: "Type d’entreprise",
      companySize: "Taille d’entreprise",
      userRole: "Rôle de l’utilisateur",
      responsibilities: "Responsabilités",
      economicBuyer: "Acheteur économique (qui contrôle le budget ?)",
      reachability: "Joignabilité (comment pouvez-vous les atteindre ?)",
      notes: "Notes",
    },
    variable: {
      kind: "Variable de valeur",
      description:
        "{count, plural, one {# douleur rattachée} other {# douleurs rattachées}}. Chaque champ porte son propre statut ; laissez un champ vide quand il est UNKNOWN plutôt que de deviner.",
      delete: "Supprimer la variable",
    },
    pain: {
      kind: "Douleur",
      description:
        "État actuel, état souhaité et écart. UNKNOWN est une réponse valable et honnête.",
      descriptionField: "Description",
      severity: "Sévérité {value}/10",
      frequency: "Fréquence {value}/10",
      currentState: "État actuel",
      desiredState: "État souhaité",
      gap: "Écart",
      triggers: "Déclencheurs ({count})",
      noTrigger: "Aucun déclencheur identifié. Sans déclencheur, pas d’urgence.",
      urgency: "urgence {value}",
      alternatives: "Alternatives actuelles ({count})",
      noAlternative:
        "Aucune alternative documentée. La faiblesse des alternatives ne peut pas encore être établie.",
      alternativeBadge: "{category} · faiblesse {value}",
      failureUnknown: "Défaillance UNKNOWN",
      evidence: "Preuves sur cette douleur ({count})",
      noEvidence:
        "Aucune preuve pour l’instant. Tout ce qui concerne cette douleur est une hypothèse.",
    },
    opportunity: {
      kind: "Opportunité",
      noProblemStatement: "Aucun énoncé de problème pour l’instant.",
      frontierLabel: "Frontière de preuve actuelle :",
      frontierNote: "Tout ce qui se trouve au-delà reste une hypothèse produit ou causale.",
      openReport: "Ouvrir le rapport",
    },
  },
};
