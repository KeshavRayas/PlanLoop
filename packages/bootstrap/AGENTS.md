# @planloop/bootstrap — Agent Guide

## Purpose
Bootstrap package for PlanLoop. Zero code dependencies. Provides `setup` and `doctor` commands.

## Architecture Constraints
- **ZERO code dependencies** — no imports from other `@planloop/*` packages
- Bridge and extension interaction is via **spawned processes only** (runtime orchestration)
- Never import `@planloop/protocol` or `@planloop/browser-transport`
- Never modify Field Guide content

## Module Map
| File | Role |
|------|------|
| `src/types.ts` | Shared types, `BootstrapError` |
| `src/logger.ts` | Package-local structured JSON logger |
| `src/detect.ts` | Environment detection (Bun, Node, workspace, components) |
| `src/install.ts` | `bun install` + extension build via spawned processes |
| `src/health.ts` | Bridge health check with retry/backoff |
| `src/extension-loader.ts` | Extension build status detection |
| `src/diagnostics.ts` | Structured diagnostics report |
| `src/setup.ts` | Setup orchestrator (Detect→Install→Build→Start→Verify) |
| `src/doctor.ts` | Doctor command |
| `src/index.ts` | Re-exports only |

## Commands
- `bun run setup` — Full setup pipeline
- `bun run doctor` — Diagnostics report
- `bun run lint` — ESLint
- `bun run typecheck` — TypeScript strict check
- `bun test` — Run tests

## Coding Standards
- Strict TypeScript, no `any`
- kebab-case file names
- JSDoc on every export
- No `console.log` — use structured logger
- No `process.env` in library code (logger exception: reads `LOG_LEVEL`)
- `AbortSignal.timeout` for timeouts
- Constructor injection, no global state

## Performance Budgets
- Setup: < 60s
- Doctor: < 5s
- Bridge health check: < 2s
- Extension reconnect: < 5s (3 attempts, exponential backoff)

## Phase -1 Decisions (user-resolved ambiguities)
1. Logger is package-local; only the JSON schema is shared across packages
2. Extension detection checks only "built" status (dist/ exists); runtime detection deferred
3. Protocol version checking NOT implemented in Phase -1; deferred to Phase 0
4. Root `package.json` with Bun workspaces created as part of Phase -1
