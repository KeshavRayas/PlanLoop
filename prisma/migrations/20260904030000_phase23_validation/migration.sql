-- Migration: Phase 2.3 — TailoredResume validation state (additive only)
-- Existing rows default to STRUCTURAL_VALID (they passed the 2.2 gate).

DO $$ BEGIN
  CREATE TYPE "TailorValidationStatus" AS ENUM ('STRUCTURAL_VALID', 'SEMANTIC_VALID', 'SEMANTIC_INVALID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "TailoredResume"
  ADD COLUMN IF NOT EXISTS "validationStatus" "TailorValidationStatus" NOT NULL DEFAULT 'STRUCTURAL_VALID',
  ADD COLUMN IF NOT EXISTS "validationResult" JSONB,
  ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3);
