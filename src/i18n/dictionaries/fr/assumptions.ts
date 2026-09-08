/** Chaînes françaises — section « assumptions ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { assumptions as en } from "@/i18n/dictionaries/en/assumptions";

export const assumptions: Section<typeof en> = {
  example: {
    CAUSAL:
      "Si les réservations à risque reçoivent des rappels adaptatifs, le taux de rendez-vous manqués diminue.",
    VALUE:
      "Une baisse de 5 points des rendez-vous manqués crée assez de valeur économique pour justifier le produit.",
    FEASIBILITY:
      "Les plateformes de réservation exposent assez de données pour calculer le risque d’un rendez-vous.",
    WTP: "Les salons indépendants paieraient 79 à 149 €/mois.",
    ACCESS: "Les acheteurs cibles peuvent être atteints efficacement.",
    GENERIC: "Le gérant décide des achats de logiciels.",
  },
  examplePlaceholder: "ex. {example}",
  summary: {
    untested:
      "{count, plural, one {# hypothèse critique reste non testée} other {# hypothèses critiques restent non testées}}. Si une hypothèse causale ou de valeur est fausse, l’opportunité s’effondre.",
    default:
      "Les hypothèses non testées les plus risquées d’abord. Liez des preuves pour les faire passer à étayée ou contredite.",
  },
  addButton: "Hypothèse",
  importance: "Importance {value}/10",
  add: "Ajouter",
  formHelp:
    "Les hypothèses causales et de valeur peuvent aussi être rattachées à un niveau de la chaîne de valeur ou à un lien causal depuis l’onglet Valeur ou l’échelle du rapport.",
  emptyTitle: "Aucune hypothèse enregistrée",
  emptyDescription:
    "Toute opportunité repose sur des hypothèses concernant l’acheteur, la douleur, le prix et — surtout — la chaîne causale du mécanisme à la valeur. Écrivez-les pour pouvoir les tester.",
  onLevel: "sur {level}",
  onLink: "sur le lien « {statement} »",
  item: {
    importance: "importance {value}/10",
    confidence: "confiance {value} %",
    evidenceCount: "{count, plural, one {# preuve} other {# preuves}}",
  },
  unlink: "dissocier",
  linkEvidence: "Lier une preuve",
  delete: "Supprimer l’hypothèse",
  linkDialog: {
    title: "Lier une preuve à l’hypothèse",
    evidence: "Preuve",
    choose: "Choisir une preuve",
    direction: "Direction",
    supports: "Étaye l’hypothèse",
    contradicts: "Contredit l’hypothèse",
    neutral: "Neutre — pertinente mais non concluante",
    link: "Lier",
    linked: "Preuve liée — statut recalculé",
  },
};
