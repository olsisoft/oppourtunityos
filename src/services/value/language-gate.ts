/**
 * Epistemic language gate. The strength of the wording follows the design
 * level and the internal validity of what was observed — never the outcome
 * the user hoped for. Correlation never becomes causal language; an
 * observation never becomes a general claim. Every sentence names its scope.
 */
import type {
  ClaimType,
  EpistemicStatus,
  ExperimentDesignLevel,
  GeneralizationStatus,
  InternalValidity,
} from "@/generated/prisma/enums";
import { msg, type SystemMessage, type LocalizedText } from "@/i18n/messages";
import { claimNature, CLAIM_STATEMENTS } from "./claim-taxonomy";
import { designAtLeast } from "./experimental-validity";

export interface CausalLanguageInput {
  designLevel: ExperimentDesignLevel;
  internalValidity?: InternalValidity | null;
  /** "the reconciliation mechanism" */
  mechanism: string;
  /** "the leakage rate decreased" / "97% of appointments were matched" */
  outcome: string;
  /** "5 salons using two POS systems, founder-assisted, over one month" */
  scope: string;
  /** Direction of the evidence: supports / contradicts / neutral. */
  direction?: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
}

export interface CausalLanguage {
  /** The level the wording was actually gated at (validity can lower it). */
  gatedLevel: ExperimentDesignLevel;
  sentence: SystemMessage;
  /**
   * Verbs and phrases allowed at this level. English vocabulary by design:
   * `languageViolations` matches these phrases against English text, so the
   * lists are plain strings and are not translated.
   */
  allowed: string[];
  /** Phrases that must not be used at this level (English, see `allowed`). */
  forbidden: string[];
  caveats: SystemMessage[];
}

const ALLOWED: Record<ExperimentDesignLevel, string[]> = {
  ANECDOTAL: ["customers report", "customers say", "stated"],
  OBSERVATIONAL: ["is associated with", "co-occurs with", "was observed alongside"],
  BEFORE_AFTER: ["changed after", "is consistent with", "moved following"],
  MATCHED_COMPARISON: [
    "improved more than the comparison group",
    "evidence supports a causal effect",
  ],
  CONTROLLED: ["the experiment supports the conclusion that", "causes, within the tested scope"],
  RANDOMIZED: ["caused, within the tested population", "the randomized experiment shows"],
};

const FORBIDDEN_CAUSAL = [
  "proves",
  "proven",
  "causes",
  "caused",
  "leads to",
  "drives",
  "results in",
  "eliminates",
];
const FORBIDDEN_GENERAL = [
  "for all customers",
  "across the market",
  "in general",
  "everywhere",
  "always",
  "for every",
];

export const FORBIDDEN_BY_LEVEL: Record<ExperimentDesignLevel, string[]> = {
  ANECDOTAL: [...FORBIDDEN_CAUSAL, "is associated with", "changed after", ...FORBIDDEN_GENERAL],
  OBSERVATIONAL: [...FORBIDDEN_CAUSAL, "changed after", ...FORBIDDEN_GENERAL],
  BEFORE_AFTER: [...FORBIDDEN_CAUSAL, "supports a causal effect", ...FORBIDDEN_GENERAL],
  MATCHED_COMPARISON: ["proves", "proven", "caused", ...FORBIDDEN_GENERAL],
  CONTROLLED: ["proves", "proven", ...FORBIDDEN_GENERAL],
  RANDOMIZED: ["proves", "proven", ...FORBIDDEN_GENERAL],
};

function lower(s: string): string {
  return s
    .trim()
    .replace(/\.$/, "")
    .replace(/^./, (c) => c.toLowerCase());
}

/**
 * Language-gated causal statement. LOW internal validity lowers the gate by
 * three levels (a broken randomized run may at most describe a change);
 * INDETERMINATE lowers it by one level and says why; MEDIUM adds a caveat.
 */
export function causalLanguage(input: CausalLanguageInput): CausalLanguage {
  const validity = input.internalValidity ?? null;
  let level = input.designLevel;
  const caveats: SystemMessage[] = [];
  const order: ExperimentDesignLevel[] = [
    "ANECDOTAL",
    "OBSERVATIONAL",
    "BEFORE_AFTER",
    "MATCHED_COMPARISON",
    "CONTROLLED",
    "RANDOMIZED",
  ];
  const lowerBy = (n: number, why: SystemMessage) => {
    const i = Math.max(0, order.indexOf(level) - n);
    if (order[i] !== level) {
      caveats.push(why);
      level = order[i];
    }
  };
  if (validity === "LOW") lowerBy(3, msg("validity.gate.caveat.low"));
  else if (validity === "INDETERMINATE") lowerBy(1, msg("validity.gate.caveat.indeterminate"));
  else if (validity === "MEDIUM" && designAtLeast(level, "CONTROLLED"))
    caveats.push(msg("validity.gate.caveat.medium"));

  // User content in lower case and with a capital first letter; the template
  // of each level picks the form its sentence position needs.
  const mech = input.mechanism ? lower(input.mechanism) : null;
  const out = input.outcome ? lower(input.outcome) : null;
  const params = {
    mechanism: mech ?? msg("validity.gate.default.mechanism"),
    mechanismCap: mech !== null ? cap(mech) : msg("validity.gate.default.mechanismCap"),
    outcome: out ?? msg("validity.gate.default.outcome"),
    outcomeCap: out !== null ? cap(out) : msg("validity.gate.default.outcomeCap"),
    scope: input.scope?.trim() || msg("validity.gate.default.scope"),
  };
  const direction = input.direction === "CONTRADICTS" ? "contradicts" : "supports";
  return {
    gatedLevel: level,
    sentence: msg(`validity.gate.sentence.${level}.${direction}`, params),
    allowed: ALLOWED[level],
    forbidden: FORBIDDEN_BY_LEVEL[level],
    caveats,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Phrases in a text that exceed what the design level allows (for warnings and tests). */
export function languageViolations(text: string, level: ExperimentDesignLevel): string[] {
  const t = ` ${text.toLowerCase()} `;
  return FORBIDDEN_BY_LEVEL[level].filter(
    (p) =>
      t.includes(` ${p.toLowerCase()} `) ||
      t.includes(` ${p.toLowerCase()}.`) ||
      t.includes(` ${p.toLowerCase()},`),
  );
}

export const GENERALIZATION_LABELS: Record<GeneralizationStatus, string> = {
  UNTESTED: "Not observed",
  CASE_ONLY: "Case only",
  SAMPLE_SUPPORTED: "Sample-supported",
  SEGMENT_SUPPORTED: "Segment-supported",
  BROADER_HYPOTHESIS: "Broader claim is a hypothesis",
  CONTRADICTED_ACROSS_CONTEXTS: "Contradicted across contexts",
};

export const GENERALIZATION_DESCRIPTIONS: Record<GeneralizationStatus, string> = {
  UNTESTED: "No observation supports the claim yet.",
  CASE_ONLY: "Observed in one context (one independent source). Nothing says it holds elsewhere.",
  SAMPLE_SUPPORTED: "Observed across several independent cases with limited diversity.",
  SEGMENT_SUPPORTED:
    "Observed across enough independent cases and configurations, within the claim's scope, to support the segment.",
  BROADER_HYPOTHESIS:
    "Observed somewhere, but the claim as stated is broader than what was observed: the broader claim remains a hypothesis.",
  CONTRADICTED_ACROSS_CONTEXTS: "Supported in some contexts and contradicted in others.",
};

/**
 * One-sentence inference for a claim, from its status, scope and
 * generalization. This is the "current inference" the claim detail shows.
 */
export function inferenceSentence(params: {
  claimType: ClaimType;
  status: EpistemicStatus;
  /** Where the claim was observed — a rendered string or a scope message. */
  scopeText?: LocalizedText | null;
  generalization?: GeneralizationStatus | null;
  bestFitBand?: "HIGH" | "MEDIUM" | "LOW" | "NONE" | null;
  designLevel?: ExperimentDesignLevel | null;
}): SystemMessage {
  const known = params.claimType in CLAIM_STATEMENTS;
  const what = known
    ? msg(`labels.claimStatement.${params.claimType}`)
    : msg("validity.inference.defaultClaim");
  const whatCap = known
    ? msg(`validity.claimStatementCap.${params.claimType}`)
    : msg("validity.inference.defaultClaimCap");
  const scope =
    typeof params.scopeText === "string"
      ? params.scopeText.trim() || null
      : (params.scopeText ?? null);
  const gen = params.generalization ?? null;
  const tail = gen && gen !== "UNTESTED" ? msg(`validity.inference.tail.${gen}`) : null;
  const common = {
    what,
    hasScope: scope !== null,
    scope,
    hasTail: tail !== null,
    tail,
  };
  const causal = claimNature(params.claimType) === "CAUSAL";
  switch (params.status) {
    case "OBSERVED":
      return msg("validity.inference.observed", { ...common, what: whatCap });
    case "STRONGLY_SUPPORTED":
      return causal && params.designLevel
        ? msg("validity.inference.stronglySupportedDesign", {
            ...common,
            level: msg(`validity.designLevelLower.${params.designLevel}`),
          })
        : msg("validity.inference.stronglySupported", common);
    case "SUPPORTED":
      return params.bestFitBand === "LOW"
        ? msg("validity.inference.supportedLowFit", { what })
        : msg("validity.inference.supported", common);
    case "MIXED":
      return msg("validity.inference.mixed", { what });
    case "CONTRADICTED":
      return msg("validity.inference.contradicted", { what });
    case "UNPROVEN":
      return params.bestFitBand === "LOW" || params.bestFitBand === "NONE"
        ? msg("validity.inference.unprovenLowFit", { what })
        : msg("validity.inference.unproven", { what });
    case "HYPOTHESIS":
      return msg("validity.inference.hypothesis", { what });
    default:
      return msg("validity.inference.notStated");
  }
}

export interface ExperimentInterpretation {
  /** The system interpretation shown on the result; the user never edits it. */
  sentence: SystemMessage;
  gatedLevel: ExperimentDesignLevel;
  caveats: SystemMessage[];
  /** English phrases the wording must not use at this level (see CausalLanguage). */
  forbidden: string[];
}

/**
 * System-generated interpretation of an experiment result. Causal targets
 * get the causal language gate; feasibility / occurrence targets get an
 * observation sentence bound to the scope. The user never edits this.
 */
export function experimentInterpretation(params: {
  targetIsCausal: boolean;
  designLevel: ExperimentDesignLevel;
  internalValidity: InternalValidity | null;
  mechanism: string;
  outcome: string;
  scope: string;
  direction: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  outcomeLabel: "SUPPORTED" | "CONTRADICTED" | "INCONCLUSIVE" | "INVALID";
}): ExperimentInterpretation {
  if (params.outcomeLabel === "INVALID") {
    return {
      sentence: msg("validity.interpretation.invalid"),
      gatedLevel: params.designLevel,
      caveats: [],
      forbidden: FORBIDDEN_BY_LEVEL[params.designLevel],
    };
  }
  if (params.outcomeLabel === "INCONCLUSIVE") {
    return {
      sentence: msg("validity.interpretation.inconclusive", {
        outcome: lower(params.outcome),
        scope: params.scope,
      }),
      gatedLevel: params.designLevel,
      caveats: [],
      forbidden: FORBIDDEN_BY_LEVEL[params.designLevel],
    };
  }
  if (params.targetIsCausal) {
    const gate = causalLanguage({
      designLevel: params.designLevel,
      internalValidity: params.internalValidity,
      mechanism: params.mechanism,
      outcome: params.outcome,
      scope: params.scope,
      direction: params.direction,
    });
    return {
      sentence: gate.sentence,
      gatedLevel: gate.gatedLevel,
      caveats: gate.caveats,
      forbidden: gate.forbidden,
    };
  }
  const note =
    params.internalValidity === "LOW"
      ? msg("validity.interpretation.caveat.low")
      : params.internalValidity === "INDETERMINATE"
        ? msg("validity.interpretation.caveat.indeterminate")
        : null;
  const sentence = msg(
    `validity.interpretation.observed.${params.direction === "CONTRADICTS" ? "contradicts" : "supports"}`,
    {
      outcomeCap: cap(lower(params.outcome)),
      scope: params.scope,
      hasNote: note !== null,
      note,
    },
  );
  return {
    sentence,
    gatedLevel: params.designLevel,
    caveats: note ? [note] : [],
    forbidden: FORBIDDEN_BY_LEVEL[params.designLevel],
  };
}
