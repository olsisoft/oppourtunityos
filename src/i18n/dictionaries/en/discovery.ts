/** English strings — section "discovery". Keys are referenced as "discovery.<key>". */
export const discovery = {
  workspace: {
    idea: "Idea: {idea}",
    mapButton: "Map",
    openMap: "Open opportunity map",
    toggleMap: "Toggle opportunity map",
    sheetTitle: "Opportunity map",
  },
  tabs: {
    map: "Map",
    variables: "Variables",
    value: "Value",
    radar: "Radar",
    evidence: "Evidence",
    assumptions: "Assumptions",
    mapHelp:
      "Market → ICP → Variable → Pain → Opportunity → Mechanism → Value chain. Click a node to inspect or edit it; expand an opportunity to see its ladder and Proof Frontier. Badges show where each fact came from.",
    variablesHelp:
      "Valuable variables ranked by importance (0–100 = importance × 10). Importance is a hypothesis until evidence backs it.",
  },
  map: {
    empty: {
      title: "No market yet",
      description:
        "The map fills itself as the conversation progresses: Market → ICP → Variables → Pains → Opportunities → Mechanism → Value chain.",
    },
    noOpportunity:
      "No opportunity formed yet. Opportunities appear once ICP, variable and pain are known.",
    node: {
      market: "Market",
      icp: "ICP",
      variable: "Valuable variable",
      pain: "Pain",
      opportunity: "Opportunity",
      mechanism: "Mechanism",
    },
    pending: {
      icp: "ICP pending",
      variables: "Variables pending",
    },
    valueChain: "Value chain",
    experiments:
      "{count, plural, =0 {No experiment planned} one {# experiment} other {# experiments}}",
    variableLine:
      "{direction} · {type} · importance {importance}/10 · {current} · {desired}{hasParent, select, true { · parent {parent}} other {}}",
    typeKnown: "type {type}",
    typeUnknown: "type UNKNOWN",
    currentKnown: "current {value} ({status})",
    currentUnknown: "current UNKNOWN",
    desiredKnown: "desired {value} ({status})",
    desiredUnknown: "desired UNKNOWN",
    painLine:
      "severity {severity} · frequency {frequency} · {triggers, plural, one {# trigger} other {# triggers}} · {alternatives, plural, one {# alternative} other {# alternatives}} · {evidence} evidence",
    collapse: "Collapse",
    expand: "Expand",
    collapseChain: "Collapse value chain",
    expandChain: "Expand value chain",
    scores: {
      potential: "potential {value}",
      evidence: "evidence {value}",
      value: "value {value}",
      causal: "causal {value}",
    },
    frontier: "Proof frontier · {frontier}",
    mechanismUnknown: "UNKNOWN — no mechanism chosen yet. Problem ≠ product.",
    noChain:
      "No value chain stated yet. Open the Value tab to state how the mechanism creates value: Mechanism → Capability → Transformation → Operational → Economic → Strategic.",
  },
  variables: {
    empty: {
      title: "No variables yet",
      description:
        "Valuable variables are the things a product must move: labor cost, no-shows, retention, utilization. They appear once an ICP is defined.",
    },
    evidenceCount: "{count, plural, =0 {No evidence} other {# evidence}}",
  },
  detail: {
    confirmDelete: "Delete this item and everything beneath it? Scores will be recomputed.",
    deleted: "Deleted",
    saved: "Saved",
    failed: "Failed",
    market: {
      kind: "Market",
      noDescription: "No description.",
      attractiveness: "Attractiveness notes",
      delete: "Delete market",
    },
    icp: {
      kind: "ICP",
      description:
        "Edit any field. Manual edits mark the ICP as stated by you. Say UNKNOWN when you do not know.",
      name: "Name",
      role: "Role",
      companyType: "Company type",
      companySize: "Company size",
      userRole: "User role",
      responsibilities: "Responsibilities",
      economicBuyer: "Economic buyer (who controls the budget?)",
      reachability: "Reachability (how can you reach them?)",
      notes: "Notes",
    },
    variable: {
      kind: "Valuable variable",
      description:
        "{count, plural, one {# pain} other {# pains}} attached. Each field carries its own status; leave a field empty when it is UNKNOWN rather than guessing.",
      delete: "Delete variable",
    },
    pain: {
      kind: "Pain",
      description: "Current state, desired state and gap. UNKNOWN is a valid and honest answer.",
      descriptionField: "Description",
      severity: "Severity {value}/10",
      frequency: "Frequency {value}/10",
      currentState: "Current state",
      desiredState: "Desired state",
      gap: "Gap",
      triggers: "Triggers ({count})",
      noTrigger: "No trigger identified. Without a trigger there is no urgency.",
      urgency: "urgency {value}",
      alternatives: "Current alternatives ({count})",
      noAlternative: "No alternative documented. Alternative weakness cannot be trusted yet.",
      alternativeBadge: "{category} · weakness {value}",
      failureUnknown: "Failure UNKNOWN",
      evidence: "Evidence on this pain ({count})",
      noEvidence: "No evidence yet. Everything about this pain is a hypothesis.",
    },
    opportunity: {
      kind: "Opportunity",
      noProblemStatement: "No problem statement yet.",
      frontierLabel: "Current Proof Frontier:",
      frontierNote: "Everything beyond it remains a product or causal hypothesis.",
      openReport: "Open report",
    },
  },
} as const;
