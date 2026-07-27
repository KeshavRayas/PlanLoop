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
```
