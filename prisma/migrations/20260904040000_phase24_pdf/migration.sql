-- Migration: Phase 2.4 — render/ATS state + Profile contact (additive only)

DO $$ BEGIN
  CREATE TYPE "RenderStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AtsStatus" AS ENUM ('PENDING', 'CHECKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "TailoredResume"
  ADD COLUMN IF NOT EXISTS "renderStatus" "RenderStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "renderedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pdfPath" TEXT,
  ADD COLUMN IF NOT EXISTS "atsStatus" "AtsStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "atsResult" JSONB,
  ADD COLUMN IF NOT EXISTS "atsCheckedAt" TIMESTAMP(3);

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "linkedin" TEXT,
  ADD COLUMN IF NOT EXISTS "github" TEXT;
