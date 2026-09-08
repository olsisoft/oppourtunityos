/** English strings — section "settings". Keys are referenced as "settings.<key>". */
export const settings = {
  metaTitle: "Settings",
  title: "Settings",
  description: "Account and runtime configuration. Secrets are never displayed.",
  account: {
    title: "Account",
    name: "Name",
    email: "Email",
  },
  language: {
    title: "Language",
    description:
      "Interface language. The choice is saved on your account and follows you to your next browser.",
    current: "Current language",
  },
  provider: {
    title: "AI provider",
    descriptionBefore: "Configured through environment variables (",
    descriptionAfter: "). Scores and verdicts never depend on the provider.",
    provider: "Provider",
    model: "Model",
    modelTemplates: "templates",
    status: "Status",
    mock: "Mock provider — templated responses, not analysis",
    configured: "Configured",
    keyMissing: "API key missing",
    rateLimit: "Rate limit",
    rateLimitValue: "{max} chat turns per {minutes} minutes per user",
  },
  research: {
    title: "Research providers",
    description:
      "V1 supports manual evidence capture, pasted URLs, quotes and notes, plus a clearly labelled mock research provider. Web, Reddit, review sites and job boards plug into the same interface later.",
    activeProvider: "Active provider",
    mockResearch: "mock-research (labelled MOCK)",
  },
} as const;
