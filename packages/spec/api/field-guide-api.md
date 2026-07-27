# Field Guide Package — Public API

Package: `packages/field-guide`

## Module surface

| Module | Responsibility |
|--------|----------------|
| `extractor.ts` | Analyzes run archives, produces lesson updates |
| `storage.ts` | Reads/writes `.field-guide/` files and `_metadata/lessons.yaml` |
| `index-builder.ts` | Rebuilds `index.md` when new categories are added |
| `planner-injector.ts` | Loads relevant lessons and formats them for planning prompt |
| `conflict-resolver.ts` | Detects contradictory lessons, flags or resolves per rules |
| `staleness-tracker.ts` | Tracks `last_used` dates, identifies stale guidance |

## Storage layout

```
.field-guide/
├── index.md              # Search map — what lives where
├── architecture.md       # Distilled architecture decisions
├── coding-style.md       # Project-specific coding conventions
├── developer-experience.md # DX rules: one-command setup, actionable diagnostics, invisible extension
├── testing.md            # Testing patterns and rules
├── database.md           # Database conventions and gotchas
├── api-patterns.md       # API design patterns
├── mistakes.md           # Common mistakes and how to avoid them
├── performance.md        # Performance lessons
├── security.md           # Security rules
├── ui.md                 # UI/frontend conventions
├── validation.md         # Validation rules and patterns
├── opencode.md           # OpenCode-specific project conventions
└── _metadata/            # Lesson metadata index (YAML)
    └── lessons.yaml
```

## Lesson schema

Every lesson has metadata in `lessons.yaml`:

```yaml
- id: FG-0012
  category: validation
  title: "Validate IDs before service calls"
  content: |
    Always validate IDs before calling service methods.
    Avoids unnecessary database work and prevents confusing error messages.
  confidence: high
  introduced: 2026-07-27
  last_used: 2026-08-03
  references:
    - run-14
    - commit a73d9f1
  status: active  # active | deprecated | superseded
```

Content rules:

- Never store raw conversation text
- Principles, not chat logs
- Each lesson is self-contained and actionable
- Contradictions are flagged and resolved (newer lesson supersedes older, or both coexist with scope)

## Extraction flow

1. Run `KnowledgeExtractor.analyze(runArchive)` against the run's conversation, reviews, diffs, and reasoning traces
2. Extract candidate lessons
3. For each candidate: check against existing Field Guide (`storage.findSimilar`)
4. If new: add with metadata, update category file, rebuild index if needed
5. If duplicate: update `last_used` timestamp and `references`
6. If contradictory: flag for human review or auto-supersede per config
7. Write updated `lessons.md` in run archive

## Performance expectations

- Field Guide index load: <100ms
- Field Guide lesson injection: <200ms
- Knowledge extraction: <2s
