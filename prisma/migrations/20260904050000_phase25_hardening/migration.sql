-- Migration: Phase 2.5 — versioning, decisions, calibration (additive-first)
-- Only destructive step: dropping the TailoredResume jobId UNIQUE so
-- (jobId, version) becomes the identity. No rows deleted.

ALTER TABLE "TailoredResume" DROP CONSTRAINT IF EXISTS "TailoredResume_jobId_key";

ALTER TABLE "TailoredResume"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE "TailoredResume" ADD CONSTRAINT "TailoredResume_jobId_version_key" UNIQUE ("jobId", "version");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "TailoredResume_jobId_current_idx" ON "TailoredResume"("jobId", "isCurrent");

DO $$ BEGIN
  CREATE TYPE "DecisionStatus" AS ENUM ('QUEUED', 'OPENED', 'APPLIED', 'SAVED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ApplicationDecision" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" "DecisionStatus" NOT NULL DEFAULT 'QUEUED',
  "reason" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApplicationDecision_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ApplicationDecision" ADD CONSTRAINT "ApplicationDecision_jobId_key" UNIQUE ("jobId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApplicationDecision" ADD CONSTRAINT "ApplicationDecision_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "JobMatch"
  ADD COLUMN IF NOT EXISTS "humanVerdict" TEXT,
  ADD COLUMN IF NOT EXISTS "judgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "judgmentContext" TEXT DEFAULT 'LOCATION_VISIBLE';
