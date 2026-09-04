# Cover letters (Phase 3A)

Reuse, don't re-analyze. A cover letter builds on the existing
`JobAnalysis` + the current approved `TailoredResume` (+ base-resume
evidence). No new job analysis is ever triggered from this flow.

## Contract

Zod shape (`src/lib/cover/contract.ts`, `coverLetterSchema`):

```text
{ subject?: string, greeting: string, paragraphs: string[3..6],
  closing: string, evidenceIds: string[1..20] }
```

Same evidence rule as tailoring: every achievement/experience claim must
trace to base-resume evidence; the model may rephrase but never invent —
no new skills, employers, numbers, dates, degrees. Known gaps from the
analysis stay out of the letter. The prompt (`buildCoverPrompt`) sends
only analysis summary + tailored highlights + evidence items.

Deterministic gate (`src/lib/cover/validate.ts`, no model):

- every evidenceId exists in the base evidence set, no duplicates
- at least one evidenceId cited, none empty

Failures → 502, nothing persists.

## Routes

```text
Analyze + tailor first → [Write cover letter]
  → POST /api/jobs/:id/cover
  → generateCoverLetter(): analysis + current tailored + base resume
    → free model → Zod shape check (+1 retry) → deterministic evidence gate
    → CoverLetter upsert by jobId (persist-only-validated)
GET returns the saved letter (cached:true, 404 until first write).
?refresh=1 regenerates; without it POST returns the cached letter.
```

Status semantics: 404 unknown job / no letter yet; 422 missing analysis
or tailored resume (or empty base resume); 502 validation/LLM failure.
`JobMatch.score` is never touched.

## States

`CoverLetter` (`jobId` unique): `content` JSON
`{subject?, greeting, paragraphs[], closing}`, `evidenceIds`,
`baseResumeId`, `rawJson`, `createdAt`. No versioning — regenerate
upserts in place.

UI (`JobDetailPanel`, Calm Focus): "Cover letter" section below the
tailored-resume block. Loads any saved letter on selection; the write
button stays disabled until analysis + tailored resume both exist;
regenerate forces `?refresh=1`. Adversarial coverage lives in
`src/__tests__/cover.test.ts` (invented-achievement rejection);
route semantics + cached reads in `src/__tests__/cover-route.test.ts`.
