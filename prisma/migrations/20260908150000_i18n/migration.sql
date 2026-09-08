-- AlterTable
ALTER TABLE "CausalLink" ADD COLUMN     "inferenceMessage" JSONB;

-- AlterTable
ALTER TABLE "ExperimentResult" ADD COLUMN     "interpretationMessage" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locale" TEXT;

-- AlterTable
ALTER TABLE "ValueChainNode" ADD COLUMN     "inferenceMessage" JSONB;

