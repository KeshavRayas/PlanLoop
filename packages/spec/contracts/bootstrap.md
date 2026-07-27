# Bootstrap Package Contract

## Inputs
- Environment (executables on PATH, versions, browsers, OpenCode installation)
- Workspace root (repository checkout)
- Bridge process status (via spawned health checks, never imports)
- Extension load status (via browser detection)

## Outputs
- Setup result: environment detected, dependencies installed, extension built, bridge started, health verified
- Diagnostics report: versions, paths, connectivity, permissions
- Health report: per-component status (Bun, Node, bridge, extension, protocol, Field Guide)
- Actionable setup errors with fix instructions

## Public API
- `setup` command — orchestrator: detect → install → build → start → verify
- `doctor` command — diagnostics + health checks, read-only, all green or actionable failure

## Internal API
- `detect.ts` — detect Bun, Node, browser, OpenCode, extension status, bridge status
- `install.ts` — run workspace install, build missing artifacts, compile extension
- `diagnostics.ts` — environment report: versions, paths, connectivity, permissions
- `health.ts` — verify all services are running (bridge, extension, OpenCode)
- `extension-loader.ts` — detect missing extension → open browser → guide Load unpacked → confirm
- `logger.ts` — structured JSON logger used by all packages per coding standards

## Dependencies
- (none — no package dependencies)

## Forbidden Dependencies
- NO `@planloop/protocol` imports
- NO `@planloop/browser-transport` imports (bridge is started and health-checked via spawned processes, not code imports)
- NO knowledge of protocol packets
- NO understanding of review logic
- NO modification of Field Guide content
