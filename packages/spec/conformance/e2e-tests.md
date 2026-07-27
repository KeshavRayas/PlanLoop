# Conformance — End-to-End Tests

```
Run the golden demo end-to-end:
  1. Fresh clone + bun install + bun run setup
  2. Verify bridge healthy
  3. Verify extension built
  4. Run bun run doctor — all green
  5. Simulate /planloop → verify manifest created
  6. Simulate planning iteration → verify plan.md created
  7. Simulate review submission → verify packet matches reference-outputs/
  8. Simulate review response → verify approval logic
  9. Simulate build session → verify fresh session created
  10. Simulate knowledge extraction → verify Field Guide updated
  11. Compare all outputs against reference-outputs/ byte-for-byte
```

Scenario source: `../golden-demo.md`. Passing the golden demo means the system works.
