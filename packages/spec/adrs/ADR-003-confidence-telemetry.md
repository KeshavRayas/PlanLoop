# ADR-003: Confidence as Telemetry Only

Status: Accepted (frozen at Spec v1.0)

```
Context: Review responses carry numeric scores (coverage, correctness, risk, confidence).
Decision: Confidence is recorded in ReviewResponsePacket.scores / confidence as telemetry only — it is not an approval gate.
Alternatives: Confidence threshold gating, weighted score approval.
Tradeoffs: Scores cannot auto-approve or auto-reject, but approval stays fully deterministic and auditable (see ADR-002).
Consequences: Confidence/scores are stored and logged, and never gate `approved`. Enforced by invariant 10: confidence scores never gate approval.
```
