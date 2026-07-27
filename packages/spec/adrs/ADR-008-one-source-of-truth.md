# ADR-008: One Source of Truth per Concept

Status: Accepted (frozen at Spec v1.0)

```
Context: Packages can duplicate logic or ownership.
Decision: Every concept has exactly one owning package; no duplication.
Alternatives: Shared utilities, cross-package imports.
Tradeoffs: More explicit boundaries, but requires discipline.
Consequences: Ownership table is enforced; violations caught in code review.
```
