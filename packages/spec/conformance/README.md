# Conformance Suite

Repository-wide tests that verify the entire system behaves according to Spec v1.0.

## Suites

| Suite | File | What it verifies |
|-------|------|------------------|
| Contract tests | `contract-tests.md` | Every package matches its contract |
| Architecture tests | `architecture-tests.md` | Imports, ownership, API surface, invariants |
| Acceptance tests | `acceptance-tests.md` | Given/When/Then scenarios pass |
| Performance tests | `performance-tests.md` | All operations under budget |
| End-to-end tests | `e2e-tests.md` | Golden demo passes end-to-end |

## How to run

- Test logic is generated from the spec files in this repository (single source of truth); implementation lives in `packages/spec/tests/` (see architecture-tests.md §Enforcement).
- The full suite runs in CI on every PR as part of the per-phase quality gate (see quality-gates.md).
- A phase is complete only when its acceptance tests, the architecture tests, and the performance budgets for its operations all pass.

## Rules

- Reference outputs in `../reference-outputs/` are compared byte-for-byte — they are actual JSON fixtures, not pseudocode.
- No skipped tests, no `.only`, no `TODO` in test assertions.
- Failures block merge.
