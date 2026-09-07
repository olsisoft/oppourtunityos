/**
 * Mock AI provider.
 *
 * Deterministic, template-based and CLEARLY LABELLED. It exists so the whole
 * product (chat → structured state → scoring → frontier → verdict) works with
 * no API key, in tests and in demos. It is not intelligent: it follows the
 * discovery stage machine and turns the user's words into structured
 * hypotheses. It never emits evidence, never fills a value dimension it has no
 * basis for (null = UNKNOWN), and never states a score, frontier or verdict.
 */
import type { DiscoveryStage, ValueChainLevel } from "@/generated/prisma/enums";
import { BaseAIProvider } from "../base-provider";
import {
  DiscoveryExtractionSchema,
  EvidenceSummarySchema,
  InterviewGuideSchema,
  type DiscoveryExtraction,
} from "../schemas";
import type { ChatOptions, StructuredOptions, TurnHints, UserContext } from "../types";

export const MOCK_LABEL = "[MOCK PROVIDER — templated response, not analysis]";

type VariableDraft = DiscoveryExtraction["variables"][number];
type AssumptionDraft = DiscoveryExtraction["assumptions"][number];

interface VariableTemplate {
  name: string;
  category: VariableDraft["category"];
  direction: VariableDraft["desiredDirection"];
  importance: number;
  target: string;
  unit: string;
  parent: string;
}

const VARIABLE_LIBRARY: Array<{ match: RegExp; variables: VariableTemplate[] }> = [
  {
    match: /reception|call|phone|front desk|booking/i,
    variables: [
      {
        name: "Missed calls",
        category: "REVENUE",
        direction: "DECREASE",
        importance: 8,
        target: "Inbound calls that go unanswered",
        unit: "calls per day",
        parent: "New-patient revenue",
      },
      {
        name: "Booking conversion",
        category: "CONVERSION",
        direction: "INCREASE",
        importance: 8,
        target: "Inquiries that become booked appointments",
        unit: "% of inquiries",
        parent: "New-patient revenue",
      },
      {
        name: "Front desk labor cost",
        category: "COST",
        direction: "DECREASE",
        importance: 7,
        target: "Staff hours spent on phone handling",
        unit: "hours per week",
        parent: "Operating cost",
      },
      {
        name: "Response time",
        category: "TIME",
        direction: "ACCELERATE",
        importance: 6,
        target: "Time between inquiry and answer",
        unit: "minutes",
        parent: "Booking conversion",
      },
      {
        name: "No-show rate",
        category: "CAPACITY",
        direction: "DECREASE",
        importance: 7,
        target: "Booked appointments that become unused capacity",
        unit: "% of appointments",
        parent: "Revenue per available chair-hour",
      },
    ],
  },
  {
    match: /salon|spa|barber|clinic|dental|dentist|physio|vet/i,
    variables: [
      {
        name: "No-show rate",
        category: "CAPACITY",
        direction: "DECREASE",
        importance: 8,
        target: "Booked appointments that become unused capacity",
        unit: "% of appointments",
        parent: "Revenue per available chair-hour",
      },
      {
        name: "Idle chair capacity",
        category: "UTILIZATION",
        direction: "DECREASE",
        importance: 7,
        target: "Chair-hours paid for but not sold",
        unit: "chair-hours per week",
        parent: "Revenue per available chair-hour",
      },
      {
        name: "Employee revenue leakage",
        category: "REVENUE",
        direction: "DECREASE",
        importance: 8,
        target: "Services performed but not recorded or paid",
        unit: "% of revenue",
        parent: "Net revenue",
      },
      {
        name: "Customer retention",
        category: "RETENTION",
        direction: "INCREASE",
        importance: 7,
        target: "Clients returning within 90 days",
        unit: "% of clients",
        parent: "Lifetime value",
      },
      {
        name: "Inventory shrinkage",
        category: "INVENTORY",
        direction: "DECREASE",
        importance: 5,
        target: "Product that disappears without a sale",
        unit: "€ per month",
        parent: "Gross margin",
      },
    ],
  },
  {
    match: /restaurant|cafe|bar|kitchen|food/i,
    variables: [
      {
        name: "Labor cost",
        category: "COST",
        direction: "DECREASE",
        importance: 9,
        target: "Staff hours per cover",
        unit: "% of revenue",
        parent: "Operating margin",
      },
      {
        name: "Food waste",
        category: "COST",
        direction: "DECREASE",
        importance: 8,
        target: "Ingredients bought but not sold",
        unit: "% of purchases",
        parent: "Gross margin",
      },
      {
        name: "Table utilization",
        category: "UTILIZATION",
        direction: "INCREASE",
        importance: 7,
        target: "Seat-hours sold",
        unit: "% of seat-hours",
        parent: "Revenue per seat-hour",
      },
      {
        name: "No-shows",
        category: "CAPACITY",
        direction: "DECREASE",
        importance: 7,
        target: "Reservations that do not arrive",
        unit: "% of reservations",
        parent: "Revenue per seat-hour",
      },
      {
        name: "Repeat visits",
        category: "RETENTION",
        direction: "INCREASE",
        importance: 6,
        target: "Guests returning within 60 days",
        unit: "% of guests",
        parent: "Lifetime value",
      },
    ],
  },
  {
    match: /logistic|fleet|delivery|truck|warehouse|shipping/i,
    variables: [
      {
        name: "Fuel cost per delivery",
        category: "COST",
        direction: "DECREASE",
        importance: 8,
        target: "Fuel spent per completed delivery",
        unit: "€ per delivery",
        parent: "Cost per delivery",
      },
      {
        name: "Idle vehicle time",
        category: "UTILIZATION",
        direction: "DECREASE",
        importance: 7,
        target: "Vehicle-hours not moving freight",
        unit: "hours per vehicle per week",
        parent: "Asset utilization",
      },
      {
        name: "Late deliveries",
        category: "RELIABILITY",
        direction: "DECREASE",
        importance: 8,
        target: "Deliveries outside the promised window",
        unit: "% of deliveries",
        parent: "Customer retention",
      },
      {
        name: "Driver churn",
        category: "RETENTION",
        direction: "DECREASE",
        importance: 6,
        target: "Drivers leaving per year",
        unit: "% per year",
        parent: "Operating cost",
      },
      {
        name: "Damage claims",
        category: "RISK",
        direction: "DECREASE",
        importance: 5,
        target: "Shipments damaged in transit",
        unit: "claims per 1,000 shipments",
        parent: "Cost per delivery",
      },
    ],
  },
  {
    match: /security|cyber|soc|incident|breach|compliance/i,
    variables: [
      {
        name: "Incident resolution time",
        category: "TIME",
        direction: "ACCELERATE",
        importance: 9,
        target: "Time from alert to closed incident",
        unit: "hours",
        parent: "Breach risk exposure",
      },
      {
        name: "Alert fatigue",
        category: "PRODUCTIVITY",
        direction: "DECREASE",
        importance: 7,
        target: "Alerts triaged per analyst per day",
        unit: "alerts per analyst",
        parent: "Analyst productivity",
      },
      {
        name: "Audit preparation time",
        category: "COMPLIANCE",
        direction: "DECREASE",
        importance: 7,
        target: "Hours spent preparing audit evidence",
        unit: "hours per audit",
        parent: "Compliance cost",
      },
      {
        name: "Breach risk exposure",
        category: "RISK",
        direction: "DECREASE",
        importance: 8,
        target: "Unpatched critical exposures",
        unit: "open critical findings",
        parent: "Expected loss",
      },
      {
        name: "Analyst turnover",
        category: "RETENTION",
        direction: "DECREASE",
        importance: 5,
        target: "Analysts leaving per year",
        unit: "% per year",
        parent: "Operating cost",
      },
    ],
  },
];

const DEFAULT_VARIABLES: VariableTemplate[] = [
  {
    name: "Revenue leakage",
    category: "REVENUE",
    direction: "DECREASE",
    importance: 8,
    target: "Revenue earned but not captured",
    unit: "% of revenue",
    parent: "Net revenue",
  },
  {
    name: "Labor cost",
    category: "COST",
    direction: "DECREASE",
    importance: 7,
    target: "Staff hours on manual work",
    unit: "hours per week",
    parent: "Operating margin",
  },
  {
    name: "Customer retention",
    category: "RETENTION",
    direction: "INCREASE",
    importance: 7,
    target: "Customers renewing or returning",
    unit: "% of customers",
    parent: "Lifetime value",
  },
  {
    name: "Time to resolution",
    category: "TIME",
    direction: "ACCELERATE",
    importance: 6,
    target: "Time from request to resolution",
    unit: "hours",
    parent: "Customer retention",
  },
  {
    name: "Error rate",
    category: "QUALITY",
    direction: "DECREASE",
    importance: 5,
    target: "Outputs that need rework",
    unit: "% of outputs",
    parent: "Operating cost",
  },
];

const CONTEXT_QUESTIONS: Array<{ key: keyof UserContext; question: string; options: string[] }> = [
  {
    key: "industries",
    question: "What industries do you understand or have access to?",
    options: [
      "Local services (salons, clinics, restaurants)",
      "B2B software teams",
      "Logistics",
      "Healthcare",
    ],
  },
  {
    key: "audiences",
    question: "What kind of people can you realistically talk to in the next two weeks?",
    options: ["Small business owners", "Engineering managers", "Operations staff", "Nobody yet"],
  },
  {
    key: "businessModel",
    question: "Are you looking for B2B, B2C, or either?",
    options: ["B2B", "B2C", "Either"],
  },
  {
    key: "productPreferences",
    question: "Do you prefer software, AI, hardware, marketplace, or are you open?",
    options: ["Software", "AI", "Marketplace", "Open"],
  },
  {
    key: "technicalStrengths",
    question: "What are your technical strengths?",
    options: ["Backend and data", "Full-stack web", "Machine learning", "Mobile"],
  },
];

function splitList(text: string): string[] {
  return text
    .split(/,|;|\band\b|\bor\b|\/|\n/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 6);
}

function singular(word: string): string {
  const w = word.trim();
  if (/ies$/i.test(w)) return w.replace(/ies$/i, "y");
  if (/(ses|xes|ches|shes)$/i.test(w)) return w.replace(/es$/i, "");
  if (/s$/i.test(w) && !/ss$/i.test(w)) return w.slice(0, -1);
  return w;
}

function plural(word: string): string {
  const w = word.trim();
  if (/y$/i.test(w) && !/[aeiou]y$/i.test(w)) return w.slice(0, -1) + "ies";
  if (/s$/i.test(w)) return w;
  return w + "s";
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function variablesFor(context: string): VariableTemplate[] {
  const hit = VARIABLE_LIBRARY.find((entry) => entry.match.test(context));
  return hit ? hit.variables : DEFAULT_VARIABLES;
}

/** Parse "X for Y" / "X pour Y" / "helps Y ..." idea statements. */
export function decomposeIdea(statement: string): { mechanism: string; icp: string } {
  const s = statement.replace(/^i (want|would like) to build\s+/i, "").trim();
  const m = s.match(/^(.+?)\s+(?:for|pour|to help|that helps|helping)\s+(.+?)[.!]?$/i);
  if (m) return { mechanism: cap(m[1].trim()), icp: m[2].trim() };
  return { mechanism: cap(s), icp: "UNKNOWN" };
}

function pickByMessage(candidates: string[], message: string): string | null {
  const lower = message.toLowerCase();
  const exact = candidates.find((c) => lower.includes(c.toLowerCase()));
  if (exact) return exact;
  const words = lower.split(/\W+/).filter((w) => w.length > 3);
  const fuzzy = candidates.find((c) => words.some((w) => c.toLowerCase().includes(w)));
  return fuzzy ?? null;
}

function variableDraft(icpName: string, v: VariableTemplate, description: string): VariableDraft {
  return {
    icpName,
    name: v.name,
    description,
    category: v.category,
    desiredDirection: v.direction,
    importanceScore: v.importance,
    target: v.target,
    // Measured states are never invented: UNKNOWN until the user or evidence states them.
    currentState: null,
    desiredState: null,
    unit: v.unit,
    whoValuesIt: icpName,
    whyItMatters: null,
    parentVariableName: v.parent,
    userStatedFields: [],
    source: "AI_HYPOTHESIS",
  };
}

function assumption(
  statement: string,
  importance: number,
  kind: AssumptionDraft["kind"] = "GENERIC",
  opportunityTitle: string | null = null,
  linkedCausalLink: AssumptionDraft["linkedCausalLink"] = null,
  linkedLevel: AssumptionDraft["linkedLevel"] = null,
): AssumptionDraft {
  return { statement, importance, kind, opportunityTitle, linkedLevel, linkedCausalLink };
}

function emptyExtraction(stage: DiscoveryStage, reasoning: string): DiscoveryExtraction {
  return {
    stage: { readyToAdvance: false, suggestedStage: stage, reasoning },
    userContext: null,
    markets: [],
    icps: [],
    variables: [],
    pains: [],
    triggers: [],
    alternatives: [],
    mechanisms: [],
    assumptions: [],
    opportunities: [],
    valueChains: [],
    valueDimensions: [],
    experiments: [],
    suggestedReplies: [],
    questionCard: null,
  };
}

interface MockTurn {
  reply: string;
  extraction: DiscoveryExtraction;
}

const LADDER: ValueChainLevel[] = [
  "MECHANISM",
  "CAPABILITY",
  "TRANSFORMATION",
  "OPERATIONAL_VALUE",
  "ECONOMIC_VALUE",
  "STRATEGIC_OUTCOME",
];

function valueChainFor(
  title: string,
  mechanism: string,
  variableName: string,
  icpName: string,
): DiscoveryExtraction["valueChains"][number] {
  const v = variableName.toLowerCase();
  const statements: Record<ValueChainLevel, string> = {
    MECHANISM: mechanism,
    CAPABILITY: `${cap(icpName)}s can identify the cases driving ${v} and act on them before the outcome is lost.`,
    TRANSFORMATION: `Fewer cases of ${v} end in an unrecoverable outcome.`,
    OPERATIONAL_VALUE: `${cap(v)} moves in the desired direction in day-to-day operations.`,
    ECONOMIC_VALUE: `The economic consequence of ${v} shrinks (capacity, revenue or cost).`,
    STRATEGIC_OUTCOME: `The parent economic variable of ${v} improves for the ${icpName.toLowerCase()}.`,
    BUSINESS_OUTCOME: "",
  };
  const links: DiscoveryExtraction["valueChains"][number]["links"] = [];
  const linkStatements: Record<string, string> = {
    "MECHANISM->CAPABILITY": `${mechanism} actually surfaces the right cases early enough to act.`,
    "CAPABILITY->TRANSFORMATION": `Acting on the identified cases materially changes the outcome (${v}).`,
    "TRANSFORMATION->OPERATIONAL_VALUE": `Changed outcomes on individual cases add up to a measurable movement of ${v}.`,
    "OPERATIONAL_VALUE->ECONOMIC_VALUE": `The movement of ${v} translates into money, capacity or cost for the ${icpName.toLowerCase()}.`,
    "ECONOMIC_VALUE->STRATEGIC_OUTCOME": `The economic effect is large and durable enough to move the parent variable.`,
  };
  for (let i = 0; i < LADDER.length - 1; i++) {
    const key = `${LADDER[i]}->${LADDER[i + 1]}`;
    links.push({
      fromLevel: LADDER[i],
      toLevel: LADDER[i + 1],
      statement: linkStatements[key],
      criticality: i >= 4 ? "IMPORTANT" : "CRITICAL",
    });
  }
  return {
    opportunityTitle: title,
    nodes: LADDER.map((level) => ({ level, statement: statements[level] })),
    links,
  };
}

export function buildMockTurn(hints: TurnHints): MockTurn {
  const { stage, entryMode, existing } = hints;
  const message = hints.userMessage.trim();

  if (!entryMode) {
    const x = emptyExtraction("START", "Entry mode not chosen.");
    x.questionCard = {
      question: "How do you want to start?",
      options: ["I don't know what to build", "I already have an idea"],
      allowFreeText: false,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${MOCK_LABEL}\n\nBefore anything else: do you already have an idea to reverse-engineer, or should we discover a market from your context? I will not start from a product either way.`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- HAS_IDEA first turn
  if (entryMode === "HAS_IDEA" && existing.markets.length === 0) {
    const idea = hints.ideaStatement || message;
    const { mechanism, icp } = decomposeIdea(idea);
    const icpName = icp === "UNKNOWN" ? "UNKNOWN ICP (please specify)" : cap(singular(icp));
    const marketName = icp === "UNKNOWN" ? "UNKNOWN market" : cap(plural(icp));
    const vars = variablesFor(idea);
    const x = emptyExtraction(
      "VARIABLE_DISCOVERY",
      "Idea decomposed into market, ICP and candidate variables.",
    );
    x.stage.readyToAdvance = true;
    x.markets = [
      {
        name: marketName,
        description: `Market implied by the idea "${idea}".`,
        attractivenessNotes: "UNKNOWN — attractiveness has not been assessed with evidence.",
        source: icp === "UNKNOWN" ? "AI_HYPOTHESIS" : "USER",
      },
    ];
    x.icps = [
      {
        marketName,
        name: icpName,
        role: "Owner / operator (HYPOTHESIS)",
        companyType: marketName,
        companySize: "UNKNOWN",
        responsibilities: "UNKNOWN",
        economicBuyer: "UNKNOWN — validate who controls purchasing",
        userRole: "UNKNOWN",
        reachability: "UNKNOWN",
        notes: `Derived from the idea statement. Solution mentioned: ${mechanism}.`,
        source: icp === "UNKNOWN" ? "AI_HYPOTHESIS" : "USER",
      },
    ];
    x.variables = vars.map((v) =>
      variableDraft(
        icpName,
        v,
        `Variable the solution "${mechanism}" might move. Importance is a HYPOTHESIS; current and desired state are UNKNOWN.`,
      ),
    );
    x.mechanisms = [
      {
        painDescription: null,
        name: mechanism,
        description: "The mechanism proposed by the user. Parked until the problem is understood.",
        category: /ai|agent|assistant|bot/i.test(mechanism) ? "AI_AGENT" : "OTHER",
      },
    ];
    x.assumptions = [
      assumption(
        `${icpName}s lose meaningful revenue or capacity because of ${vars[0].name.toLowerCase()}.`,
        9,
        "VALUE",
      ),
      assumption(
        `The ${icpName.toLowerCase()} controls software purchasing decisions.`,
        8,
        "ACCESS",
      ),
      assumption(
        `Current workflows for ${vars[0].name.toLowerCase()} are insufficient.`,
        7,
        "GENERIC",
      ),
    ];
    x.questionCard = {
      question: "Which variable is the idea really supposed to move?",
      options: vars.slice(0, 4).map((v) => v.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        MOCK_LABEL,
        "",
        `I will not evaluate "${mechanism}" yet. First the decomposition:`,
        "",
        `- ICP (${icp === "UNKNOWN" ? "HYPOTHESIS" : "FACT from your statement"}): ${icpName}`,
        `- Market: ${marketName}`,
        `- Variables the solution could move (HYPOTHESIS, importance 0–10): ${vars.map((v) => `${v.name} ${v.importance}`).join(", ")}`,
        "- Current state and desired state of every variable: UNKNOWN. Economic buyer: UNKNOWN. Reachability: UNKNOWN.",
        "",
        "Three assumptions were added to the ledger (value, access, generic). Which variable is the idea really about?",
      ].join("\n"),
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- NO_IDEA context interview
  if (entryMode === "NO_IDEA" && (stage === "START" || stage === "USER_CONTEXT")) {
    // Clone: buildMockTurn must stay pure (it runs once for chat, once for extraction).
    const ctx: UserContext = hints.userContext
      ? {
          industries: [...(hints.userContext.industries ?? [])],
          audiences: [...(hints.userContext.audiences ?? [])],
          businessModel: hints.userContext.businessModel ?? "UNKNOWN",
          productPreferences: [...(hints.userContext.productPreferences ?? [])],
          avoidIndustries: [...(hints.userContext.avoidIndustries ?? [])],
          technicalStrengths: [...(hints.userContext.technicalStrengths ?? [])],
        }
      : {
          industries: [],
          audiences: [],
          businessModel: "UNKNOWN",
          productPreferences: [],
          avoidIndustries: [],
          technicalStrengths: [],
        };
    const isKickoff = /don't know what to build|dont know what to build|^start$/i.test(message);
    const pendingOf = () =>
      CONTEXT_QUESTIONS.find((q) =>
        q.key === "businessModel"
          ? ctx.businessModel === "UNKNOWN"
          : (ctx[q.key] as string[]).length === 0,
      );
    const pending = pendingOf();
    if (!isKickoff && pending) {
      if (pending.key === "businessModel") {
        ctx.businessModel =
          /b2c/i.test(message) && /b2b/i.test(message)
            ? "EITHER"
            : /either|both|open/i.test(message)
              ? "EITHER"
              : /b2c/i.test(message)
                ? "B2C"
                : /b2b/i.test(message)
                  ? "B2B"
                  : "EITHER";
      } else {
        (ctx[pending.key] as string[]) = splitList(message).length
          ? splitList(message)
          : [message.slice(0, 80)];
      }
    }
    const next = pendingOf();
    const enough =
      ctx.industries.length > 0 && ctx.audiences.length > 0 && ctx.businessModel !== "UNKNOWN";

    if (!enough && next) {
      const x = emptyExtraction("USER_CONTEXT", "Collecting user context.");
      x.userContext = ctx;
      x.questionCard = { question: next.question, options: next.options, allowFreeText: true };
      x.suggestedReplies = next.options;
      return {
        reply: `${MOCK_LABEL}\n\n${isKickoff ? "Good. We start from your context, not from a product.\n\n" : "Noted.\n\n"}${next.question}`,
        extraction: x,
      };
    }

    const base = ctx.industries.slice(0, 3);
    const markets = base.map((ind) => ({
      name: `Independent ${plural(singular(ind)).toLowerCase()}`,
      description: `Small, owner-operated businesses in ${ind.toLowerCase()} that you can reach through ${ctx.audiences[0] ?? "your network"}.`,
      attractivenessNotes:
        "HYPOTHESIS: fragmented buyers, owner is both user and buyer, under-served by generic tools. Nothing verified yet.",
      source: "AI_HYPOTHESIS" as const,
    }));
    if (markets.length < 2) {
      markets.push({
        name: "Local service businesses",
        description: "Salons, clinics and repair shops with 5–20 staff.",
        attractivenessNotes:
          "HYPOTHESIS: high pain density around scheduling and capacity. Unverified.",
        source: "AI_HYPOTHESIS",
      });
    }
    const x = emptyExtraction("MARKET_SELECTION", "Context complete; candidate markets proposed.");
    x.stage.readyToAdvance = true;
    x.userContext = ctx;
    x.markets = markets;
    x.questionCard = {
      question: "Which market should we investigate first?",
      options: markets.map((m) => m.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        MOCK_LABEL,
        "",
        `Context captured: industries ${ctx.industries.join(", ")}; reachable people ${ctx.audiences.join(", ")}; model ${ctx.businessModel}.`,
        "",
        "Candidate markets (all HYPOTHESES until evidence exists):",
        ...markets.map((m) => `- ${m.name}: ${m.attractivenessNotes}`),
        "",
        "Which one should we investigate first?",
      ].join("\n"),
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Market chosen → ICP map
  if (stage === "MARKET_SELECTION" || (existing.icps.length === 0 && existing.markets.length > 0)) {
    const chosen =
      pickByMessage(existing.markets, message) ??
      (existing.markets.length === 1 ? existing.markets[0] : null);
    const marketName = chosen ?? cap(message.slice(0, 80));
    const x = emptyExtraction("ICP_DISCOVERY", "Market selected; ICP map proposed.");
    x.stage.readyToAdvance = true;
    if (!chosen) {
      x.markets = [
        {
          name: marketName,
          description: "Market named by the user.",
          attractivenessNotes: "UNKNOWN",
          source: "USER",
        },
      ];
    }
    const baseName = singular(marketName.replace(/^independent\s+/i, ""));
    x.icps = [
      {
        marketName,
        name: cap(`${baseName} owner`),
        role: "Owner-operator",
        companyType: marketName,
        companySize: "1–20 employees (HYPOTHESIS)",
        responsibilities: "Revenue, staffing, scheduling, customer experience",
        economicBuyer: "Owner (HYPOTHESIS — validate)",
        userRole: "Owner and front-desk staff",
        reachability: "UNKNOWN",
        notes: "Owner is likely both user and buyer.",
        source: "AI_HYPOTHESIS",
      },
      {
        marketName,
        name: `${cap(baseName)} manager (multi-site)`,
        role: "Operations manager",
        companyType: `${marketName} with several locations`,
        companySize: "20–200 employees (HYPOTHESIS)",
        responsibilities: "Utilization, staff productivity, reporting",
        economicBuyer: "UNKNOWN — likely the owner or regional director",
        userRole: "Manager",
        reachability: "UNKNOWN",
        notes: null,
        source: "AI_HYPOTHESIS",
      },
    ];
    x.questionCard = {
      question: "Which ICP matters most to you?",
      options: x.icps.map((i) => i.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${MOCK_LABEL}\n\nMarket: ${marketName}.\n\nICP map (HYPOTHESIS):\n- ${x.icps[0].name}: owner is user and buyer; reachability UNKNOWN.\n- ${x.icps[1].name}: manager uses, buyer UNKNOWN.\n\nWhich ICP matters most?`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- ICP chosen → variable map
  if (stage === "ICP_DISCOVERY" || (existing.variables.length === 0 && existing.icps.length > 0)) {
    const icpName = pickByMessage(existing.icps, message) ?? existing.icps[0];
    const vars = variablesFor(`${icpName} ${existing.markets.join(" ")} ${message}`);
    const x = emptyExtraction("VARIABLE_DISCOVERY", "ICP selected; variable map proposed.");
    x.stage.readyToAdvance = true;
    x.variables = vars.map((v) =>
      variableDraft(
        icpName,
        v,
        `Valuable variable for ${icpName}. Importance is a HYPOTHESIS; current and desired state are UNKNOWN.`,
      ),
    );
    x.questionCard = {
      question: "Which variable should we investigate first?",
      options: vars.slice(0, 4).map((v) => v.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${MOCK_LABEL}\n\nICP: ${icpName}.\n\nVariable map (action × variable × target; importance 0–10, HYPOTHESIS):\n${vars.map((v) => `- ${cap(v.direction.toLowerCase())} × ${v.name} × ${v.target.toLowerCase()} — ${v.importance}`).join("\n")}\n\nCurrent and desired states are UNKNOWN for all of them. Which variable should we investigate first?`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Variable chosen → pains
  if (
    stage === "VARIABLE_DISCOVERY" ||
    (existing.pains.length === 0 && existing.variables.length > 0)
  ) {
    const variableName = pickByMessage(existing.variables, message) ?? existing.variables[0];
    const icpName = existing.icps[0] ?? "the ICP";
    const x = emptyExtraction("PAIN_DISCOVERY", "Variable selected; pains described.");
    x.stage.readyToAdvance = true;
    x.pains = [
      {
        variableName,
        description: `${cap(variableName)} is worse than it should be for ${icpName}s, and nobody measures it precisely.`,
        severityScore: 7,
        frequencyScore: 7,
        currentState: "UNKNOWN (HYPOTHESIS: noticeably above what the owner would accept)",
        desiredState: "UNKNOWN (HYPOTHESIS: measurable, controlled, under a target)",
        gapDescription:
          "The gap is a hypothesis until the current state is measured with real data.",
        source: "AI_HYPOTHESIS",
      },
    ];
    x.assumptions = [
      assumption(
        `${cap(variableName)} costs ${icpName}s meaningful money every month.`,
        9,
        "VALUE",
      ),
    ];
    x.questionCard = {
      question: `Tell me about the last time ${variableName.toLowerCase()} hurt. What happened?`,
      options: [
        "It happens weekly and costs real money",
        "It happens but they tolerate it",
        "I don't know yet",
      ],
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${MOCK_LABEL}\n\nVariable: ${variableName}.\n\nCurrent state: UNKNOWN. Desired state: UNKNOWN. Everything about this gap is a HYPOTHESIS until measured.\n\n${x.questionCard.question}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Pain → triggers + alternatives
  if (stage === "PAIN_DISCOVERY" || stage === "TRIGGER_DISCOVERY") {
    const pain = existing.pains[0];
    const variableName = existing.variables[0] ?? "the variable";
    const tolerated = /tolerate|not a big deal|rare|don't know|dont know/i.test(message);
    const x = emptyExtraction(
      "EVIDENCE_DISCOVERY",
      "Triggers and alternatives proposed; evidence needed next.",
    );
    x.stage.readyToAdvance = true;
    x.triggers = [
      {
        painDescription: pain,
        description: `A visible spike in ${variableName.toLowerCase()} during a high-demand period.`,
        urgencyScore: tolerated ? 4 : 7,
        frequency: tolerated ? "UNKNOWN" : "Weekly (stated by user)",
        source: tolerated ? "AI_HYPOTHESIS" : "USER",
      },
      {
        painDescription: pain,
        description: "A staff member or key customer complains loudly enough to reach the owner.",
        urgencyScore: 6,
        frequency: "UNKNOWN",
        source: "AI_HYPOTHESIS",
      },
    ];
    x.alternatives = [
      {
        painDescription: pain,
        name: "Manual follow-up by staff",
        category: "MANUAL_PROCESS",
        description: "Someone chases the problem by hand when they remember.",
        costEstimate: "Staff time, UNKNOWN hours/week",
        weaknessDescription: "Inconsistent, no prediction, depends on one person.",
        weaknessScore: 7,
        source: "AI_HYPOTHESIS",
      },
      {
        painDescription: pain,
        name: "Spreadsheet tracking",
        category: "SPREADSHEET",
        description: "A shared sheet updated irregularly.",
        costEstimate: "Free",
        weaknessDescription: "Stale data, no alerts, nobody trusts it.",
        weaknessScore: 6,
        source: "AI_HYPOTHESIS",
      },
      {
        painDescription: pain,
        name: "Generic booking / CRM software",
        category: "COMPETITOR_SOFTWARE",
        description: "Existing tools cover part of the workflow.",
        costEstimate: "UNKNOWN",
        weaknessDescription: "Not designed around this variable; adoption UNKNOWN.",
        weaknessScore: 5,
        source: "AI_HYPOTHESIS",
      },
    ];
    x.questionCard = {
      question:
        "Nothing here is verified. Add evidence through the Evidence panel, or continue to mechanisms with hypotheses only?",
      options: ["Continue with hypotheses for now", "I added evidence, continue"],
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        MOCK_LABEL,
        "",
        `${tolerated ? "You said the pain is tolerated or unknown — that lowers urgency (trigger urgency 4/10)." : "Noted as a FACT from you: it happens weekly and costs money. The economic magnitude is still UNKNOWN until a number is captured as evidence."}`,
        "",
        "Triggers (HYPOTHESIS): demand-period spikes; loud complaints reaching the owner.",
        "Current alternatives (HYPOTHESIS): manual follow-up (weakness 7), spreadsheet (6), generic software (5).",
        "",
        "Evidence Confidence is computed from captured evidence only. Useful research: forum threads where owners describe this problem, competitor reviews mentioning it, and job postings that pay someone to handle it.",
      ].join("\n"),
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Alternatives/evidence → mechanisms
  if (stage === "ALTERNATIVE_DISCOVERY" || stage === "EVIDENCE_DISCOVERY") {
    const pain = existing.pains[0] ?? null;
    const variableName = existing.variables[0] ?? "the variable";
    const x = emptyExtraction("MECHANISM_DISCOVERY", "Mechanisms explored.");
    x.stage.readyToAdvance = true;
    x.mechanisms = [
      {
        painDescription: pain,
        name: `Automated reminders and follow-ups for ${variableName.toLowerCase()}`,
        description: "Removes the manual chasing.",
        category: "AUTOMATION",
      },
      {
        painDescription: pain,
        name: `Risk prediction for ${variableName.toLowerCase()}`,
        description: "Predicts which cases will go wrong and prioritizes them.",
        category: "PREDICTION",
      },
      {
        painDescription: pain,
        name: "Policy change (deposits, cancellation rules, incentives)",
        description: "Non-software mechanism that changes behavior.",
        category: "OTHER",
      },
      {
        painDescription: pain,
        name: `Monitoring dashboard for ${variableName.toLowerCase()}`,
        description: "Makes the variable visible weekly.",
        category: "MONITORING",
      },
      {
        painDescription: pain,
        name: "Done-for-you service",
        description: "A person or agency handles it for a fee — a concierge test candidate.",
        category: "OTHER",
      },
    ];
    x.questionCard = {
      question: "Which mechanism should anchor the first opportunity hypothesis?",
      options: x.mechanisms.slice(0, 4).map((m) => m.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${MOCK_LABEL}\n\nProblem ≠ product. Five mechanisms that could move ${variableName.toLowerCase()}:\n${x.mechanisms.map((m) => `- ${m.name} (${m.category})`).join("\n")}\n\nWhich one should anchor the first opportunity hypothesis?`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Mechanism → opportunity + value chain
  if (stage === "MECHANISM_DISCOVERY" || stage === "OPPORTUNITY_FORMATION") {
    const mechanism =
      pickByMessage(existing.mechanisms, message) ?? existing.mechanisms[0] ?? "Automation";
    const icpName = existing.icps[0] ?? "the ICP";
    const variableName = existing.variables[0] ?? "the variable";
    const pain = existing.pains[0] ?? null;
    const title = `${cap(variableName)} for ${icpName.toLowerCase()}s`;
    const x = emptyExtraction(
      "EXPERIMENT_DESIGN",
      "Opportunity formed with its value causality ladder; scoring and frontier are computed by the application.",
    );
    x.stage.readyToAdvance = true;
    x.opportunities = [
      {
        title,
        icpName,
        variableName,
        painDescription: pain,
        problemStatement: `${icpName}s cannot control ${variableName.toLowerCase()}; the current state is UNKNOWN and alternatives are manual.`,
        mechanism,
        productHypothesis: `A ${mechanism.toLowerCase()} layer for ${icpName.toLowerCase()}s.`,
        valueProposition: `Move ${variableName.toLowerCase()} measurably for ${icpName.toLowerCase()}s without adding staff.`,
        metric: `${cap(variableName)} per month`,
        inputs: {
          importance: 7,
          painIntensity: 6,
          frequency: 6,
          gap: 6,
          willingnessToPay: 5,
          alternativeWeakness: 6,
        },
        inputJustification:
          "All inputs are HYPOTHESES proposed from the conversation; edit them and add evidence.",
        risks: [
          "Economic buyer is UNKNOWN",
          "Current state has never been measured",
          "Alternatives may be good enough",
        ],
        nextSteps: [
          "Add external evidence",
          "Interview 5 ICPs about the last occurrence",
          "Measure the current state",
        ],
      },
    ];
    x.valueChains = [valueChainFor(title, mechanism, variableName, icpName)];
    x.valueDimensions = [
      {
        opportunityTitle: title,
        importance: 7,
        magnitude: null,
        frequency: null,
        population: null,
        attributability: null,
        justification:
          "Importance mirrors the variable's hypothesized importance. Magnitude, frequency, population and attributability are UNKNOWN: nothing has been measured.",
        userStatedDimensions: [],
      },
    ];
    x.assumptions = [
      assumption(
        `If ${mechanism.toLowerCase()} is applied to the cases driving ${variableName.toLowerCase()}, the outcome of those cases changes.`,
        9,
        "CAUSAL",
        title,
        { fromLevel: "CAPABILITY", toLevel: "TRANSFORMATION" },
      ),
      assumption(
        `The movement of ${variableName.toLowerCase()} is worth enough money to justify a product.`,
        8,
        "VALUE",
        title,
        { fromLevel: "OPERATIONAL_VALUE", toLevel: "ECONOMIC_VALUE" },
      ),
      assumption(
        `The data needed for ${mechanism.toLowerCase()} exists and can be obtained.`,
        7,
        "FEASIBILITY",
        title,
        { fromLevel: "MECHANISM", toLevel: "CAPABILITY" },
      ),
      assumption(
        `${icpName}s would pay for a ${mechanism.toLowerCase()} solution.`,
        8,
        "WTP",
        title,
      ),
    ];
    x.questionCard = {
      question:
        "The first uncertainty beyond the problem is the causal link mechanism → outcome. Plan an experiment to test it?",
      options: [
        "Plan the pilot experiment",
        "Show me the opportunity report",
        "Explore another variable",
      ],
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        MOCK_LABEL,
        "",
        `Opportunity hypothesis formed: "${title}" anchored on "${mechanism}".`,
        "",
        "Value causality ladder (every level is a HYPOTHESIS until evidence is linked):",
        `- Mechanism: ${mechanism}`,
        `- Capability: identify the cases driving ${variableName.toLowerCase()} and act early`,
        `- Transformation: fewer cases end in an unrecoverable outcome`,
        `- Operational value: ${variableName.toLowerCase()} moves in the desired direction`,
        `- Economic value: the economic consequence shrinks`,
        `- Strategic outcome: the parent variable improves`,
        "",
        "Proposed inputs (0–10, HYPOTHESES): importance 7, pain 6, frequency 6, gap 6, willingness to pay 5, alternative weakness 6. Value Strength: importance 7; magnitude, frequency, population and attributability UNKNOWN — Value Strength is therefore INCOMPLETE.",
        "Four typed assumptions were added (causal, value, feasibility, WTP). The application computes Opportunity Potential, Evidence Confidence, Value Strength, Causal Confidence, the Proof Frontier and the verdict deterministically — see the Radar and the Value tab.",
      ].join("\n"),
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Value chain → experiment
  if (stage === "VALUE_CAUSALITY" || stage === "SCORING" || stage === "EXPERIMENT_DESIGN") {
    const title = existing.opportunities[0] ?? null;
    const variableName = existing.variables[0] ?? "the variable";
    const icpName = existing.icps[0] ?? "the ICP";
    const mechanism = existing.mechanisms[0] ?? "the intervention";
    if (/plan|pilot|experiment|test/i.test(message) && title) {
      const x = emptyExtraction(
        "RECOMMENDATION",
        "Experiment designed for the first unproven causal link.",
      );
      x.stage.readyToAdvance = true;
      x.experiments = [
        {
          opportunityTitle: title,
          title: `Controlled pilot: ${mechanism} vs current practice`,
          hypothesis: `If ${mechanism.toLowerCase()} is applied to the cases driving ${variableName.toLowerCase()}, ${variableName.toLowerCase()} moves in the desired direction compared with comparable cases handled as today.`,
          design: `With ${icpName.toLowerCase()}s who agree to a four-week pilot, split comparable cases into two groups: one handled as today, one with ${mechanism.toLowerCase()}. Record ${variableName.toLowerCase()} for both groups every week.`,
          successMetric: `${cap(variableName)} in the intervention group versus the control group, with the difference large enough to matter economically to the ${icpName.toLowerCase()}.`,
          causalLink: { fromLevel: "CAPABILITY", toLevel: "TRANSFORMATION" },
        },
      ];
      x.suggestedReplies = [
        "Show me the opportunity report",
        "Explore another variable",
        "What evidence should I collect first?",
      ];
      return {
        reply: [
          MOCK_LABEL,
          "",
          `Experiment planned for the causal link Capability → Transformation of "${title}":`,
          "",
          `- Hypothesis: ${x.experiments[0].hypothesis}`,
          `- Design: ${x.experiments[0].design}`,
          `- Success metric: ${x.experiments[0].successMetric}`,
          "",
          "When the pilot produces results, capture them as evidence linked to this causal link. The Proof Frontier moves only when linked evidence reaches the supported threshold.",
        ].join("\n"),
        extraction: x,
      };
    }
    const x = emptyExtraction("RECOMMENDATION", "Moving to recommendation.");
    x.stage.readyToAdvance = true;
    x.suggestedReplies = ["Plan the pilot experiment", "Explore another variable", "Add evidence"];
    return {
      reply: `${MOCK_LABEL}\n\nThe ladder for "${title ?? "the opportunity"}" is entirely hypothetical below the problem. The Radar shows the deterministic scores and the current Proof Frontier; the Value tab shows which causal link should be tested first.`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Recommendation / follow-ups
  const x = emptyExtraction("RECOMMENDATION", "Follow-up discussion.");
  x.suggestedReplies = ["Explore another variable", "Add evidence", "Generate the interview guide"];
  if (/another variable|other variable|next variable/i.test(message)) {
    x.stage.suggestedStage = "VARIABLE_DISCOVERY";
    x.stage.readyToAdvance = true;
    x.questionCard = {
      question: "Which variable should we investigate next?",
      options: existing.variables.slice(0, 4),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return { reply: `${MOCK_LABEL}\n\nWhich variable should we investigate next?`, extraction: x };
  }
  return {
    reply: `${MOCK_LABEL}\n\nThe workspace now holds structured hypotheses and a value causality ladder. Scores, the Proof Frontier and verdicts are computed from your inputs and the evidence you capture — nothing here counts as validation yet. The next best action is listed on each opportunity. You can explore another variable, add evidence, or generate an interview guide.`,
    extraction: x,
  };
}

function turnKey(h: TurnHints): string {
  return `${h.workspaceName}|${h.stage}|${h.turnIndex}|${h.userMessage}`;
}

export class MockProvider extends BaseAIProvider {
  readonly name = "mock";
  readonly model = "mock-templates";
  readonly isMock = true;
  private lastTurn: MockTurn | null = null;
  private lastTurnKey: string | null = null;

  async *chat(options: ChatOptions): AsyncIterable<string> {
    if (!options.hints) {
      yield `${MOCK_LABEL} No turn hints available.`;
      return;
    }
    this.lastTurn = buildMockTurn(options.hints);
    this.lastTurnKey = turnKey(options.hints);
    const words = this.lastTurn.reply.split(/(\s+)/);
    for (const w of words) {
      yield w;
    }
  }

  async structuredOutput<T>(options: StructuredOptions<T>): Promise<T> {
    if (options.schema === (DiscoveryExtractionSchema as unknown)) {
      const turn =
        this.lastTurn && options.hints && this.lastTurnKey === turnKey(options.hints)
          ? this.lastTurn
          : options.hints
            ? buildMockTurn(options.hints)
            : this.lastTurn;
      if (!turn) throw new Error("Mock provider has no turn to extract from.");
      return options.schema.parse(turn.extraction);
    }
    if (options.schema === (EvidenceSummarySchema as unknown)) {
      const content = options.messages.at(-1)?.content ?? "";
      return options.schema.parse({
        summary: `${MOCK_LABEL} Excerpt captured; signals must be confirmed manually.`,
        hasExplicitPain: /lose|lost|cost|waste|frustrat|problem|pain/i.test(content),
        hasEconomicImpact: /\$|€|£|per month|per week|revenue|cost/i.test(content),
        hasWorkaround: /spreadsheet|manual|whatsapp|by hand|workaround/i.test(content),
        hasPurchaseIntent: /pay|paid|bought|purchase|subscribe/i.test(content),
        isDirectCustomer: /interview|owner|customer said|we /i.test(content),
        sentiment: /doesn't matter|not a problem|no issue|fine as is/i.test(content)
          ? "NEGATIVE"
          : "NEUTRAL",
        strengthScore: 5,
        relevanceScore: 5,
        caveats: ["Mock summary. Confirm every signal before trusting the score."],
      });
    }
    if (options.schema === (InterviewGuideSchema as unknown)) {
      const ctx = options.messages.at(-1)?.content ?? "";
      const icp = ctx.match(/ICP: (.+)/)?.[1] ?? "the ICP";
      const pain = ctx.match(/Pain: (.+)/)?.[1] ?? "the problem";
      return options.schema.parse({
        title: `Discovery interview guide — ${icp}`,
        targetProfile: `${icp}; has experienced "${pain}" in the last 90 days.`,
        sections: [
          {
            name: "Context",
            questions: [
              "Walk me through a normal week. Where does your time go?",
              "Who else is involved when things go wrong?",
            ],
          },
          {
            name: "Last occurrence",
            questions: [
              `Tell me about the last time ${pain.toLowerCase()} happened.`,
              "What did you do, step by step?",
              "How much time did it take?",
            ],
          },
          {
            name: "Cost and impact",
            questions: [
              "What did it cost you — money, capacity, customers?",
              "What happened when it wasn't solved?",
            ],
          },
          {
            name: "Current alternatives",
            questions: [
              "What do you use today to deal with it?",
              "What is frustrating about that?",
            ],
          },
          {
            name: "Buying behavior",
            questions: [
              "Have you purchased anything to solve this?",
              "What triggered that purchase?",
              "Who signed off on it?",
            ],
          },
        ],
        listenFor: [
          "Specific numbers and dates",
          "Workarounds they built themselves",
          "Who actually controls the budget",
        ],
        avoid: [
          "Would you pay for this?",
          "Pitching the solution",
          "Leading questions about your idea",
        ],
      });
    }
    const schemaName = options.schemaName;
    const fallback: Record<string, unknown> = {
      market_map: { markets: [] },
      icp_map: { icps: [] },
      variable_map: { variables: [] },
      pain_analysis: { pains: [], triggers: [], alternatives: [] },
      mechanisms: { mechanisms: [] },
    };
    return options.schema.parse(fallback[schemaName] ?? {});
  }
}
