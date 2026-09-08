/**
 * English labels for enums and engine vocabularies.
 *
 * The tables themselves stay where the engines define them (they are the
 * canonical English wording the engines and tests rely on). This section
 * exposes them under stable dictionary keys ("labels.verdict.KILL") so the
 * UI can render any label in the current locale, and the French section is
 * typed against it. Getters keep module evaluation lazy: engines import the
 * message helpers, which import this dictionary, which reads the engines —
 * a cycle that is harmless as long as nothing is read at module load.
 */
import {
  ALTERNATIVE_CATEGORY_LABELS,
  ASSUMPTION_KIND_LABELS,
  ASSUMPTION_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  CONFIDENCE_LABELS,
  CRITICALITY_LABELS,
  DIRECTION_LABELS,
  EPISTEMIC_DESCRIPTIONS,
  EPISTEMIC_LABELS,
  EVIDENCE_ORIGIN_LABELS,
  EVIDENCE_SOURCE_TYPE_LABELS,
  EVIDENCE_TYPE_LABELS,
  EXPERIMENT_OUTCOME_LABELS,
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_TYPE_LABELS,
  KNOWLEDGE_TRIGGER_LABELS,
  MECHANISM_CATEGORY_LABELS,
  OUTCOME_SOURCE_LABELS,
  PROVENANCE_LABELS,
  SENTIMENT_LABELS,
  STAGE_LABELS,
  VALUE_CHAIN_LEVEL_HELP,
  VALUE_CHAIN_LEVEL_LABELS,
  VARIABLE_CATEGORY_LABELS,
  VARIABLE_POLARITY_LABELS,
  VERDICT_DESCRIPTIONS,
  VERDICT_LABELS,
} from "@/domain/enums";
import { EVIDENCE_COMPONENT_LABELS } from "@/services/scoring/evidence-score";
import {
  OPPORTUNITY_INPUT_HELP,
  OPPORTUNITY_INPUT_LABELS,
} from "@/services/scoring/opportunity-score";
import { ADMISSIBILITY_LABELS } from "@/services/value/admissibility";
import { CLAIM_GROUP_LABELS, CLAIM_STATEMENTS } from "@/services/value/claim-taxonomy";
import { COMMERCIAL_RUNG_LABELS } from "@/services/value/commercial-ladder";
import { CAUSAL_DISTANCE_LABELS } from "@/services/value/epistemic";
import { FIT_DIMENSION_LABELS } from "@/services/value/evidence-fit";
import { SOURCE_FAMILY_LABELS } from "@/services/value/evidence-sources";
import {
  ASSIGNMENT_METHOD_LABELS,
  DESIGN_LEVEL_HELP,
  DESIGN_LEVEL_LABELS,
  INTERNAL_VALIDITY_LABELS,
  VALIDITY_INPUT_LABELS,
} from "@/services/value/experimental-validity";
import { GENERALIZATION_DESCRIPTIONS, GENERALIZATION_LABELS } from "@/services/value/language-gate";
import { UNCERTAINTY_LABELS } from "@/services/value/next-value-action";
import { PROOF_RUNG_LABELS } from "@/services/value/proof-frontier";
import { SCOPE_LABELS } from "@/services/value/scope";
import { VALUE_DIMENSION_HELP, VALUE_DIMENSION_LABELS } from "@/services/value/value-strength";
import { FIELD_STATUS_LABELS } from "@/services/value/variable-semantics";

export const labels = {
  // --- domain enums (src/domain/enums.ts)
  get stage() {
    return STAGE_LABELS;
  },
  get verdict() {
    return VERDICT_LABELS;
  },
  get verdictDescription() {
    return VERDICT_DESCRIPTIONS;
  },
  get provenance() {
    return PROVENANCE_LABELS;
  },
  get evidenceType() {
    return EVIDENCE_TYPE_LABELS;
  },
  get evidenceOrigin() {
    return EVIDENCE_ORIGIN_LABELS;
  },
  get sentiment() {
    return SENTIMENT_LABELS;
  },
  get variableCategory() {
    return VARIABLE_CATEGORY_LABELS;
  },
  get direction() {
    return DIRECTION_LABELS;
  },
  get epistemic() {
    return EPISTEMIC_LABELS;
  },
  get epistemicDescription() {
    return EPISTEMIC_DESCRIPTIONS;
  },
  get valueChainLevel() {
    return VALUE_CHAIN_LEVEL_LABELS;
  },
  get valueChainLevelHelp() {
    return VALUE_CHAIN_LEVEL_HELP;
  },
  get claimType() {
    return CLAIM_TYPE_LABELS;
  },
  get evidenceSourceType() {
    return EVIDENCE_SOURCE_TYPE_LABELS;
  },
  get assumptionKind() {
    return ASSUMPTION_KIND_LABELS;
  },
  get criticality() {
    return CRITICALITY_LABELS;
  },
  get experimentStatus() {
    return EXPERIMENT_STATUS_LABELS;
  },
  get experimentType() {
    return EXPERIMENT_TYPE_LABELS;
  },
  get experimentOutcome() {
    return EXPERIMENT_OUTCOME_LABELS;
  },
  get outcomeSource() {
    return OUTCOME_SOURCE_LABELS;
  },
  get knowledgeTrigger() {
    return KNOWLEDGE_TRIGGER_LABELS;
  },
  get variablePolarity() {
    return VARIABLE_POLARITY_LABELS;
  },
  get alternativeCategory() {
    return ALTERNATIVE_CATEGORY_LABELS;
  },
  get mechanismCategory() {
    return MECHANISM_CATEGORY_LABELS;
  },
  get assumptionStatus() {
    return ASSUMPTION_STATUS_LABELS;
  },
  get confidence() {
    return CONFIDENCE_LABELS;
  },
  // --- engine vocabularies (src/services/**)
  get scopeDimension() {
    return SCOPE_LABELS;
  },
  get proofRung() {
    return PROOF_RUNG_LABELS;
  },
  get fitDimension() {
    return FIT_DIMENSION_LABELS;
  },
  get fieldStatus() {
    return FIELD_STATUS_LABELS;
  },
  get causalDistance() {
    return CAUSAL_DISTANCE_LABELS;
  },
  get admissibility() {
    return ADMISSIBILITY_LABELS;
  },
  get commercialRung() {
    return COMMERCIAL_RUNG_LABELS;
  },
  get claimGroup() {
    return CLAIM_GROUP_LABELS;
  },
  get claimStatement() {
    return CLAIM_STATEMENTS;
  },
  get sourceFamily() {
    return SOURCE_FAMILY_LABELS;
  },
  get generalization() {
    return GENERALIZATION_LABELS;
  },
  get generalizationDescription() {
    return GENERALIZATION_DESCRIPTIONS;
  },
  get designLevel() {
    return DESIGN_LEVEL_LABELS;
  },
  get designLevelHelp() {
    return DESIGN_LEVEL_HELP;
  },
  get internalValidity() {
    return INTERNAL_VALIDITY_LABELS;
  },
  get assignmentMethod() {
    return ASSIGNMENT_METHOD_LABELS;
  },
  get validityInput() {
    return VALIDITY_INPUT_LABELS;
  },
  get uncertainty() {
    return UNCERTAINTY_LABELS;
  },
  get valueDimension() {
    return VALUE_DIMENSION_LABELS;
  },
  get valueDimensionHelp() {
    return VALUE_DIMENSION_HELP;
  },
  get opportunityInput() {
    return OPPORTUNITY_INPUT_LABELS;
  },
  get opportunityInputHelp() {
    return OPPORTUNITY_INPUT_HELP;
  },
  get evidenceComponent() {
    return EVIDENCE_COMPONENT_LABELS;
  },
};
