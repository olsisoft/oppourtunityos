/**
 * English strings — section "mock". Keys are referenced as "mock.<key>".
 *
 * Everything the templated (mock) AI provider, the template interview guide
 * and the mock research provider say to the user. The English templates are
 * the exact sentences the mock produced before the product became bilingual:
 * the unit and e2e tests assert on them, so they never change.
 *
 * Parameters: {icp} is the ICP name as stored, {icpLower} its lower-case
 * form, {icpPlural} a locale-aware plural (French templates rely on it; the
 * English ones add an "s" themselves, as they always did); {variable} is the
 * capitalised variable name and {variableLower} the lower-case one.
 */
export const mock = {
  label: "[MOCK PROVIDER — templated response, not analysis]",
  fallback: {
    icp: "the ICP",
    variable: "the variable",
    intervention: "the intervention",
    opportunity: "the opportunity",
    automation: "Automation",
    problem: "the problem",
  },
  /** Variable library: name, what is directly moved (type), target, unit and parent variable. */
  variables: {
    missedCalls: {
      name: "Missed calls",
      type: "Loss",
      target: "Inbound calls that go unanswered",
      unit: "calls per day",
      parent: "New-patient revenue",
    },
    bookingConversion: {
      name: "Booking conversion",
      type: "Conversion",
      target: "Inquiries that become booked appointments",
      unit: "% of inquiries",
      parent: "New-patient revenue",
    },
    frontDeskLaborCost: {
      name: "Front desk labor cost",
      type: "Cost",
      target: "Staff hours spent on phone handling",
      unit: "hours per week",
      parent: "Operating cost",
    },
    responseTime: {
      name: "Response time",
      type: "Processing time",
      target: "Time between inquiry and answer",
      unit: "minutes",
      parent: "Booking conversion",
    },
    noShowRate: {
      name: "No-show rate",
      type: "No-show rate",
      target: "Booked appointments that become unused capacity",
      unit: "% of appointments",
      parent: "Revenue per available chair-hour",
    },
    idleChairCapacity: {
      name: "Idle chair capacity",
      type: "Idle capacity",
      target: "Chair-hours paid for but not sold",
      unit: "chair-hours per week",
      parent: "Revenue per available chair-hour",
    },
    employeeRevenueLeakage: {
      name: "Employee revenue leakage",
      type: "Leakage",
      target: "Services performed but not recorded or paid",
      unit: "% of revenue",
      parent: "Net revenue",
    },
    clientRetention: {
      name: "Customer retention",
      type: "Retention",
      target: "Clients returning within 90 days",
      unit: "% of clients",
      parent: "Lifetime value",
    },
    inventoryShrinkage: {
      name: "Inventory shrinkage",
      type: "Shrinkage",
      target: "Product that disappears without a sale",
      unit: "€ per month",
      parent: "Gross margin",
    },
    kitchenLaborCost: {
      name: "Labor cost",
      type: "Cost",
      target: "Staff hours per cover",
      unit: "% of revenue",
      parent: "Operating margin",
    },
    foodWaste: {
      name: "Food waste",
      type: "Waste",
      target: "Ingredients bought but not sold",
      unit: "% of purchases",
      parent: "Gross margin",
    },
    tableUtilization: {
      name: "Table utilization",
      type: "Utilization",
      target: "Seat-hours sold",
      unit: "% of seat-hours",
      parent: "Revenue per seat-hour",
    },
    noShows: {
      name: "No-shows",
      type: "No-show rate",
      target: "Reservations that do not arrive",
      unit: "% of reservations",
      parent: "Revenue per seat-hour",
    },
    repeatVisits: {
      name: "Repeat visits",
      type: "Retention",
      target: "Guests returning within 60 days",
      unit: "% of guests",
      parent: "Lifetime value",
    },
    fuelCostPerDelivery: {
      name: "Fuel cost per delivery",
      type: "Cost",
      target: "Fuel spent per completed delivery",
      unit: "€ per delivery",
      parent: "Cost per delivery",
    },
    idleVehicleTime: {
      name: "Idle vehicle time",
      type: "Idle capacity",
      target: "Vehicle-hours not moving freight",
      unit: "hours per vehicle per week",
      parent: "Asset utilization",
    },
    lateDeliveries: {
      name: "Late deliveries",
      type: "Delay",
      target: "Deliveries outside the promised window",
      unit: "% of deliveries",
      parent: "Customer retention",
    },
    driverChurn: {
      name: "Driver churn",
      type: "Churn",
      target: "Drivers leaving per year",
      unit: "% per year",
      parent: "Operating cost",
    },
    damageClaims: {
      name: "Damage claims",
      type: "Loss",
      target: "Shipments damaged in transit",
      unit: "claims per 1,000 shipments",
      parent: "Cost per delivery",
    },
    incidentResolutionTime: {
      name: "Incident resolution time",
      type: "Processing time",
      target: "Time from alert to closed incident",
      unit: "hours",
      parent: "Breach risk exposure",
    },
    alertFatigue: {
      name: "Alert fatigue",
      type: "Volume",
      target: "Alerts triaged per analyst per day",
      unit: "alerts per analyst",
      parent: "Analyst productivity",
    },
    auditPreparationTime: {
      name: "Audit preparation time",
      type: "Manual effort",
      target: "Hours spent preparing audit evidence",
      unit: "hours per audit",
      parent: "Compliance cost",
    },
    breachRiskExposure: {
      name: "Breach risk exposure",
      type: "Exposure",
      target: "Unpatched critical exposures",
      unit: "open critical findings",
      parent: "Expected loss",
    },
    analystTurnover: {
      name: "Analyst turnover",
      type: "Churn",
      target: "Analysts leaving per year",
      unit: "% per year",
      parent: "Operating cost",
    },
    revenueLeakage: {
      name: "Revenue leakage",
      type: "Leakage",
      target: "Revenue earned but not captured",
      unit: "% of revenue",
      parent: "Net revenue",
    },
    manualLaborCost: {
      name: "Labor cost",
      type: "Cost",
      target: "Staff hours on manual work",
      unit: "hours per week",
      parent: "Operating margin",
    },
    customerRetention: {
      name: "Customer retention",
      type: "Retention",
      target: "Customers renewing or returning",
      unit: "% of customers",
      parent: "Lifetime value",
    },
    timeToResolution: {
      name: "Time to resolution",
      type: "Cycle time",
      target: "Time from request to resolution",
      unit: "hours",
      parent: "Customer retention",
    },
    errorRate: {
      name: "Error rate",
      type: "Error",
      target: "Outputs that need rework",
      unit: "% of outputs",
      parent: "Operating cost",
    },
  },
  /** The context interview (NO_IDEA entry mode). */
  context: {
    industries: {
      question: "What industries do you understand or have access to?",
      options: {
        localServices: "Local services (salons, clinics, restaurants)",
        b2bSoftware: "B2B software teams",
        logistics: "Logistics",
        healthcare: "Healthcare",
      },
    },
    audiences: {
      question: "What kind of people can you realistically talk to in the next two weeks?",
      options: {
        smallBusinessOwners: "Small business owners",
        engineeringManagers: "Engineering managers",
        operationsStaff: "Operations staff",
        nobody: "Nobody yet",
      },
    },
    businessModel: {
      question: "Are you looking for B2B, B2C, or either?",
      options: { b2b: "B2B", b2c: "B2C", either: "Either" },
    },
    productPreferences: {
      question: "Do you prefer software, AI, hardware, marketplace, or are you open?",
      options: { software: "Software", ai: "AI", marketplace: "Marketplace", open: "Open" },
    },
    technicalStrengths: {
      question: "What are your technical strengths?",
      options: {
        backend: "Backend and data",
        fullStack: "Full-stack web",
        machineLearning: "Machine learning",
        mobile: "Mobile",
      },
    },
    reasoning: "Collecting user context.",
    kickoff: "Good. We start from your context, not from a product.",
    noted: "Noted.",
    yourNetwork: "your network",
  },
  start: {
    reasoning: "Entry mode not chosen.",
    question: "How do you want to start?",
    options: { noIdea: "I don't know what to build", hasIdea: "I already have an idea" },
    reply:
      "Before anything else: do you already have an idea to reverse-engineer, or should we discover a market from your context? I will not start from a product either way.",
  },
  idea: {
    unknownIcp: "UNKNOWN ICP (please specify)",
    unknownMarket: "UNKNOWN market",
    reasoning: "Idea decomposed into market, ICP and candidate variables.",
    marketDescription: 'Market implied by the idea "{idea}".',
    marketNotes: "UNKNOWN — attractiveness has not been assessed with evidence.",
    icpRole: "Owner / operator (HYPOTHESIS)",
    icpEconomicBuyer: "UNKNOWN — validate who controls purchasing",
    icpNotes: "Derived from the idea statement. Solution mentioned: {mechanism}.",
    variableDescription:
      'Variable the solution "{mechanism}" might move. Importance is a HYPOTHESIS; current and desired state are UNKNOWN.',
    mechanismDescription:
      "The mechanism proposed by the user. Parked until the problem is understood.",
    assumptionValue: "{icp}s lose meaningful revenue or capacity because of {variableLower}.",
    assumptionAccess: "The {icpLower} controls software purchasing decisions.",
    assumptionGeneric: "Current workflows for {variableLower} are insufficient.",
    question: "Which variable is the idea really supposed to move?",
    factFromStatement: "FACT from your statement",
    reply: {
      intro: 'I will not evaluate "{mechanism}" yet. First the decomposition:',
      icp: "- ICP ({basis}): {icp}",
      market: "- Market: {market}",
      variables: "- Variables the solution could move (HYPOTHESIS, importance 0–10): {variables}",
      variableItem: "{name} {importance}",
      unknowns:
        "- Current state and desired state of every variable: UNKNOWN. Economic buyer: UNKNOWN. Reachability: UNKNOWN.",
      outro:
        "Three assumptions were added to the ledger (value, access, generic). Which variable is the idea really about?",
    },
  },
  market: {
    /** {industry}: singular-then-plural industry name, lower-case in English. */
    candidateName: "Independent {industry}",
    candidateDescription:
      "Small, owner-operated businesses in {industry} that you can reach through {audience}.",
    candidateNotes:
      "HYPOTHESIS: fragmented buyers, owner is both user and buyer, under-served by generic tools. Nothing verified yet.",
    fallbackName: "Local service businesses",
    fallbackDescription: "Salons, clinics and repair shops with 5–20 staff.",
    fallbackNotes: "HYPOTHESIS: high pain density around scheduling and capacity. Unverified.",
    reasoning: "Context complete; candidate markets proposed.",
    question: "Which market should we investigate first?",
    reply: {
      context:
        "Context captured: industries {industries}; reachable people {audiences}; model {model}.",
      heading: "Candidate markets (all HYPOTHESES until evidence exists):",
      item: "- {name}: {notes}",
      outro: "Which one should we investigate first?",
    },
  },
  icp: {
    reasoning: "Market selected; ICP map proposed.",
    userMarketDescription: "Market named by the user.",
    ownerName: "{base} owner",
    ownerRole: "Owner-operator",
    ownerCompanySize: "1–20 employees (HYPOTHESIS)",
    ownerResponsibilities: "Revenue, staffing, scheduling, customer experience",
    ownerEconomicBuyer: "Owner (HYPOTHESIS — validate)",
    ownerUserRole: "Owner and front-desk staff",
    ownerNotes: "Owner is likely both user and buyer.",
    managerName: "{base} manager (multi-site)",
    managerRole: "Operations manager",
    managerCompanyType: "{market} with several locations",
    managerCompanySize: "20–200 employees (HYPOTHESIS)",
    managerResponsibilities: "Utilization, staff productivity, reporting",
    managerEconomicBuyer: "UNKNOWN — likely the owner or regional director",
    managerUserRole: "Manager",
    question: "Which ICP matters most to you?",
    reply:
      "Market: {market}.\n\nICP map (HYPOTHESIS):\n- {owner}: owner is user and buyer; reachability UNKNOWN.\n- {manager}: manager uses, buyer UNKNOWN.\n\nWhich ICP matters most?",
  },
  variable: {
    reasoning: "ICP selected; variable map proposed.",
    description:
      "Valuable variable for {icp}. Importance is a HYPOTHESIS; current and desired state are UNKNOWN.",
    question: "Which variable should we investigate first?",
    line: "- {action} × {name} × {target} — {importance}",
    reply:
      "ICP: {icp}.\n\nVariable map (action × variable × target; importance 0–10, HYPOTHESIS):\n{lines}\n\nCurrent and desired states are UNKNOWN for all of them. Which variable should we investigate first?",
  },
  pain: {
    reasoning: "Variable selected; pains described.",
    description:
      "{variable} is worse than it should be for {icp}s, and nobody measures it precisely.",
    currentState: "UNKNOWN (HYPOTHESIS: noticeably above what the owner would accept)",
    desiredState: "UNKNOWN (HYPOTHESIS: measurable, controlled, under a target)",
    gap: "The gap is a hypothesis until the current state is measured with real data.",
    assumption: "{variable} costs {icp}s meaningful money every month.",
    question: "Tell me about the last time {variableLower} hurt. What happened?",
    options: {
      weekly: "It happens weekly and costs real money",
      tolerated: "It happens but they tolerate it",
      unknown: "I don't know yet",
    },
    reply:
      "Variable: {variableRaw}.\n\nCurrent state: UNKNOWN. Desired state: UNKNOWN. Everything about this gap is a HYPOTHESIS until measured.\n\n{question}",
  },
  trigger: {
    reasoning: "Triggers and alternatives proposed; evidence needed next.",
    spike: "A visible spike in {variableLower} during a high-demand period.",
    weekly: "Weekly (stated by user)",
    complaint: "A staff member or key customer complains loudly enough to reach the owner.",
    manual: {
      name: "Manual follow-up by staff",
      description: "Someone chases the problem by hand when they remember.",
      cost: "Staff time, UNKNOWN hours/week",
      weakness: "Inconsistent, no prediction, depends on one person.",
    },
    spreadsheet: {
      name: "Spreadsheet tracking",
      description: "A shared sheet updated irregularly.",
      cost: "Free",
      weakness: "Stale data, no alerts, nobody trusts it.",
    },
    software: {
      name: "Generic booking / CRM software",
      description: "Existing tools cover part of the workflow.",
      weakness: "Not designed around this variable; adoption UNKNOWN.",
    },
    question:
      "Nothing here is verified. Add evidence through the Evidence panel, or continue to mechanisms with hypotheses only?",
    options: {
      hypotheses: "Continue with hypotheses for now",
      evidence: "I added evidence, continue",
    },
    reply: {
      tolerated:
        "You said the pain is tolerated or unknown — that lowers urgency (trigger urgency 4/10).",
      fact: "Noted as a FACT from you: it happens weekly and costs money. The economic magnitude is still UNKNOWN until a number is captured as evidence.",
      triggers: "Triggers (HYPOTHESIS): demand-period spikes; loud complaints reaching the owner.",
      alternatives:
        "Current alternatives (HYPOTHESIS): manual follow-up (weakness 7), spreadsheet (6), generic software (5).",
      evidence:
        "Evidence Confidence is computed from captured evidence only. Useful research: forum threads where owners describe this problem, competitor reviews mentioning it, and job postings that pay someone to handle it.",
    },
  },
  mechanism: {
    reasoning: "Mechanisms explored.",
    reminders: {
      name: "Automated reminders and follow-ups for {variableLower}",
      description: "Removes the manual chasing.",
    },
    prediction: {
      name: "Risk prediction for {variableLower}",
      description: "Predicts which cases will go wrong and prioritizes them.",
    },
    policy: {
      name: "Policy change (deposits, cancellation rules, incentives)",
      description: "Non-software mechanism that changes behavior.",
    },
    dashboard: {
      name: "Monitoring dashboard for {variableLower}",
      description: "Makes the variable visible weekly.",
    },
    service: {
      name: "Done-for-you service",
      description: "A person or agency handles it for a fee — a concierge test candidate.",
    },
    question: "Which mechanism should anchor the first opportunity hypothesis?",
    line: "- {name} ({category})",
    reply:
      "Problem ≠ product. Five mechanisms that could move {variableLower}:\n{lines}\n\nWhich one should anchor the first opportunity hypothesis?",
  },
  opportunity: {
    title: "{variable} for {icpLower}s",
    reasoning:
      "Opportunity formed with its value causality ladder; scoring and frontier are computed by the application.",
    problemStatement:
      "{icp}s cannot control {variableLower}; the current state is UNKNOWN and alternatives are manual.",
    productHypothesis: "A {mechanismLower} layer for {icpLower}s.",
    valueProposition: "Move {variableLower} measurably for {icpLower}s without adding staff.",
    metric: "{variable} per month",
    inputJustification:
      "All inputs are HYPOTHESES proposed from the conversation; edit them and add evidence.",
    risks: {
      buyer: "Economic buyer is UNKNOWN",
      currentState: "Current state has never been measured",
      alternatives: "Alternatives may be good enough",
    },
    nextSteps: {
      evidence: "Add external evidence",
      interviews: "Interview 5 ICPs about the last occurrence",
      measure: "Measure the current state",
    },
    ladder: {
      capability:
        "{icpCap}s can identify the cases driving {variableLower} and act on them before the outcome is lost.",
      transformation: "Fewer cases of {variableLower} end in an unrecoverable outcome.",
      operationalValue:
        "{variableLowerCap} moves in the desired direction in day-to-day operations.",
      economicValue:
        "The economic consequence of {variableLower} shrinks (capacity, revenue or cost).",
      strategicOutcome:
        "The parent economic variable of {variableLower} improves for the {icpLower}.",
      linkMechanismCapability: "{mechanism} actually surfaces the right cases early enough to act.",
      linkCapabilityTransformation:
        "Acting on the identified cases materially changes the outcome ({variableLower}).",
      linkTransformationOperational:
        "Changed outcomes on individual cases add up to a measurable movement of {variableLower}.",
      linkOperationalEconomic:
        "The movement of {variableLower} translates into money, capacity or cost for the {icpLower}.",
      linkEconomicStrategic:
        "The economic effect is large and durable enough to move the parent variable.",
    },
    dimensionsJustification:
      "Importance mirrors the variable's hypothesized importance. Magnitude, frequency, population and attributability are UNKNOWN: nothing has been measured.",
    assumptions: {
      causal:
        "If {mechanismLower} is applied to the cases driving {variableLower}, the outcome of those cases changes.",
      value: "The movement of {variableLower} is worth enough money to justify a product.",
      feasibility: "The data needed for {mechanismLower} exists and can be obtained.",
      wtp: "{icp}s would pay for a {mechanismLower} solution.",
    },
    question:
      "The first uncertainty beyond the problem is the causal link mechanism → outcome. Plan an experiment to test it?",
    options: {
      plan: "Plan the pilot experiment",
      report: "Show me the opportunity report",
      anotherVariable: "Explore another variable",
    },
    reply: {
      formed: 'Opportunity hypothesis formed: "{title}" anchored on "{mechanism}".',
      ladderHeading:
        "Value causality ladder (every level is a HYPOTHESIS until evidence is linked):",
      mechanism: "- Mechanism: {mechanism}",
      capability: "- Capability: identify the cases driving {variableLower} and act early",
      transformation: "- Transformation: fewer cases end in an unrecoverable outcome",
      operationalValue: "- Operational value: {variableLower} moves in the desired direction",
      economicValue: "- Economic value: the economic consequence shrinks",
      strategicOutcome: "- Strategic outcome: the parent variable improves",
      inputs:
        "Proposed inputs (0–10, HYPOTHESES): importance 7, pain 6, frequency 6, gap 6, willingness to pay 5, alternative weakness 6. Value Strength: importance 7; magnitude, frequency, population and attributability UNKNOWN — Value Strength is therefore INCOMPLETE.",
      computed:
        "Four typed assumptions were added (causal, value, feasibility, WTP). The application computes Opportunity Potential, Evidence Confidence, Value Strength, Causal Confidence, the Proof Frontier and the verdict deterministically — see the Radar and the Value tab.",
    },
  },
  experiment: {
    reasoning: "Experiment designed for the first unproven causal link.",
    title: "Controlled pilot: {mechanism} vs current practice",
    hypothesis:
      "If {mechanismLower} is applied to the cases driving {variableLower}, {variableLower} moves in the desired direction compared with comparable cases handled as today.",
    design:
      "With {icpLower}s who agree to a four-week pilot, split comparable cases into two groups: one handled as today, one with {mechanismLower}. Record {variableLower} for both groups every week.",
    successMetric:
      "{variable} in the intervention group versus the control group, with the difference large enough to matter economically to the {icpLower}.",
    options: {
      report: "Show me the opportunity report",
      anotherVariable: "Explore another variable",
      whichEvidence: "What evidence should I collect first?",
      plan: "Plan the pilot experiment",
      addEvidence: "Add evidence",
    },
    reply: {
      planned: 'Experiment planned for the causal link Capability → Transformation of "{title}":',
      hypothesis: "- Hypothesis: {hypothesis}",
      design: "- Design: {design}",
      successMetric: "- Success metric: {metric}",
      outro:
        "When the pilot produces results, capture them as evidence linked to this causal link. The Proof Frontier moves only when linked evidence reaches the supported threshold.",
    },
    recommendationReasoning: "Moving to recommendation.",
    recommendationReply:
      'The ladder for "{title}" is entirely hypothetical below the problem. The Radar shows the deterministic scores and the current Proof Frontier; the Value tab shows which causal link should be tested first.',
  },
  followUp: {
    reasoning: "Follow-up discussion.",
    options: {
      anotherVariable: "Explore another variable",
      addEvidence: "Add evidence",
      interviewGuide: "Generate the interview guide",
    },
    nextVariableQuestion: "Which variable should we investigate next?",
    reply:
      "The workspace now holds structured hypotheses and a value causality ladder. Scores, the Proof Frontier and verdicts are computed from your inputs and the evidence you capture — nothing here counts as validation yet. The next best action is listed on each opportunity. You can explore another variable, add evidence, or generate an interview guide.",
  },
  /** Template interview guide (src/services/interview/guide.ts). */
  interview: {
    title: "Discovery interviews — {title}",
    targetProfile:
      '{icp} who has dealt with "{pain}" in the last 90 days. Aim for 5 interviews; stop pitching, start listening.',
    context: {
      name: "Context",
      week: "Walk me through a normal week. Where does most of your time go?",
      tracking: "How do you currently keep track of {variable}?",
      involved: "Who else is involved when something goes wrong with it?",
    },
    lastOccurrence: {
      name: "Last occurrence",
      lastTime: "Tell me about the last time {pain} happened.",
      steps: "What did you do, step by step?",
      duration: "How much time did it take you and your team?",
      trigger: 'You mentioned situations like "{trigger}". When was the last one?',
      unignorable: "What made it impossible to ignore that time?",
    },
    cost: {
      name: "Cost and impact",
      cost: "What did it cost you — in money, capacity or customers?",
      unsolved: "What happened when the problem was not solved?",
      frequency: "How often does something like this happen per month?",
    },
    alternatives: {
      name: "Current alternatives",
      known: "You use {alternatives} today. What is frustrating about that?",
      unknown: "What do you use today to deal with it? What is frustrating about that?",
      tried: "What have you tried that did not work?",
    },
    buying: {
      name: "Buying behavior",
      purchased: "Have you purchased anything to solve this? What?",
      trigger: "What triggered that purchase?",
      signoff: "Who signed off on it, and how long did it take?",
    },
    listenFor: {
      numbers: "Specific numbers, dates and names — vagueness means low pain.",
      workarounds: "Workarounds they built themselves (strong evidence of pain).",
      budget: "Who actually controls the budget versus who feels the pain.",
    },
    avoid: {
      wouldPay: "Would you pay for this?",
      wouldUse: "Would you use a product that…?",
      pitching: "Describing your solution before the last question.",
    },
  },
  /** Mock research provider (src/services/research/mock-provider.ts). */
  research: {
    forum: {
      title: '[MOCK] Forum thread: "How do you deal with {topic}?"',
      excerpt:
        "[MOCK DATA] Synthetic forum post. An owner describes struggling with {topic} and tracking it in a spreadsheet. Replace with a real source before trusting it.",
    },
    review: {
      title: "[MOCK] Competitor review mentioning {topic}",
      excerpt:
        '[MOCK DATA] Synthetic review: "The tool helps a bit with {topic} but we still lose money every month." No real product is referenced.',
    },
    job: {
      title: "[MOCK] Job posting: coordinator responsible for {topic}",
      excerpt:
        "[MOCK DATA] Synthetic posting for a role whose duties include handling {topic}. Signals a workaround via labour, if real.",
    },
    reddit: {
      title: "[MOCK] Reddit comment contradicting the hypothesis about {topic}",
      excerpt:
        '[MOCK DATA] Synthetic comment: "Honestly {topic} is not a big deal for us, the reminders we already send are fine." Contradictory signal example.',
    },
    report: {
      title: "[MOCK] Industry note on {topic}",
      excerpt:
        "[MOCK DATA] Synthetic market note. Contains no real statistics on purpose. Use it only to test the evidence workflow.",
    },
  },
  /** Opportunity server actions (src/actions/opportunities.ts). */
  opportunityAction: {
    checkFields: "Check the highlighted fields.",
  },
} as const;
