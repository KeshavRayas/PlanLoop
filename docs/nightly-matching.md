# Nightly matching (Phase 1)

Model-free candidate selection. No LLM, no embeddings, no resume tailoring.

## Flow

```text
Vercel Cron 02:00 GET /api/cron/nightly
  → runNightly()
    → runIngestionPipeline() (existing: fetch, validate, cheap filters, upsert)
    → runMatching(runId, topN=25)
      → Profile (default row; seeded from latest Resume skills on first run)
      → candidates: Job WHERE status=ACTIVE
          AND classificationScore >= 0.70
          AND (postedAt within 30d OR postedAt IS NULL)
      → scoreJob(profile, job) per candidate (pure, see below)
      → sort DESC → take TOP 25 → upsert JobMatch (keeps history:
          older rows retain their previous nightlyRunId)
    → getTopMatches(25, runId) → sendNightlyDigest() via Resend
    → NightlyRun marked success/failed
```

## scoreJob contract (`src/lib/matching/score.ts`)

Pure function, zero Prisma/API/LLM deps:

```ts
scoreJob(profile, job, now?): MatchResult
```

Weights: skills 0.55, level 0.15, recency 0.10, source 0.10, salary 0.10.
Persisted raw components per match: `score, matchedSkills[], missingSkills[],
skillOverlap, salaryFit (MATCH|BELOW|UNKNOWN), salaryScore, recencyDecay,
sourceTrust, levelFit, reasons[]` — never just the final score, so weights
can be retuned later without reverse-engineering.

Key rules:

- Unknown salary → `UNKNOWN` (0.5), never zero. Below `Profile.minSalary` →
  `BELOW` (0).
- No extracted job skills → overlap neutral (0.5), not zero.
- Recency decay: today 1.0 → 1d 0.9 → 3d 0.7 → 7d 0.4 → 30d 0.
- Source trust: `sourceScore` 3/2/1/0 → 1.0/0.8/0.6/0.4
  (Greenhouse/Lever/Ashby = 3, Remotive = 1, aggregators = 0).
- Skills normalized through `SKILL_ALIASES` (`ts` → `TypeScript`).

## Explicitly out of scope (Phase 2+)

Tailored resumes in nightly, LLM calls, embeddings, morning Analyze/Tailor
actions, feedback-weight learning, aggressive liveness crawling.

## Env

- `DIGEST_TO_EMAIL` — digest recipient. When unset (or `RESEND_API_KEY`
  unset), the digest is skipped with a log line and the run still succeeds.
- `DIGEST_FROM_EMAIL` — optional sender override (verified domain).
