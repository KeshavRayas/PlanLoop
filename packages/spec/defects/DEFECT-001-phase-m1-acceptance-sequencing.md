# DEFECT-001 — Phase -1 acceptance scenario requires Phase 1 artifacts

| Field | Value |
|---|---|
| Status | Resolved in spec v1.0.1 (2026-07-28) |
| Severity | Blocking (Phase -1 gate unsatisfiable on fresh clone) |
| Found | 2026-07-27, Phase -1 behavior audit (fresh-clone execution) |
| Affects | `acceptance-tests/phase-m1-bootstrap.test.md`, `acceptance-tests/phase-1-transport.test.md` |
| Does NOT affect | `architecture.md`, `contracts/bootstrap.md`, `api/bootstrap-api.md`, `golden-demo.md`, phase ordering, package ownership |

## Summary

The Phase -1 "Fresh setup" acceptance scenario asserts outcomes that require
packages which do not exist until Phase 1:

```
Then the bridge is running on ws://127.0.0.1:9477      # needs packages/browser-transport (Phase 1)
And the extension is built in apps/browser-extension/dist/  # needs apps/browser-extension (Phase 1)
And "bun run doctor" reports all green                  # needs both of the above
```

The bootstrap package's setup pipeline (`detect → install → build → start →
verify`, per `api/bootstrap-api.md`) orchestrates those packages via
`bun run --filter`. On a fresh clone at Phase -1, the workspace contains only
`packages/bootstrap` and `packages/spec`, so the filter matches nothing and
setup fails at the Build step:

```
✗ Build Extension (38ms) — Failed to build browser extension.
Details: Command failed: bun run --filter @planloop/browser-extension build
error: No packages matched the filter
```

Observed on 2026-07-27 audit: `bun run setup` exits 1 in 590 ms;
`.opencode/bridge-state.json` is never created; `bun run doctor` exits 1 with
correct actionable output (`Extension: ✗ not built`, `Bridge: ✗ unreachable`).
All failure-matrix behavior is correct — the happy path is simply unreachable.

This is a **sequencing defect in the acceptance tests**, not an architecture
defect: the setup pipeline is correctly designed for the steady-state repo
(post-Phase 1), but the Phase -1 gate evaluates it before its orchestration
targets exist.

## Constraints honored by this proposal

- No placeholder/stub `browser-transport` or `browser-extension` packages.
- No weakening of setup (no silent skipping of required components).
- Architecture unchanged. Package ownership unchanged. Phase ordering unchanged.
- Per `SPEC_FREEZE.md` rule 4, this is a defect fix and routes to spec v1.0.1
  (or v1.1.0 if treated as additive); no v2.0.0 break.

## Minimal patch proposal

Two files change. Nothing else.

### 1. `acceptance-tests/phase-m1-bootstrap.test.md` — replace

```gherkin
# Acceptance Tests — Phase -1: Bootstrap

Scenario: Fresh environment setup
  Given a fresh clone of the repository
  When the developer runs "bun install" then "bun run setup"
  Then the environment is detected (Bun, Node, workspace)
  And workspace dependencies are installed
  And setup reports readiness of each required component
  And components not yet present in the workspace are reported as actionable errors

Scenario: Missing Bun
  Given Bun is not installed
  When the developer runs "bun run setup"
  Then setup fails with "Bun is required. Install from https://bun.sh"

Scenario: Diagnostics report
  Given the environment has been set up
  When the developer runs "bun run doctor"
  Then doctor reports per-component status for Bun, Node, Workspace, Bridge, Extension
  And any failing component includes an actionable fix instruction
  And doctor exits non-zero if any component reports error
```

Rationale: Phase -1 owns **environment detection, workspace validation,
installation, diagnostics, doctor, readiness checks** — and nothing else.
Readiness checks *report* bridge/extension status; they do not require those
components to exist. Failure reporting stays strict: setup still aborts with
an actionable error when a required component is absent (current behavior,
verified in audit), so nothing is silently skipped.

### 2. `acceptance-tests/phase-1-transport.test.md` — add one scenario

```gherkin
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

Rationale: Phase 1 delivers `packages/browser-transport` and
`apps/browser-extension`; only then can the setup pipeline's Build/Start/Verify
steps and an all-green doctor be evaluated. The two moved assertions (bridge
running + extension built + doctor all green; extension-not-loaded
instructions) arrive here verbatim from the old Phase -1 scenario.

### Explicitly unchanged

- `api/bootstrap-api.md` — setup pipeline `detect → install → build → start →
  verify` and module surface stay exactly as specified. The pipeline is right;
  only *when it is evaluated* moves.
- `golden-demo.md` — unchanged; the golden demo is a whole-system scenario and
  already implicitly assumes all phases complete.
- `contracts/bootstrap.md`, `architecture.md`, ownership map, phase list,
  failure matrix, performance budgets — unchanged.

## Impact on current implementation

`packages/bootstrap` as implemented already satisfies the proposed Phase -1
scenarios (verified in the 2026-07-27 audit: detection, validation, install,
diagnostics, actionable errors, exit codes, timing budgets all conform).
**No code change is required by this patch.** Implementation can resume at
Phase 0 once the spec amendment lands.

## Resolution (spec v1.0.1)

Applied 2026-07-28. The proposal above was applied with one addition: the
maintainer also annotated `golden-demo.md` with an explicit phase-boundary
note (Phase -1 ends at diagnostics readiness; Phase 1 owns extension build,
bridge startup, bridge verification) and bumped the spec version to v1.0.1.
Scenario text moved exactly as proposed. No architecture, contract, API,
ownership, dependency-graph, or ADR changes. No implementation code changed.

---

# DEFECT-002 — `health.ts` does not use `AbortSignal.timeout`

| Field | Value |
|---|---|
| Status | Fixed in code (no spec change needed) |
| Severity | Minor (coding-standards inconsistency) |
| Found | 2026-07-27, Phase -1 behavior audit |
| Affects | `packages/bootstrap/src/health.ts` (implementation only) |

`coding-standards.md` line 53 mandates `AbortSignal.timeout(ms)` for timeouts.
`health.ts` used the `node:net` socket `timeout` option plus a `setTimeout`
backoff instead. Fixed by driving the connection timeout with
`AbortSignal.timeout`. No spec text references socket-level APIs, so the spec
needs no amendment.
