# Implementation Invariants

Global rules that must always hold. Stronger than acceptance tests — they apply everywhere, at all times.

## Structural invariants

1. **Invariant 1.** Every run has exactly one `manifest.json`
2. **Invariant 2.** Every packet validates against its schema before processing
3. **Invariant 3.** Every lesson belongs to exactly one category in the Field Guide
4. **Invariant 4.** No package imports a forbidden package (enforced by architecture test)
5. **Invariant 5.** The dependency graph has no cycles (enforced by architecture test)

## Behavioral invariants

6. **Invariant 6.** Planning never edits source code (only `.opencode/` and `.field-guide/`)
7. **Invariant 7.** Build sessions never contain review history, ChatGPT responses, or planning transcript
8. **Invariant 8.** The Field Guide never contains raw conversation text
9. **Invariant 9.** Approval is never granted with critical or major issues open
10. **Invariant 10.** Confidence scores never gate approval
11. **Invariant 11.** The browser transport never imports protocol types
12. **Invariant 12.** Knowledge extraction is non-blocking — a failed extraction never prevents plan approval
13. **Invariant 13.** Every state transition writes manifest before side effects (crash recovery)
14. **Invariant 14.** Subagent sessions are filtered by `parentID` — never mixed with parent context

## Data invariants

15. **Invariant 15.** Every `RunId` is a UUID v4
16. **Invariant 16.** Every `iteration` number is monotonically increasing per run
17. **Invariant 17.** Every lesson `id` is unique across the entire Field Guide
18. **Invariant 18.** Every lesson `introduced` date is ≤ current date
19. **Invariant 19.** Every lesson `last_used` date is ≥ `introduced` date
20. **Invariant 20.** Issue fingerprints are deterministic (same input → same hash)
