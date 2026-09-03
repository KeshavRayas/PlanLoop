-- Migration: Phase 2A — JobAnalysis (additive only)
-- SAFE: creates new type/table only, touches no existing data.

DO $$ BEGIN
  CREATE TYPE "AnalysisVerdict" AS ENUM ('STRONG', 'POSSIBLE', 'WEAK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "JobAnalysis" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "responsibilities" TEXT[] NOT NULL,
  "requiredSkills" TEXT[] NOT NULL,
  "preferredSkills" TEXT[] NOT NULL,
  "matchedSkills" TEXT[] NOT NULL,
  "missingSkills" TEXT[] NOT NULL,
  "experienceRequirements" TEXT[] NOT NULL,
  "potentialConcerns" TEXT[] NOT NULL,
  "workAuthorization" TEXT,
  "workMode" TEXT,
  "verdict" "AnalysisVerdict" NOT NULL,
  "verdictReasons" TEXT[] NOT NULL,
  "rawJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JobAnalysis_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_jobId_key" UNIQUE ("jobId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobAnalysis" ADD CONSTRAINT "JobAnalysis_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
