# Acceptance Tests — Phase -1: Bootstrap

```gherkin
Scenario: Fresh environment setup
  Given a fresh clone of the repository
  When the developer runs "bun install" then "bun run setup"
  Then the environment is detected (Bun, Node, workspace)
  And workspace dependencies are installed
  And setup reports readiness of each required component
  And components not yet present in the workspace are reported as actionable errors

Scenario: Missing Bun
  Given Bun is not installed
  When the developer runs "bun run setup"
  Then setup fails with "Bun is required. Install from https://bun.sh"

Scenario: Diagnostics report
  Given the environment has been set up
  When the developer runs "bun run doctor"
  Then doctor reports per-component status for Bun, Node, Workspace, Bridge, Extension
  And any failing component includes an actionable fix instruction
  And doctor exits non-zero if any component reports error
```
