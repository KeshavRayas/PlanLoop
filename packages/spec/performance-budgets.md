# Performance Budgets

Timing constraints for every operation.

| Operation | Budget | Notes |
|-----------|--------|-------|
| `validate()` | <20ms | Any packet, any schema |
| `checkCompat()` | <1ms | String comparison only |
| `evaluateApproval()` | <5ms | Pure logic, no I/O |
| `buildReasoningTrace()` | <50ms | Hash + diff |
| `fingerprintIssue()` | <5ms | Single hash |
| Repository Brief build | <3s | File reads + git commands |
| Field Guide index load | <100ms | Single file read |
| Field Guide lesson injection | <200ms | Read + format |
| Knowledge extraction | <2s | Analysis of run archive |
| Bridge health check | <2s | WebSocket ping |
| Extension reconnect | <5s | 3 attempts, backoff |
| Full setup (`bun run setup`) | <60s | Install + build + extension + verify |
| `bun run doctor` | <5s | All checks |
| `/planloop` to first review | <30s | Plan extract + brief + submit |
| Review iteration cycle | <180s | Submit + await + validate + revise |
| Plugin startup (manifest load) | <500ms | Read manifest.json |

## Enforcement

Performance tests in CI. Budget violations fail the build.
