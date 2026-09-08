/**
 * Mock AI provider.
 *
 * Deterministic, template-based and CLEARLY LABELLED. It exists so the whole
 * product (chat → structured state → scoring → frontier → verdict) works with
 * no API key, in tests and in demos. It is not intelligent: it follows the
 * discovery stage machine and turns the user's words into structured
 * hypotheses. It never emits evidence, never fills a value dimension it has no
 * basis for (null = UNKNOWN), and never states a score, frontier or verdict.
 *
 * It speaks the conversation locale (`hints.locale`): every sentence, option
 * and extracted text lives in the "mock" dictionary section, so the French
 * templates sit next to the English ones. The English templates are the
 * exact sentences the mock always produced — tests assert on them.
 */
import type { DiscoveryStage, ValueChainLevel } from "@/generated/prisma/enums";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { renderKey, type MessageParams } from "@/i18n/messages";
import { BaseAIProvider } from "../base-provider";
import {
  DiscoveryExtractionSchema,
  EvidenceSummarySchema,
  InterviewGuideSchema,
  type DiscoveryExtraction,
} from "../schemas";
import type { ChatOptions, StructuredOptions, TurnHints, UserContext } from "../types";

export const MOCK_LABEL = "[MOCK PROVIDER — templated response, not analysis]";

/** The mock banner in the conversation locale (English: MOCK_LABEL). */
export function mockLabel(locale: Locale): string {
  return tx(locale, "label");
}

/** Render a "mock.*" dictionary key in the locale. */
function tx(locale: Locale, key: string, params?: MessageParams): string {
  return renderKey(locale, `mock.${key}`, params);
}

type VariableDraft = DiscoveryExtraction["variables"][number];
type AssumptionDraft = DiscoveryExtraction["assumptions"][number];

interface VariableTemplate {
  /** Key under "mock.variables": name, type, target, unit and parent live in the dictionary. */
  key: string;
  category: VariableDraft["category"];
  direction: VariableDraft["desiredDirection"];
  importance: number;
}

interface LocalizedVariable extends VariableTemplate {
  name: string;
  /** What is directly moved (open taxonomy); distinct from the economic category. */
  type: string;
  target: string;
  unit: string;
  parent: string;
}

function v(
  key: string,
  category: VariableDraft["category"],
  direction: VariableDraft["desiredDirection"],
  importance: number,
): VariableTemplate {
  return { key, category, direction, importance };
}

/**
 * Industry → candidate variables. The patterns accept the French words a
 * French user or the French context options would use (accented forms only
 * where the unaccented word is also English, so English routing is unchanged).
 */
const VARIABLE_LIBRARY: Array<{ match: RegExp; variables: VariableTemplate[] }> = [
  {
    match:
      /r[ée]ception|call|phone|front desk|booking|accueil|appels?\b|t[ée]l[ée]phon|réservation|rendez-vous/i,
    variables: [
      v("missedCalls", "REVENUE", "DECREASE", 8),
      v("bookingConversion", "CONVERSION", "INCREASE", 8),
      v("frontDeskLaborCost", "COST", "DECREASE", 7),
      v("responseTime", "TIME", "ACCELERATE", 6),
      v("noShowRate", "CAPACITY", "DECREASE", 7),
    ],
  },
  {
    match:
      /salon|spa|barber|clinic|dental|dentist|physio|vet|coiff|clinique|dentaire|kin[ée]|vétérinaire|esth[ée]tique|institut de beaut/i,
    variables: [
      v("noShowRate", "CAPACITY", "DECREASE", 8),
      v("idleChairCapacity", "UTILIZATION", "DECREASE", 7),
      v("employeeRevenueLeakage", "REVENUE", "DECREASE", 8),
      v("clientRetention", "RETENTION", "INCREASE", 7),
      v("inventoryShrinkage", "INVENTORY", "DECREASE", 5),
    ],
  },
  {
    match: /restaurant|cafe|bar|kitchen|food|café|restauration|alimentaire|traiteur/i,
    variables: [
      v("kitchenLaborCost", "COST", "DECREASE", 9),
      v("foodWaste", "COST", "DECREASE", 8),
      v("tableUtilization", "UTILIZATION", "INCREASE", 7),
      v("noShows", "CAPACITY", "DECREASE", 7),
      v("repeatVisits", "RETENTION", "INCREASE", 6),
    ],
  },
  {
    match:
      /logistic|fleet|delivery|truck|warehouse|shipping|logistique|flotte|livraison|camion|entrepôt|expédition|transporteur/i,
    variables: [
      v("fuelCostPerDelivery", "COST", "DECREASE", 8),
      v("idleVehicleTime", "UTILIZATION", "DECREASE", 7),
      v("lateDeliveries", "RELIABILITY", "DECREASE", 8),
      v("driverChurn", "RETENTION", "DECREASE", 6),
      v("damageClaims", "RISK", "DECREASE", 5),
    ],
  },
  {
    match:
      /security|cyber|soc|incident|breach|compliance|sécurité|conformité|piratage|fuite de donn/i,
    variables: [
      v("incidentResolutionTime", "TIME", "ACCELERATE", 9),
      v("alertFatigue", "PRODUCTIVITY", "DECREASE", 7),
      v("auditPreparationTime", "COMPLIANCE", "DECREASE", 7),
      v("breachRiskExposure", "RISK", "DECREASE", 8),
      v("analystTurnover", "RETENTION", "DECREASE", 5),
    ],
  },
];

const DEFAULT_VARIABLES: VariableTemplate[] = [
  v("revenueLeakage", "REVENUE", "DECREASE", 8),
  v("manualLaborCost", "COST", "DECREASE", 7),
  v("customerRetention", "RETENTION", "INCREASE", 7),
  v("timeToResolution", "TIME", "ACCELERATE", 6),
  v("errorRate", "QUALITY", "DECREASE", 5),
];

interface ContextQuestion {
  key: keyof UserContext;
  /** Dictionary node under "mock.context" holding `question` and `options.*`. */
  node: string;
  options: string[];
}

const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    key: "industries",
    node: "industries",
    options: ["localServices", "b2bSoftware", "logistics", "healthcare"],
  },
  {
    key: "audiences",
    node: "audiences",
    options: ["smallBusinessOwners", "engineeringManagers", "operationsStaff", "nobody"],
  },
  { key: "businessModel", node: "businessModel", options: ["b2b", "b2c", "either"] },
  {
    key: "productPreferences",
    node: "productPreferences",
    options: ["software", "ai", "marketplace", "open"],
  },
  {
    key: "technicalStrengths",
    node: "technicalStrengths",
    options: ["backend", "fullStack", "machineLearning", "mobile"],
  },
];

function contextQuestion(
  locale: Locale,
  q: ContextQuestion,
): { question: string; options: string[] } {
  return {
    question: tx(locale, `context.${q.node}.question`),
    options: q.options.map((o) => tx(locale, `context.${q.node}.options.${o}`)),
  };
}

/**
 * Split a free-text list on commas, semicolons, slashes, "and" / "or" (and
 * "et" / "ou" in French) and newlines. Separators inside parentheses never
 * split: "Local services (salons, clinics, restaurants)" stays one item.
 */
export function splitList(text: string, locale: Locale = DEFAULT_LOCALE): string[] {
  const groups: string[] = [];
  const masked = text.replace(/\([^()]*\)/g, (group) => {
    groups.push(group);
    return `\uE000${groups.length - 1}\uE001`;
  });
  const separator =
    locale === "fr" ? /,|;|\band\b|\bor\b|\bet\b|\bou\b|\/|\n/i : /,|;|\band\b|\bor\b|\/|\n/i;
  return masked
    .split(separator)
    .map((s) => s.replace(/\uE000(\d+)\uE001/g, (_, i: string) => groups[Number(i)]).trim())
    .filter((s) => s.length > 1 && s.length < 80)
    .slice(0, 6);
}

/** "Local services (salons, clinics)" → "Local services" — for names built from a list item. */
function stripParenthetical(text: string): string {
  return text.replace(/\s*\([^()]*\)/g, "").trim();
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

/**
 * French number: nouns and adjectives agree, so every word of the head noun
 * phrase changes ("clinique dentaire" ↔ "cliniques dentaires") until the first
 * preposition or article ("salon de coiffure" ↔ "salons de coiffure").
 * Acronyms (PME, ICP, UNKNOWN) and words with digits or brackets stay as they are.
 */
const FR_FUNCTION_WORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "en",
  "à",
  "au",
  "aux",
  "et",
  "ou",
  "pour",
  "sur",
  "dans",
  "par",
  "avec",
  "sans",
  "chez",
  "un",
  "une",
  "—",
  "-",
]);

function isFrFunctionWord(word: string): boolean {
  const bare = word.replace(/^[(«"']+|[)»"',.;:!?]+$/g, "").toLowerCase();
  return FR_FUNCTION_WORDS.has(bare) || /^[dlsjmntc]['’]/.test(bare);
}

function mapFrHead(phrase: string, fn: (word: string) => string): string {
  let head = true;
  return phrase
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (head && isFrFunctionWord(word)) head = false;
      if (!head || !/^[\p{L}’'-]+$/u.test(word) || /^\p{Lu}{2,}$/u.test(word)) return word;
      return fn(word);
    })
    .join(" ");
}

function singularFr(phrase: string): string {
  return mapFrHead(phrase, (w) => {
    if (/eaux$/i.test(w)) return w.slice(0, -1);
    if (/aux$/i.test(w)) return w.slice(0, -3) + "al";
    if (/s$/i.test(w) && !/ss$/i.test(w) && w.length > 3) return w.slice(0, -1);
    return w;
  });
}

function pluralFr(phrase: string): string {
  return mapFrHead(phrase, (w) => {
    if (/[sxz]$/i.test(w)) return w;
    if (/eau$/i.test(w)) return w + "x";
    if (/al$/i.test(w) && w.length > 3) return w.slice(0, -2) + "aux";
    return w + "s";
  });
}

function singularFor(locale: Locale, word: string): string {
  return locale === "fr" ? singularFr(word) : singular(word);
}

function pluralFor(locale: Locale, word: string): string {
  return locale === "fr" ? pluralFr(word) : plural(word);
}

/** French "de" elides before a vowel: "de clinique", "d’agence". */
function deFr(word: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(word) ? "d’" : "de ";
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Lower-case the first letter unless the phrase opens with an acronym (PME, ICP). */
function uncap(s: string): string {
  return /^\p{Lu}{2,}/u.test(s) || !s ? s : s[0].toLowerCase() + s.slice(1);
}

function variablesFor(locale: Locale, context: string): LocalizedVariable[] {
  const hit = VARIABLE_LIBRARY.find((entry) => entry.match.test(context));
  return (hit ? hit.variables : DEFAULT_VARIABLES).map((t) => ({
    ...t,
    name: tx(locale, `variables.${t.key}.name`),
    type: tx(locale, `variables.${t.key}.type`),
    target: tx(locale, `variables.${t.key}.target`),
    unit: tx(locale, `variables.${t.key}.unit`),
    parent: tx(locale, `variables.${t.key}.parent`),
  }));
}

/** Parse "X for Y" / "X pour Y" / "helps Y ..." idea statements. */
export function decomposeIdea(
  statement: string,
  locale: Locale = DEFAULT_LOCALE,
): { mechanism: string; icp: string } {
  const s = statement
    .replace(/^i (want|would like) to build\s+/i, "")
    .replace(/^je (veux|voudrais|souhaite|aimerais) (construire|créer|développer|lancer)\s+/i, "")
    .trim();
  const m = s.match(/^(.+?)\s+(?:for|pour aider|pour|to help|that helps|helping)\s+(.+?)[.!]?$/i);
  if (m) {
    const icp =
      locale === "fr" ? m[2].trim().replace(/^(les|des|la|le|l['’]|un|une)\s*/i, "") : m[2].trim();
    return { mechanism: cap(m[1].trim()), icp };
  }
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

/** Template parameters describing the ICP in every form the sentences need. */
function icpParams(locale: Locale, icpName: string): MessageParams {
  return {
    icp: icpName,
    icpLower: icpName.toLowerCase(),
    icpCap: cap(icpName),
    icpPlural: pluralFor(locale, icpName).toLowerCase(),
  };
}

/** Template parameters describing the variable in every form the sentences need. */
function variableParams(variableName: string): MessageParams {
  return {
    variable: cap(variableName),
    variableRaw: variableName,
    variableLower: variableName.toLowerCase(),
    variableLowerCap: cap(variableName.toLowerCase()),
  };
}

function mechanismParams(mechanism: string): MessageParams {
  return { mechanism, mechanismLower: mechanism.toLowerCase() };
}

function variableDraft(icpName: string, v: LocalizedVariable, description: string): VariableDraft {
  return {
    icpName,
    name: v.name,
    description,
    category: v.category,
    variableType: v.type,
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
  locale: Locale,
  title: string,
  mechanism: string,
  variableName: string,
  icpName: string,
): DiscoveryExtraction["valueChains"][number] {
  const p = { ...icpParams(locale, icpName), ...variableParams(variableName), mechanism };
  const statements: Record<ValueChainLevel, string> = {
    MECHANISM: mechanism,
    CAPABILITY: tx(locale, "opportunity.ladder.capability", p),
    TRANSFORMATION: tx(locale, "opportunity.ladder.transformation", p),
    OPERATIONAL_VALUE: tx(locale, "opportunity.ladder.operationalValue", p),
    ECONOMIC_VALUE: tx(locale, "opportunity.ladder.economicValue", p),
    STRATEGIC_OUTCOME: tx(locale, "opportunity.ladder.strategicOutcome", p),
    BUSINESS_OUTCOME: "",
  };
  const links: DiscoveryExtraction["valueChains"][number]["links"] = [];
  const linkStatements: Record<string, string> = {
    "MECHANISM->CAPABILITY": tx(locale, "opportunity.ladder.linkMechanismCapability", p),
    "CAPABILITY->TRANSFORMATION": tx(locale, "opportunity.ladder.linkCapabilityTransformation", p),
    "TRANSFORMATION->OPERATIONAL_VALUE": tx(
      locale,
      "opportunity.ladder.linkTransformationOperational",
      p,
    ),
    "OPERATIONAL_VALUE->ECONOMIC_VALUE": tx(
      locale,
      "opportunity.ladder.linkOperationalEconomic",
      p,
    ),
    "ECONOMIC_VALUE->STRATEGIC_OUTCOME": tx(locale, "opportunity.ladder.linkEconomicStrategic", p),
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

/**
 * "Independent local services" ↔ "Services de proximité — indépendants".
 * English normalises the number; French sector names are often mass nouns
 * ("logistique", "santé"), so the industry is kept as the user wrote it.
 */
function candidateMarketName(locale: Locale, industry: string): string {
  const base = stripParenthetical(industry);
  const name = locale === "fr" ? cap(base) : plural(singular(base)).toLowerCase();
  return tx(locale, "market.candidateName", { industry: name });
}

/** Inverse of candidateMarketName, singular: the noun the ICP names are built on. */
function marketBaseName(locale: Locale, marketName: string): string {
  const stripped =
    locale === "fr"
      ? marketName.replace(/\s+—\s+indépendants$/i, "")
      : marketName.replace(/^independent\s+/i, "");
  return singularFor(locale, stripped);
}

export function buildMockTurn(hints: TurnHints): MockTurn {
  const { stage, entryMode, existing } = hints;
  const locale: Locale = hints.locale ?? DEFAULT_LOCALE;
  const label = mockLabel(locale);
  const message = hints.userMessage.trim();

  if (!entryMode) {
    const x = emptyExtraction("START", tx(locale, "start.reasoning"));
    x.questionCard = {
      question: tx(locale, "start.question"),
      options: [tx(locale, "start.options.noIdea"), tx(locale, "start.options.hasIdea")],
      allowFreeText: false,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${label}\n\n${tx(locale, "start.reply")}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- HAS_IDEA first turn
  if (entryMode === "HAS_IDEA" && existing.markets.length === 0) {
    const idea = hints.ideaStatement || message;
    const { mechanism, icp } = decomposeIdea(idea, locale);
    const icpName =
      icp === "UNKNOWN" ? tx(locale, "idea.unknownIcp") : cap(singularFor(locale, icp));
    const marketName =
      icp === "UNKNOWN" ? tx(locale, "idea.unknownMarket") : cap(pluralFor(locale, icp));
    const vars = variablesFor(locale, idea);
    const p = {
      ...icpParams(locale, icpName),
      ...variableParams(vars[0].name),
      ...mechanismParams(mechanism),
      idea,
      market: marketName,
    };
    const x = emptyExtraction("VARIABLE_DISCOVERY", tx(locale, "idea.reasoning"));
    x.stage.readyToAdvance = true;
    x.markets = [
      {
        name: marketName,
        description: tx(locale, "idea.marketDescription", p),
        attractivenessNotes: tx(locale, "idea.marketNotes"),
        source: icp === "UNKNOWN" ? "AI_HYPOTHESIS" : "USER",
      },
    ];
    x.icps = [
      {
        marketName,
        name: icpName,
        role: tx(locale, "idea.icpRole"),
        companyType: marketName,
        companySize: "UNKNOWN",
        responsibilities: "UNKNOWN",
        economicBuyer: tx(locale, "idea.icpEconomicBuyer"),
        userRole: "UNKNOWN",
        reachability: "UNKNOWN",
        notes: tx(locale, "idea.icpNotes", p),
        source: icp === "UNKNOWN" ? "AI_HYPOTHESIS" : "USER",
      },
    ];
    x.variables = vars.map((v) =>
      variableDraft(icpName, v, tx(locale, "idea.variableDescription", p)),
    );
    x.mechanisms = [
      {
        painDescription: null,
        name: mechanism,
        description: tx(locale, "idea.mechanismDescription"),
        category: /ai|agent|assistant|bot/i.test(mechanism) ? "AI_AGENT" : "OTHER",
      },
    ];
    x.assumptions = [
      assumption(tx(locale, "idea.assumptionValue", p), 9, "VALUE"),
      assumption(tx(locale, "idea.assumptionAccess", p), 8, "ACCESS"),
      assumption(tx(locale, "idea.assumptionGeneric", p), 7, "GENERIC"),
    ];
    x.questionCard = {
      question: tx(locale, "idea.question"),
      options: vars.slice(0, 4).map((v) => v.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        label,
        "",
        tx(locale, "idea.reply.intro", p),
        "",
        tx(locale, "idea.reply.icp", {
          ...p,
          basis: icp === "UNKNOWN" ? "HYPOTHESIS" : tx(locale, "idea.factFromStatement"),
        }),
        tx(locale, "idea.reply.market", p),
        tx(locale, "idea.reply.variables", {
          variables: vars
            .map((v) =>
              tx(locale, "idea.reply.variableItem", { name: v.name, importance: v.importance }),
            )
            .join(", "),
        }),
        tx(locale, "idea.reply.unknowns"),
        "",
        tx(locale, "idea.reply.outro"),
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
    const isKickoff =
      /don't know what to build|dont know what to build|^start$|ne sais pas quoi construire|^(démarrer|commencer)$/i.test(
        message,
      );
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
            : /either|both|open|les deux|peu importe|indiff[ée]rent|ouvert/i.test(message)
              ? "EITHER"
              : /b2c/i.test(message)
                ? "B2C"
                : /b2b/i.test(message)
                  ? "B2B"
                  : "EITHER";
      } else {
        (ctx[pending.key] as string[]) = splitList(message, locale).length
          ? splitList(message, locale)
          : [message.slice(0, 80)];
      }
    }
    const next = pendingOf();
    const enough =
      ctx.industries.length > 0 && ctx.audiences.length > 0 && ctx.businessModel !== "UNKNOWN";

    if (!enough && next) {
      const { question, options } = contextQuestion(locale, next);
      const x = emptyExtraction("USER_CONTEXT", tx(locale, "context.reasoning"));
      x.userContext = ctx;
      x.questionCard = { question, options, allowFreeText: true };
      x.suggestedReplies = options;
      return {
        reply: `${label}\n\n${isKickoff ? `${tx(locale, "context.kickoff")}\n\n` : `${tx(locale, "context.noted")}\n\n`}${question}`,
        extraction: x,
      };
    }

    const base = ctx.industries.slice(0, 3);
    const markets = base.map((ind) => ({
      name: candidateMarketName(locale, ind),
      description: tx(locale, "market.candidateDescription", {
        industry: ind.toLowerCase(),
        audience: ctx.audiences[0] ?? tx(locale, "context.yourNetwork"),
      }),
      attractivenessNotes: tx(locale, "market.candidateNotes"),
      source: "AI_HYPOTHESIS" as const,
    }));
    if (markets.length < 2) {
      markets.push({
        name: tx(locale, "market.fallbackName"),
        description: tx(locale, "market.fallbackDescription"),
        attractivenessNotes: tx(locale, "market.fallbackNotes"),
        source: "AI_HYPOTHESIS",
      });
    }
    const x = emptyExtraction("MARKET_SELECTION", tx(locale, "market.reasoning"));
    x.stage.readyToAdvance = true;
    x.userContext = ctx;
    x.markets = markets;
    x.questionCard = {
      question: tx(locale, "market.question"),
      options: markets.map((m) => m.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        label,
        "",
        tx(locale, "market.reply.context", {
          industries: ctx.industries.join(", "),
          audiences: ctx.audiences.join(", "),
          model: ctx.businessModel,
        }),
        "",
        tx(locale, "market.reply.heading"),
        ...markets.map((m) =>
          tx(locale, "market.reply.item", { name: m.name, notes: m.attractivenessNotes }),
        ),
        "",
        tx(locale, "market.reply.outro"),
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
    const x = emptyExtraction("ICP_DISCOVERY", tx(locale, "icp.reasoning"));
    x.stage.readyToAdvance = true;
    if (!chosen) {
      x.markets = [
        {
          name: marketName,
          description: tx(locale, "icp.userMarketDescription"),
          attractivenessNotes: "UNKNOWN",
          source: "USER",
        },
      ];
    }
    const baseName = marketBaseName(locale, marketName);
    const p = {
      base: cap(baseName),
      baseLower: uncap(baseName),
      de: deFr(baseName),
      market: marketName,
    };
    x.icps = [
      {
        marketName,
        name: tx(locale, "icp.ownerName", p),
        role: tx(locale, "icp.ownerRole"),
        companyType: marketName,
        companySize: tx(locale, "icp.ownerCompanySize"),
        responsibilities: tx(locale, "icp.ownerResponsibilities"),
        economicBuyer: tx(locale, "icp.ownerEconomicBuyer"),
        userRole: tx(locale, "icp.ownerUserRole"),
        reachability: "UNKNOWN",
        notes: tx(locale, "icp.ownerNotes"),
        source: "AI_HYPOTHESIS",
      },
      {
        marketName,
        name: tx(locale, "icp.managerName", p),
        role: tx(locale, "icp.managerRole"),
        companyType: tx(locale, "icp.managerCompanyType", p),
        companySize: tx(locale, "icp.managerCompanySize"),
        responsibilities: tx(locale, "icp.managerResponsibilities"),
        economicBuyer: tx(locale, "icp.managerEconomicBuyer"),
        userRole: tx(locale, "icp.managerUserRole"),
        reachability: "UNKNOWN",
        notes: null,
        source: "AI_HYPOTHESIS",
      },
    ];
    x.questionCard = {
      question: tx(locale, "icp.question"),
      options: x.icps.map((i) => i.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${label}\n\n${tx(locale, "icp.reply", { market: marketName, owner: x.icps[0].name, manager: x.icps[1].name })}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- ICP chosen → variable map
  if (stage === "ICP_DISCOVERY" || (existing.variables.length === 0 && existing.icps.length > 0)) {
    const icpName = pickByMessage(existing.icps, message) ?? existing.icps[0];
    const vars = variablesFor(locale, `${icpName} ${existing.markets.join(" ")} ${message}`);
    const x = emptyExtraction("VARIABLE_DISCOVERY", tx(locale, "variable.reasoning"));
    x.stage.readyToAdvance = true;
    x.variables = vars.map((v) =>
      variableDraft(icpName, v, tx(locale, "variable.description", { icp: icpName })),
    );
    x.questionCard = {
      question: tx(locale, "variable.question"),
      options: vars.slice(0, 4).map((v) => v.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    const lines = vars
      .map((v) =>
        tx(locale, "variable.line", {
          action:
            locale === DEFAULT_LOCALE
              ? cap(v.direction.toLowerCase())
              : renderKey(locale, `labels.direction.${v.direction}`),
          name: v.name,
          target: v.target.toLowerCase(),
          importance: v.importance,
        }),
      )
      .join("\n");
    return {
      reply: `${label}\n\n${tx(locale, "variable.reply", { icp: icpName, lines })}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Variable chosen → pains
  if (
    stage === "VARIABLE_DISCOVERY" ||
    (existing.pains.length === 0 && existing.variables.length > 0)
  ) {
    const variableName = pickByMessage(existing.variables, message) ?? existing.variables[0];
    const icpName = existing.icps[0] ?? tx(locale, "fallback.icp");
    const p = { ...icpParams(locale, icpName), ...variableParams(variableName) };
    const x = emptyExtraction("PAIN_DISCOVERY", tx(locale, "pain.reasoning"));
    x.stage.readyToAdvance = true;
    x.pains = [
      {
        variableName,
        description: tx(locale, "pain.description", p),
        severityScore: 7,
        frequencyScore: 7,
        currentState: tx(locale, "pain.currentState"),
        desiredState: tx(locale, "pain.desiredState"),
        gapDescription: tx(locale, "pain.gap"),
        source: "AI_HYPOTHESIS",
      },
    ];
    x.assumptions = [assumption(tx(locale, "pain.assumption", p), 9, "VALUE")];
    x.questionCard = {
      question: tx(locale, "pain.question", p),
      options: [
        tx(locale, "pain.options.weekly"),
        tx(locale, "pain.options.tolerated"),
        tx(locale, "pain.options.unknown"),
      ],
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: `${label}\n\n${tx(locale, "pain.reply", { ...p, question: x.questionCard.question })}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Pain → triggers + alternatives
  if (stage === "PAIN_DISCOVERY" || stage === "TRIGGER_DISCOVERY") {
    const pain = existing.pains[0];
    const variableName = existing.variables[0] ?? tx(locale, "fallback.variable");
    const p = variableParams(variableName);
    const tolerated =
      /tolerate|not a big deal|rare|don't know|dont know|tol[èe]r|pas grave|sais pas/i.test(
        message,
      );
    const x = emptyExtraction("EVIDENCE_DISCOVERY", tx(locale, "trigger.reasoning"));
    x.stage.readyToAdvance = true;
    x.triggers = [
      {
        painDescription: pain,
        description: tx(locale, "trigger.spike", p),
        urgencyScore: tolerated ? 4 : 7,
        frequency: tolerated ? "UNKNOWN" : tx(locale, "trigger.weekly"),
        source: tolerated ? "AI_HYPOTHESIS" : "USER",
      },
      {
        painDescription: pain,
        description: tx(locale, "trigger.complaint"),
        urgencyScore: 6,
        frequency: "UNKNOWN",
        source: "AI_HYPOTHESIS",
      },
    ];
    x.alternatives = [
      {
        painDescription: pain,
        name: tx(locale, "trigger.manual.name"),
        category: "MANUAL_PROCESS",
        description: tx(locale, "trigger.manual.description"),
        costEstimate: tx(locale, "trigger.manual.cost"),
        weaknessDescription: tx(locale, "trigger.manual.weakness"),
        weaknessScore: 7,
        source: "AI_HYPOTHESIS",
      },
      {
        painDescription: pain,
        name: tx(locale, "trigger.spreadsheet.name"),
        category: "SPREADSHEET",
        description: tx(locale, "trigger.spreadsheet.description"),
        costEstimate: tx(locale, "trigger.spreadsheet.cost"),
        weaknessDescription: tx(locale, "trigger.spreadsheet.weakness"),
        weaknessScore: 6,
        source: "AI_HYPOTHESIS",
      },
      {
        painDescription: pain,
        name: tx(locale, "trigger.software.name"),
        category: "COMPETITOR_SOFTWARE",
        description: tx(locale, "trigger.software.description"),
        costEstimate: "UNKNOWN",
        weaknessDescription: tx(locale, "trigger.software.weakness"),
        weaknessScore: 5,
        source: "AI_HYPOTHESIS",
      },
    ];
    x.questionCard = {
      question: tx(locale, "trigger.question"),
      options: [tx(locale, "trigger.options.hypotheses"), tx(locale, "trigger.options.evidence")],
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return {
      reply: [
        label,
        "",
        tolerated ? tx(locale, "trigger.reply.tolerated") : tx(locale, "trigger.reply.fact"),
        "",
        tx(locale, "trigger.reply.triggers"),
        tx(locale, "trigger.reply.alternatives"),
        "",
        tx(locale, "trigger.reply.evidence"),
      ].join("\n"),
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Alternatives/evidence → mechanisms
  if (stage === "ALTERNATIVE_DISCOVERY" || stage === "EVIDENCE_DISCOVERY") {
    const pain = existing.pains[0] ?? null;
    const variableName = existing.variables[0] ?? tx(locale, "fallback.variable");
    const p = variableParams(variableName);
    const x = emptyExtraction("MECHANISM_DISCOVERY", tx(locale, "mechanism.reasoning"));
    x.stage.readyToAdvance = true;
    const mechanism = (
      node: string,
      category: DiscoveryExtraction["mechanisms"][number]["category"],
    ) => ({
      painDescription: pain,
      name: tx(locale, `mechanism.${node}.name`, p),
      description: tx(locale, `mechanism.${node}.description`),
      category,
    });
    x.mechanisms = [
      mechanism("reminders", "AUTOMATION"),
      mechanism("prediction", "PREDICTION"),
      mechanism("policy", "OTHER"),
      mechanism("dashboard", "MONITORING"),
      mechanism("service", "OTHER"),
    ];
    x.questionCard = {
      question: tx(locale, "mechanism.question"),
      options: x.mechanisms.slice(0, 4).map((m) => m.name),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    const lines = x.mechanisms
      .map((m) => tx(locale, "mechanism.line", { name: m.name, category: m.category }))
      .join("\n");
    return {
      reply: `${label}\n\n${tx(locale, "mechanism.reply", { ...p, lines })}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Mechanism → opportunity + value chain
  if (stage === "MECHANISM_DISCOVERY" || stage === "OPPORTUNITY_FORMATION") {
    const mechanism =
      pickByMessage(existing.mechanisms, message) ??
      existing.mechanisms[0] ??
      tx(locale, "fallback.automation");
    const icpName = existing.icps[0] ?? tx(locale, "fallback.icp");
    const variableName = existing.variables[0] ?? tx(locale, "fallback.variable");
    const pain = existing.pains[0] ?? null;
    const p = {
      ...icpParams(locale, icpName),
      ...variableParams(variableName),
      ...mechanismParams(mechanism),
    };
    const title = tx(locale, "opportunity.title", p);
    const x = emptyExtraction("EXPERIMENT_DESIGN", tx(locale, "opportunity.reasoning"));
    x.stage.readyToAdvance = true;
    x.opportunities = [
      {
        title,
        icpName,
        variableName,
        painDescription: pain,
        problemStatement: tx(locale, "opportunity.problemStatement", p),
        mechanism,
        productHypothesis: tx(locale, "opportunity.productHypothesis", p),
        valueProposition: tx(locale, "opportunity.valueProposition", p),
        metric: tx(locale, "opportunity.metric", p),
        inputs: {
          importance: 7,
          painIntensity: 6,
          frequency: 6,
          gap: 6,
          willingnessToPay: 5,
          alternativeWeakness: 6,
        },
        inputJustification: tx(locale, "opportunity.inputJustification"),
        risks: [
          tx(locale, "opportunity.risks.buyer"),
          tx(locale, "opportunity.risks.currentState"),
          tx(locale, "opportunity.risks.alternatives"),
        ],
        nextSteps: [
          tx(locale, "opportunity.nextSteps.evidence"),
          tx(locale, "opportunity.nextSteps.interviews"),
          tx(locale, "opportunity.nextSteps.measure"),
        ],
      },
    ];
    x.valueChains = [valueChainFor(locale, title, mechanism, variableName, icpName)];
    x.valueDimensions = [
      {
        opportunityTitle: title,
        importance: 7,
        magnitude: null,
        frequency: null,
        population: null,
        attributability: null,
        justification: tx(locale, "opportunity.dimensionsJustification"),
        userStatedDimensions: [],
      },
    ];
    x.assumptions = [
      assumption(tx(locale, "opportunity.assumptions.causal", p), 9, "CAUSAL", title, {
        fromLevel: "CAPABILITY",
        toLevel: "TRANSFORMATION",
      }),
      assumption(tx(locale, "opportunity.assumptions.value", p), 8, "VALUE", title, {
        fromLevel: "OPERATIONAL_VALUE",
        toLevel: "ECONOMIC_VALUE",
      }),
      assumption(tx(locale, "opportunity.assumptions.feasibility", p), 7, "FEASIBILITY", title, {
        fromLevel: "MECHANISM",
        toLevel: "CAPABILITY",
      }),
      assumption(tx(locale, "opportunity.assumptions.wtp", p), 8, "WTP", title),
    ];
    x.questionCard = {
      question: tx(locale, "opportunity.question"),
      options: [
        tx(locale, "opportunity.options.plan"),
        tx(locale, "opportunity.options.report"),
        tx(locale, "opportunity.options.anotherVariable"),
      ],
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    const rp = { ...p, title };
    return {
      reply: [
        label,
        "",
        tx(locale, "opportunity.reply.formed", rp),
        "",
        tx(locale, "opportunity.reply.ladderHeading"),
        tx(locale, "opportunity.reply.mechanism", rp),
        tx(locale, "opportunity.reply.capability", rp),
        tx(locale, "opportunity.reply.transformation"),
        tx(locale, "opportunity.reply.operationalValue", rp),
        tx(locale, "opportunity.reply.economicValue"),
        tx(locale, "opportunity.reply.strategicOutcome"),
        "",
        tx(locale, "opportunity.reply.inputs"),
        tx(locale, "opportunity.reply.computed"),
      ].join("\n"),
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Value chain → experiment
  if (stage === "VALUE_CAUSALITY" || stage === "SCORING" || stage === "EXPERIMENT_DESIGN") {
    const title = existing.opportunities[0] ?? null;
    const variableName = existing.variables[0] ?? tx(locale, "fallback.variable");
    const icpName = existing.icps[0] ?? tx(locale, "fallback.icp");
    const mechanism = existing.mechanisms[0] ?? tx(locale, "fallback.intervention");
    const p = {
      ...icpParams(locale, icpName),
      ...variableParams(variableName),
      ...mechanismParams(mechanism),
    };
    if (/plan|pilot|exp[ée]riment|test|essai/i.test(message) && title) {
      const x = emptyExtraction("RECOMMENDATION", tx(locale, "experiment.reasoning"));
      x.stage.readyToAdvance = true;
      x.experiments = [
        {
          opportunityTitle: title,
          title: tx(locale, "experiment.title", p),
          hypothesis: tx(locale, "experiment.hypothesis", p),
          design: tx(locale, "experiment.design", p),
          successMetric: tx(locale, "experiment.successMetric", p),
          causalLink: { fromLevel: "CAPABILITY", toLevel: "TRANSFORMATION" },
        },
      ];
      x.suggestedReplies = [
        tx(locale, "experiment.options.report"),
        tx(locale, "experiment.options.anotherVariable"),
        tx(locale, "experiment.options.whichEvidence"),
      ];
      return {
        reply: [
          label,
          "",
          tx(locale, "experiment.reply.planned", { title }),
          "",
          tx(locale, "experiment.reply.hypothesis", { hypothesis: x.experiments[0].hypothesis }),
          tx(locale, "experiment.reply.design", { design: x.experiments[0].design }),
          tx(locale, "experiment.reply.successMetric", { metric: x.experiments[0].successMetric }),
          "",
          tx(locale, "experiment.reply.outro"),
        ].join("\n"),
        extraction: x,
      };
    }
    const x = emptyExtraction("RECOMMENDATION", tx(locale, "experiment.recommendationReasoning"));
    x.stage.readyToAdvance = true;
    x.suggestedReplies = [
      tx(locale, "experiment.options.plan"),
      tx(locale, "experiment.options.anotherVariable"),
      tx(locale, "experiment.options.addEvidence"),
    ];
    return {
      reply: `${label}\n\n${tx(locale, "experiment.recommendationReply", { title: title ?? tx(locale, "fallback.opportunity") })}`,
      extraction: x,
    };
  }

  // ---------------------------------------------------------------- Recommendation / follow-ups
  const x = emptyExtraction("RECOMMENDATION", tx(locale, "followUp.reasoning"));
  x.suggestedReplies = [
    tx(locale, "followUp.options.anotherVariable"),
    tx(locale, "followUp.options.addEvidence"),
    tx(locale, "followUp.options.interviewGuide"),
  ];
  if (
    /another variable|other variable|next variable|autre variable|variable suivante|prochaine variable/i.test(
      message,
    )
  ) {
    x.stage.suggestedStage = "VARIABLE_DISCOVERY";
    x.stage.readyToAdvance = true;
    x.questionCard = {
      question: tx(locale, "followUp.nextVariableQuestion"),
      options: existing.variables.slice(0, 4),
      allowFreeText: true,
    };
    x.suggestedReplies = x.questionCard.options;
    return { reply: `${label}\n\n${tx(locale, "followUp.nextVariableQuestion")}`, extraction: x };
  }
  return {
    reply: `${label}\n\n${tx(locale, "followUp.reply")}`,
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
      // Never shown: the interview-guide action replaces mock output with the
      // localized template guide (src/services/interview/guide.ts).
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
