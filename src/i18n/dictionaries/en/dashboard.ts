/** English strings — section "dashboard". Keys are referenced as "dashboard.<key>". */
export const dashboard = {
  metaTitle: "Dashboard",
  title: "What should I investigate next?",
  summary:
    "{workspaces, plural, one {# active workspace} other {# active workspaces}} · {opportunities, plural, one {# opportunity} other {# opportunities}} · {evidence, plural, one {# evidence item} other {# evidence items}} · {assumptions, plural, one {# untested assumption} other {# untested assumptions}}",
  why: "Why",
  incomplete: "INCOMPLETE",
  firstDiscovery: {
    title: "Start your first discovery",
    descriptionBefore: "Create a workspace, then choose how to begin inside the conversation. Run",
    descriptionAfter: "to add the Beauty Salons demo workspace.",
  },
  nextAction: {
    label: "Next best action",
    ifFalse: "If false: {consequence}",
    open: "Open opportunity",
    emptyTitle: "No opportunity formed yet",
    emptyDescription:
      "Continue a conversation until an ICP, a variable and a pain are known. The dashboard then tells you what to research first.",
  },
  frontier: {
    notComputed: "Not computed",
    label: "Proof frontier: {frontier}",
  },
  strongest: {
    title: "Strongest opportunities",
    description:
      "Ranked by Opportunity Potential. Evidence says whether the problem is real, Value how much moving the variable is worth, Causal whether the mechanism can move it. Hover the title for the Proof Frontier.",
    empty: "Nothing scored yet.",
    demoWorkspace: "{name} (demo)",
  },
  columns: {
    opportunity: "Opportunity",
    workspace: "Workspace",
    potential: "Potential",
    evidence: "Evidence",
    value: "Value",
    causal: "Causal",
    verdict: "Verdict",
  },
  scoreQuestions: {
    potential: "Opportunity Potential — is the problem structurally attractive?",
    evidence: "Evidence Confidence — do we have credible evidence that the problem is real?",
    value: "Value Strength — if we move the variable, how much value could be created?",
    causal: "Causal Confidence — do we know the proposed mechanism can actually move it?",
  },
  byVerdict: {
    title: "Opportunities by verdict",
  },
  learning: {
    title: "Recent learning",
    description:
      "What the last evidence and experiment results changed: claims, scores, the Proof Frontier, the verdict.",
    empty: "Nothing has changed yet. Record an experiment result or link evidence to a claim.",
    frontierMoved: "Proof Frontier moved: {from} → {to}",
    verdictChanged: "Verdict {from} → {to}",
    reasonExperiment: "{title} (experiment result)",
    reasonEvidence: "{title} (evidence)",
    meta: "{summary} · Reason: {reason} · {date}",
  },
  stalled: {
    title: "Opportunities with stalled learning",
    description:
      "No experiment completed in {days} days while critical assumptions remain UNKNOWN.",
    empty: "No live opportunity is stalled.",
    detail:
      "{status, select, NEVER {No experiment completed yet} other {No experiment completed in {days} days}} · {critical, plural, one {# critical assumption remains UNKNOWN} other {# critical assumptions remain UNKNOWN}}{planned, plural, =0 {} other { · # planned}}",
  },
  weakest: {
    title: "Weakest assumptions",
    description:
      "Untested, high importance. Causal and value assumptions rank first: if one is false, the opportunity collapses.",
    empty: "No untested assumptions. Either everything is verified or nothing was written down.",
    onLevel: "on {level}",
    onCausalLink: "on a causal link",
    evidenceCount: "{count} evidence",
    importance: "importance {value}",
  },
  gaps: {
    title: "Evidence gaps",
    description:
      "What kind of evidence is missing: the problem itself, its economic magnitude, the causal chain, willingness to pay or mechanism feasibility.",
    empty: "No open evidence gap on a live opportunity.",
    kinds: {
      PROBLEM: "Problem evidence gap",
      MAGNITUDE: "Economic magnitude gap",
      CAUSAL: "Causal evidence gap",
      WTP: "Willingness-to-pay gap",
      FEASIBILITY: "Mechanism feasibility gap",
    },
    problemDetail: "potential {potential} · evidence {evidence} · {gap}",
    noEvidenceCaptured: "no evidence captured",
    magnitudeDetail: "The economic magnitude is unknown: nothing measured, nothing stated.",
    causalNoEvidence: "A critical causal link has no evidence at all.",
    causalWeak: "Causal confidence {confidence}: the weakest critical link is barely supported.",
    wtpDetail: "No evidence of purchase intent or spend on an alternative.",
    feasibilityDetail: "A feasibility assumption about the mechanism is untested.",
  },
  fitness: {
    title: "Evidence fitness gaps",
    description:
      "Where the Proof Frontier is blocked by evidence that exists but cannot establish the claim: not admissible, low fit, or a design too weak for causality. More of the same evidence will not help.",
    empty: "No live opportunity is blocked by ill-fitting evidence.",
    kinds: {
      NOT_ADMISSIBLE: "Evidence not admissible",
      LOW_FIT: "Evidence does not fit the claim",
      WEAK_DESIGN: "Design too weak for causality",
    },
  },
  generalization: {
    title: "Generalization gaps",
    description:
      "Levels observed in one case or a small sample. Observed in a sample does not mean proven for the market; the next question widens the scope.",
    empty: "No observed level is waiting for generalization.",
  },
  workspaces: {
    title: "Workspaces",
    counts:
      "{opportunities, plural, one {# opportunity} other {# opportunities}} · {evidence} evidence",
  },
  quickStart: {
    discoverTitle: "I don't know what to build",
    discoverBody: "Start from your context and discover a market",
    validateTitle: "I already have an idea",
    validateBody: "Reverse-engineer it into ICP, variable, pain and evidence",
  },
} as const;
