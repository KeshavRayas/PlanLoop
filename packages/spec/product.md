# Product Specification

What PlanLoop actually does. This is not how it's built — it's what the user experiences.

## User story

Developer types `/planloop` → system plans, reviews, iterates, approves, implements.

1. The developer types `/planloop` in OpenCode.
2. The Planning Engine creates a run and the plan agent produces an implementation plan.
3. The Review Engine reviews the plan against a Repository Brief and the Field Guide.
4. If the review finds critical or major issues, the plan agent revises — issues only, never reviewer prose — and the loop repeats.
5. When the review is clean and the user confirms, the plan is approved.
6. A fresh Build session implements the approved plan with no planning or review history.
7. The Knowledge Engine extracts durable lessons from the run into the Field Guide, improving every future planning session.

## Commands

| Command | Description | Agent | Output |
|---------|-------------|-------|--------|
| `/planloop` | Start planning loop | `plan` | Creates run, extracts plan, reviews, iterates |
| `/planloop status` | Show current run status | — | TUI toast with iteration count, issues, approval state |
| `/planloop cancel` | Cancel current run | — | Marks run CANCELLED, cleans up handles |
| `/planloop history` | List past runs | — | TUI list with run IDs, dates, outcomes |

## TUI behavior

- Toast notifications for lifecycle events (run started, review received, approval state, handoff complete)
- Session list distinguishes planning sessions from Build sessions
- Approval prompts require explicit user confirmation before a plan is approved
- Reasoning trace summaries show issue movement between iterations (resolved / still open / new)

## UX flow

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

## Configuration

Project config: `.opencode/planloop/config.json`

```json
{
  "review": {
    "adapter": "chatgpt-browser",
    "adapters": {
      "chatgpt-browser": { "bridgeUrl": "ws://127.0.0.1:9477" }
    }
  },
  "approval": {
    "maxCriticalIssues": 0,
    "maxMajorIssues": 0,
    "requireUserApproval": true
  },
  "context": { "maxContextRounds": 3 },
  "archive": { "directory": ".opencode/planloop/runs" },
  "fieldGuide": {
    "enabled": true,
    "directory": ".field-guide",
    "extraction": {
      "autoExtract": true,
      "confidenceThreshold": "medium",
      "flagContradictions": true
    },
    "plannerIntegration": {
      "injectIntoPlanning": true,
      "maxLessonsPerRun": 20
    }
  }
}
```

Defaults: review adapter is `chatgpt-browser`; approval requires zero critical issues, zero major issues, passed verification, and user confirmation (`requireUserApproval: true`); context requests are capped at 3 rounds; the Field Guide is enabled with automatic extraction and planner injection.

## Error UX

What the user sees when things fail (from the failure matrix):

| Failure | User sees |
|---------|-----------|
| Browser crashes | Toast: "Browser disconnected. Restart and run /planloop resume." |
| Extension disconnects | Toast: "Extension disconnected. Reload extension." |
| Bridge dies | Toast: "Bridge process died. Run bun run doctor." |
| OpenCode exits | N/A — user restarted; on restart, prompted to resume from manifest |
| JSON invalid | Toast: "Invalid response from reviewer. Retrying." |
| ChatGPT refuses | Toast: "ChatGPT returned empty. Paste response manually." |
| Review timeout | Toast: "Review timed out. Retrying." |
| Protocol mismatch | Toast: "Protocol version incompatible. Check adapter version." |
| Field Guide write fails | Warning in run archive; run continues |
| Setup fails | Console output with fix instructions |

Failures are surfaced with actionable next steps, never silent.
