-- CreateEnum
CREATE TYPE "VariablePolarity" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "ExperimentType" AS ENUM ('CUSTOMER_INTERVIEW', 'PRICING_TEST', 'LANDING_PAGE_TEST', 'CONCIERGE_TEST', 'PROTOTYPE_TEST', 'DATA_FEASIBILITY_TEST', 'AB_TEST', 'MANUAL_WORKFLOW_TEST', 'COHORT_OBSERVATION', 'TECHNICAL_SPIKE', 'RETROSPECTIVE_DATA_ANALYSIS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperimentOutcome" AS ENUM ('SUPPORTED', 'CONTRADICTED', 'INCONCLUSIVE', 'INVALID');

-- CreateEnum
CREATE TYPE "OutcomeSource" AS ENUM ('THRESHOLD', 'USER');

-- CreateEnum
CREATE TYPE "KnowledgeTrigger" AS ENUM ('EXPERIMENT_RESULT', 'EVIDENCE_ADDED', 'EVIDENCE_LINKED', 'ASSUMPTION_UPDATED', 'RECOMPUTE');

-- AlterEnum
ALTER TYPE "EvidenceOrigin" ADD VALUE 'EXPERIMENT_RESULT';

-- AlterEnum
ALTER TYPE "EvidenceType" ADD VALUE 'EXPERIMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExperimentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ExperimentStatus" ADD VALUE 'INVALID';

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "experimentId" TEXT,
ADD COLUMN     "experimentResultId" TEXT,
ADD COLUMN     "limitations" TEXT,
ADD COLUMN     "methodology" TEXT,
ADD COLUMN     "observedMetric" TEXT,
ADD COLUMN     "sampleSize" INTEGER;

-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "costEstimate" TEXT,
ADD COLUMN     "decisionImpact" INTEGER,
ADD COLUMN     "decisionQuestion" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "effort" INTEGER,
ADD COLUMN     "expectedInformationGain" INTEGER,
ADD COLUMN     "experimentType" "ExperimentType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "failureThreshold" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "owner" TEXT,
ADD COLUMN     "plannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "population" TEXT,
ADD COLUMN     "sampleSize" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "successThreshold" DOUBLE PRECISION,
ADD COLUMN     "timeEstimate" TEXT,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "valueChainNodeId" TEXT;

-- AlterTable
ALTER TABLE "Variable" ADD COLUMN     "parentDirection" "DesiredDirection",
ADD COLUMN     "scope" TEXT,
ADD COLUMN     "variablePolarity" "VariablePolarity",
ADD COLUMN     "variableType" TEXT;

-- CreateTable
CREATE TABLE "ExperimentResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "outcome" "ExperimentOutcome" NOT NULL,
    "outcomeSource" "OutcomeSource" NOT NULL DEFAULT 'USER',
    "observedMetric" TEXT,
    "observedValue" DOUBLE PRECISION,
    "unit" TEXT,
    "sampleSize" INTEGER,
    "measurementPeriod" TEXT,
    "resultSummary" TEXT NOT NULL,
    "limitations" TEXT,
    "confounders" TEXT,
    "anomalies" TEXT,
    "rawEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enteredBy" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChange" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "experimentId" TEXT,
    "evidenceId" TEXT,
    "trigger" "KnowledgeTrigger" NOT NULL DEFAULT 'RECOMPUTE',
    "previousFrontier" TEXT,
    "newFrontier" TEXT,
    "previousEvidenceConfidence" INTEGER NOT NULL,
    "newEvidenceConfidence" INTEGER NOT NULL,
    "previousValueStrength" INTEGER,
    "newValueStrength" INTEGER,
    "previousCausalConfidence" INTEGER,
    "newCausalConfidence" INTEGER,
    "previousVerdict" "Verdict" NOT NULL,
    "newVerdict" "Verdict" NOT NULL,
    "claimsStrengthened" JSONB NOT NULL,
    "claimsWeakened" JSONB NOT NULL,
    "claimsContradicted" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValuePath" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primaryVariableId" TEXT,
    "parentEconomicVariableId" TEXT,
    "nodeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causalLinkIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proofFrontier" TEXT,
    "status" "EpistemicStatus" NOT NULL DEFAULT 'UNKNOWN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValuePath_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentResult_experimentId_key" ON "ExperimentResult"("experimentId");

-- CreateIndex
CREATE INDEX "KnowledgeChange_opportunityId_createdAt_idx" ON "KnowledgeChange"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "ValuePath_opportunityId_idx" ON "ValuePath"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_experimentResultId_key" ON "Evidence"("experimentResultId");

-- CreateIndex
CREATE INDEX "Evidence_experimentId_idx" ON "Evidence"("experimentId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_experimentResultId_fkey" FOREIGN KEY ("experimentResultId") REFERENCES "ExperimentResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_valueChainNodeId_fkey" FOREIGN KEY ("valueChainNodeId") REFERENCES "ValueChainNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentResult" ADD CONSTRAINT "ExperimentResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChange" ADD CONSTRAINT "KnowledgeChange_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChange" ADD CONSTRAINT "KnowledgeChange_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChange" ADD CONSTRAINT "KnowledgeChange_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuePath" ADD CONSTRAINT "ValuePath_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuePath" ADD CONSTRAINT "ValuePath_primaryVariableId_fkey" FOREIGN KEY ("primaryVariableId") REFERENCES "Variable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValuePath" ADD CONSTRAINT "ValuePath_parentEconomicVariableId_fkey" FOREIGN KEY ("parentEconomicVariableId") REFERENCES "Variable"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Data migration (backward compatible, nothing inferred):
--  * existing experiments keep their creation date as planning date;
--  * variableType / variablePolarity / scope / parentDirection stay NULL
--    (UNKNOWN) — the economic category is never turned into a variable type.
-- ---------------------------------------------------------------------------
UPDATE "Experiment" SET "plannedAt" = "createdAt";
