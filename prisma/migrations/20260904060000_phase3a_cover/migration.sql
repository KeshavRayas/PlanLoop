-- Migration: Phase 3A — CoverLetter (additive only)
-- SAFE: creates one table, touches no existing data.

CREATE TABLE IF NOT EXISTS "CoverLetter" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "baseResumeId" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "evidenceIds" TEXT[] NOT NULL,
  "rawJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_jobId_key" UNIQUE ("jobId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
