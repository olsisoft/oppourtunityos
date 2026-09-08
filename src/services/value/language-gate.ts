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
import { claimNature, CLAIM_STATEMENTS } from "./claim-taxonomy";
import { DESIGN_LEVEL_LABELS, designAtLeast } from "./experimental-validity";

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
  sentence: string;
  /** Verbs and phrases allowed at this level. */
  allowed: string[];
  /** Phrases that must not be used at this level. */
  forbidden: string[];
  caveats: string[];
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
  const caveats: string[] = [];
  const order: ExperimentDesignLevel[] = [
    "ANECDOTAL",
    "OBSERVATIONAL",
    "BEFORE_AFTER",
    "MATCHED_COMPARISON",
    "CONTROLLED",
    "RANDOMIZED",
  ];
  const lowerBy = (n: number, why: string) => {
    const i = Math.max(0, order.indexOf(level) - n);
    if (order[i] !== level) {
      caveats.push(why);
      level = order[i];
    }
  };
  if (validity === "LOW")
    lowerBy(3, "Internal validity is low: the wording is gated three levels down.");
  else if (validity === "INDETERMINATE")
    lowerBy(
      1,
      "Internal validity is indeterminate (critical facts not recorded): the wording is gated one level down.",
    );
  else if (validity === "MEDIUM" && designAtLeast(level, "CONTROLLED"))
    caveats.push("Internal validity is medium: the conclusion holds with recorded threats.");

  const mech = lower(input.mechanism || "the intervention");
  const out = lower(input.outcome || "the variable changed");
  const scope = input.scope?.trim() || "the tested scope";
  const contradicts = input.direction === "CONTRADICTS";
  let sentence: string;
  switch (level) {
    case "ANECDOTAL":
      sentence = contradicts
        ? `Customers report that ${out} did not follow ${mech} (${scope}).`
        : `Customers report that ${out} after ${mech} (${scope}).`;
      break;
    case "OBSERVATIONAL":
      sentence = contradicts
        ? `${cap(mech)} is not associated with ${out} in ${scope}.`
        : `${cap(mech)} is associated with ${out} in ${scope}.`;
      break;
    case "BEFORE_AFTER":
      sentence = contradicts
        ? `${cap(out)} did not change after ${mech} in ${scope}; the observation does not support an effect.`
        : `${cap(out)} changed after ${mech} in ${scope}; the observation is consistent with an effect, not proof of one.`;
      break;
    case "MATCHED_COMPARISON":
      sentence = contradicts
        ? `Treated units did not improve more than the matched comparison group in ${scope}; the evidence does not support a causal effect.`
        : `Treated units improved more than the matched comparison group in ${scope}; the evidence supports a causal effect within this scope.`;
      break;
    case "CONTROLLED":
      sentence = contradicts
        ? `The controlled experiment does not support the conclusion that ${mech} causes ${out} in ${scope}.`
        : `The controlled experiment supports the conclusion that ${mech} causes ${out} within ${scope}.`;
      break;
    default:
      sentence = contradicts
        ? `The randomized experiment shows that ${mech} did not cause ${out} within the tested population (${scope}).`
        : `${cap(mech)} caused ${out} within the tested population (${scope}).`;
  }
  sentence += " Not established beyond this scope.";
  return {
    gatedLevel: level,
    sentence,
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
  scopeText?: string | null;
  generalization?: GeneralizationStatus | null;
  bestFitBand?: "HIGH" | "MEDIUM" | "LOW" | "NONE" | null;
  designLevel?: ExperimentDesignLevel | null;
}): string {
  const what = CLAIM_STATEMENTS[params.claimType] ?? "the claim holds";
  const scope = params.scopeText?.trim();
  const inScope = scope ? ` within ${scope}` : " within the observed scope";
  const gen = params.generalization ?? null;
  const tail =
    gen === "SEGMENT_SUPPORTED"
      ? " Observed across enough independent cases to support the segment; not the whole market."
      : gen === "SAMPLE_SUPPORTED"
        ? " Observed in a sample; not established for the market."
        : gen === "CASE_ONLY"
          ? " One case; not established elsewhere."
          : gen === "BROADER_HYPOTHESIS"
            ? " The broader claim remains a hypothesis."
            : gen === "CONTRADICTED_ACROSS_CONTEXTS"
              ? " Contradicted in other contexts."
              : "";
  const causal = claimNature(params.claimType) === "CAUSAL";
  switch (params.status) {
    case "OBSERVED":
      return `${cap(what)}: observed${inScope}.${tail}`;
    case "STRONGLY_SUPPORTED":
      return causal
        ? `Evidence strongly supports that ${what}${scope ? ` (${scope})` : ""}${params.designLevel ? `, at ${DESIGN_LEVEL_LABELS[params.designLevel].toLowerCase()} design strength` : ""}. Nothing has measured it directly.${tail}`
        : `Evidence strongly supports that ${what}${scope ? ` (${scope})` : ""}. Nothing has measured it directly.${tail}`;
    case "SUPPORTED":
      return params.bestFitBand === "LOW"
        ? `Relevant testimony, but weak evidence that ${what}: the linked evidence has low fit for this claim.`
        : `Evidence supports that ${what}${scope ? ` (${scope})` : ""}; it does not establish it.${tail}`;
    case "MIXED":
      return `Mixed evidence: high-fit evidence both supports and contradicts that ${what}. Nothing can be concluded until the contradiction is resolved.`;
    case "CONTRADICTED":
      return `Evidence contradicts that ${what}.`;
    case "UNPROVEN":
      return params.bestFitBand === "LOW" || params.bestFitBand === "NONE"
        ? `Stated, with evidence that does not fit the claim: nothing admissible establishes that ${what}.`
        : `Stated; the linked evidence is not sufficient to establish that ${what}.`;
    case "HYPOTHESIS":
      return `Hypothesis: nothing tested whether ${what}.`;
    default:
      return "Not stated.";
  }
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
}): {
  sentence: string;
  gatedLevel: ExperimentDesignLevel;
  caveats: string[];
  forbidden: string[];
} {
  if (params.outcomeLabel === "INVALID") {
    return {
      sentence: "The run was declared invalid: it cannot be trusted and establishes nothing.",
      gatedLevel: params.designLevel,
      caveats: [],
      forbidden: FORBIDDEN_BY_LEVEL[params.designLevel],
    };
  }
  if (params.outcomeLabel === "INCONCLUSIVE") {
    return {
      sentence: `Inconclusive: ${lower(params.outcome)} in ${params.scope} decides nothing either way. The claim stays where it was.`,
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
  const validityNote =
    params.internalValidity === "LOW"
      ? " Internal validity is low: treat the observation with caution."
      : params.internalValidity === "INDETERMINATE"
        ? " Internal validity is indeterminate: critical facts about the run were not recorded."
        : "";
  const sentence =
    params.direction === "CONTRADICTS"
      ? `${cap(lower(params.outcome))} was observed in ${params.scope}; it does not support the claim.${validityNote} Not established beyond this scope.`
      : `${cap(lower(params.outcome))} was observed in ${params.scope}.${validityNote} Observed within this scope only; not established beyond it.`;
  return {
    sentence,
    gatedLevel: params.designLevel,
    caveats: validityNote ? [validityNote.trim()] : [],
    forbidden: FORBIDDEN_BY_LEVEL[params.designLevel],
  };
}
