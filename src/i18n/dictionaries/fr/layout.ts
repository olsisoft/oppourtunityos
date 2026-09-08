/** Chaînes françaises — section « layout ». Typée sur la section anglaise : toute clé manquante ou en trop est une erreur de compilation. */
import type { Section } from "@/i18n/dictionary";
import type { layout as en } from "@/i18n/dictionaries/en/layout";

export const layout: Section<typeof en> = {
  demoBadge: "Démo",
  nav: {
    newDiscovery: "Nouvelle découverte",
    dashboard: "Tableau de bord",
    settings: "Paramètres",
    workspaces: "Espaces de travail",
    recent: "Découvertes récentes",
    noWorkspaces: "Aucun espace de travail pour l’instant. Lancez une nouvelle découverte.",
    openNavigation: "Ouvrir la navigation",
  },
  userMenu: {
    label: "Menu utilisateur",
    account: "Compte",
    settings: "Paramètres",
    signOut: "Se déconnecter",
  },
  newWorkspace: {
    title: "Nouvelle découverte d’opportunités",
    description:
      "Un espace de travail contient un projet de découverte : marché, ICP, variables, douleurs, preuves et opportunités. Vous choisissez comment démarrer dans la conversation.",
    name: "Nom",
    namePlaceholder: "ex. Cliniques dentaires, Restaurants, Cybersécurité",
    notes: "Notes (facultatif)",
    notesPlaceholder: "Pourquoi ce domaine ? Un accès ou des contraintes particulières ?",
    submit: "Créer l’espace de travail",
  },
  notFound: {
    title: "Cette page n’existe pas ou vous n’y avez pas accès.",
    backToDashboard: "Retour au tableau de bord",
  },
};
