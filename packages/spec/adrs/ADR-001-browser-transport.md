# ADR-001: Generic Browser Transport

Status: Accepted (frozen at Spec v1.0)

```
Context: PlanLoop needs to communicate with ChatGPT via browser.
Decision: Browser layer is transport-only — no protocol or review knowledge.
Alternatives: Protocol-aware extension, direct API integration.
Tradeoffs: More layers, but extension is reusable for any AI service.
Consequences: ChatGPT-specific logic lives in chat-adapters, not extension.
```
