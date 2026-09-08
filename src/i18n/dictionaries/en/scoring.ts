/**
 * English strings — section "scoring": sentences built by the deterministic
 * scoring engines (Value Strength, Causal Confidence, verdict and its
 * extension rules, kill criteria, discovery progress, variable semantics,
 * Evidence Confidence and Opportunity Potential). Keys are referenced as
 * "scoring.<key>" and rendered through `msg()` — the English text here is the
 * canonical wording the unit tests assert on.
 */
export const scoring = {
  /** Shared closing line of a score breakdown. */
  total: "Total: {score}/100",

  valueStrength: {
    incomplete:
      "Value Strength is INCOMPLETE · {known}/{total}: a required dimension is UNKNOWN and is never guessed (UNKNOWN ≠ 0).",
    missing:
      "Missing: {count, plural, =1 {{d1}} =2 {{d1}, {d2}} =3 {{d1}, {d2}, {d3}} =4 {{d1}, {d2}, {d3}, {d4}} other {{d1}, {d2}, {d3}, {d4}, {d5}}}.",
    dimensionLine: "{label}: {value}/10 ({provenance})",
    dimensionUnknown: "{label}: UNKNOWN ({provenance})",
    nextQuestion: "Next value question: {question}",
    geometricMean: "Geometric mean of normalized dimensions × 100 = {score}/100.",
    weakest: "Weakest dimension: {label}.",
    question: {
      population:
        "What share of {icp}'s operation (capacity, revenue or transactions) is actually affected by {variable}?",
      magnitude:
        "How much does {variable} move — or cost — per occurrence, in numbers (money, hours, capacity)?",
      frequency: "How often does {variable} actually occur for {icp} (per week or month)?",
      importance: "How much does {variable} matter to {icp} compared with their other problems?",
      attributability:
        "How directly could {mechanism} cause the change in {variable}, versus other factors?",
    },
    defaultVariable: "the variable",
    defaultIcp: "the customer",
    defaultMechanism: "the proposed mechanism",
  },

  causal: {
    linkLabel: "{from} → {to}",
    missing: {
      notStated: "{from} → {to}: causal link not stated",
      noEvidence: '{from} → {to}: no evidence on a critical link ("{statement}")',
      noAdmissibleEvidence:
        '{from} → {to}: no admissible evidence on a critical link ("{statement}")',
    },
    cappedBy: {
      contradicted: "contradicted",
      mixed: "mixed evidence",
      design: "{design} design (ceiling {ceiling})",
    },
    /** Lower-case design words used inside sentences. */
    designWord: {
      ANECDOTAL: "anecdotal",
      OBSERVATIONAL: "observational",
      BEFORE_AFTER: "before / after",
      MATCHED_COMPARISON: "matched comparison",
      CONTROLLED: "controlled",
      RANDOMIZED: "randomized",
    },
    /** Lower-case criticality words used inside sentences. */
    criticalityWord: {
      CRITICAL: "critical",
      IMPORTANT: "important",
      MINOR: "minor",
    },
    question: {
      missingLink: "What is the causal assumption that connects {from} to {to}?",
      verify: "Is it actually true that {statement}?",
    },
    incomplete:
      "Causal Confidence is INCOMPLETE · {validated}/{total} critical links validated. A link without evidence is UNKNOWN, not zero; a number is not fabricated.",
    coverageMissing:
      "{label}: UNKNOWN (not stated){informative, select, true { (informative, outside the score)} other {}}",
    coverageLine:
      "{label}: {status}{confidence, plural, =0 {} other { #}}{informative, select, true { (informative, outside the score)} other {}}",
    blockedBy: "Blocked by: {label}.",
    nextQuestion: "Next causal question: {question}",
    missingLine: "Missing: {reason}",
    validated: "{validated}/{total} chain links validated.",
    linkLine:
      "{label}: {status}, confidence {confidence}/100{capped, select, true { → {effective} capped by {cappedBy}} other {}} ({evidenceCount} admissible evidence, best fit {bestFit}{hasDesign, select, true {, {design}} other {}}{critical, select, true {} other {, {criticality}}}{informative, select, true {, informative} other {}})",
    score: "Score = weakest critical link ({label}) = {score}/100.",
    noLinks: "No links.",
  },

  verdict: {
    /** Upper-case verdict words as they appear inside rule sentences. */
    name: {
      IGNORE: "IGNORE",
      KILL: "KILL",
      RESEARCH: "RESEARCH",
      INVESTIGATE: "INVESTIGATE",
      INTERVIEW: "INTERVIEW",
      TEST: "TEST",
    },
    condition: {
      TEST: "Opportunity ≥ 75 and Evidence ≥ 75",
      INTERVIEW: "Opportunity ≥ 70 and Evidence ≥ 60",
      RESEARCH: "Opportunity ≥ 70 and Evidence < 50",
      INVESTIGATE: "Opportunity 60–79 and Evidence 40–69",
      KILL: "Opportunity < 50 and Evidence ≥ 60",
      IGNORE: "Opportunity < 40 and Evidence < 40",
      FALLBACK_RESEARCH_GAP: "Opportunity ≥ 70 and Evidence 50–59",
      FALLBACK_RESEARCH_MID: "Opportunity 50–69 and Evidence < 40",
      FALLBACK_INVESTIGATE_PROVEN: "Opportunity 60–69 and Evidence ≥ 70",
      FALLBACK_INVESTIGATE_MID: "Opportunity 50–59 and Evidence ≥ 40",
      FALLBACK_IGNORE_WEAK: "Opportunity < 50 and Evidence < 60",
      UNMATCHED: "No rule matched",
    },
    meaning: {
      TEST: "Strong structure and strong proof: run a lightweight market test before building.",
      INTERVIEW: "Strong enough to justify customer discovery interviews.",
      RESEARCH: "Promising hypothesis, insufficient proof. Research before anything else.",
      INVESTIGATE: "Moderate potential with partial evidence. Deepen the analysis.",
      KILL: "We have evidence that the opportunity is structurally weak.",
      IGNORE: "Weak and unproven. Not worth time.",
      FALLBACK_RESEARCH_GAP: "Attractive but proof is still thin. Close the evidence gap.",
      FALLBACK_RESEARCH_MID: "Moderate potential and almost no evidence. Cheap research first.",
      FALLBACK_INVESTIGATE_PROVEN:
        "Well evidenced but only moderately attractive. Look for a sharper ICP or variable.",
      FALLBACK_INVESTIGATE_MID:
        "Borderline structure with some evidence. Sharpen before investing more.",
      FALLBACK_IGNORE_WEAK: "Structurally weak with little proof either way. Park it.",
      UNMATCHED: "Defaulting to research.",
    },
    reason: {
      opportunity: "Opportunity Potential is {score}/100.",
      evidence: "Evidence Confidence is {score}/100.",
      ruleApplies: 'Rule "{condition}" applies → {verdict}.',
      neverBuild: "High potential with low evidence means RESEARCH, never BUILD.",
      unmatched: "Opportunity {opportunity}/100, Evidence {evidence}/100 matched no rule.",
    },
    extension: {
      rule: {
        LOW_VALUE_KILL:
          "Value Strength < 40 with Evidence ≥ 60 → KILL (the problem is real but moving the variable is not worth much).",
        CRITICAL_CONTRADICTION:
          "Critical contradiction with a TEST/INTERVIEW base verdict → INVESTIGATE.",
        TEST_MECHANISM:
          "Problem validated (Evidence ≥ 60) and Causal Confidence < 40 → TEST, focused on the mechanism.",
        CRITICAL_CUSTOMER_QUESTION:
          "INTERVIEW with an untested critical customer assumption → INTERVIEW, focused on that question.",
      },
      lowValueKill:
        "Value Strength is {valueStrength}/100 while Evidence Confidence is {evidenceScore}/100: evidence supports the problem, but even a successful movement of the variable creates little value. Deprioritize.",
      criticalContradiction:
        "A critical claim is contradicted by evidence. Resolve the contradiction before customer discovery or testing.",
      testMechanism:
        "The problem is validated (Evidence {evidenceScore}/100) but the mechanism is not (Causal Confidence {causalConfidence}/100). Test the mechanism, not the problem.",
      criticalCustomerQuestion:
        "A critical customer question (willingness to pay, access or value) remains untested: make it the centre of the interviews.",
      causalIncomplete:
        "Causal Confidence is INCOMPLETE: the mechanism → value chain has untested links. Verdict rules that depend on it did not fire.",
      valueIncomplete:
        "Value Strength is INCOMPLETE: some value dimensions are UNKNOWN. Verdict rules that depend on it did not fire.",
    },
  },

  kill: {
    LOW_PAIN: {
      message: "Pain intensity is {value}/10. Below 5 the problem is a nuisance, not a priority.",
      suggestion:
        "Find evidence that the gap actually hurts (lost money, time, customers) or move on.",
    },
    LOW_WTP: {
      message: "Willingness to pay is {value}/10. Nobody has shown they would spend money on this.",
      suggestion:
        "Look for existing spend: tools, staff, consultants or workarounds the ICP already pays for.",
    },
    NO_TRIGGER: {
      message: "No identifiable trigger. Without a trigger there is no urgency to act.",
      suggestion:
        "Ask: when does this problem become impossible to ignore? What event forces a decision?",
    },
    RARE: {
      message:
        "The problem occurs rarely (frequency {value}/10). Rare problems are hard to sell and easy to tolerate.",
      suggestion: "Confirm how often it happens per week or month with real customers.",
    },
    ALTERNATIVE_ADEQUATE: {
      message: "Current alternatives already solve the problem adequately (weakness {value}/10).",
      suggestion:
        "Identify a specific failure of the alternative that costs money, or pick a different variable.",
    },
    NOT_ECONOMIC: {
      message: "The variable is not economically meaningful to the ICP (importance {value}/10).",
      suggestion:
        "Trace the variable to revenue, cost, risk or capacity. If you cannot, choose another variable.",
    },
    NO_METRIC: {
      message: "No measurable outcome defined. Without a metric you cannot prove value.",
      suggestion: "Define the metric the product moves (e.g. no-show rate, minutes per ticket).",
    },
    ICP_UNREACHABLE: {
      message: 'Reaching the ICP looks difficult: "{reachability}".',
      messageUnknown: "It is unknown whether you can reach the ICP to interview or sell.",
      suggestion:
        "List 5 concrete people or channels through which you can reach the ICP this month.",
    },
    BUYER_UNKNOWN: {
      message:
        "The economic buyer is not identified. Users who feel the pain may not control the budget.",
      suggestion: "Validate whether the owner, a manager or someone else controls purchasing.",
    },
    PERSONAL_CURIOSITY: {
      message:
        "This looks like personal curiosity rather than a business pain someone pays to remove.",
      suggestion:
        "Name the ICP who loses money because of this problem. If nobody does, treat it as a hobby.",
    },
    SOLUTION_TOO_BIG: {
      message:
        "The solution dependency (complexity {complexity}/10) is much larger than the perceived value (importance {importance}/10).",
      suggestion:
        "Look for a smaller mechanism (service, script, spreadsheet) that moves the variable first.",
    },
    NO_ECONOMIC_EVIDENCE: {
      message: "Evidence exists but none of it quantifies economic impact.",
      suggestion: "Ask customers what the problem cost them the last time it happened.",
    },
  },

  progress: {
    step: {
      MARKET_SELECTION: "Market",
      ICP_DISCOVERY: "ICP",
      VARIABLE_DISCOVERY: "Variables",
      PAIN_DISCOVERY: "Pain",
      TRIGGER_DISCOVERY: "Trigger",
      ALTERNATIVE_DISCOVERY: "Alternative",
      EVIDENCE_DISCOVERY: "Evidence",
      MECHANISM_DISCOVERY: "Mechanisms",
      OPPORTUNITY_FORMATION: "Opportunity",
      VALUE_CAUSALITY: "Value chain",
      EXPERIMENT_DESIGN: "Experiment",
      RECOMMENDATION: "Decision",
    },
    detail: {
      markets: "{count, plural, one {# market} other {# markets}}",
      icps: "{count, plural, one {# ICP} other {# ICPs}}",
      variables: "{count, plural, one {# variable} other {# variables}}",
      pains: "{count, plural, one {# pain} other {# pains}}",
      triggers: "{count, plural, one {# trigger} other {# triggers}}",
      alternatives: "{count, plural, one {# alternative} other {# alternatives}}",
      evidence: "{count} of {target} target items",
      mechanisms: "{count} of {target} explored",
      opportunities: "{count} formed",
      valueChain: "{count} of {target} ladder levels",
      experiments: "{count} planned",
      verdictComputed: "Verdict computed",
      noVerdict: "No verdict yet",
    },
  },

  semantics: {
    unknownType:
      "Variable type is UNKNOWN, so the action verb cannot be checked. Choose a type (or set the polarity of a custom type).",
    decreasingPositive:
      '"{verb} × {type}" reads as making a desirable thing smaller. Did you mean {first}, {second}, {third}? You may keep it if it is intended.',
    increasingNegative:
      '"{verb} × {type}" reads as making an undesirable thing bigger. Did you mean {first}, {second}, {third}? You may keep it if it is intended.',
    /** Fallback for the type name when only a polarity is known. */
    polarityWord: {
      POSITIVE: "positive",
      NEGATIVE: "negative",
      NEUTRAL: "neutral",
    },
    verbSentence: "{verb} {name}",
  },

  evidence: {
    noEvidence: "No evidence captured. Everything about this opportunity is still a hypothesis.",
    noAdmissible: "No admissible evidence linked to this claim.",
    componentLine:
      "{label}: {fill}% of {weight} pts → {points} pts ({count, plural, one {# item} other {# items}})",
    contradiction:
      "Contradictory evidence: {count, plural, one {# item} other {# items}} → −{penalty} pts",
    gap: {
      noDirect: "No direct customer evidence (interview, quote or survey).",
      noPain: "No source states the pain explicitly.",
      noEconomic: "No evidence of economic impact (money, time or capacity lost).",
      noWorkaround: "No evidence of workaround behavior (people already trying to solve it).",
      noIntent: "No willingness-to-pay or purchase-intent evidence.",
      contradictionOutweighs: "Contradictory evidence outweighs supporting evidence.",
      noSupport: "No supporting evidence.",
      singleOrigin: "A single independent source: no corroboration yet.",
      noMeasurement: "Nothing measured or observed directly: the claim rests on reports.",
    },
  },

  opportunity: {
    componentLine: "{label}: {value}/10 × {weight}% → {points} pts",
  },
} as const;
