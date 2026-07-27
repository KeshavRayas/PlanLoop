# Protocol Package — Frozen Public API

Package: `packages/protocol`

Every exported function, type, and constant is frozen at Spec v1.0. Changes require a new spec version.

## Functions

```typescript
// Validates a packet against a schema
function validate(
  packet: unknown,
  schemaName: SchemaName
): ValidationResult

// Checks protocol version compatibility
function checkCompat(
  senderVersion: string,
  receiverRange: { minimum: string; maximum: string }
): CompatResult

// Evaluates deterministic approval rules
function evaluateApproval(
  response: ReviewResponsePacket,
  verification: VerificationResult[],
  userConfirmed: boolean
): ApprovalResult

// Builds reasoning trace between iterations
function buildReasoningTrace(
  prevResponse: ReviewResponsePacket,
  currentResponse: ReviewResponsePacket,
  verificationResults: VerificationResult[]
): ReasoningTrace

// Fingerprint an issue for deduplication
function fingerprintIssue(issue: Issue): string

// Diff two iterations for trace
function diffIterations(
  prev: ReviewResponsePacket,
  current: ReviewResponsePacket
): TraceDelta
```

## Exceptions

- `validate` returns `{ valid: false, errors }` — never throws
- `checkCompat` returns `{ compatible: false, reason }` — never throws
- `evaluateApproval` is pure — no side effects

## Approval rules

```
approved iff:
  issues.critical.length === 0
  issues.major.length === 0
  all verification[].status === "passed"   // set by OpenCode after repo checks
  userConfirmed === true                     // config: requireUserApproval default true
```

Confidence/scores: stored, logged, never gate `approved`.

## Compatibility rules

- Receiver accepts packet if `protocolVersion` satisfies receiver's supported range
- Reject if `protocolVersion < receiver.minimumSupported` or `> receiver.maximumSupported`
- Reject if sender's `maximumSupported` < receiver's `minimumSupported` (no overlap)
- Major version bump = breaking; minor = additive fields only

## ReviewResponsePacket forbidden keys

Enforce `additionalProperties` and explicit forbidden keys: `revised_plan`, `replacement_sections`, `plan_rewrite`, `implementation_steps`.

## Reasoning trace

Artifact per iteration, stored at `.opencode/planloop/runs/<runId>/traces/iteration-<n>.json`:

```json
{
  "iteration": 3,
  "resolved": [{ "issueId": "iss_001", "title": "..." }],
  "stillOpen": [{ "issueId": "iss_003" }],
  "newIssues": [{ "issueId": "iss_008" }],
  "confidenceDelta": { "before": 0.91, "after": 0.95 },
  "verificationDelta": { "passed": 2, "failed": 0, "pending": 1 }
}
```

- Fingerprint issues: `hash(category + title + sorted(affectedFiles))`
- Compare iteration N vs N-1: classify resolved / stillOpen / new
- Human-readable summary generated for TUI toast and archive

## Performance expectations

- `validate`: <20ms for any packet
- `checkCompat`: <1ms
- `evaluateApproval`: <5ms
- `buildReasoningTrace`: <50ms
- `fingerprintIssue`: <5ms
