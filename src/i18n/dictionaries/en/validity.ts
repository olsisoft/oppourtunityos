/**
 * English strings — section "validity". Keys are referenced as "validity.<key>".
 *
 * Sentences built by the experimental-validity, language-gate, evidence-fit
 * and admissibility engines, plus the experiment actions. The English
 * templates reproduce the sentences those engines produced before they
 * became system messages: unit tests assert on them.
 *
 * Case variants: a label used mid-sentence ("treated as before / after") or
 * as a sentence start ("The pain exists: observed…") needs a case the label
 * tables do not carry. They are derived here from the engine tables through
 * getters (lazy, like `labels`, because the engines import this dictionary).
 */
import { EVIDENCE_SOURCE_TYPE_LABELS } from "@/domain/enums";
import type {
  AssignmentMethod,
  ClaimType,
  EvidenceAdmissibility,
  EvidenceSourceType,
  ExperimentDesignLevel,
  InternalValidity,
} from "@/generated/prisma/enums";
import { ADMISSIBILITY_LABELS } from "@/services/value/admissibility";
import { CLAIM_STATEMENTS } from "@/services/value/claim-taxonomy";
import { FIT_DIMENSION_LABELS, type FitDimensionKey } from "@/services/value/evidence-fit";
import {
  ASSIGNMENT_METHOD_LABELS,
  DESIGN_LEVEL_LABELS,
  INTERNAL_VALIDITY_LABELS,
} from "@/services/value/experimental-validity";

/**
 * "Before / after" → "before / after". A label that starts with an acronym
 * ("A/B test", "POS data") keeps its case.
 */
export function lowerFirstLabels<K extends string>(table: Record<K, string>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(table) as K[]) {
    const label = table[key];
    const second = label.charAt(1);
    out[key] =
      second && second === second.toUpperCase() && second !== second.toLowerCase()
        ? label
        : label.charAt(0).toLowerCase() + label.slice(1);
  }
  return out;
}

/** "the pain exists" → "The pain exists". */
export function capitalizeLabels<K extends string>(table: Record<K, string>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(table) as K[]) {
    const label = table[key];
    out[key] = label.charAt(0).toUpperCase() + label.slice(1);
  }
  return out;
}

export const validity = {
  // --- case variants of engine labels, for use inside sentences
  get designLevelLower(): Record<ExperimentDesignLevel, string> {
    return lowerFirstLabels(DESIGN_LEVEL_LABELS);
  },
  get internalValidityLower(): Record<InternalValidity, string> {
    return lowerFirstLabels(INTERNAL_VALIDITY_LABELS);
  },
  get admissibilityLower(): Record<EvidenceAdmissibility, string> {
    return lowerFirstLabels(ADMISSIBILITY_LABELS);
  },
  get assignmentMethodLower(): Record<AssignmentMethod, string> {
    return lowerFirstLabels(ASSIGNMENT_METHOD_LABELS);
  },
  get fitDimensionLower(): Record<FitDimensionKey, string> {
    return lowerFirstLabels(FIT_DIMENSION_LABELS);
  },
  get sourceTypeLower(): Record<EvidenceSourceType, string> {
    return lowerFirstLabels(EVIDENCE_SOURCE_TYPE_LABELS);
  },
  get claimStatementCap(): Record<ClaimType, string> {
    return capitalizeLabels(CLAIM_STATEMENTS);
  },

  // --- resolveDesignLevel: the recorded facts cap the declared design
  downgrade: {
    noComparisonGroup: "{declared} declared, but no comparison group exists: treated as {level}.",
    notRandomlyAssigned:
      "{declared} declared, but units were not randomly assigned: treated as {level}.",
    singleGroup: "{declared} declared, but there is a single group: treated as {level}.",
    notMatched: "{declared} declared, but comparison units were not matched: treated as {level}.",
    notIsolated: "{declared} declared, but the intervention was not isolated: treated as {level}.",
    noBaseline: "{declared} declared, but no baseline was measured: treated as {level}.",
  },

  // --- assessInternalValidity: one text per checklist item and state
  check: {
    baselineMeasured: {
      ok: "A baseline was measured before the intervention.",
      fail: "No baseline: a change cannot be shown without a starting point.",
      unknown: "Baseline not recorded.",
    },
    comparisonGroup: {
      ok: "A comparison group exists.",
      fail: "No comparison group: what would have happened without the intervention is unobserved.",
      unknown: "Comparison group not recorded.",
    },
    assignmentMethod: {
      recorded: "Assignment: {method}.",
      unknown: "Assignment method not recorded.",
    },
    sameMeasurement: {
      ok: "The same measurement was used throughout.",
      fail: "The measurement changed: before and after are not comparable.",
      unknown: "Measurement consistency not recorded.",
    },
    interventionIsolated: {
      ok: "Only the intervention changed.",
      fail: "Other things changed with the intervention: the effect cannot be attributed to it.",
      unknown: "Isolation of the intervention not recorded.",
    },
    confoundersControlled: {
      ok: "Known confounders were controlled.",
      fail: "Known confounders were not controlled.",
      unknown: "Confounders not recorded.",
    },
    attritionPercent: {
      unknown: "Attrition not recorded.",
      high: "Attrition {percent}%: more than 30% of units were lost.",
      moderate: "Attrition {percent}%.",
      negligible: "Attrition {percent}%: negligible.",
    },
    instrumentationChanged: {
      ok: "Instrumentation unchanged.",
      fail: "Instrumentation changed during the run.",
      unknown: "Instrumentation not recorded.",
    },
    sampleSize: {
      organizations: "{count, plural, one {# organization} other {# organizations}}.",
      organizationsSmall:
        "{count, plural, one {# organization} other {# organizations}}: very small sample.",
      units: "n = {count}.",
      unitsSmall: "n = {count}: very small sample.",
      unknown: "Sample size not recorded.",
    },
    durationDays: {
      unknown: "Duration not recorded.",
      short: "{count, plural, one {# day} other {# days}}: short period.",
      ok: "{count} days.",
    },
    dataCompletenessPercent: {
      unknown: "Data completeness not recorded.",
      recorded: "{percent}% of expected data present.",
    },
    contaminationRisk: {
      ok: "No contamination between groups.",
      fail: "Comparison units may have been exposed to the intervention.",
      unknown: "Contamination not recorded.",
    },
    seasonalityRisk: {
      ok: "No seasonality effect expected.",
      fail: "Seasonality may explain part of the change.",
      unknown: "Seasonality not recorded.",
    },
    concurrentChanges: {
      ok: "No concurrent changes.",
      fail: "Other changes happened during the run.",
      unknown: "Concurrent changes not recorded.",
    },
  },

  // --- assessInternalValidity: explanation lines
  explanation: {
    design: "Design: {level}.",
    designDeclared: "Design: {level} (declared {declared}).",
    validityCriticalThreats:
      "Internal validity: {validity} — {count, plural, one {# critical threat} other {# critical threats}}.",
    validityCriticalUnknown: "Internal validity: {validity} — {count} critical facts not recorded.",
    validityModerateThreats:
      "Internal validity: {validity} — {count, plural, one {# moderate threat} other {# moderate threats}}.",
    validityNoThreats: "Internal validity: {validity} — no recorded threats.",
    measuresOnly: "{level} designs measure; they do not test what causes what.",
  },

  // --- designProofPreview: "what can this design prove?"
  preview: {
    note: "Whatever the design, the result is observed within the tested scope only; it never generalizes automatically.",
    reason: {
      notAdmissible: "this kind of result is not admissible evidence for the claim.",
      beforeAfter:
        "a before/after change is consistent with a causal effect but does not establish it.",
      designCannotCausal: "{level} designs cannot establish causality.",
      high: "the result is high-admissibility evidence for this claim within the tested scope.",
      medium:
        "the result is medium-admissibility evidence: it supports the claim but cannot establish it alone.",
      low: "the result is low-admissibility evidence for this claim: it can inform, not establish.",
    },
    ANECDOTAL: {
      strongly: {
        painDescribed: "That a pain exists and how customers describe it",
        statedIntent: "Stated intent and stated willingness to pay",
      },
      partially: { reportedState: "Current state and alternatives, as reported" },
      cannot: {
        magnitude: "Magnitude or frequency",
        mechanismEffect: "That the mechanism changes anything",
        actualPurchase: "Actual purchase",
      },
    },
    OBSERVATIONAL: {
      strongly: {
        measuredState: "Frequency, magnitude and current state, as measured",
        technicalFeasibility: "Feasibility, when the observation is technical",
      },
      partially: { association: "Association between the mechanism and the variable" },
      cannot: {
        causation: "That the mechanism causes the change",
        beyondScope: "Anything beyond the observed scope",
      },
    },
    BEFORE_AFTER: {
      strongly: {
        feasibilityInScope: "Feasibility and capability within the tested scope",
        variableChanged: "That the variable changed after the intervention",
      },
      partially: { causalConsistent: "A causal effect (consistent with, not proven)" },
      cannot: {
        causalityConfounders: "Causality against confounders and time",
        generalizationUnits: "Generalization beyond the tested units",
      },
    },
    MATCHED_COMPARISON: {
      strongly: {
        occurrenceInScope: "Feasibility, capability and occurrence within scope",
        treatedImproved: "That treated units improved more than similar untreated units",
      },
      partially: { causalInScope: "A causal effect within the tested scope" },
      cannot: {
        unobservedDifferences: "Causality against unobserved differences between groups",
        generalizationSegment: "Generalization beyond the segment",
      },
    },
    CONTROLLED: {
      strongly: { causalInScope: "A causal effect of the mechanism within the tested scope" },
      partially: { magnitudeElsewhere: "The magnitude of the effect in other contexts" },
      cannot: {
        generalizationMarket: "Generalization to the whole market",
        willingnessToPay: "Willingness to pay, unless the design charges money",
      },
    },
    RANDOMIZED: {
      strongly: {
        causalInPopulation: "A causal effect of the mechanism within the tested population",
      },
      partially: { effectSizeElsewhere: "The size of the effect elsewhere" },
      cannot: {
        generalizationScope: "Generalization beyond the tested scope",
        willingnessToPay: "Willingness to pay, unless the design charges money",
      },
    },
  },

  // --- causalLanguage: the epistemic language gate
  gate: {
    default: {
      mechanism: "the intervention",
      mechanismCap: "The intervention",
      outcome: "the variable changed",
      outcomeCap: "The variable changed",
      scope: "the tested scope",
    },
    caveat: {
      low: "Internal validity is low: the wording is gated three levels down.",
      indeterminate:
        "Internal validity is indeterminate (critical facts not recorded): the wording is gated one level down.",
      medium: "Internal validity is medium: the conclusion holds with recorded threats.",
    },
    // {mechanism} / {outcome} are the user's text in lower case; {mechanismCap} /
    // {outcomeCap} the same text with a capital first letter, for sentence starts.
    sentence: {
      ANECDOTAL: {
        supports:
          "Customers report that {outcome} after {mechanism} ({scope}). Not established beyond this scope.",
        contradicts:
          "Customers report that {outcome} did not follow {mechanism} ({scope}). Not established beyond this scope.",
      },
      OBSERVATIONAL: {
        supports:
          "{mechanismCap} is associated with {outcome} in {scope}. Not established beyond this scope.",
        contradicts:
          "{mechanismCap} is not associated with {outcome} in {scope}. Not established beyond this scope.",
      },
      BEFORE_AFTER: {
        supports:
          "{outcomeCap} changed after {mechanism} in {scope}; the observation is consistent with an effect, not proof of one. Not established beyond this scope.",
        contradicts:
          "{outcomeCap} did not change after {mechanism} in {scope}; the observation does not support an effect. Not established beyond this scope.",
      },
      MATCHED_COMPARISON: {
        supports:
          "Treated units improved more than the matched comparison group in {scope}; the evidence supports a causal effect within this scope. Not established beyond this scope.",
        contradicts:
          "Treated units did not improve more than the matched comparison group in {scope}; the evidence does not support a causal effect. Not established beyond this scope.",
      },
      CONTROLLED: {
        supports:
          "The controlled experiment supports the conclusion that {mechanism} causes {outcome} within {scope}. Not established beyond this scope.",
        contradicts:
          "The controlled experiment does not support the conclusion that {mechanism} causes {outcome} in {scope}. Not established beyond this scope.",
      },
      RANDOMIZED: {
        supports:
          "{mechanismCap} caused {outcome} within the tested population ({scope}). Not established beyond this scope.",
        contradicts:
          "The randomized experiment shows that {mechanism} did not cause {outcome} within the tested population ({scope}). Not established beyond this scope.",
      },
    },
  },

  // --- inferenceSentence: the "current inference" of a claim
  // {what} is the claim statement ("the pain exists"); {hasScope} / {scope} the
  // observed scope when known; {hasTail} / {tail} the generalization sentence.
  inference: {
    defaultClaim: "the claim holds",
    defaultClaimCap: "The claim holds",
    tail: {
      SEGMENT_SUPPORTED:
        "Observed across enough independent cases to support the segment; not the whole market.",
      SAMPLE_SUPPORTED: "Observed in a sample; not established for the market.",
      CASE_ONLY: "One case; not established elsewhere.",
      BROADER_HYPOTHESIS: "The broader claim remains a hypothesis.",
      CONTRADICTED_ACROSS_CONTEXTS: "Contradicted in other contexts.",
    },
    observed:
      "{what}: observed {hasScope, select, true {within {scope}} other {within the observed scope}}.{hasTail, select, true { {tail}} other {}}",
    stronglySupportedDesign:
      "Evidence strongly supports that {what}{hasScope, select, true { ({scope})} other {}}, at {level} design strength. Nothing has measured it directly.{hasTail, select, true { {tail}} other {}}",
    stronglySupported:
      "Evidence strongly supports that {what}{hasScope, select, true { ({scope})} other {}}. Nothing has measured it directly.{hasTail, select, true { {tail}} other {}}",
    supportedLowFit:
      "Relevant testimony, but weak evidence that {what}: the linked evidence has low fit for this claim.",
    supported:
      "Evidence supports that {what}{hasScope, select, true { ({scope})} other {}}; it does not establish it.{hasTail, select, true { {tail}} other {}}",
    mixed:
      "Mixed evidence: high-fit evidence both supports and contradicts that {what}. Nothing can be concluded until the contradiction is resolved.",
    contradicted: "Evidence contradicts that {what}.",
    unprovenLowFit:
      "Stated, with evidence that does not fit the claim: nothing admissible establishes that {what}.",
    unproven: "Stated; the linked evidence is not sufficient to establish that {what}.",
    hypothesis: "Hypothesis: nothing tested whether {what}.",
    notStated: "Not stated.",
  },

  // --- experimentInterpretation: the system interpretation of a result
  interpretation: {
    invalid: "The run was declared invalid: it cannot be trusted and establishes nothing.",
    inconclusive:
      "Inconclusive: {outcome} in {scope} decides nothing either way. The claim stays where it was.",
    caveat: {
      low: "Internal validity is low: treat the observation with caution.",
      indeterminate:
        "Internal validity is indeterminate: critical facts about the run were not recorded.",
    },
    // {note} is one of the caveats above when internal validity is weak.
    observed: {
      supports:
        "{outcomeCap} was observed in {scope}.{hasNote, select, true { {note}} other {}} Observed within this scope only; not established beyond it.",
      contradicts:
        "{outcomeCap} was observed in {scope}; it does not support the claim.{hasNote, select, true { {note}} other {}} Not established beyond this scope.",
    },
  },

  // --- computeEvidenceFit: dimension notes, explanation lines and summary
  fit: {
    note: {
      admissibility: "{level} — {explanation}",
      directness: "relevance {relevance}/10",
      directnessThirdParty: "relevance {relevance}/10, third-party source",
      method:
        "{source} baseline {base}, strength {strength}/10{hasDesign, select, true {, {design} design ×{designFactor}} other {}}{hasValidity, select, true {, internal validity {validity} ×{validityFactor}} other {}}",
      independent: "independent origin",
      duplicate: "derivative of a source already counted on this claim ({origin})",
      scopeMatch: "{explanation}",
      sample: {
        organizations: "{count, plural, one {# organization} other {# organizations}}",
        units: "n = {count}",
        singleRespondent: "single respondent",
        aggregate: "aggregate source, sample not stated",
        unknown: "sample not recorded",
      },
      recency: {
        undated: "undated (half credit)",
        recent: "within 12 months",
        aging: "12–24 months old",
        old: "older than 24 months",
      },
    },
    penalty: {
      lowValidity: "low internal validity (−8)",
      indeterminateValidity: "indeterminate internal validity (−5)",
      mediumValidity: "medium internal validity (−3)",
      limitations: "recorded limitations (−2)",
    },
    explanation: {
      notAdmissible:
        "Not admissible: a {source} cannot be evidence that {what} (matrix {version}).",
      score: 'Fit {score}/100 ({band}) for "{what}".',
      dimension: "{label}: {percent}% of {weight} → {points} pts ({note})",
      penalty: "Limitations penalty: −{penalty} ({note})",
      noPenalty: "No limitations penalty.",
      cap: "Capped at {cap}: {level}-admissibility evidence cannot fit better than this for the claim.",
    },
    reason: {
      lowAdmissibility: "a {source} is low-admissibility evidence for this claim",
      mediumAdmissibility: "a {source} is medium-admissibility evidence for this claim",
      duplicate: "it derives from a source already counted",
      weakDimension: "{dimension} is weak ({note})",
      strong: "high-admissibility, direct and independent",
    },
    summary: {
      notAdmissible: 'Not admissible for "{what}".',
      line: '{band} fit ({score}/100) for "{what}" — {reason}.',
    },
  },

  // --- admissibility(): which rule of the matrix applied
  admissibility: {
    explanation: {
      unknownProvenance:
        "{level}: a source of unknown provenance cannot be more than low-admissibility evidence.",
      source: "{level}: source-specific rule for this claim type (matrix {version}).",
      family:
        "{level}: family rule ({family, select, SELF_REPORTED {self-reported} BEHAVIORAL {behavioral} OPERATIONAL {operational} MARKET {market} EXPERIMENTAL {experimental} TECHNICAL {technical} COMMERCIAL {commercial} other {unknown}} sources) for this claim type.",
      default: "{level}: default for this claim type; no family or source rule applies.",
    },
  },

  // --- completeExperimentAction: how the outcome was decided
  complete: {
    outcome: {
      invalid: "Declared INVALID by you: the run cannot be trusted and produces no evidence.",
      userClassified: "No deterministic threshold could decide; classified explicitly by you.",
      inconclusive: "No thresholds and no explicit classification: the result stays INCONCLUSIVE.",
    },
  },

  // --- value actions: errors returned to the caller
  action: {
    checkFields: "Check the fields.",
    opportunityNotFound: "Opportunity not found",
    nodeNotFound: "Node not found",
    ladderLevelsMustExist: "Both ladder levels must exist before linking them.",
    linkNeedsTwoLevels: "A causal link needs two different levels.",
    linkNotFound: "Link not found",
    evidenceNotFound: "Evidence not found",
    nodeNotInWorkspace: "Node not found in workspace",
    linkNotInWorkspace: "Link not found in workspace",
    opportunityNotInWorkspace: "Opportunity not found in workspace",
    variableNotFound: "Variable not found",
    parentVariableNotInWorkspace: "Parent variable not found in workspace",
    causalLinkNotOnOpportunity: "Causal link not found on this opportunity",
    assumptionNotOnOpportunity: "Assumption not found on this opportunity",
    ladderLevelNotOnOpportunity: "Value chain level not found on this opportunity",
    experimentNotFound: "Experiment not found",
    experimentHasResult: "This experiment already has a result",
  },
} as const;
