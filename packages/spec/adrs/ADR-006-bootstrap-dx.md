# ADR-006: Bootstrap First

Status: Accepted (frozen at Spec v1.0)

```
Context: Developer onboarding affects every subsequent phase.
Decision: Phase -1 (Bootstrap) is built before any feature code.
Alternatives: Documentation-only setup, post-hoc DX improvements.
Tradeoffs: Delays feature work, but every phase benefits from smooth setup.
Consequences: `bun run setup` and `bun run doctor` work from day one.
```
