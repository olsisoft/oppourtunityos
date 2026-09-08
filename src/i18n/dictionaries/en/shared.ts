/** English strings — section "shared". Keys are referenced as "shared.<key>". */
export const shared = {
  /** Direction of an evidence link, as a lowercase inline word. */
  direction: {
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts",
    NEUTRAL: "neutral",
  },
  provenanceBadge: {
    short: {
      USER: "USER",
      AI_HYPOTHESIS: "HYPOTHESIS",
      EXTERNAL_EVIDENCE: "EVIDENCE",
      INTERVIEW: "INTERVIEW",
      COMPUTED: "COMPUTED",
    },
    help: {
      USER: "Stated by you in the conversation or edited manually.",
      AI_HYPOTHESIS: "Proposed by the analyst from reasoning. Not verified.",
      EXTERNAL_EVIDENCE: "Backed by captured external evidence.",
      INTERVIEW: "Comes from customer interview notes.",
      COMPUTED: "Calculated deterministically by the application.",
    },
  },
  /** Errors a server action returns to the user. */
  action: {
    signIn: "Please sign in.",
    forbidden: "You do not have access to this workspace.",
    failed: "Something went wrong. Please try again.",
  },
} as const;
