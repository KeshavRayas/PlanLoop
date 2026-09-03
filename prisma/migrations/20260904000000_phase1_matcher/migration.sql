-- Migration: Phase 1 matcher — Profile, NightlyRun, JobMatch (additive only)
-- SAFE: creates new tables/types only, touches no existing data.

--------------------------------------------------------------
-- STEP 1: Create SalaryFit enum
--------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "SalaryFit" AS ENUM ('MATCH', 'BELOW', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--------------------------------------------------------------
-- STEP 2: Create Profile table (single default row + future variants)
--------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Profile" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'default',
  "skills" TEXT[] NOT NULL,
  "minSalary" INTEGER,
  "locations" TEXT[] NOT NULL DEFAULT '{}',
  "workModes" "WorkMode"[] NOT NULL DEFAULT '{}',
  "dealbreakers" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

--------------------------------------------------------------
-- STEP 3: Create NightlyRun table (audit log per nightly scoring run)
--------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "NightlyRun" (
  "id" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "fetched" INTEGER NOT NULL DEFAULT 0,
  "scored" INTEGER NOT NULL DEFAULT 0,
  "matched" INTEGER NOT NULL DEFAULT 0,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,

  CONSTRAINT "NightlyRun_pkey" PRIMARY KEY ("id")
);

--------------------------------------------------------------
-- STEP 4: Create JobMatch table (TOP 25 candidate set + history)
--------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "JobMatch" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "matchedSkills" TEXT[] NOT NULL,
  "missingSkills" TEXT[] NOT NULL,
  "skillOverlap" DOUBLE PRECISION NOT NULL,
  "salaryFit" "SalaryFit" NOT NULL,
  "salaryScore" DOUBLE PRECISION NOT NULL,
  "recencyDecay" DOUBLE PRECISION NOT NULL,
  "sourceTrust" DOUBLE PRECISION NOT NULL,
  "levelFit" DOUBLE PRECISION NOT NULL,
  "reasons" TEXT[] NOT NULL,
  "nightlyRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- Unique jobId (one current match row per job; upsert per nightly run)
DO $$ BEGIN
  ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_jobId_key" UNIQUE ("jobId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- FK to Job (cascade: deleting a job removes its match)
DO $$ BEGIN
  ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- FK to NightlyRun (null on run cleanup: history survives)
DO $$ BEGIN
  ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_nightlyRunId_fkey"
    FOREIGN KEY ("nightlyRunId") REFERENCES "NightlyRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "JobMatch_score_idx" ON "JobMatch"("score");
CREATE INDEX IF NOT EXISTS "JobMatch_nightlyRunId_idx" ON "JobMatch"("nightlyRunId");
