# Acceptance Tests — Phase -1: Bootstrap

```gherkin
Scenario: Fresh setup
  Given a fresh clone of the repository
  When the developer runs "bun install" then "bun run setup"
  Then the bridge is running on ws://127.0.0.1:9477
  And the extension is built in apps/browser-extension/dist/
  And "bun run doctor" reports all green

Scenario: Missing Bun
  Given Bun is not installed
  When the developer runs "bun run setup"
  Then setup fails with "Bun is required. Install from https://bun.sh"

Scenario: Extension not loaded
  Given the extension is built but not loaded in Chrome
  When the developer runs "bun run doctor"
  Then doctor reports "Extension: not loaded"
  And provides instructions for Load unpacked
```
