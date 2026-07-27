# Acceptance Tests — Phase 4: Handoff

```gherkin
Scenario: Clean Build session
  Given an approved plan
  When the Build session is created
  Then the session has no parentID
  And the implementation prompt contains only the approved plan
  And the implementation prompt excludes review history
  And the planning session is marked archived
```
