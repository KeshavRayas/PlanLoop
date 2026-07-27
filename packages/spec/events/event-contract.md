# Event Contract

All events: name, payload, emitter, listeners, retry, idempotent.

```yaml
events:
  - name: PlanCreated
    payload: { runId: string, planPath: string, sessionId: string }
    emitter: opencode-plugin
    listeners: [review-adapter, field-guide]
    retry: exponential backoff, 3 attempts
    idempotent: true

  - name: ReviewStarted
    payload: { runId: string, iteration: number, adapterId: string }
    emitter: opencode-plugin
    listeners: [field-guide]
    retry: none
    idempotent: true

  - name: ReviewCompleted
    payload: { runId: string, iteration: number, response: ReviewResponsePacket }
    emitter: review-adapter
    listeners: [opencode-plugin]
    retry: re-submit via adapter
    idempotent: true

  - name: ContextRequested
    payload: { runId: string, paths: string[], reason: string }
    emitter: review-adapter
    listeners: [opencode-plugin]
    retry: re-request same paths
    idempotent: true

  - name: PlanUpdated
    payload: { runId: string, iteration: number, issuesResolved: number, issuesNew: number }
    emitter: opencode-plugin
    listeners: [field-guide]
    retry: none
    idempotent: true

  - name: ApprovalPassed
    payload: { runId: string, criticalIssues: 0, majorIssues: 0, userConfirmed: true }
    emitter: opencode-plugin
    listeners: [field-guide]
    retry: none
    idempotent: true

  - name: ImplementationStarted
    payload: { runId: string, buildSessionId: string, planPath: string }
    emitter: opencode-plugin
    listeners: [field-guide]
    retry: none
    idempotent: true

  - name: LessonExtracted
    payload: { runId: string, lessonId: string, category: string, title: string }
    emitter: field-guide
    listeners: []
    retry: none
    idempotent: true
```
