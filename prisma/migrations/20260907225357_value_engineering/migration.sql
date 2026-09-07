-- CreateEnum
CREATE TYPE "EpistemicStatus" AS ENUM ('PROVEN', 'SUPPORTED', 'HYPOTHESIS', 'UNPROVEN', 'CONTRADICTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ValueChainLevel" AS ENUM ('MECHANISM', 'CAPABILITY', 'TRANSFORMATION', 'OPERATIONAL_VALUE', 'ECONOMIC_VALUE', 'STRATEGIC_OUTCOME', 'BUSINESS_OUTCOME');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('CRITICAL', 'IMPORTANT', 'MINOR');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('ICP', 'VARIABLE', 'CURRENT_STATE', 'PAIN', 'MAGNITUDE', 'FREQUENCY', 'ECONOMIC_IMPACT', 'CAUSAL_LINK', 'MECHANISM', 'WILLINGNESS_TO_PAY', 'VALUE_CHAIN_NODE', 'ALTERNATIVE', 'TRIGGER');

-- CreateEnum
CREATE TYPE "AssumptionKind" AS ENUM ('GENERIC', 'CAUSAL', 'VALUE', 'FEASIBILITY', 'WTP', 'ACCESS');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'ABANDONED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DesiredDirection" ADD VALUE 'PROTECT';
ALTER TYPE "DesiredDirection" ADD VALUE 'RECOVER';
ALTER TYPE "DesiredDirection" ADD VALUE 'STABILIZE';
ALTER TYPE "DesiredDirection" ADD VALUE 'MAINTAIN';
ALTER TYPE "DesiredDirection" ADD VALUE 'EXPAND';
ALTER TYPE "DesiredDirection" ADD VALUE 'RELEASE';
ALTER TYPE "DesiredDirection" ADD VALUE 'MEASURE';
ALTER TYPE "DesiredDirection" ADD VALUE 'TRACE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DiscoveryStage" ADD VALUE 'VALUE_CAUSALITY';
ALTER TYPE "DiscoveryStage" ADD VALUE 'EXPERIMENT_DESIGN';

-- AlterEnum
ALTER TYPE "EvidenceLinkDirection" ADD VALUE 'NEUTRAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VariableCategory" ADD VALUE 'CASH';
ALTER TYPE "VariableCategory" ADD VALUE 'COMPLEXITY';
ALTER TYPE "VariableCategory" ADD VALUE 'RELIABILITY';
ALTER TYPE "VariableCategory" ADD VALUE 'PERFORMANCE';
ALTER TYPE "VariableCategory" ADD VALUE 'VISIBILITY';
ALTER TYPE "VariableCategory" ADD VALUE 'PREDICTABILITY';
ALTER TYPE "VariableCategory" ADD VALUE 'UTILIZATION';

-- AlterTable
ALTER TABLE "Assumption" ADD COLUMN     "causalLinkId" TEXT,
ADD COLUMN     "kind" "AssumptionKind" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "valueChainNodeId" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "causalBreakdown" JSONB,
ADD COLUMN     "causalConfidence" INTEGER,
ADD COLUMN     "proofFrontier" JSONB,
ADD COLUMN     "proofFrontierRung" TEXT,
ADD COLUMN     "valueDimensionProvenance" JSONB,
ADD COLUMN     "valueStrength" INTEGER,
ADD COLUMN     "valueStrengthBreakdown" JSONB,
ADD COLUMN     "vsAttributability" INTEGER,
ADD COLUMN     "vsFrequency" INTEGER,
ADD COLUMN     "vsImportance" INTEGER,
ADD COLUMN     "vsMagnitude" INTEGER,
ADD COLUMN     "vsPopulation" INTEGER;

-- AlterTable
ALTER TABLE "Variable" ADD COLUMN     "currentState" TEXT,
ADD COLUMN     "currentStateValue" DOUBLE PRECISION,
ADD COLUMN     "desiredState" TEXT,
ADD COLUMN     "desiredStateValue" DOUBLE PRECISION,
ADD COLUMN     "evidenceStatus" "EpistemicStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "fieldProvenance" JSONB,
ADD COLUMN     "parentVariableId" TEXT,
ADD COLUMN     "target" TEXT,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "whoValuesIt" TEXT,
ADD COLUMN     "whyItMatters" TEXT;

-- CreateTable
CREATE TABLE "ValueChainNode" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "level" "ValueChainLevel" NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "EpistemicStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "causalDistance" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "generatedBy" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValueChainNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CausalLink" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "EpistemicStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "criticality" "Criticality" NOT NULL DEFAULT 'CRITICAL',
    "notes" TEXT,
    "generatedBy" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CausalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceClaimLink" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "claimType" "ClaimType" NOT NULL,
    "claimId" TEXT,
    "valueChainNodeId" TEXT,
    "causalLinkId" TEXT,
    "direction" "EvidenceLinkDirection" NOT NULL DEFAULT 'SUPPORTS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceClaimLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "causalLinkId" TEXT,
    "assumptionId" TEXT,
    "title" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "design" TEXT,
    "successMetric" TEXT,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'PLANNED',
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValueChainNode_opportunityId_idx" ON "ValueChainNode"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "ValueChainNode_opportunityId_level_key" ON "ValueChainNode"("opportunityId", "level");

-- CreateIndex
CREATE INDEX "CausalLink_opportunityId_idx" ON "CausalLink"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "CausalLink_fromNodeId_toNodeId_key" ON "CausalLink"("fromNodeId", "toNodeId");

-- CreateIndex
CREATE INDEX "EvidenceClaimLink_evidenceId_idx" ON "EvidenceClaimLink"("evidenceId");

-- CreateIndex
CREATE INDEX "EvidenceClaimLink_opportunityId_idx" ON "EvidenceClaimLink"("opportunityId");

-- CreateIndex
CREATE INDEX "EvidenceClaimLink_valueChainNodeId_idx" ON "EvidenceClaimLink"("valueChainNodeId");

-- CreateIndex
CREATE INDEX "EvidenceClaimLink_causalLinkId_idx" ON "EvidenceClaimLink"("causalLinkId");

-- CreateIndex
CREATE INDEX "EvidenceClaimLink_claimType_claimId_idx" ON "EvidenceClaimLink"("claimType", "claimId");

-- CreateIndex
CREATE INDEX "Experiment_opportunityId_idx" ON "Experiment"("opportunityId");

-- CreateIndex
CREATE INDEX "Assumption_valueChainNodeId_idx" ON "Assumption"("valueChainNodeId");

-- CreateIndex
CREATE INDEX "Assumption_causalLinkId_idx" ON "Assumption"("causalLinkId");

-- CreateIndex
CREATE INDEX "Variable_parentVariableId_idx" ON "Variable"("parentVariableId");

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_parentVariableId_fkey" FOREIGN KEY ("parentVariableId") REFERENCES "Variable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueChainNode" ADD CONSTRAINT "ValueChainNode_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CausalLink" ADD CONSTRAINT "CausalLink_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CausalLink" ADD CONSTRAINT "CausalLink_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "ValueChainNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CausalLink" ADD CONSTRAINT "CausalLink_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "ValueChainNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaimLink" ADD CONSTRAINT "EvidenceClaimLink_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaimLink" ADD CONSTRAINT "EvidenceClaimLink_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaimLink" ADD CONSTRAINT "EvidenceClaimLink_valueChainNodeId_fkey" FOREIGN KEY ("valueChainNodeId") REFERENCES "ValueChainNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaimLink" ADD CONSTRAINT "EvidenceClaimLink_causalLinkId_fkey" FOREIGN KEY ("causalLinkId") REFERENCES "CausalLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_causalLinkId_fkey" FOREIGN KEY ("causalLinkId") REFERENCES "CausalLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "Assumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_valueChainNodeId_fkey" FOREIGN KEY ("valueChainNodeId") REFERENCES "ValueChainNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_causalLinkId_fkey" FOREIGN KEY ("causalLinkId") REFERENCES "CausalLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data migration: map existing state into the Valuable Variable model.
-- Existing text is preserved verbatim and keeps the provenance it already had;
-- nothing is inferred. Fields that were never captured stay NULL (UNKNOWN).
-- ---------------------------------------------------------------------------

-- Current/desired state recorded on the first pain of a variable becomes the
-- variable's current/desired state, carrying the pain's provenance.
UPDATE "Variable" v
SET "currentState" = p."currentState",
    "desiredState" = p."desiredState",
    "fieldProvenance" = COALESCE(v."fieldProvenance", '{}'::jsonb)
      || CASE WHEN p."currentState" IS NOT NULL THEN jsonb_build_object('currentState', p."provenance"::text) ELSE '{}'::jsonb END
      || CASE WHEN p."desiredState" IS NOT NULL THEN jsonb_build_object('desiredState', p."provenance"::text) ELSE '{}'::jsonb END
FROM (
  SELECT DISTINCT ON ("variableId") "variableId", "currentState", "desiredState", "provenance"
  FROM "Pain"
  WHERE "currentState" IS NOT NULL OR "desiredState" IS NOT NULL
  ORDER BY "variableId", "createdAt" ASC
) p
WHERE p."variableId" = v.id
  AND v."currentState" IS NULL
  AND v."desiredState" IS NULL;

-- Name, category, direction and importance keep the variable's own provenance.
UPDATE "Variable"
SET "fieldProvenance" = COALESCE("fieldProvenance", '{}'::jsonb)
  || jsonb_build_object(
       'name', "provenance"::text,
       'category', "provenance"::text,
       'desiredDirection', "provenance"::text,
       'importanceScore', "provenance"::text
     );
