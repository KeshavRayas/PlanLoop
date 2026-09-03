-- Migration: Add new enums, columns, and cleanup existing data
-- This migration is SAFE — no hard deletes, only soft-rejections via status='REJECTED'

--------------------------------------------------------------
-- STEP 1: Create new enum types
--------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RejectionReason" AS ENUM ('NON_CS', 'NON_ENTRY_LEVEL', 'UNKNOWN_EXPERIENCE', 'INVALID_LOCATION', 'DUPLICATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--------------------------------------------------------------
-- STEP 2: Add new columns to Job table
--------------------------------------------------------------

ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "workMode" "WorkMode" NOT NULL DEFAULT 'ONSITE',
  ADD COLUMN IF NOT EXISTS "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "classificationScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "rejectionReason" "RejectionReason",
  ADD COLUMN IF NOT EXISTS "sourceScore" INTEGER NOT NULL DEFAULT 0;

--------------------------------------------------------------
-- STEP 3: Migrate existing data — populate workMode from remote boolean
--------------------------------------------------------------

-- Jobs that were remote=true become REMOTE
UPDATE "Job"
SET "workMode" = 'REMOTE'
WHERE "remote" = true;

-- Jobs with Bangalore/Bengaluru in location become ONSITE (hybrid wasn't stored)
UPDATE "Job"
SET "workMode" = 'ONSITE'
WHERE "remote" = false
  AND (
    LOWER(location) LIKE '%bangalore%'
    OR LOWER(location) LIKE '%bengaluru%'
    OR LOWER(location) LIKE '%bangalore urban%'
    OR LOWER(location) LIKE '%karnataka%'
  );

-- Jobs with no Bangalore location and not remote remain ONSITE (they'll be cleaned up below)

--------------------------------------------------------------
-- STEP 4: Add indexes for performance
--------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "Job_workMode_idx" ON "Job" ("workMode");
CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job" ("status");
CREATE INDEX IF NOT EXISTS "Job_location_idx" ON "Job" (location);
CREATE INDEX IF NOT EXISTS "Job_jobType_idx" ON "Job" ("jobType");
CREATE INDEX IF NOT EXISTS "Job_experience_idx" ON "Job" (experience);
CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job" ("createdAt");
CREATE INDEX IF NOT EXISTS "Job_sourceScore_idx" ON "Job" ("sourceScore");

-- Drop old remote index (replaced by workMode)
DROP INDEX IF EXISTS "Job_remote_idx";

--------------------------------------------------------------
-- STEP 5: Cleanup — soft-reject non-CS jobs
-- Uses simple keyword matching (same strategy as classifier)
--------------------------------------------------------------

-- 5a: Reject non-CS jobs
UPDATE "Job"
SET
  "status" = 'REJECTED',
  "rejectionReason" = 'NON_CS'
WHERE
  "status" = 'ACTIVE'
  AND NOT (
    LOWER(title) ~ '(software|engineer|developer|data\s*scien|data\s*engineer|machine\s*learning|full\s*stack|frontend|backend|devops|sre|site\s*reliability|platform\s*engineer|cloud\s*engineer|cybersec|qa\s*automation|mobile\s*dev|embedded\s*software|systems\s*engineer|product\s*engineer|infrastructure|network\s*engineer|data\s*analyst|research\s*scientist|apprentice|intern|graduate|trainee|associate|junior)'
  );

-- 5b: Reject senior/lead/principal/staff/manager/director/vp/architect roles
UPDATE "Job"
SET
  "status" = 'REJECTED',
  "rejectionReason" = 'NON_ENTRY_LEVEL'
WHERE
  "status" = 'ACTIVE'
  AND (
    LOWER(title) ~ '(senior|lead|principal|staff\s+(engineer|sde|developer)|manager|director|vp\s|vice\s*president|architect|head\s+of|chief)'
  );

-- 5c: Reject invalid locations (non-Bangalore, non-remote)
UPDATE "Job"
SET
  "status" = 'REJECTED',
  "rejectionReason" = 'INVALID_LOCATION'
WHERE
  "status" = 'ACTIVE'
  AND "workMode" != 'REMOTE'
  AND NOT (
    LOWER(location) LIKE '%bangalore%'
    OR LOWER(location) LIKE '%bengaluru%'
    OR LOWER(location) LIKE '%bangalore urban%'
    OR LOWER(location) LIKE '%karnataka%'
    OR location IS NULL
  );

--------------------------------------------------------------
-- Summary: report counts
--------------------------------------------------------------

DO $$
DECLARE
  non_cs_count INTEGER;
  senior_count INTEGER;
  location_count INTEGER;
  active_count INTEGER;
  rejected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO non_cs_count FROM "Job" WHERE "rejectionReason" = 'NON_CS';
  SELECT COUNT(*) INTO senior_count FROM "Job" WHERE "rejectionReason" = 'NON_ENTRY_LEVEL';
  SELECT COUNT(*) INTO location_count FROM "Job" WHERE "rejectionReason" = 'INVALID_LOCATION';
  SELECT COUNT(*) INTO active_count FROM "Job" WHERE "status" = 'ACTIVE';
  SELECT COUNT(*) INTO rejected_count FROM "Job" WHERE "status" = 'REJECTED';

  RAISE NOTICE '=== Cleanup Summary ===';
  RAISE NOTICE 'Rejected as Non-CS: %', non_cs_count;
  RAISE NOTICE 'Rejected as Senior: %', senior_count;
  RAISE NOTICE 'Rejected as Location: %', location_count;
  RAISE NOTICE 'Remaining Active: %', active_count;
  RAISE NOTICE 'Total Rejected: %', rejected_count;
END $$;
