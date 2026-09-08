/** English strings — section "report". Keys are referenced as "report.<key>". */
export const report = {
  meta: {
    title: "Opportunity report",
  },
  /** Opportunity report page (src/app/app/w/[workspaceId]/opportunities/[opportunityId]/page.tsx). */
  page: {
    confidence: "{confidence} confidence",
    title: "Opportunity report",
    description:
      "The artifact of this discovery. Hypotheses stay labelled; UNKNOWN is an honest answer. Each field of the valuable variable carries its own status.",
    section: {
      icp: "A · ICP",
      variable: "B · Valuable variable",
      pain: "C · Pain / economic consequence",
      trigger: "D · Trigger",
      alternatives: "E · Current alternatives",
      mechanisms: "F · Mechanisms explored",
      productHypothesis: "G · Product hypothesis",
      valueProposition: "H · Value proposition",
      metric: "Metric that proves value",
      risks: "Risks",
      ladder: "I · Value causality ladder",
      frontier: "J · Proof frontier",
      riskiest: "L · Riskiest assumption",
      killCriteria: "N · Kill criteria",
    },
    variable: {
      actionType:
        "Action: {direction} · Type: {type}{hasPolarity, select, true { ({polarity})} other {}}",
      parentLabel: "Parent economic variable:",
      field: {
        type: "Type",
        target: "Target",
        scope: "Scope",
        currentState: "Current state",
        desiredState: "Desired state",
        unit: "Unit",
        importance: "Importance",
        parentVariable: "Parent economic variable",
        whoValuesIt: "Who values it",
        whyItMatters: "Why it matters",
      },
    },
    alternatives: {
      weakness: "weakness {weakness}/10",
    },
    mechanisms: {
      empty: "None explored yet. Problem ≠ product.",
    },
    risks: {
      empty: "None recorded.",
    },
    ladder: {
      description:
        "Mechanism → Capability → Transformation → Operational value → Economic value → Strategic outcome. Each level shows its epistemic status; each arrow is a testable causal assumption. Click to link evidence, add an assumption or plan an experiment.",
    },
    frontier: {
      scopeLabel: "Scope:",
      scopeLine: "{scope}{hasGeneralization, select, true { · {generalization}} other {}}",
      scopeHint: "— what was reached, and where it was observed.",
      whyStopsLabel: "Why the frontier stops here:",
    },
    riskiest: {
      description:
        "{count, plural, =0 {Link evidence to support or contradict each assumption.} one {# assumption remains untested. Causal and value assumptions rank first.} other {# assumptions remain untested. Causal and value assumptions rank first.}}",
      importance: "importance {importance}/10",
      collapse: "If this assumption is false, the opportunity collapses. It has not been tested.",
      empty:
        "No untested assumption recorded. Either everything is verified or nothing was written down.",
    },
    commercial: {
      title: "Commercial ladder",
      description:
        "Existing spend → purchase intent → stated willingness to pay → price acceptance → actual purchase. Each rung is its own claim with its own evidence; support for one rung never moves the rungs above it.",
      rung: "{status}{hasEvidence, select, true { · {count} admissible · fit {fit}} other {}}",
    },
    experiments: {
      title: "Experiments",
      description:
        "Assumption → experiment → result → evidence → knowledge update → frontier movement → verdict. Record a result and see exactly what it changed. Each result carries its design level, internal validity and a language-gated interpretation.",
    },
    learning: {
      title: "Learning history",
      description:
        "How we came to believe what we believe: every change of a claim, a score, the Proof Frontier or the verdict, with what caused it.",
    },
    interview: {
      title: "Interview guide",
      description:
        "Generated when an opportunity is worth customer discovery. Save what you hear as evidence.",
    },
    then: {
      title: "Then",
      description: "Lower-priority uncertainties, in order.",
      item: "{priority} · {score}",
    },
    verdict: {
      title: "Why this verdict",
      description:
        "Deterministic rules over the four scores and the frontier. The analyst never decides this.",
    },
    valueStrength: {
      title: "Why this Value Strength",
      description:
        "Geometric mean of importance, magnitude, frequency, population and attributability. A missing dimension makes the score INCOMPLETE, never zero.",
    },
    causal: {
      title: "Why this Causal Confidence",
      description:
        "The weakest critical causal link decides. A link with no evidence makes the score INCOMPLETE{hasCompleteness, select, true { · {completeness} chain links validated} other {}}{hasBlocking, select, true { · blocked by {blocking}} other {}}.",
      notComputed: "Not computed yet — state the value chain first.",
    },
    potential: {
      title: "Why this Opportunity Potential",
      description:
        "Importance 20% · Pain 20% · Frequency 15% · Gap 15% · Willingness to pay 20% · Alternative weakness 10%",
      inputs: "Inputs",
      editInputs: "Edit inputs",
      inputsOrigin:
        "Inputs were {origin, select, USER {set by you} other {proposed by the analyst (hypothesis)}}. Edit them to reflect what you actually know.",
    },
    evidenceConfidence: {
      title: "Why this Evidence Confidence",
      description:
        "Direct customer 25 · Explicit pain 20 · Economic impact 20 · Workaround 10 · Purchase intent 15 · Diversity 5 · Recency 5. Contradictions subtract.",
    },
    evidence: {
      title: "Evidence",
      description:
        "Items linked to this opportunity, its pain or one of its claims. Each item says which claims it supports or contradicts; the engine decides what that proves.",
    },
  },
  /** Report model fallbacks (src/services/report/opportunity-report.ts). */
  model: {
    detailsUnknown: "details UNKNOWN",
    triggerUnknown: "UNKNOWN — no trigger identified",
    failureUnknown: "Failure UNKNOWN",
    notFormed: "Not yet formed",
    metricUnknown: "UNKNOWN — no measurable outcome defined",
    frontierNotComputed: "Not computed yet.",
    scopeNotComputed: "not computed",
    validityNotAssessed: "not assessed",
    frontierNone:
      "Current Proof Frontier: nothing is supported yet. Every claim, including the problem itself, remains a hypothesis.",
    frontierAt:
      "Current Proof Frontier: {label}. Everything beyond this line remains a product or causal hypothesis.",
  },
  /** Markdown export (src/services/report/opportunity-report.ts). */
  md: {
    title: "Opportunity Report — {title}",
    generated:
      "Generated {date} by OpportunityOS. Hypotheses are labelled; nothing below is validated unless backed by evidence. Scores, statuses and the Proof Frontier are computed deterministically.",
    heading: {
      icp: "A. ICP",
      variable: "B. Valuable variable",
      pain: "C. Pain / economic consequence",
      trigger: "D. Trigger",
      alternatives: "E. Current alternatives",
      mechanisms: "F. Mechanisms explored",
      productHypothesis: "G. Product hypothesis",
      valueProposition: "H. Value proposition",
      ladder: "I. Value causality ladder",
      frontier: "J. Proof frontier",
      commercial: "Commercial ladder",
      experimentalValidity: "Experimental validity",
      scorecard: "K. Scorecard",
      riskiest: "L. Riskiest assumption",
      nextAction: "M. Next best action",
      killCriteria: "N. Kill criteria",
      assumptions: "Assumptions",
      evidence: "Evidence ({count})",
      risks: "Risks",
    },
    icp: "{name} — {description} _({provenance})_",
    variable: {
      name: "Variable: {name} _({provenance})_",
      direction: "Direction: {direction}",
      type: "Type (what is moved): {value} _({status})_",
      target: "Target: {value} _({status})_",
      scope: "Scope: {value} _({status})_",
      currentState: "Current state: {value} _({status})_",
      desiredState: "Desired state: {value} _({status})_",
      unit: "Unit: {value} _({status})_",
      importance: "Importance: {value} _({status})_",
      parentVariable: "Parent economic variable: {value} _({status})_",
    },
    alternative: "{name} (weakness {weakness}/10): {failure}",
    mechanismsEmpty: "None explored yet",
    metric: "Metric that proves value: {metric}",
    ladder: {
      empty: "No value chain stated yet.",
      node: "**{level}** [{status}{hasConfidence, select, true { {confidence}} other {}} · {distance}] — {statement}",
      nodeCounts:
        "_({evidence} evidence, {admissible} admissible{hasFit, select, true {, best fit {fit}} other {}}, {assumptions, plural, one {# assumption} other {# assumptions}})_",
      nodeScope: "Scope: {scope} · {generalization}",
      nodeInference: "Inference: {inference}",
      linksTitle: "Causal links (testable assumptions):",
      link: "{from} → {to} [{status}, {criticality}{hasFit, select, true {, best fit {fit}} other {}}{hasDesign, select, true {, {design} design} other {}}]: {statement}{hasInference, select, true { — {inference}} other {}}",
    },
    frontier: {
      scope:
        "Scope: {scope}{hasGeneralization, select, true { ({generalization})} other {}}. Observed in a sample does not mean proven for the market.",
      whyStops: "Why the frontier stops here: {whyStops}",
    },
    commercial: {
      rung: "{label}: {status}{hasEvidence, select, true { ({count} admissible, best fit {fit})} other {}}",
      note: "Each rung is its own claim: existing spend is not willingness to pay; stated willingness is not a purchase.",
    },
    experimentValidity: {
      line: "**{title}** — {outcome}; design {design}; internal validity {validity}; scope {scope}.",
      threats: "Threats: {threats}",
    },
    scorecard: {
      score: "{score}/100",
      incomplete: "INCOMPLETE",
      valueIncomplete:
        "INCOMPLETE · {completeness}{hasMissing, select, true { (missing: {missing})} other {}}",
      causalIncomplete:
        "INCOMPLETE · {completeness} links validated{hasBlocking, select, true { (blocked by {blocking})} other {}}",
      opportunityPotential:
        "Opportunity Potential: **{score}** — is the problem structurally attractive?",
      evidenceConfidence:
        "Evidence Confidence: **{score}** ({confidence} confidence) — is the problem real?",
      valueStrength: "Value Strength: **{score}** — if the variable moves, how much value?",
      causalConfidence: "Causal Confidence: **{score}** — can the mechanism move it?",
      verdict: "Verdict: **{verdict}**",
    },
    riskiest: {
      line: "[{kind}, importance {importance}/10] {statement}",
      collapse: "If this assumption is false, the opportunity collapses.",
      empty: "No untested assumption recorded.",
    },
    nextAction: {
      value:
        "**{what}**\n- Why: {why}\n- Affects: {affects}\n- If false: {ifFalse}\n- Evidence that would move the frontier: {evidence}{hasExperiment, select, true {\n- Experiment: {experiment}} other {}}",
      simple: "**{title}**\n{rationale}",
    },
    kill: {
      line: "[{severity}] {message}",
      empty: "No warnings triggered.",
    },
    assumptions: {
      line: "{index}. [{kind} · {status}] {statement} (importance {importance}/10)",
      empty: "No assumptions recorded.",
    },
    evidence: {
      line: "{title} — {type}, {sentiment}, strength {strength}, relevance {relevance}{isDemo, select, true { [DEMO DATA]} other {}}{isMocked, select, true { [MOCKED]} other {}}",
      empty: "No evidence captured. Everything above is a hypothesis.",
    },
    risksEmpty: "None recorded.",
    listSeparator: ", ",
  },
} as const;
