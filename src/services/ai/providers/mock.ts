/**
 * Mock AI provider.
 *
 * Deterministic, template-based and CLEARLY LABELLED. It exists so the whole
 * product (chat → structured state → scoring → verdict) works with no API key,
 * in tests and in demos. It is not intelligent: it follows the discovery stage
 * machine and turns the user's words into structured hypotheses.
 */
import type { DiscoveryStage } from "@/generated/prisma/enums";
import { BaseAIProvider } from "../base-provider";
import {
  DiscoveryExtractionSchema,
  EvidenceSummarySchema,
  InterviewGuideSchema,
  type DiscoveryExtraction,
} from "../schemas";
import type { ChatOptions, StructuredOptions, TurnHints, UserContext } from "../types";

export const MOCK_LABEL = "[MOCK PROVIDER — templated response, not analysis]";

interface VariableTemplate {
  name: string;
  category: DiscoveryExtraction["variables"][number]["category"];
  direction: DiscoveryExtraction["variables"][number]["desiredDirection"];
  importance: number;
}

const VARIABLE_LIBRARY: Array<{ match: RegExp; variables: VariableTemplate[] }> = [
  {
    match: /reception|call|phone|front desk|booking/i,
    variables: [
      { name: "Missed calls", category: "REVENUE", direction: "DECREASE", importance: 8 },
      { name: "Booking conversion", category: "CONVERSION", direction: "INCREASE", importance: 8 },
      { name: "Front desk labor cost", category: "COST", direction: "DECREASE", importance: 7 },
      { name: "Response time", category: "TIME", direction: "ACCELERATE", importance: 6 },
      { name: "No-show rate", category: "CAPACITY", direction: "DECREASE", importance: 7 },
    ],
  },
  {
    match: /salon|spa|barber|clinic|dental|dentist|physio|vet/i,
    variables: [
      { name: "No-show rate", category: "CAPACITY", direction: "DECREASE", importance: 8 },
      { name: "Idle chair capacity", category: "CAPACITY", direction: "INCREASE", importance: 7 },
      {
        name: "Employee revenue leakage",
        category: "REVENUE",
        direction: "DECREASE",
        importance: 8,
      },
      { name: "Customer retention", category: "RETENTION", direction: "INCREASE", importance: 7 },
      { name: "Inventory shrinkage", category: "INVENTORY", direction: "DECREASE", importance: 5 },
    ],
  },
  {
    match: /restaurant|cafe|bar|kitchen|food/i,
    variables: [
      { name: "Labor cost", category: "COST", direction: "DECREASE", importance: 9 },
      { name: "Food waste", category: "INVENTORY", direction: "DECREASE", importance: 8 },
      { name: "Table utilization", category: "CAPACITY", direction: "INCREASE", importance: 7 },
      { name: "No-shows", category: "CAPACITY", direction: "DECREASE", importance: 7 },
      { name: "Repeat visits", category: "RETENTION", direction: "INCREASE", importance: 6 },
    ],
  },
  {
    match: /logistic|fleet|delivery|truck|warehouse|shipping/i,
    variables: [
      { name: "Fuel cost per delivery", category: "COST", direction: "DECREASE", importance: 8 },
      { name: "Idle vehicle time", category: "CAPACITY", direction: "DECREASE", importance: 7 },
      { name: "Late deliveries", category: "QUALITY", direction: "DECREASE", importance: 8 },
      { name: "Driver churn", category: "RETENTION", direction: "DECREASE", importance: 6 },
      { name: "Damage claims", category: "RISK", direction: "DECREASE", importance: 5 },
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
      },
      { name: "Alert fatigue", category: "PRODUCTIVITY", direction: "DECREASE", importance: 7 },
      {
        name: "Audit preparation time",
        category: "COMPLIANCE",
        direction: "DECREASE",
        importance: 7,
      },
      { name: "Breach risk exposure", category: "RISK", direction: "DECREASE", importance: 8 },
      { name: "Analyst turnover", category: "RETENTION", direction: "DECREASE", importance: 5 },
    ],
  },
];

const DEFAULT_VARIABLES: VariableTemplate[] = [
  { name: "Revenue leakage", category: "REVENUE", direction: "DECREASE", importance: 8 },
  { name: "Labor cost", category: "COST", direction: "DECREASE", importance: 7 },
  { name: "Customer retention", category: "RETENTION", direction: "INCREASE", importance: 7 },
  { name: "Time to resolution", category: "TIME", direction: "ACCELERATE", importance: 6 },
  { name: "Error rate", category: "QUALITY", direction: "DECREASE", importance: 5 },
];

const CONTEXT_QUESTIONS: Array<{
  key: keyof UserContext;
  question: string;
  options: string[];
}> = [
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
    suggestedReplies: [],
    questionCard: null,
  };
}

interface MockTurn {
  reply: string;
  extraction: DiscoveryExtraction;
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
    x.variables = vars.map((v) => ({
      icpName,
      name: v.name,
      description: `Variable the solution "${mechanism}" might move. Importance is a HYPOTHESIS.`,
      category: v.category,
      desiredDirection: v.direction,
      importanceScore: v.importance,
      source: "AI_HYPOTHESIS",
    }));
    x.mechanisms = [
      {
        painDescription: null,
        name: mechanism,
        description: "The mechanism proposed by the user. Parked until the problem is understood.",
        category: /ai|agent|assistant|bot/i.test(mechanism) ? "AI_AGENT" : "OTHER",
      },
    ];
    x.assumptions = [
      {
        statement: `${icpName}s lose meaningful revenue or capacity because of ${vars[0].name.toLowerCase()}.`,
        importance: 9,
        opportunityTitle: null,
      },
      {
        statement: `The ${icpName.toLowerCase()} controls software purchasing decisions.`,
        importance: 8,
        opportunityTitle: null,
      },
      {
        statement: `Current workflows for ${vars[0].name.toLowerCase()} are insufficient.`,
        importance: 7,
        opportunityTitle: null,
      },
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
        "- Economic buyer: UNKNOWN. Reachability: UNKNOWN.",
        "",
        "Three assumptions were added to the ledger. Which variable is the idea really about?",
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
    const pending = CONTEXT_QUESTIONS.find((q) =>
      q.key === "businessModel"
        ? ctx.businessModel === "UNKNOWN"
        : (ctx[q.key] as string[]).length === 0,
    );
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
                  : "UNKNOWN";
        if (ctx.businessModel === "UNKNOWN") ctx.businessModel = "EITHER";
      } else {
        (ctx[pending.key] as string[]) = splitList(message).length
          ? splitList(message)
          : [message.slice(0, 80)];
      }
    }
    const next = CONTEXT_QUESTIONS.find((q) =>
      q.key === "businessModel"
        ? ctx.businessModel === "UNKNOWN"
        : (ctx[q.key] as string[]).length === 0,
    );
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

    // Enough context → propose markets.
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
    const ownerName = `${singular(marketName.replace(/^independent\s+/i, ""))} owner`;
    x.icps = [
      {
        marketName,
        name: cap(ownerName),
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
        name: `${cap(singular(marketName.replace(/^independent\s+/i, "")))} manager (multi-site)`,
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
    x.variables = vars.map((v) => ({
      icpName,
      name: v.name,
      description: `Valuable variable for ${icpName}. Importance is a HYPOTHESIS.`,
      category: v.category,
      desiredDirection: v.direction,
      importanceScore: v.importance,
      source: "AI_HYPOTHESIS",
    }));
    x.questionCard = {
      question: "Which variable should we investigate first?",
      options: vars.slice(0, 4).map((v) => v.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${MOCK_LABEL}\n\nICP: ${icpName}.\n\nVariable map (importance 0–10, HYPOTHESIS):\n${vars.map((v) => `- ${v.name} — ${v.importance}`).join("\n")}\n\nWhich variable should we investigate first?`,
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
      {
        statement: `${cap(variableName)} costs ${icpName}s meaningful money every month.`,
        importance: 9,
        opportunityTitle: null,
      },
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
        `${tolerated ? "You said the pain is tolerated or unknown — that lowers urgency (trigger urgency 4/10)." : "Noted as a FACT from you: it happens weekly and costs money."}`,
        "",
        "Triggers (HYPOTHESIS): demand-period spikes; loud complaints reaching the owner.",
        "Current alternatives (HYPOTHESIS): manual follow-up (weakness 7), spreadsheet (6), generic software (5).",
        "",
        "Evidence Confidence is 0 until you capture external evidence. Useful research: forum threads where owners describe this problem, competitor reviews mentioning it, and job postings that pay someone to handle it.",
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

  // ---------------------------------------------------------------- Mechanism → opportunity
  if (stage === "MECHANISM_DISCOVERY" || stage === "OPPORTUNITY_FORMATION") {
    const mechanism =
      pickByMessage(existing.mechanisms, message) ?? existing.mechanisms[0] ?? "Automation";
    const icpName = existing.icps[0] ?? "the ICP";
    const variableName = existing.variables[0] ?? "the variable";
    const pain = existing.pains[0] ?? null;
    const title = `${cap(variableName)} for ${icpName.toLowerCase()}s`;
    const x = emptyExtraction(
      "RECOMMENDATION",
      "Opportunity formed; scoring is computed by the application.",
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
    x.assumptions = [
      {
        statement: `${icpName}s would pay for a ${mechanism.toLowerCase()} solution.`,
        importance: 8,
        opportunityTitle: title,
      },
      {
        statement: `The chosen mechanism actually moves ${variableName.toLowerCase()}.`,
        importance: 7,
        opportunityTitle: title,
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
        `Opportunity hypothesis formed: "${title}" anchored on "${mechanism}".`,
        "",
        "Proposed inputs (0–10, all HYPOTHESES): importance 7, pain 6, frequency 6, gap 6, willingness to pay 5, alternative weakness 6.",
        "The application computes Opportunity Potential, Evidence Confidence and the verdict deterministically — see the Opportunity Radar. With no evidence, expect RESEARCH, not BUILD.",
      ].join("\n"),
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
    reply: `${MOCK_LABEL}\n\nThe workspace now holds structured hypotheses. Verdicts are computed from your inputs and the evidence you capture — nothing here counts as validation yet. Next best actions are listed on each opportunity card. You can explore another variable, add evidence, or generate an interview guide.`,
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
    // Stream in word chunks so the UI streaming path is exercised.
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
    // Generic fallback for the map generators.
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
