# OpenCode Plugin Package — Public API

Package: `packages/opencode-plugin`

Full specification for the OpenCode plugin interface.

## Commands

| Command | Description | Agent | Output |
|---------|-------------|-------|--------|
| `/planloop` | Start planning loop | `plan` | Creates run, extracts plan, reviews, iterates |
| `/planloop status` | Show current run status | — | TUI toast with iteration count, issues, approval state |
| `/planloop cancel` | Cancel current run | — | Marks run CANCELLED, cleans up handles |
| `/planloop history` | List past runs | — | TUI list with run IDs, dates, outcomes |

## Hooks

| Hook | Phase | Behavior |
|------|-------|----------|
| `command.executed` | Entry | If command is `/planloop`, create run, tag session |
| `session.status` (idle) | Monitor | Check if planning session is idle; trigger next iteration |
| `file.edited` on `.opencode/plans/*.md` | Monitor | Detect plan changes for re-review |

## Permissions

```json
{
  "plan": {
    "edit": { "*": "deny", ".opencode/plans/*.md": "allow", ".opencode/planloop/**": "allow" },
    "read": { "*": "allow" },
    "shell": { "*": "deny", "git *": "allow" }
  },
  "build": {
    "edit": { "*": "allow" },
    "read": { "*": "allow" },
    "shell": { "*": "allow" }
  }
}
```

## Storage

```
.opencode/planloop/
├── config.json
├── runs/
│   └── <runId>/
│       ├── manifest.json
│       ├── conversation.md
│       ├── plan-v1.md
│       ├── review-1.json
│       ├── review-2.json
│       ├── approved-plan.md
│       ├── commit.txt
│       └── lessons.md
└── traces/
    └── iteration-<n>.json
```

## Lifecycle

```
Plugin registered
    ↓
Hooks active
    ↓
/planloop command
    ↓
Run created (manifest.json)
    ↓
Plan extracted
    ↓
Repository Brief built (+ Field Guide injection)
    ↓
Review submitted
    ↓
Response received
    ↓
Validated by protocol
    ↓
Issues? → Revise → Loop
No issues? → Approval check
    ↓
Approved → Build session
Rejected → Notify user
    ↓
Knowledge extraction (non-blocking)
    ↓
Run archived
```

## Recovery

- Plugin reads `manifest.json` on startup to detect interrupted runs
- If run state is mid-iteration, prompt user: "Resume previous run?"
- If manifest is corrupt, start new run; archive old run as FAILED
- All state transitions are atomic (write manifest before side effects)

## Build session handoff

1. Evaluate approval (deterministic rules + user confirm via `tui.showToast` + wait or config)
2. Archive approved plan to `plans/approved.md`
3. `client.session.create({ body: { title: "PlanLoop · Implement · <slug>" } })` — **no parentID**
4. `client.session.prompt({ agent: "build", parts: [implementation template + approved plan only] })`
5. Mark planning session archived; set run phase `COMPLETE`
6. `client.tui.showToast` + optional `client.tui.openSessions()`

Implementation prompt excludes: review history, ChatGPT raw responses, planning transcript.

## Performance expectations

- Plugin startup (manifest load): <500ms
- Repository Brief build: <3s
- `/planloop` to first review: <30s
- Review iteration cycle: <180s
