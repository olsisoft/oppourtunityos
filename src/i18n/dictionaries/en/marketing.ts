/** English strings — section "marketing". Keys are referenced as "marketing.<key>". */
export const marketing = {
  metaDescription:
    "Stop asking AI for startup ideas. Discover problems worth solving: markets, valuable variables, pain, evidence and a deterministic verdict.",
  nav: {
    method: "Method",
    radar: "Radar",
    openWorkspace: "Open workspace",
    signIn: "Sign in",
    getStarted: "Get started",
  },
  hero: {
    eyebrow: "Evidence-driven opportunity discovery",
    title: "Know what is worth building before you spend months building it.",
    subtitle:
      "OpportunityOS turns market hypotheses into evidence-backed, falsifiable opportunities — and shows exactly what still needs proving.",
    body: "Stop asking AI for startup ideas. Map markets, identify valuable variables, analyze pain and evidence, trace the causal chain from mechanism to value, test the weakest link and watch your confidence change.",
    findOpportunity: "Find an opportunity",
    validateIdea: "Validate an idea",
    note: "Hypothesis ≠ Evidence. Every opportunity carries four independent scores and a Proof Frontier. The AI doesn't decide what's true. Evidence does. And evidence isn't just a source: it has to fit the claim.",
  },
  footer: {
    tagline: "OpportunityOS — discover economic anomalies, not ideas.",
    motto: "Don't generate ideas. Discover economic anomalies.",
  },
  whyFail: {
    title: "Why idea generators fail",
    body: "They start from a product and justify it afterwards. They praise everything. They confuse a plausible story with a customer who loses money every week. The output looks like progress and costs you months.",
    generatorsLabel: "Most AI idea generators",
    generatorsFlow: "Idea → justification",
    ourLabel: "OpportunityOS",
    ourFlow:
      "Market → ICP → Valuable variable → Pain → Evidence → Opportunity → Mechanism → Proof frontier → Experiment",
    productFirst: {
      title: "Product first",
      body: "Idea → justification instead of market → ICP → variable → problem.",
    },
    reasoningAsProof: {
      title: "Reasoning as proof",
      body: "An LLM's confidence is not evidence. Nothing is verified.",
    },
    noKillSwitch: {
      title: "No kill switch",
      body: "Weak ideas never get killed because nothing is scored against a rule.",
    },
    noCausalChain: {
      title: "No causal chain",
      body: "If you cannot say how a mechanism moves a variable — and prove each step — you cannot sell it.",
    },
  },
  method: {
    title: "Opportunity discovery methodology",
    bodyBefore:
      "Every conversation moves through the same pipeline and produces a structured artifact, not a transcript. Products move valuable variables:",
    formula: "ICP × Variable × Desired movement",
    bodyAfter:
      ". Then the value causality ladder says how — and the Proof Frontier says how much of it is actually supported.",
    pipeline: {
      market: "Market",
      icp: "ICP",
      variable: "Valuable variable",
      pain: "Pain",
      evidence: "Evidence",
      opportunity: "Opportunity",
      mechanism: "Mechanism",
      causalChain: "Causal chain",
      proofFrontier: "Proof frontier",
      experiment: "Experiment",
    },
  },
  evidenceDecides: {
    title: "The AI doesn't decide what's true. Evidence does.",
    body: "The analyst proposes hypotheses and asks questions. Four independent scores, the epistemic status of every claim, the Proof Frontier and the verdict are computed deterministically from the evidence you capture. UNKNOWN stays UNKNOWN. And not every piece of evidence can prove every claim.",
    questions: {
      potential: {
        title: "Opportunity Potential",
        question: "Is the problem structurally attractive?",
      },
      evidence: {
        title: "Evidence Confidence",
        question: "Do we have credible evidence that the problem is real?",
      },
      value: {
        title: "Value Strength",
        question: "If we move the variable, how much value could be created?",
      },
      causal: {
        title: "Causal Confidence",
        question: "Do we know that the proposed mechanism can actually move it?",
      },
    },
    verdictNote: {
      lowEvidence: "High potential with low evidence yields",
      untestedMechanism:
        ", never BUILD. A strong problem whose mechanism has never been tested yields",
      experiment: "— an experiment on the first unproven causal link.",
    },
  },
  fit: {
    title: "Not all evidence proves the same thing",
    body: "Evidence isn't just a source. It has to fit the claim. Every piece of evidence is judged against the specific claim it is linked to — admissibility, directness, method, independence, scope, sample, recency — and a claim is only as established as its best-fitting evidence, within the scope where it was observed.",
    establishes: "establishes",
    cannot: "not {claim}",
    examples: {
      interview: {
        source: "Interview",
        proves: "that a pain exists and how it is described",
        cannot: "its magnitude, nor causality",
      },
      operationalData: {
        source: "Operational data",
        proves: "frequency and magnitude, as measured",
        cannot: "that a mechanism caused a change",
      },
      controlledTest: {
        source: "Controlled test",
        proves: "a causal effect within the tested scope",
        cannot: "the whole market",
      },
      purchase: {
        source: "Purchase",
        proves: "willingness to pay and actual purchase",
        cannot: "that the product created value",
      },
    },
    footnote:
      "Interviews cannot establish causality. Existing spend is not willingness to pay. A before/after change is consistent with an effect, not proof of one. Observed in five salons means observed in five salons.",
  },
  decision: {
    title: "From assumption to decision",
    body: "OpportunityOS doesn't stop at telling you what to test. It records what happened, updates the causal model, and shows exactly how your confidence changed — which claims moved, where the Proof Frontier now stands, and what the verdict became. No automatic certainty: a result supports, contradicts or stays inconclusive, and keeps its limitations.",
    loop: {
      assumption: "Assumption",
      experiment: "Experiment",
      result: "Result",
      evidence: "Evidence",
      proofFrontier: "Proof frontier",
      decision: "Decision",
    },
    discoveryLoopLabel: "Discovery loop",
    discoveryLoop:
      "Market → ICP → Valuable variable → Pain → Evidence → Opportunity → Mechanism → Value chain → Proof frontier",
    validationLoopLabel: "Validation loop",
    validationLoop:
      "Assumption → Experiment → Result → Evidence → Knowledge update → Proof frontier movement → Verdict → Next best action",
  },
  radar: {
    title: "Example Opportunity Radar",
    badge: "Example data — illustrative, not measured",
    columns: {
      opportunity: "Opportunity",
      potential: "Potential",
      evidence: "Evidence",
      value: "Value",
      causal: "Causal",
      proofFrontier: "Proof frontier",
      verdict: "Verdict",
    },
    incomplete: "INCOMPLETE",
    rows: {
      leakage: "Employee revenue leakage",
      noShow: "Salon no-show prevention",
      idleCapacity: "Idle capacity",
      shrinkage: "Inventory shrinkage",
      dynamicPricing: "Dynamic pricing",
    },
    note: "INCOMPLETE means an input is unknown, not zero. The frontier is where supported knowledge currently ends; everything beyond it is a product or causal hypothesis.",
  },
  how: {
    title: "How it works",
    steps: {
      talk: {
        title: "Talk",
        body: "Start from your context or decompose an existing idea. The analyst asks one focused question at a time.",
      },
      structure: {
        title: "Structure",
        body: "Every answer updates a structured model: ICPs, valuable variables, pains, mechanisms and the causal chain from mechanism to value.",
      },
      evidence: {
        title: "Evidence",
        body: "Capture quotes, URLs, interviews and notes, and say which claim each one supports or contradicts. Hypotheses and evidence never mix.",
      },
      decide: {
        title: "Decide",
        body: "Deterministic scores, a Proof Frontier and a verdict rule tell you what to ignore, kill, research, interview or test next.",
      },
    },
  },
  cta: {
    title: "Decide what is worth months of your life.",
    body: "Open the demo workspace, or start your own discovery. No credit card, no pitch deck, no logo generator.",
  },
} as const;
