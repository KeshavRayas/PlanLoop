# Golden End-to-End Demo

One complete happy-path run. If an implementation passes this scenario, the entire system works.

## Phase boundaries

This demo runs against the complete system. Phase ownership within it:

- **Phase -1 (Bootstrap)** ends after environment detection, dependency
  installation, workspace validation, and diagnostics readiness — Steps 1–2
  and the detect/report portions of Steps 3–4. On a Phase -1-only workspace,
  `bun run setup` stops here and reports bridge/extension as actionable
  errors, because those packages do not exist yet
  (`acceptance-tests/phase-m1-bootstrap.test.md`).
- **Phase 1 (Transport)** owns extension build, bridge startup, and bridge
  verification — the build/start/verify portions of Steps 3–4
  (`acceptance-tests/phase-1-transport.test.md`). The demo can proceed past
  Step 4 only from Phase 1 onward.

## Step 1: Fresh clone

```
Action: git clone <repo>
Input:  Repository URL
Output: Local clone at ./PlanLoop
Files:  .git/, all source files
Events: none
Logs:   none
State:  Fresh clone, nothing built
```

## Step 2: Install

```
Action: bun install
Input:  package.json, bun.lockb
Output: node_modules/ populated
Files:  node_modules/ (all packages linked)
Events: none
Logs:   [info] workspace installed in 4.2s
State:  Dependencies resolved
```

## Step 3: Setup

```
Action: bun run setup
Input:  packages/bootstrap/src/setup.ts
Output: Bridge running, extension built, health green
Files:
  apps/browser-extension/dist/       # Built extension
  .opencode/bridge-state.json        # Bridge health state
Events: none
Logs:
  [info] Detecting environment...
  [info] Bun: v1.x ✓ | Node: v20.x ✓
  [info] Building extension...                     # Phase 1 responsibility
  [info] Starting bridge on ws://127.0.0.1:9477    # Phase 1 responsibility
  [info] Bridge health: healthy                    # Phase 1 responsibility
  [info] Setup complete in 12.3s
State:  Bridge listening, extension ready to load
```

## Step 4: Health check

```
Action: bun run doctor
Input:  packages/bootstrap/src/doctor.ts
Output: All components green
Files:  (none — read-only)
Events: none
Logs:
  [info] Doctor checks:
  [info]   Bun: ✓
  [info]   Node: ✓
  [info]   Bridge: ✓ (ws://127.0.0.1:9477)          # green only from Phase 1
  [info]   Extension: ✓ (loaded in Chrome)          # green only from Phase 1
  [info]   Protocol: ✓ (v1.0)
  [info]   Field Guide: ✓ (0 lessons)
  [info] All checks passed                          # all-green doctor is a Phase 1 outcome
State:  System healthy
```

## Step 5: OpenCode + /planloop

```
Action: User types /planloop in OpenCode
Input:  /planloop command
Output: PlanLoop initializes
Files:
  .opencode/planloop/manifest.json   # Created with runId, state: "planning"
Events:
  - RunStarted { runId, timestamp }
Logs:
  [info] Run abc-123 started
  [info] Loading Repository Brief...
  [info] Repository Brief: 23 files, 4 packages, 3127 lines
  [info] Loading Field Guide: 0 lessons
  [info] Injecting context into planning prompt...
State:  idle → planning
```

## Step 6: Planning iteration 1

```
Action: Plan agent generates plan
Input:  Repository Brief + Field Guide + planning prompt
Output: plan.md with 3 issues
Files:
  .opencode/plans/plan.md            # Plan content
  .opencode/planloop/manifest.json   # Updated: state: "planning", iteration: 1
Events:
  - PlanCreated { runId, planPath, sessionId }
  - IterationStarted { runId, iteration: 1 }
Logs:
  [info] Plan created at .opencode/plans/plan.md
  [info] 3 issues identified
State:  planning (iteration 1)
```

## Step 7: Review submission

```
Action: Plugin extracts issues, builds Brief, submits to ChatGPT
Input:  plan.md, Repository Brief
Output: Review submitted to adapter
Files:
  .opencode/planloop/runs/abc-123/review-request-1.json
Events:
  - ReviewStarted { runId, iteration: 1, adapterId: "chatgpt-browser" }
  - PlanSent { runId, iteration: 1, packetHash: "a1b2c3" }
Logs:
  [info] Extracted 3 issues from plan
  [info] Building Repository Brief...
  [info] Brief: 23 files, 4 packages, 3127 lines
  [info] Submitting to chatgpt-browser...
State:  planning → reviewing
```

## Step 8: Review response (issues found)

```
Action: ChatGPT returns review with 1 critical, 2 major, 1 minor
Input:  ChatGPT response
Output: ReviewResponsePacket
Files:
  .opencode/planloop/runs/abc-123/review-response-1.json
Events:
  - ReviewCompleted { runId, iteration: 1, issuesFound: 4, durationMs: 23400 }
Logs:
  [info] Review received in 23.4s
  [info] Issues: 1 critical, 2 major, 1 minor
  [info] Approval: DENIED (critical/major issues present)
State:  reviewing → awaiting_user
```

## Step 9: User confirms revision

```
Action: User approves revision
Input:  User confirmation
Output: Revision authorized
Files:  (none — state change only)
Events:
  - RevisionAuthorized { runId, iteration: 1 }
Logs:
  [info] User authorized revision
State:  awaiting_user → revising
```

## Step 10: Plan revision

```
Action: Plugin injects issues into plan agent, agent revises
Input:  Issues + original plan
Output: Revised plan.md
Files:
  .opencode/plans/plan.md            # Updated
  .opencode/planloop/manifest.json   # Updated: iteration: 2
  .opencode/planloop/reasoning-trace-1-2.json
Events:
  - PlanRevised { runId, iteration: 2, issuesAddressed: ["issue-1", "issue-2"] }
  - IterationStarted { runId, iteration: 2 }
Logs:
  [info] Injecting 3 issues into plan...
  [info] Plan revised (iteration 2)
  [info] 2/3 issues addressed
State:  revising → planning (iteration 2)
```

## Step 11: Review iteration 2

```
Action: Second review submitted and returns 1 minor only
Input:  Revised plan
Output: ReviewResponsePacket
Files:
  .opencode/planloop/runs/abc-123/review-request-2.json
  .opencode/planloop/runs/abc-123/review-response-2.json
Events:
  - ReviewStarted { runId, iteration: 2, adapterId: "chatgpt-browser" }
  - ReviewCompleted { runId, iteration: 2, issuesFound: 1, durationMs: 18200 }
Logs:
  [info] Review 2 received in 18.2s
  [info] Issues: 0 critical, 0 major, 1 minor
  [info] Approval: PENDING (requires user confirmation)
State:  planning → reviewing → awaiting_user
```

## Step 12: User approves

```
Action: User confirms approval
Input:  User confirmation
Output: Approved plan
Files:
  .opencode/planloop/runs/abc-123/approved-plan.md
  .opencode/planloop/manifest.json   # Updated: state: "approved"
Events:
  - PlanApproved { runId, iteration: 2, totalIterations: 2 }
Logs:
  [info] Plan approved after 2 iterations
  [info] Approved plan archived to runs/abc-123/approved-plan.md
State:  awaiting_user → approved
```

## Step 13: Build session

```
Action: Handoff creates fresh Build session
Input:  Approved plan + Repository Brief
Output: New Build session with injected prompt
Files:
  .opencode/planloop/manifest.json   # Updated: state: "building", sessionId: "build-456"
Events:
  - BuildSessionStarted { runId, buildSessionId: "build-456" }
Logs:
  [info] Creating fresh Build session...
  [info] Session build-456 created (no parentID)
  [info] Build prompt injected
  [info] Handoff complete
State:  approved → building
```

## Step 14: Knowledge extraction

```
Action: Extract lessons from run archive
Input:  Run archive (conversation, plans, reviews)
Output: Extracted lessons
Files:
  .field-guide/principles/architecture/use-context-request-first.md
  .field-guide/decisions/tool-choices/chatgpt-browser-default.md
Events:
  - RunArchived { runId, archivePath, conversationTurns: 12, plans: 2, reviews: 2 }
  - LessonExtracted { runId, lessonId: "lesson-789", category: "principles/architecture", title: "Use context request first" }
Logs:
  [info] Archiving run abc-123...
  [info] Conversation: 12 turns, 2 plans, 2 reviews
  [info] Extracting knowledge...
  [info] 1 principle extracted
  [info] 1 decision extracted
  [info] Field Guide updated: 2 new lessons
State:  building → (extraction complete)
```

## Step 15: Field Guide updated

```
Action: Verify Field Guide index is updated
Input:  Extracted lessons
Output: Updated index
Files:
  .field-guide/index.json            # Updated: lessonCount: 2
Events: (none — already emitted)
Logs:
  [info] Index updated: 2 lessons (1 principles, 1 decisions)
State:  Field Guide contains durable knowledge from run abc-123
```
