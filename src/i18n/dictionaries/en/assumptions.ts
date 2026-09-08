/** English strings — section "assumptions". Keys are referenced as "assumptions.<key>". */
export const assumptions = {
  /** Example statement per assumption kind, shown as the input placeholder. */
  example: {
    CAUSAL: "If high-risk bookings receive adaptive reminders, the no-show rate decreases.",
    VALUE: "A 5-point reduction in no-shows creates enough economic value to justify the product.",
    FEASIBILITY: "Booking platforms expose enough data to calculate appointment risk.",
    WTP: "Independent salons would pay €79–149/month.",
    ACCESS: "The target buyers can be reached efficiently.",
    GENERIC: "The owner controls software purchases.",
  },
  examplePlaceholder: "e.g. {example}",
  summary: {
    untested:
      "{count, plural, one {# critical assumption remains} other {# critical assumptions remain}} untested. If a causal or value assumption is false, the opportunity collapses.",
    default:
      "Riskiest untested assumptions first. Link evidence to move them to supported or contradicted.",
  },
  addButton: "Assumption",
  importance: "Importance {value}/10",
  add: "Add",
  formHelp:
    "Causal and value assumptions can also be attached to a value chain level or a causal link from the Value tab or the report ladder.",
  emptyTitle: "No assumptions recorded",
  emptyDescription:
    "Every opportunity rests on assumptions about the buyer, the pain, the price and — above all — the causal chain from mechanism to value. Write them down so they can be tested.",
  onLevel: "on {level}",
  onLink: "on link “{statement}”",
  item: {
    importance: "importance {value}/10",
    confidence: "confidence {value}%",
    evidenceCount: "{count} evidence",
  },
  unlink: "unlink",
  linkEvidence: "Link evidence",
  delete: "Delete assumption",
  linkDialog: {
    title: "Link evidence to assumption",
    evidence: "Evidence",
    choose: "Choose evidence",
    direction: "Direction",
    supports: "Supports the assumption",
    contradicts: "Contradicts the assumption",
    neutral: "Neutral — relevant but inconclusive",
    link: "Link",
    linked: "Evidence linked — status recomputed",
  },
} as const;
