# OpenCode Plugin Package Contract

## Inputs
- `/planloop` command invocations (via `command.executed` hook)
- OpenCode session events (`session.status` idle, `file.edited` on `.opencode/plans/`)
- ReviewResponsePacket / ContextRequestPacket (from review-adapters)
- Field Guide lessons (from field-guide, injected into planning prompt)
- PlanLoop config (`.opencode/planloop/config.json`)

## Outputs
- Run manifests and run archives (`.opencode/planloop/runs/<runId>/`)
- ReviewRequestPacket / ContextFulfillmentPacket (to review-adapters)
- PlanRevisionInstruction (issues + recommendations + verification only — never reviewer prose or plan rewrites)
- RepositoryBrief (compressed, not raw dump)
- Fresh Build session (no parentID) with implementation prompt containing only the approved plan
- Events per events/event-contract.md
- TUI toasts: status, approval prompts, failure notifications

## Public API
- OpenCode `Plugin` entry function (per OpenCode plugin docs)
- Commands: `/planloop`, `/planloop status`, `/planloop cancel`, `/planloop history`
- Hooks: `command.executed`, `session.status` (idle), `file.edited` on `.opencode/plans/*.md`

## Internal API
- State machine (planning → reviewing → awaiting_user → revising → … → approved → building)
- `context/brief-builder.ts` — Repository Brief builder (SDK `client.find.*`, `client.file.read`, `$` for git); cached per iteration
- Context request handler — fetch requested paths, redact, build ContextFulfillmentPacket, resubmit via adapter
- `plan/revision.ts` — issues-only plan revision; archives reasoning trace each iteration
- `session/implementation.ts` — Build session handoff
- Subagent session filtering via `session.get().parentID`

## Dependencies
- `@planloop/protocol`
- `@planloop/review-adapters`
- `@planloop/field-guide`
- `@opencode-ai/plugin` (OpenCode SDK: `client`, `directory`, `worktree`, `$`)

## Forbidden Dependencies
- NO `@planloop/browser-transport` imports
- NO parsing of raw ChatGPT responses
- NO protocol validation implementation (delegate to protocol)
- NO knowledge extraction (delegate to field-guide)
- NO environment detection (delegate to bootstrap)
