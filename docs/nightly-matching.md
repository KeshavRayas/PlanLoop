# Nightly matching (Phase 1 + Matcher v2)

Model-free candidate selection. No LLM, no embeddings, no resume tailoring.

## Flow

```text
Vercel Cron 02:00 GET /api/cron/nightly
  â†’ runNightly()
    â†’ runIngestionPipeline() (existing: fetch, validate, cheap filters, upsert)
    â†’ runMatching(runId, topN=25)
      â†’ Profile (default row: skills, floors, role goals, remote prefs)
      â†’ candidates: Job WHERE status=ACTIVE
          AND classificationScore >= 0.70
          AND (postedAt within 30d OR postedAt IS NULL)
      â†’ HARD FILTERS (logged, counted): role-family VETO
          (e.g. DATA_ANNOTATION), location INELIGIBLE
      â†’ scoreJob() per survivor â†’ sort DESC â†’ take TOP 25
      â†’ upsert JobMatch (history retained) â†’ NightlyRun stats
    â†’ getTopMatches(25, runId) â†’ sendNightlyDigest() via Resend
```

## scoreJob contract (`src/lib/matching/score.ts`)

Pure function, zero Prisma/API/LLM deps. Weights (v2, sum 1.0 â€” old
components keep their relative order):

```text
skills .40, role .15, level .12, recency .08, source .08, salary .07,
location .10
```

Persisted raw components per match: `score, matchedSkills[],
missingSkills[], skillOverlap, salaryFit, salaryScore, recencyDecay,
recencySource (posted|scraped|none), sourceTrust, levelFit, roleFamily,
roleFit, locationFit, reasons[]` â€” never just the final score.

Key rules:

- Unknown salary â†’ `UNKNOWN` (0.5), never zero. Below `Profile.minSalary` â†’
  `BELOW` (0).
- No extracted job skills â†’ overlap neutral (0.5), not zero.
- Recency decay: today 1.0 â†’ 1d 0.9 â†’ 3d 0.7 â†’ 7d 0.4 â†’ 30d 0, with
  `effectiveDate = postedAt ?? scrapedAt` (source recorded in reasons).
- Source trust: `sourceScore` 3/2/1/0 â†’ 1.0/0.8/0.6/0.4
  (Greenhouse/Lever/Ashby = 3, Remotive = 1, aggregators = 0).
- Skills normalized through `SKILL_ALIASES` (`ts` â†’ `TypeScript`).
- Role family (`src/lib/matching/roleFamily.ts`): title taxonomy
  BACKEND/INFRASTRUCTURE/DEVOPS_SRE/FULL_STACK/FRONTEND/ML_AI/DATA/
  DATA_ANNOTATION/FORWARD_DEPLOYED/OTHER, checked specific-first so
  annotation never lands in DATA. Fit vs profile goals: STRONG 1.0,
  ACCEPTABLE 0.6, WEAK 0.3 (OTHER), VETO 0. Annotation is vetoed
  unconditionally (different job category, like NON_CS rejection).
- Location (`src/lib/matching/eligibility.ts`): ELIGIBLE 1.0 /
  UNCERTAIN 0.75 / UNKNOWN 0.5 / INELIGIBLE filtered. INELIGIBLE is reserved
  for the genuinely impossible (on-site foreign, explicit work-auth
  restrictions, remote denials like "no remote work"). Foreign requisition
  codes on remote postings (`US-*`, `PL-*`, `DE-*` via country-code parsing)
  are UNCERTAIN â€” a small penalty plus a visible reason, never a verdict
  ceiling. Home = Bangalore/India/APAC markers in the LOCATION (a bare
  "india" in boilerplate does not count). Missing info â†’ UNKNOWN, never
  silent eligible. Fit (would I pursue this?) and confidence (can I pursue
  it?) stay separate: verdict vs `locationFit` signal.
- `Profile.baseResumeId` pins the tailoring base resume (seeded from the
  transcribed resume); tailoring never depends on timestamp ordering.

## Calibration

Batch metrics (`npx tsx scripts/calibrate.ts`, scoped to one run):

```text
BAD/EXCELLENT in top 5/10, pairwise inversions, mean rank by verdict,
role-family distribution, location errors, location UNKNOWN-rate
```

`judgmentContext` (`LOCATION_VISIBLE` default, `LOCATION_HIDDEN` for
judgments made without seeing locations) excludes blind rows from
location-specific cuts only. Batch snapshots with reason context:
`npx tsx scripts/judge-queue.ts --export <path>` (see
`scripts/calibration/batch1.json`, `batch2.json`). Class-level ranking
invariants live in `src/__tests__/rankingInvariants.test.ts`: assert
relationships between job classes, never exact floats.

## Env

- `DIGEST_TO_EMAIL` - digest recipient. When unset (or `RESEND_API_KEY`
  unset), the digest is skipped with a log line and the run still succeeds.
- `DIGEST_FROM_EMAIL` - optional sender override (verified domain).
