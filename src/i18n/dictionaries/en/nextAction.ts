/**
 * English strings — section "nextAction". Keys are referenced as "nextAction.<key>".
 *
 * Sentences built by the next-best-action engines (value-level and MVP-level),
 * the knowledge-change diff, the experiment outcome classifier and the
 * experiment prefill. Every template is the sentence the engine produced
 * before the bilingual pass — the unit tests assert on them.
 */
export const nextAction = {
  /** Pass-through wrapper for a sentence produced by another engine (or a legacy string). */
  verbatim: "{text}",
  /** Up to four items separated by commas. */
  list: "{count, plural, =1 {{a}} =2 {{a}, {b}} =3 {{a}, {b}, {c}} other {{a}, {b}, {c}, {d}}}",
  /** "From → To" label of a causal link. */
  link: "{from} → {to}",
  fallback: {
    icp: "target customers",
    variable: "the variable",
    problem: "this problem",
    problemOf: "the problem",
    intervention: "the intervention",
    proposedMechanism: "the proposed mechanism",
    wholeOpportunity: "The whole opportunity",
    observedScope: "the observed scope",
    admissibleSource: "a high-admissibility source for this claim",
    designNone: "none",
    generalizationNone: "—",
  },
  /** Lower-case forms of labels, for the middle of a sentence. */
  lower: {
    rung: {
      NONE: "nothing supported yet",
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
    generalization: {
      UNTESTED: "not observed",
      CASE_ONLY: "case only",
      SAMPLE_SUPPORTED: "sample-supported",
      SEGMENT_SUPPORTED: "segment-supported",
      BROADER_HYPOTHESIS: "broader claim is a hypothesis",
      CONTRADICTED_ACROSS_CONTEXTS: "contradicted across contexts",
    },
    dimension: {
      importance: "importance",
      magnitude: "magnitude",
      frequency: "frequency",
      population: "population affected",
      attributability: "attributability",
    },
    commercialRung: {
      EXISTING_SPEND: "existing spend",
      PURCHASE_INTENT: "purchase intent",
      WILLINGNESS_TO_PAY: "stated willingness to pay",
      PRICE_ACCEPTANCE: "price acceptance",
      ACTUAL_PURCHASE: "actual purchase",
    },
    status: {
      UNKNOWN: "unknown",
      HYPOTHESIS: "hypothesis",
      UNPROVEN: "unproven",
      SUPPORTED: "supported",
      STRONGLY_SUPPORTED: "strongly_supported",
      OBSERVED: "observed",
      MIXED: "mixed",
      CONTRADICTED: "contradicted",
    },
    design: {
      ANECDOTAL: "anecdotal",
      OBSERVATIONAL: "observational",
      BEFORE_AFTER: "before / after",
      MATCHED_COMPARISON: "matched comparison",
      CONTROLLED: "controlled",
      RANDOMIZED: "randomized",
    },
    sourceType: {
      INTERVIEW: "interview",
      SURVEY: "survey",
      CUSTOMER_QUOTE: "customer quote",
      FORUM_POST: "forum post",
      REDDIT_POST: "reddit post",
      SALES_CONVERSATION: "sales conversation",
      OBSERVED_WORKFLOW: "observed workflow",
      PRODUCT_USAGE: "product usage data",
      CLICKSTREAM: "clickstream",
      PURCHASE_BEHAVIOR: "purchase behaviour",
      CRM_DATA: "crm data",
      TRANSACTION_RECORDS: "transaction records",
      FINANCIAL_RECORDS: "financial records",
      SYSTEM_LOGS: "system logs",
      BOOKING_DATA: "booking data",
      POS_DATA: "pos data",
      ERP_DATA: "erp data",
      SUPPORT_TICKETS: "support tickets",
      TIME_TRACKING_DATA: "time-tracking data",
      COMPETITOR_REVIEW: "competitor review",
      PRICING_PAGE: "pricing page",
      JOB_POSTING: "job posting",
      PUBLIC_FINANCIALS: "public financials",
      INDUSTRY_REPORT: "industry report",
      GOVERNMENT_DATA: "government data",
      MARKET_DATASET: "market dataset",
      PROTOTYPE_TEST: "prototype test",
      CONCIERGE_TEST: "concierge test",
      BEFORE_AFTER_TEST: "before / after test",
      MATCHED_COMPARISON: "matched comparison",
      CONTROLLED_EXPERIMENT: "controlled experiment",
      AB_TEST: "a/b test",
      RANDOMIZED_EXPERIMENT: "randomized experiment",
      PRICING_EXPERIMENT: "pricing experiment",
      LANDING_PAGE_EXPERIMENT: "landing page experiment",
      TECHNICAL_SPIKE: "technical spike",
      BENCHMARK: "benchmark",
      DATA_FEASIBILITY_STUDY: "data feasibility study",
      INTEGRATION_TEST: "integration test",
      LOAD_TEST: "load test",
      SIGNED_LOI: "signed letter of intent",
      PAID_PILOT: "paid pilot",
      CONTRACT: "contract",
      INVOICE: "invoice",
      SUBSCRIPTION_PURCHASE: "subscription purchase",
      RENEWAL: "renewal",
      EXPANSION: "expansion",
      OTHER: "other / unknown provenance",
    },
  },
  /** Evidence that would move the frontier, by assumption kind. */
  evidence: {
    CAUSAL:
      "A controlled comparison (with vs without the intervention) on comparable cases, with the variable measured before and after.",
    VALUE:
      "Quantified before/after numbers from real operations: how much the variable moved and what that was worth.",
    FEASIBILITY:
      "A technical spike or data audit proving the required inputs exist and can be obtained.",
    WTP: "Observed purchase behaviour: paid pilots, deposits, signed letters of intent or existing spend on partial solutions.",
    ACCESS:
      "An outreach test: how many target buyers could actually be reached and would talk within two weeks.",
    GENERIC: "Direct customer evidence (interviews, quotes, surveys) that speaks to the statement.",
  },
  /** Recommended experiment, by assumption kind. */
  experiment: {
    CAUSAL:
      "Run a controlled pilot: apply the intervention to half of comparable cases and compare the variable across both groups.",
    VALUE:
      "Instrument five customers for one month; measure the variable and translate the movement into money or hours.",
    FEASIBILITY:
      "Build the thinnest possible prototype of the data path and check the inputs on real customer data.",
    WTP: "Offer a paid concierge version (or a deposit-backed waitlist) to ten target customers and count who pays.",
    ACCESS:
      "Contact twenty target buyers through the intended channel and measure reply and meeting rates.",
    GENERIC:
      "Interview five target customers about the last time this happened and capture their statements as evidence.",
  },
  /** What happens if a collapse-level assumption is false. */
  collapse: {
    ifFalse: {
      CAUSAL: "The product hypothesis collapses: the mechanism would not move the variable.",
      VALUE:
        "The opportunity collapses: moving the variable would not create enough value to justify a product.",
      FEASIBILITY: "The mechanism cannot be built as imagined; a different mechanism is needed.",
      WTP: "The problem may be real but nobody pays to remove it; the business case collapses.",
      ACCESS:
        "The buyers cannot be reached efficiently; go-to-market collapses even if the product works.",
      GENERIC: "A load-bearing belief is false and the opportunity must be re-examined.",
    },
    /** Same consequence, embedded after "if false:". */
    consequence: {
      CAUSAL: "the product hypothesis collapses: the mechanism would not move the variable.",
      VALUE:
        "the opportunity collapses: moving the variable would not create enough value to justify a product.",
      FEASIBILITY: "the mechanism cannot be built as imagined; a different mechanism is needed.",
      WTP: "the problem may be real but nobody pays to remove it; the business case collapses.",
      ACCESS:
        "the buyers cannot be reached efficiently; go-to-market collapses even if the product works.",
      GENERIC: "A load-bearing belief is false and the opportunity must be re-examined.",
    },
  },
  /** "Why this test now?" by action type. */
  whyNow: {
    collapse:
      "This is the {cheap, select, true {cheapest} other {most tractable}} test capable of resolving the highest-impact uncertainty: if this assumption is false the opportunity collapses, so nothing else is worth testing first.",
    causalLink:
      "This is the {cheap, select, true {cheapest} other {most tractable}} test that can move the Proof Frontier: it targets the first unproven critical link, and everything downstream depends on it.",
    wtp: "Willingness to pay stays an independent assumption until tested; a strong problem and a working mechanism do not prove anyone pays.",
    economicMagnitude:
      "Without the economic magnitude, Value Strength stays INCOMPLETE and the business case cannot be sized.",
    mechanismFeasibility:
      "If the mechanism cannot be built, every downstream claim is moot; this is the cheapest way to find out.",
    other:
      "Resolves the highest-impact uncertainty currently reachable at {cheap, select, true {low} other {moderate}} cost.",
  },
  /** "What this could change" defaults by action type. */
  change: {
    CAUSAL_LINK:
      "If supported, the Proof Frontier moves one level and Causal Confidence gains a validated link; if contradicted, the value argument breaks here and everything downstream stays a hypothesis.",
    WTP_EVIDENCE:
      "If supported, the commercial ladder moves one rung and the business case gains an evidence-backed price signal; if contradicted, the problem may be real but not worth money to the buyer.",
    ECONOMIC_MAGNITUDE:
      "If measured, Value Strength stops being INCOMPLETE and the verdict can size the business case; if small, the opportunity may not justify a product.",
    MECHANISM_FEASIBILITY:
      "If feasible, the mechanism becomes OBSERVED within the tested scope; if not, the mechanism must change before anything else is tested.",
    EVIDENCE_GAP:
      "Closing the gap raises Evidence Confidence; failing to close it means the problem is weaker than believed.",
    other:
      "Resolves one open dimension of the value argument without moving the Proof Frontier by itself.",
  },
  /** Value-level action drafts, by action type. */
  draft: {
    COLLAPSE_ASSUMPTION: {
      change:
        "If supported, the highest-importance untested belief becomes evidence-backed; if false: {consequence}",
      what: '{kind, select, CAUSAL {Validate the causal assumption} VALUE {Validate the value assumption} FEASIBILITY {Validate the feasibility assumption} WTP {Validate the wtp assumption} ACCESS {Validate the access assumption} other {Validate the assumption}}: "{statement}"',
      why: "Importance {importance}/10 with {count, plural, one {# linked evidence item} other {# linked evidence items}}. It is the highest-importance untested belief. Current Proof Frontier: {frontier}.",
    },
    CAUSAL_LINK: {
      change:
        "If supported, the Proof Frontier moves from {frontier} to {target}; if contradicted, the value argument breaks at {from} → {to} and the verdict is re-examined.",
      what: 'Test the causal link: "{statement}"',
      why: "{target} is the first level beyond the Proof Frontier ({frontier}); this link into it is {status} with {count, plural, one {# evidence item} other {# evidence items}}.",
      ifFalse:
        "The value argument breaks at this link: everything downstream, including the economic value, stays a hypothesis.",
      evidenceToMove:
        "Evidence that {statement} in real conditions, ideally a before/after or with/without comparison; enough to reach the supported threshold (40/100) with no unresolved contradiction.",
      experiment:
        "Run a controlled pilot with {icp}: compare comparable cases with and without {mechanism} and measure {variable}.",
    },
    EVIDENCE_FITNESS: {
      change:
        "If fitting evidence supports it, {level} becomes evidence-backed and the Proof Frontier can move; the existing evidence stays as context, it never becomes proof by accumulation.",
      whatWeakDesign:
        "Get evidence of a stronger design for {level}: strongest design is {design}; attributing {levelLower} requires at least a {required} design.",
      whatWeakDesignDetail: "Get evidence of a stronger design for {level}: {detail}",
      whatSources: "Get evidence that fits {level}: {sources}",
      whyNotAdmissible:
        "The evidence linked to {level} is not admissible for this claim: it exists, but it cannot establish it.",
      whyWeakDesign:
        "The linked evidence is admissible but its design is too weak to attribute {levelLower}.",
      whyLowFit:
        "The best evidence fit for {level} is {fit}/100; the frontier requires {required}. More of the same evidence will not help.",
      ifFalse:
        "The claim stays unproven whatever the volume of low-fit evidence; the frontier does not move.",
      evidenceToMoveSources: "High-admissibility evidence for this claim: {sources}.",
      evidenceToMoveGeneric: "Evidence whose source type is admissible for this claim.",
      experiment:
        'Design a test whose result is admissible for "{statement}" at the required design level.',
    },
    GENERALIZATION: {
      change:
        "If it holds in other contexts, {level} moves from {generalization} towards segment support and the verdict can rely on it for {icp}; if it does not, the observation stays a case and the target scope narrows.",
      what: "Test whether {levelLower} holds beyond {scope}",
      why: "{level} is {generalization} ({count, plural, one {# independent origin} other {# independent origins}}, scope: {scope}). Observed in a sample does not mean proven for the market.",
      affects: "{level} — scope of generalization",
      ifFalse:
        "The claim holds only in the observed context; the target scope must narrow or the mechanism must adapt.",
      evidenceToMove:
        "The same observation repeated in other organizations and configurations (different systems, sizes or conditions) with the scope recorded.",
      experiment:
        "Repeat the observation in {generalization, select, CASE_ONLY {two more} other {five}} organizations with different configurations and record the scope of each run.",
    },
    WTP_EVIDENCE: {
      whatNext: "{question} — establish {rung} with {icp}",
      what: "Find willingness-to-pay evidence from {icp}",
      ladder:
        "{EXISTING_SPEND} · {PURCHASE_INTENT} · {WILLINGNESS_TO_PAY} · {PRICE_ACCEPTANCE} · {ACTUAL_PURCHASE}",
      rung: "{label} {state}",
      whyLadder: "Commercial ladder: {ladder}. {note}",
      note: {
        EXISTING_SPEND: "Existing spend on an alternative is not willingness to pay for this.",
        PURCHASE_INTENT: "Stated intent is not a stated price, and neither is a purchase.",
        other: "No rung of the commercial ladder is evidence-backed yet.",
      },
      why: "No evidence shows anyone paying, or intending to pay, to move this variable.",
      affects: "Commercial ladder → business case",
      ifFalse: "The problem may be real but not worth money to the buyer.",
    },
    ECONOMIC_MAGNITUDE: {
      what: "Quantify the economic magnitude of {pain}",
      whyMissing:
        "The Magnitude dimension of Value Strength is UNKNOWN, so Value Strength is INCOMPLETE.",
      why: "No evidence quantifies what the problem costs.",
      affects: "Economic pain and Value Strength (magnitude)",
      ifFalse: "The value may be too small to matter even if the mechanism works.",
      evidenceToMove:
        "Customer statements or records with numbers: money, hours or capacity lost per week or month.",
      experiment:
        "Ask five customers what the last occurrence cost them and collect one month of their own records.",
    },
    MECHANISM_FEASIBILITY: {
      what: "Establish whether the mechanism is feasible: {mechanism}",
      why: "Nothing shows the required data, integrations or behaviours exist.",
      affects: "Mechanism → Capability",
      ifFalse: "The mechanism must change before anything else is worth testing.",
    },
    EVIDENCE_GAP: {
      why: "This gap keeps Evidence Confidence low.",
      affects: "Problem evidence",
      ifFalse: "The problem itself may be weaker than believed.",
      evidenceToMove: "Direct customer evidence that closes the gap.",
    },
    SECONDARY: {
      what: "Validate the {dimension} dimension of Value Strength",
      why: "{dimension} is UNKNOWN; Value Strength stays INCOMPLETE until it is validated, never estimated silently.",
      affects: "Value Strength",
      ifFalse: "Value Strength may be lower than hoped.",
      evidenceToMove: "Customer or operational data that establishes this dimension.",
    },
    WEAKEST_LINK: {
      what: 'Strengthen the weakest causal link: "{statement}"',
      why: "Causal Confidence equals its weakest critical link ({score}/100).",
      ifFalse: "Causal Confidence stays capped by this link.",
      evidenceToMove: "Additional controlled evidence on this link.",
    },
  },
  /** MVP-level next actions (verdict, evidence gaps, riskiest assumption). */
  mvp: {
    KILL: {
      title: "Write down why this opportunity is dead and archive it",
      rationale:
        "Evidence Confidence is {evidenceScore}/100 while Opportunity Potential is only {opportunityScore}/100: the evidence says the structure is weak.",
    },
    IGNORE: {
      title: "Park this opportunity; revisit only if new evidence appears",
      rationale:
        "Both potential and evidence are low. Spending research time here has poor expected value.",
    },
    RESOLVE_WARNING: {
      title: "{suggestion}",
      rationale: "{message}",
    },
    VALIDATE_ASSUMPTION: {
      title: 'Validate the riskiest assumption: "{statement}"',
      rationale:
        "Importance {importance}/10 with {count, plural, one {# linked evidence item} other {# linked evidence items}}. If this is false the opportunity collapses.",
    },
    ECONOMIC_IMPACT: {
      title: "Determine the economic impact of {pain}",
      rationale:
        "No evidence quantifies what the problem costs. Scores stay hypothetical until it does.",
    },
    DIRECT_CUSTOMER: {
      title: "Talk to 3 {icp} and capture what they say as evidence",
      rationale: "There is no direct customer evidence yet. Everything rests on reasoning.",
    },
    EXPLICIT_PAIN: {
      title: "Find evidence that this pain occurs at least weekly",
      rationale: "Frequency is assumed high but no source states the pain explicitly.",
    },
    ALTERNATIVES: {
      title: "Map what {icp} do today and where it fails",
      rationale: "No current alternative is documented. Alternative weakness cannot be trusted.",
    },
    TRIGGER: {
      title: "Identify the trigger that makes the problem urgent",
      rationale: "Without a trigger there is no buying moment.",
    },
    RESEARCH: {
      title: "Capture at least 5 external evidence items before thinking about solutions",
      rationale:
        "Opportunity Potential {opportunityScore}/100 with Evidence Confidence {evidenceScore}/100: promising but unproven.",
    },
    INVESTIGATE: {
      title: "Sharpen the ICP and variable, then add direct evidence",
      rationale:
        "Moderate potential with partial evidence. A narrower ICP often raises both scores.",
    },
    EXPLORE_MECHANISMS: {
      title: "Explore at least 3 mechanisms before selecting a product hypothesis",
      rationale:
        "{count, plural, one {# mechanism} other {# mechanisms}} documented. Problem ≠ product.",
    },
    INTERVIEW: {
      title: "Interview 5 {icp} about the last time {pain} happened",
      rationale:
        "Scores justify customer discovery. Use the generated interview guide and save notes as evidence.",
    },
    TEST: {
      title: "Run a concierge test or landing page before writing software",
      rationale: "Both scores are strong. A lightweight test validates demand cheaper than code.",
    },
    DEFINE: {
      title: "Define the ICP, variable and pain before anything else",
      rationale: "The opportunity is not yet structured enough to recommend an action.",
    },
  },
  /** Knowledge change (what a recompute changed). */
  knowledge: {
    state: {
      withConfidence: "{status} {confidence}",
      statusOnly: "{status}",
    },
    score: {
      incomplete: "INCOMPLETE · {completeness}",
      incompleteBare: "INCOMPLETE",
    },
    delta: {
      plain: "{label}: {before} → {after}",
      scoped: "{label}: {before} → {after} (in tested scope: {scope})",
      generalized: "{label}: {before} → {after} · generalization {genBefore} → {genAfter}",
      scopedGeneralized:
        "{label}: {before} → {after} (in tested scope: {scope}) · generalization {genBefore} → {genAfter}",
    },
    frontier: {
      forward: "Proof Frontier moved forward: {before} → {after}",
      backward: "Proof Frontier moved back: {before} → {after}",
    },
    line: {
      evidenceConfidence: "Evidence Confidence {before} → {after}",
      valueStrength: "Value Strength {before} → {after}",
      causalConfidence: "Causal Confidence {before} → {after}",
      verdict: "Verdict {before} → {after}",
    },
    summary: {
      nothing: "Nothing changed.",
      contradicted:
        "{count, plural, one {# claim contradicted} other {# claims contradicted}}: {label}",
    },
  },
  /** Experiment outcome decided by the thresholds, and planning warnings. */
  outcome: {
    supported:
      "Observed {observed} {higherIsBetter, select, true {≥} other {≤}} success threshold {threshold}.",
    contradicted:
      "Observed {observed} {higherIsBetter, select, true {≤} other {≥}} failure threshold {threshold}.",
    inconclusive:
      "Observed {observed} lies between the failure threshold {failure} and the success threshold {success}.",
    warning: {
      noDecisionQuestion:
        "No decision question. Every experiment must say what decision becomes easier after it runs.",
      noTarget:
        "The experiment targets nothing: attach it to an assumption, a causal link or a value chain level so its result can move a claim.",
      singleThreshold:
        "Only one threshold is set. Both a success and a failure threshold are needed for the outcome to be decided deterministically; otherwise you will classify it yourself.",
      noThresholds:
        "No thresholds: the outcome will have to be classified explicitly, or it stays INCONCLUSIVE.",
      noUnit: "Thresholds without a unit are hard to interpret later.",
    },
  },
  /** Experiment plan prefilled from a value action. */
  prefill: {
    decisionQuestion: 'Should we keep investing in "{title}" given {affects}? If false: {ifFalse}',
  },
} as const;
