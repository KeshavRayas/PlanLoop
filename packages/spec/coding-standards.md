# Coding Standards

How code is written across the entire project.

## File naming

- Source files: `kebab-case.ts` (e.g., `bridge-server.ts`, `reasoning-trace.ts`)
- Test files: `*.test.ts` co-located with source
- Schema files: `*.schema.json` in `schemas/` directory
- Config files: `*.config.ts` (not `.js`)

## Folder conventions

- `src/` for source code (never root-level `.ts` files)
- `src/types.ts` for shared type definitions
- `src/index.ts` for package entry point (re-exports only)
- `tests/` only for integration tests; unit tests co-located

## Error handling

- Custom error classes per package: `ProtocolError`, `TransportError`, `BootstrapError`
- Always include `code` property (string enum) for programmatic handling
- Never throw raw `Error` — always wrap with context
- Errors are values, not control flow: return `Result<T, E>` where practical

## Logging

- Structured JSON logs via `packages/bootstrap/src/logger.ts`
- Levels: `debug`, `info`, `warn`, `error`
- Every log entry: `{ timestamp, runId, iteration, component, level, message, metadata? }`
- No `console.log` in production code — use the logger

## TypeScript rules

- Strict mode (`strict: true`)
- No `any` — use `unknown` and narrow
- Explicit return types on exported functions
- Prefer `type` over `interface` for object shapes (consistency)
- Enums: use `as const` objects instead of `enum` keyword
- Null handling: prefer `??` and `?.` over explicit null checks

## Dependency injection

- Constructor injection for classes
- Function parameters for utilities
- No service locators or global state
- Config passed explicitly, never read from `process.env` in library code

## Async patterns

- `async/await` everywhere — no raw promises or callbacks
- Parallel with `Promise.all` / `Promise.allSettled`
- Timeouts via `AbortSignal.timeout(ms)` — never `setTimeout` + `Promise.race`
- Cleanup via `finally` blocks, not manual tracking

## Testing style

- Arrange / Act / Assert pattern
- One assertion per concept per test
- Mock at boundaries (transport, file system, network) — not internals
- Test file mirrors source file structure
- Test names: `should <behavior> when <condition>`

## Documentation style

- JSDoc on every exported function, type, and constant
- `@param`, `@returns`, `@throws`, `@example`
- No comments explaining *what* — comments explain *why*
- README per package with: purpose, install, usage, API surface
