# Interview prep (Phase 3B)

Reuse, don't re-analyze. Prep builds on the existing `JobAnalysis` +
current `SEMANTIC_VALID` `TailoredResume` (+ base-resume evidence).

## Contract

Zod shape (`src/lib/interview/contract.ts`, `interviewPrepSchema`):

```text
{ technical[5], resumeBased[5], behavioral[4], toAsk[4], gaps[0..8] }
question = { question, whyAsked, evidenceIds[], answerStructure[1..8],
             followUps[0..5], starStory? }
starStory = { situation, task, action, result, evidenceIds[] } (optional,
  only where a genuine experience story fits)
gap = { skill, bridgeAnswer }
```

Evidence rule: every `evidenceIds[]` on questions AND inside STAR stories
must resolve against the base evidence set. Gaps come from
`analysis.missingSkills` — bridged honestly from adjacent experience,
never filled with fiction. The prompt sends `JobAnalysis` + tailored
highlights + a relevant evidence slice (tailored-cited ids first, then
skills/summary, capped at 30) — never the whole resume blindly.

Deterministic gate (`src/lib/interview/validate.ts`, no model):
unknown/duplicate/empty evidence IDs fail. Failures → 502, nothing persists.

## Routes

```text
Analyze + SEMANTIC_VALID tailor first → [Prepare interview]
  → POST /api/jobs/:id/interview
  → generateInterviewPrep(): analysis + validated tailored + base resume
    → free model → Zod shape check (+1 retry) → deterministic evidence gate
    → InterviewPrep upsert by jobId (persist-only-validated)
GET returns the saved prep (cached:true, 404 until first write).
?refresh=1 regenerates; without it POST returns the cached prep.
```

Status semantics: 404 unknown job / no prep yet; 422 missing analysis,
missing/non-SEMANTIC_VALID tailored resume, or empty base resume;
502 validation/LLM failure. `JobMatch.score` is never touched.

## States

`InterviewPrep` (`jobId` unique): `content` JSON
`{technical, resumeBased, behavioral, toAsk, gaps}`, `evidenceIds`
(union of all cited ids), `baseResumeId`, `rawJson`, `createdAt`.
No versioning — regenerate upserts in place.

UI (`JobDetailPanel`, Calm Focus): "Interview prep" section below the
cover-letter block. Technical / Resume-based / Behavioral groups with
why-asked, answer structure, follow-ups, and STAR story cards where
present; "Ask them" list; "Honest bridges" for gaps. The prep button stays
disabled until analysis + tailored resume both exist.
