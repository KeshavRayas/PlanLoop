# Acceptance Tests — Phase 2: Adapters

```gherkin
Scenario: Manual adapter round-trip
  Given a ReviewRequestPacket
  When submitted via manual adapter
  Then the packet is serialized to clipboard-friendly text
  And the response is validated against ReviewResponsePacket schema

Scenario: ChatGPT browser adapter end-to-end
  Given a ReviewRequestPacket
  And a ChatGPT tab is open
  When submitted via chatgpt-browser adapter
  Then the prompt is injected into ChatGPT
  And the response is extracted and validated
```
