# ADR-002: Deterministic Approval

Status: Accepted (frozen at Spec v1.0)

```
Context: Plans need approval before implementation.
Decision: Approval is deterministic — zero critical + zero major + verification passed + user confirm.
Alternatives: Confidence threshold, LLM-based approval, voting.
Tradeoffs: Less flexible, but fully predictable and auditable.
Consequences: Confidence scores are telemetry only, never gate approval.
```
