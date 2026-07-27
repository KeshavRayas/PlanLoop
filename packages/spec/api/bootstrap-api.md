# Bootstrap Package — Public API

Package: `packages/bootstrap`

## Commands

| Command | Behavior |
|---------|----------|
| `setup` | Orchestrator: detect → install → build → start → verify |
| `doctor` | Diagnostics + health checks; read-only; all green or actionable failure |

## Setup pipeline

```
Detect environment
    ↓
Install dependencies (bun install)
    ↓
Build workspace (bun run build)
    ↓
Build extension (if missing)
    ↓
Detect extension installed?
    ↓ No
Open browser → guide Load unpacked → confirm
    ↓
Start bridge
    ↓
Verify health (all services green)
    ↓
Ready
```

Setup fails with actionable errors, e.g. `Bun is required. Install from https://bun.sh`.

## Diagnostics output

```
Environment:
  Bun: 1.2.4 ✓
  Node: 22.5.0 ✓
  OpenCode: 0.4.12 ✓

Services:
  Bridge: ws://127.0.0.1:9477 ✓
  Extension: installed (v1) ✓

Field Guide:
  .field-guide/: initialized ✓

Status: All systems ready
```

Fails with actionable diagnostics rather than generic errors.

## Module surface (internal)

| Module | Responsibility |
|--------|----------------|
| `detect.ts` | Detect Bun, Node, browser, OpenCode, extension status, bridge status |
| `install.ts` | Run workspace install, build missing artifacts, compile extension |
| `diagnostics.ts` | Environment report: versions, paths, connectivity, permissions |
| `health.ts` | Verify all services are running (bridge, extension, OpenCode) |
| `setup.ts` | Orchestrator: detect → install → build → start → verify |
| `extension-loader.ts` | Detect extension missing → open browser → guide user through Load unpacked → confirm |
| `logger.ts` | Structured JSON logger per coding standards; used by all packages |

## Performance expectations

- Full setup (`bun run setup`): <60s
- `bun run doctor`: <5s
- Bridge health check: <2s
- Extension reconnect: <5s (3 attempts, backoff)
