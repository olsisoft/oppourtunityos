/** Chaînes françaises — section « shared ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { shared as en } from "@/i18n/dictionaries/en/shared";

export const shared: Section<typeof en> = {
  direction: {
    SUPPORTS: "étaye",
    CONTRADICTS: "contredit",
    NEUTRAL: "neutre",
  },
  provenanceBadge: {
    short: {
      USER: "VOUS",
      AI_HYPOTHESIS: "HYPOTHÈSE",
      EXTERNAL_EVIDENCE: "PREUVE",
      INTERVIEW: "ENTRETIEN",
      COMPUTED: "CALCULÉ",
    },
    help: {
      USER: "Énoncé par vous dans la conversation ou modifié manuellement.",
      AI_HYPOTHESIS: "Proposé par l’analyste par raisonnement. Non vérifié.",
      EXTERNAL_EVIDENCE: "Étayé par des preuves externes capturées.",
      INTERVIEW: "Issu de notes d’entretien client.",
      COMPUTED: "Calculé de façon déterministe par l’application.",
    },
  },
  action: {
    signIn: "Veuillez vous connecter.",
    forbidden: "Vous n’avez pas accès à cet espace de travail.",
    failed: "Une erreur est survenue. Veuillez réessayer.",
  },
};
