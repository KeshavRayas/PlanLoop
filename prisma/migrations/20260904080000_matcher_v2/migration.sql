-- Migration: Matcher v2 — role/location/recency dimensions (additive only)

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "preferredRoleFamilies" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "vetoedRoleFamilies" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "openToRemote" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "JobMatch"
  ADD COLUMN IF NOT EXISTS "roleFamily" TEXT,
  ADD COLUMN IF NOT EXISTS "roleFit" TEXT,
  ADD COLUMN IF NOT EXISTS "locationFit" TEXT,
  ADD COLUMN IF NOT EXISTS "recencySource" TEXT;

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "baseResumeId" TEXT;
