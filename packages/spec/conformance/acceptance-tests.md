# Conformance — Acceptance Tests

```
For each phase's Given/When/Then scenarios:
  1. Set up preconditions
  2. Execute actions
  3. Assert outcomes match

Example (Phase 0):
  Given: A ReviewRequestPacket matching the schema
  When:  validate(packet) is called
  Then:  Result is { valid: true, errors: [] }

  Given: A ReviewResponsePacket with "revised_plan" field
  When:  validate(packet) is called
  Then:  Result is { valid: false, errors: ["Forbidden key: revised_plan"] }
```

Scenario sources: `../acceptance-tests/phase-*.test.md`.
