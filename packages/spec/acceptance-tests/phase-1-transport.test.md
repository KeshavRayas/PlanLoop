# Acceptance Tests — Phase 1: Transport

```gherkin
Scenario: Open tab and inject prompt
  Given the bridge is running
  When openTab("https://chatgpt.com") is called
  Then a TabHandle is returned
  And injectPrompt(handle, "test") completes without error

Scenario: Extension clipboard fallback
  Given extractResponse returns empty string
  When the bridge signals clipboard_fallback
  Then the user is prompted to paste
  And the pasted content is returned

Scenario: Full setup with transport present
  Given a fresh clone of the repository
  When the developer runs "bun install" then "bun run setup"
  Then the bridge is running on ws://127.0.0.1:9477
  And the extension is built in apps/browser-extension/dist/
  And .opencode/bridge-state.json exists
  And "bun run doctor" reports all green

Scenario: Extension not loaded
  Given the extension is built but not loaded in Chrome
  When the developer runs "bun run doctor"
  Then doctor reports "Extension: not loaded"
  And provides instructions for Load unpacked
```
