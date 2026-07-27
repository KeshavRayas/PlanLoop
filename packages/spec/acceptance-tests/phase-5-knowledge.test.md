# Acceptance Tests — Phase 5: Knowledge Engine

```gherkin
Scenario: Lesson extracted after planning run
  Given a completed planning run with 3 iterations
  When the knowledge extractor runs
  Then at least one lesson is added to .field-guide/
  And no raw conversation text appears in any lesson
  And the index.md is updated if a new category was added

Scenario: Planner uses Field Guide
  Given .field-guide/ contains 5 lessons in validation.md
  When a new planning run starts
  Then the planner prompt includes the 5 validation lessons
  And the planning output reflects those lessons

Scenario: Contradiction detected
  Given a new lesson "Always use UUIDs for IDs"
  And an existing lesson "Use sequential integers for IDs"
  When the conflict resolver runs
  Then the contradiction is flagged
  And the newer lesson supersedes the older
  And the older lesson status becomes "superseded"
```
