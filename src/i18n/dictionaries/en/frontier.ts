/**
 * English strings — section "frontier". Keys are referenced as "frontier.<key>".
 *
 * Sentences built by the Proof Frontier, the commercial ladder, the scope of
 * generalization, scope comparison and the epistemic assessment
 * (src/services/value/{proof-frontier,commercial-ladder,generalization,scope,
 * epistemic}.ts). Every template reproduces the sentence the engine produced
 * before the bilingual pass: the unit tests assert on these renderings.
 *
 * Parameters named `label`, `level`, `from`, `to`, `rung`, `design`,
 * `generalization`, `claim`, `scope`, `reason`, `head`, `tail` and
 * `dimensions` are nested messages; `statement` and `assumption` are user
 * content; the rest are numbers, enum values or booleans used by `select`.
 */
export const frontier = {
  /** Identity template: carries a plain string as a message parameter. */
  plain: "{text}",
  /** Pairwise joiners for lists of translated items (nested head/tail). */
  list: {
    comma: "{head}, {tail}",
    and: "{head} and {tail}",
  },
  /** Compact description of a scope: "5 organizations · salons · 3 configurations (…)". */
  scope: {
    notRecorded: "scope not recorded",
    join: "{head} · {tail}",
    organizations: "{count, plural, one {# organization} other {# organizations}}",
    sampleSize: "n = {count}",
    configurations: "{count, plural, one {# configuration} other {# configurations}} ({systems})",
    /** Dimension names as they read inside a sentence (lowercase). */
    dimension: {
      population: "population",
      icp: "icp",
      geography: "geography",
      industry: "industry",
      companySize: "company size",
      systems: "systems / tools",
      workflow: "workflow",
      environment: "environment",
      timePeriod: "time period",
      sampleSize: "sample size",
      organizationCount: "organizations",
      userCount: "users",
      sourceDiversity: "independent sources",
      conditions: "conditions",
      exclusions: "exclusions",
    },
  },
  /** Explanation of a scope comparison (scopeMatch). */
  scopeMatch: {
    claimUndeclared:
      "The claim declares no scope; the evidence cannot mismatch it, but nothing confirms it applies.",
    evidenceUnknown:
      "The evidence records no scope: where and under which conditions it was observed is unknown.",
    match: "Scope matches on {matched}.",
    /** shape: M = matched, D = differs (mismatched), U = unknown — which lists are non-empty. */
    partial:
      "{shape, select, MD {Matches {matched}; differs on {mismatched}.} MU {Matches {matched}; unknown for {unknown}.} MDU {Matches {matched}; differs on {mismatched}; unknown for {unknown}.} D {Differs on {mismatched}.} U {Unknown for {unknown}.} other {Differs on {mismatched}; unknown for {unknown}.}}",
  },
  /** Rung names as they read inside a sentence ("attributing operational value"). */
  rung: {
    inSentence: {
      VARIABLE_IMPORTANCE: "variable importance",
      PAIN: "pain",
      ECONOMIC_PAIN: "economic pain",
      MECHANISM: "mechanism",
      CAPABILITY: "capability",
      TRANSFORMATION: "transformation",
      OPERATIONAL_VALUE: "operational value",
      ECONOMIC_VALUE: "economic value",
      STRATEGIC_OUTCOME: "strategic outcome",
      BUSINESS_OUTCOME: "business outcome",
    },
  },
  /** Design levels as they read inside a sentence ("a before / after design"). */
  design: {
    none: "none",
    ANECDOTAL: "anecdotal",
    OBSERVATIONAL: "observational",
    BEFORE_AFTER: "before / after",
    MATCHED_COMPARISON: "matched comparison",
    CONTROLLED: "controlled",
    RANDOMIZED: "randomized",
  },
  /** "Mechanism → Capability". */
  linkLabel: "{from} → {to}",
  blocker: {
    noEvidence: {
      rung: "{label} has no linked evidence ({status}).",
      link: '{label}: causal link "{statement}" has no linked evidence ({status}).',
    },
    notAdmissible: {
      rung: "{label}: {count, plural, one {# linked item is} other {# linked items are}} not admissible evidence for this claim.",
      link: '{label}: {count, plural, one {# linked item is} other {# linked items are}} not admissible evidence for this claim ("{statement}").',
    },
    contradicted: "{label}: contradictory evidence outweighs support; it blocks advancement.",
    mixed:
      "{label}: mixed evidence — high-fit evidence both supports and contradicts it; contradictory evidence blocks advancement until it is resolved, never averaged away.",
    lowFitOnly: {
      rung: "{label}: only low-fit evidence is linked (best fit {fit}/100, required {requiredFit}) — the sources are low-admissibility for this claim; they inform it but cannot establish it.",
      link: '{label}: only low-fit evidence is linked (best fit {fit}/100, required {requiredFit}) — the sources are low-admissibility for this claim ("{statement}"); they inform it but cannot establish it.',
    },
    lowFit: {
      rung: "{label}: best evidence fit {fit}/100, required {requiredFit} — the evidence exists but does not fit this claim.",
      link: '{label}: best evidence fit {fit}/100, required {requiredFit} — the evidence exists but does not fit this claim ("{statement}").',
    },
    belowThreshold: "{label}: confidence {confidence}, required threshold {required} ({status}).",
    contradictedAcrossContexts:
      "{label}: supported in one context and contradicted in another; the frontier cannot rest on it.",
    broaderHypothesis:
      "{label}: observed in {scope}, but the claim is made for a broader scope; the broader claim is a hypothesis.",
    differentScope: "a different scope",
    untestedAssumption: {
      rung: '{label}: critical assumption is completely untested: "{assumption}".',
      link: '{label}: critical causal assumption remains untested: "{assumption}".',
    },
    /** hasDesign tells whether {design} is a real level or "none". */
    weakDesign:
      "{label}: strongest design is {design}; attributing {rung} requires at least a {requiredDesign} design.",
    nonCritical: "{reason} (non-critical link, does not gate the frontier)",
    notStated: "{label}: this level of the value argument has not been stated.",
    optionalNotStated: "Optional level, not stated.",
    missingLink: "No causal link stated from {from} to {to}.",
    reachableLater: "Reachable only once the earlier gap is closed.",
    unknown: "Unknown blocker.",
  },
  whyStops: {
    none: "No claim is supported by evidence yet.",
    complete: "Every stated level is supported; state the next level to go further.",
  },
  frontierScope: {
    none: "no scope: nothing is supported",
    reported: "not observed directly; supported by reported evidence",
  },
  explanation: {
    none: "No claim is supported by evidence yet. Everything is a hypothesis.",
    current:
      "Current Proof Frontier: {level} · scope: {scope}{hasGeneralization, select, true { ({generalization})} other {}}. Everything beyond this point remains a product or causal hypothesis.",
    whyStops: "Why the frontier stops here: {reason}",
    also: "Also: {reason}",
  },
  commercial: {
    question: {
      EXISTING_SPEND:
        "What do target buyers already spend to deal with this (accountants, tools, staff time)?",
      PURCHASE_INTENT: "Do target buyers say they would buy something that removes this?",
      WILLINGNESS_TO_PAY: "How much do target buyers say they would pay, and for what?",
      PRICE_ACCEPTANCE:
        "Do target buyers accept a stated price when it is actually put in front of them?",
      ACTUAL_PURCHASE:
        "Has anyone paid real money — a paid pilot, a subscription, a signed contract?",
    },
    evidence: {
      EXISTING_SPEND:
        "Invoices, financial records or statements of what is paid today for partial solutions.",
      PURCHASE_INTENT: "Interviews, sales conversations, waitlist sign-ups or letters of intent.",
      WILLINGNESS_TO_PAY:
        "Pricing experiments or paid pilots; stated amounts from interviews count as medium evidence.",
      PRICE_ACCEPTANCE: "A pricing test or paid pilot at the intended price.",
      ACTUAL_PURCHASE:
        "Transactions, contracts, invoices or subscription purchases — never statements.",
    },
    rungLine:
      "{label}: {status}{count, plural, =0 {} one { (# admissible item, best fit {fit})} other { (# admissible items, best fit {fit})}}",
    principle:
      "Each rung is its own claim: existing spend is not willingness to pay; stated willingness is not a purchase.",
  },
  generalization: {
    gap: {
      untested: "Nothing with medium or high fit supports that {claim}.",
      caseOnly:
        "Observed in one independent case ({scope}); {missing, plural, one {# more independent case} other {# more independent cases}} would make it sample-supported.",
      sampleSupported:
        "Observed across {origins} independent cases and {configurations, plural, one {# configuration} other {# configurations}} ({scope}); segment support needs ≥ {minOrigins} cases across ≥ {minConfigurations} configurations{hasUncovered, select, true { and coverage of {dimensions}} other {}}.",
      segmentSupported:
        "Observed across {origins} independent cases and {configurations} configurations within the claim's scope. Still not the whole market.",
      broaderHypothesis:
        "Observed in {scope}, but the claim is made for a broader scope (match {match}%): the broader claim is a hypothesis.",
      contradictedAcrossContexts: "Supported in {scope} and contradicted in another context.",
    },
    nextQuestion: {
      contradicted:
        "What differs between the contexts where {claim} and the context where it does not?",
      uncovered:
        "Does it still hold that {claim} for {dimensions}{targetScope, select, true { within the target scope} other {}}?",
      elsewhere:
        "Does it still hold that {claim} in {status, select, CASE_ONLY {other organizations} other {other configurations}} ({scope} so far)?",
    },
    /** Up to two uncovered dimensions: "other population and other geography". */
    otherDimensions:
      "{count, plural, one {other {first}} other {other {first} and other {second}}}",
    summary:
      "Generalization: {status} — {origins, plural, one {# independent origin} other {# independent origins}}, {configurations, plural, one {# configuration} other {# configurations}}{hasMatch, select, true {, scope match {match}%} other {, claim scope undeclared}}.",
  },
  inference: {
    /** A claim without a claim type has no inference sentence. */
    none: "",
  },
  epistemic: {
    lowFitCapped:
      "Low-fit evidence capped: {before} → {after} (evidence with low fit for this claim informs but cannot establish it).",
  },
} as const;
