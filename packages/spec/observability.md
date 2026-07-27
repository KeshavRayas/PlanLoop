# Observability

Structured logging, metrics, tracing, debug mode.

## Log schema

```json
{
  "timestamp": "ISO8601",
  "runId": "uuid",
  "iteration": 3,
  "component": "protocol|transport|adapter|plugin|field-guide|bootstrap",
  "level": "debug|info|warn|error",
  "message": "Human-readable message",
  "metadata": {}
}
```

## Log levels

| Level | When | Example |
|-------|------|---------|
| `debug` | Detailed internal state | `Packet validated in 12ms` |
| `info` | Significant lifecycle events | `Run abc-123 started, iteration 1` |
| `warn` | Degraded but recoverable | `Extension reconnect attempt 2/3` |
| `error` | Failure requiring attention | `Review timeout after 120s` |

## Metrics

Counters, exported to optional telemetry:

- `planloop.runs.total` — Total runs started
- `planloop.runs.completed` — Runs that reached approval
- `planloop.iterations.avg` — Average iterations per run
- `planloop.reviews.total` — Reviews submitted
- `planloop.reviews.timeout` — Reviews that timed out
- `planloop.extraction.lessons` — Lessons extracted
- `planloop.setup.duration` — Setup time in ms

## Debug mode

- Set `LOG_LEVEL=debug` in environment
- All components emit debug logs
- Includes packet payloads, timing, state transitions
- Never logs secrets, keys, or credentials

## Tracing

- Each run gets a trace ID (same as `runId`)
- All log entries for a run share the trace ID
- Enables correlating events across components
