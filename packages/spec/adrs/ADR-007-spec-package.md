# ADR-007: Spec Package as Source of Truth

Status: Accepted (frozen at Spec v1.0)

```
Context: Implementation agents need deterministic specifications.
Decision: packages/spec/ defines product, contracts, events, ownership, non-goals, acceptance tests.
Alternatives: Inline documentation, README-only specs.
Tradeoffs: Extra package to maintain, but eliminates implementation ambiguity.
Consequences: Implementation plan builds what spec defines; spec never changes during implementation.
```
