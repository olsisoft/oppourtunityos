/** English strings — section "chat". Keys are referenced as "chat.<key>". */
export const chat = {
  header: {
    stage: "Stage",
    entryMode: {
      HAS_IDEA: "Reverse-engineering an idea",
      NO_IDEA: "Market discovery",
    },
    mockProvider: "Mock AI provider — templated responses",
  },
  error: {
    requestFailed: "Request failed ({status})",
    generic: "Something went wrong.",
  },
  composer: {
    placeholder: "Answer, add context, or ask the analyst…",
    placeholderWorking: "Analyst is working…",
    messageLabel: "Message",
    send: "Send",
    footer:
      "Hypotheses stay labelled as hypotheses. Evidence is added through the Evidence tab, never invented by the analyst.",
  },
  progress: {
    title: "Discovery progress",
    percent: "{value}%",
  },
  entry: {
    title: "How do you want to start?",
    subtitle:
      "Either way we start from a problem, never from a product. The conversation builds a structured opportunity model on the right.",
    noIdea: {
      title: "I don't know what to build",
      description:
        "Start from the industries you understand and the people you can reach. We map markets, ICPs and valuable variables before any solution.",
      submit: "Start market discovery",
      /** First message sent to the analyst when market discovery starts. */
      message: "I don't know what to build",
    },
    hasIdea: {
      title: "I already have an idea",
      description:
        "We reverse-engineer it: product → intended outcome → variable → ICP → pain → trigger → evidence. The idea may turn out weak.",
      placeholder: 'Describe the idea in one sentence, e.g. "AI receptionist for dental clinics"',
      submit: "Decompose the idea",
    },
  },
  applied: {
    summary: "Added to workspace: {summary}",
    markets: "{count, plural, one {# market} other {# markets}}",
    icps: "{count, plural, one {# ICP} other {# ICPs}}",
    variables: "{count, plural, one {# variable} other {# variables}}",
    pains: "{count, plural, one {# pain} other {# pains}}",
    triggers: "{count, plural, one {# trigger} other {# triggers}}",
    alternatives: "{count, plural, one {# alternative} other {# alternatives}}",
    mechanisms: "{count, plural, one {# mechanism} other {# mechanisms}}",
    opportunities: "{count, plural, one {# opportunity} other {# opportunities}}",
    valueChainNodes: "{count, plural, one {# value chain level} other {# value chain levels}}",
    causalLinks: "{count, plural, one {# causal link} other {# causal links}}",
    experiments: "{count, plural, one {# experiment} other {# experiments}}",
    assumptions: "{count, plural, one {# assumption} other {# assumptions}}",
  },
  mockBadge: "mock provider",
  question: {
    freeTextHint: "Or type your own answer below.",
  },
} as const;
