-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EntryMode" AS ENUM ('NO_IDEA', 'HAS_IDEA');

-- CreateEnum
CREATE TYPE "DiscoveryStage" AS ENUM ('START', 'USER_CONTEXT', 'MARKET_SELECTION', 'ICP_DISCOVERY', 'VARIABLE_DISCOVERY', 'PAIN_DISCOVERY', 'TRIGGER_DISCOVERY', 'ALTERNATIVE_DISCOVERY', 'EVIDENCE_DISCOVERY', 'MECHANISM_DISCOVERY', 'OPPORTUNITY_FORMATION', 'SCORING', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "Provenance" AS ENUM ('USER', 'AI_HYPOTHESIS', 'EXTERNAL_EVIDENCE', 'INTERVIEW', 'COMPUTED');

-- CreateEnum
CREATE TYPE "VariableCategory" AS ENUM ('REVENUE', 'COST', 'TIME', 'RISK', 'CAPACITY', 'QUALITY', 'RETENTION', 'CONVERSION', 'PRODUCTIVITY', 'AVAILABILITY', 'COMPLIANCE', 'FRAUD', 'DOWNTIME', 'INVENTORY', 'MARGIN', 'OTHER');

-- CreateEnum
CREATE TYPE "DesiredDirection" AS ENUM ('INCREASE', 'DECREASE', 'ACCELERATE', 'IMPROVE', 'SIMPLIFY', 'PREVENT', 'AUTOMATE', 'OPTIMIZE', 'DETECT');

-- CreateEnum
CREATE TYPE "AlternativeCategory" AS ENUM ('SPREADSHEET', 'MANUAL_PROCESS', 'INTERNAL_EMPLOYEE', 'OUTSOURCING', 'COMPETITOR_SOFTWARE', 'MESSAGING', 'EMAIL', 'PHONE', 'CUSTOM_SOFTWARE', 'NO_SOLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('FORUM_POST', 'REDDIT', 'REVIEW', 'COMPETITOR_REVIEW', 'INTERVIEW', 'SURVEY', 'JOB_POSTING', 'SEARCH_SIGNAL', 'CUSTOMER_QUOTE', 'MARKET_REPORT', 'MANUAL_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceSentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "EvidenceOrigin" AS ENUM ('USER_CAPTURED', 'INTERVIEW', 'RESEARCH_PROVIDER', 'DEMO');

-- CreateEnum
CREATE TYPE "MechanismCategory" AS ENUM ('AUTOMATION', 'AI_AGENT', 'PREDICTION', 'MONITORING', 'MARKETPLACE', 'WORKFLOW', 'FINTECH', 'COMPUTER_VISION', 'HARDWARE', 'ROBOTICS', 'OPTIMIZATION', 'API', 'DATA_AGGREGATION', 'VERTICAL_SAAS', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('IGNORE', 'KILL', 'RESEARCH', 'INVESTIGATE', 'INTERVIEW', 'TEST');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AssumptionStatus" AS ENUM ('UNKNOWN', 'SUPPORTED', 'CONTRADICTED');

-- CreateEnum
CREATE TYPE "EvidenceLinkDirection" AS ENUM ('SUPPORTS', 'CONTRADICTS');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "entryMode" "EntryMode",
    "ideaStatement" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "attractivenessNotes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICP" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "companyType" TEXT,
    "companySize" TEXT,
    "responsibilities" TEXT,
    "economicBuyer" TEXT,
    "userRole" TEXT,
    "reachability" TEXT,
    "notes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variable" (
    "id" TEXT NOT NULL,
    "icpId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "VariableCategory" NOT NULL DEFAULT 'OTHER',
    "desiredDirection" "DesiredDirection" NOT NULL DEFAULT 'IMPROVE',
    "importanceScore" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pain" (
    "id" TEXT NOT NULL,
    "variableId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severityScore" INTEGER NOT NULL DEFAULT 5,
    "frequencyScore" INTEGER NOT NULL DEFAULT 5,
    "currentState" TEXT,
    "desiredState" TEXT,
    "gapDescription" TEXT,
    "notes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trigger" (
    "id" TEXT NOT NULL,
    "painId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgencyScore" INTEGER NOT NULL DEFAULT 5,
    "frequency" TEXT,
    "notes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alternative" (
    "id" TEXT NOT NULL,
    "painId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AlternativeCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "costEstimate" TEXT,
    "weaknessDescription" TEXT,
    "weaknessScore" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "painId" TEXT,
    "opportunityId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "origin" "EvidenceOrigin" NOT NULL DEFAULT 'USER_CAPTURED',
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceExcerpt" TEXT NOT NULL,
    "sourceDate" TIMESTAMP(3),
    "sourceAuthor" TEXT,
    "relevanceScore" INTEGER NOT NULL DEFAULT 5,
    "strengthScore" INTEGER NOT NULL DEFAULT 5,
    "sentiment" "EvidenceSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "isDirectCustomer" BOOLEAN NOT NULL DEFAULT false,
    "hasExplicitPain" BOOLEAN NOT NULL DEFAULT false,
    "hasEconomicImpact" BOOLEAN NOT NULL DEFAULT false,
    "hasWorkaround" BOOLEAN NOT NULL DEFAULT false,
    "hasPurchaseIntent" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isMocked" BOOLEAN NOT NULL DEFAULT false,
    "providerName" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMechanism" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "painId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MechanismCategory" NOT NULL DEFAULT 'OTHER',
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMechanism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "icpId" TEXT,
    "variableId" TEXT,
    "painId" TEXT,
    "title" TEXT NOT NULL,
    "problemStatement" TEXT,
    "mechanism" TEXT,
    "productHypothesis" TEXT,
    "valueProposition" TEXT,
    "metric" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 5,
    "painIntensity" INTEGER NOT NULL DEFAULT 5,
    "frequency" INTEGER NOT NULL DEFAULT 5,
    "gap" INTEGER NOT NULL DEFAULT 5,
    "willingnessToPay" INTEGER NOT NULL DEFAULT 5,
    "alternativeWeakness" INTEGER NOT NULL DEFAULT 5,
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "evidenceScore" INTEGER NOT NULL DEFAULT 0,
    "verdict" "Verdict" NOT NULL DEFAULT 'IGNORE',
    "confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "scoreBreakdown" JSONB,
    "evidenceBreakdown" JSONB,
    "verdictReasons" JSONB,
    "killWarnings" JSONB,
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interviewGuide" JSONB,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "statement" TEXT NOT NULL,
    "status" "AssumptionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "importance" INTEGER NOT NULL DEFAULT 5,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "provenance" "Provenance" NOT NULL DEFAULT 'AI_HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssumptionEvidence" (
    "assumptionId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "direction" "EvidenceLinkDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssumptionEvidence_pkey" PRIMARY KEY ("assumptionId","evidenceId")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stage" "DiscoveryStage" NOT NULL DEFAULT 'START',
    "userContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE INDEX "Market_workspaceId_idx" ON "Market"("workspaceId");

-- CreateIndex
CREATE INDEX "ICP_marketId_idx" ON "ICP"("marketId");

-- CreateIndex
CREATE INDEX "Variable_icpId_idx" ON "Variable"("icpId");

-- CreateIndex
CREATE INDEX "Pain_variableId_idx" ON "Pain"("variableId");

-- CreateIndex
CREATE INDEX "Trigger_painId_idx" ON "Trigger"("painId");

-- CreateIndex
CREATE INDEX "Alternative_painId_idx" ON "Alternative"("painId");

-- CreateIndex
CREATE INDEX "Evidence_workspaceId_idx" ON "Evidence"("workspaceId");

-- CreateIndex
CREATE INDEX "Evidence_painId_idx" ON "Evidence"("painId");

-- CreateIndex
CREATE INDEX "Evidence_opportunityId_idx" ON "Evidence"("opportunityId");

-- CreateIndex
CREATE INDEX "ProductMechanism_workspaceId_idx" ON "ProductMechanism"("workspaceId");

-- CreateIndex
CREATE INDEX "Opportunity_workspaceId_idx" ON "Opportunity"("workspaceId");

-- CreateIndex
CREATE INDEX "Assumption_workspaceId_idx" ON "Assumption"("workspaceId");

-- CreateIndex
CREATE INDEX "Assumption_opportunityId_idx" ON "Assumption"("opportunityId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_idx" ON "Conversation"("workspaceId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICP" ADD CONSTRAINT "ICP_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variable" ADD CONSTRAINT "Variable_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "ICP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pain" ADD CONSTRAINT "Pain_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "Variable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_painId_fkey" FOREIGN KEY ("painId") REFERENCES "Pain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alternative" ADD CONSTRAINT "Alternative_painId_fkey" FOREIGN KEY ("painId") REFERENCES "Pain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_painId_fkey" FOREIGN KEY ("painId") REFERENCES "Pain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMechanism" ADD CONSTRAINT "ProductMechanism_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMechanism" ADD CONSTRAINT "ProductMechanism_painId_fkey" FOREIGN KEY ("painId") REFERENCES "Pain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "ICP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "Variable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_painId_fkey" FOREIGN KEY ("painId") REFERENCES "Pain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssumptionEvidence" ADD CONSTRAINT "AssumptionEvidence_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "Assumption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssumptionEvidence" ADD CONSTRAINT "AssumptionEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
