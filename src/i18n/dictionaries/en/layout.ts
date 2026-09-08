/** English strings — section "layout". Keys are referenced as "layout.<key>". */
export const layout = {
  demoBadge: "Demo",
  nav: {
    newDiscovery: "New discovery",
    dashboard: "Dashboard",
    settings: "Settings",
    workspaces: "Workspaces",
    recent: "Recent discoveries",
    noWorkspaces: "No workspaces yet. Start a new discovery.",
    openNavigation: "Open navigation",
  },
  userMenu: {
    label: "User menu",
    account: "Account",
    settings: "Settings",
    signOut: "Sign out",
  },
  newWorkspace: {
    title: "New opportunity discovery",
    description:
      "A workspace holds one discovery project: market, ICPs, variables, pains, evidence and opportunities. You choose how to start inside the conversation.",
    name: "Name",
    namePlaceholder: "e.g. Dental clinics, Restaurants, Cybersecurity",
    notes: "Notes (optional)",
    notesPlaceholder: "Why this space? Any access or constraints?",
    submit: "Create workspace",
  },
  notFound: {
    title: "This page does not exist or you do not have access.",
    backToDashboard: "Back to dashboard",
  },
} as const;
