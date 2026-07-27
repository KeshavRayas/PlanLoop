# Field Guide Package Contract

## Inputs
- Run archives (conversation, plans, reviews, diffs, reasoning traces — read-only)
- Field Guide configuration (`.opencode/planloop/config.json` → `fieldGuide`)
- Existing `.field-guide/` contents (for dedup, contradiction, staleness)

## Outputs
- `.field-guide/` lesson files (distilled principles, never raw conversations)
- `.field-guide/_metadata/lessons.yaml` (lesson metadata index)
- `.field-guide/index.md` (search map — rebuilt when categories are added)
- Planner injection payload (relevant lessons formatted for the planning prompt)
- `LessonExtracted` events
- `lessons.md` written into the run archive

## Public API
- `extractor.ts` — analyzes run archives, produces lesson updates
- `storage.ts` — reads/writes `.field-guide/` files and `_metadata/lessons.yaml`
- `index-builder.ts` — rebuilds `index.md` when new categories are added
- `planner-injector.ts` — loads relevant lessons and formats them for the planning prompt
- `conflict-resolver.ts` — detects contradictory lessons, flags or resolves per rules
- `staleness-tracker.ts` — tracks `last_used` dates, identifies stale guidance

## Internal API
- Similarity check (`storage.findSimilar`) for dedup and `last_used` updates
- Contradiction flagging / auto-supersede per config

## Dependencies
- `@planloop/protocol`

## Forbidden Dependencies
- NO `@planloop/browser-transport` imports
- NO plan modification (read-only for planning)
- NO protocol validation implementation
- NO network calls
- NO browser tab management
