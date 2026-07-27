# Failure Matrix

Every failure mode has detect, recover, retry, abort, and notify defined.

| Failure | Detect | Recover | Retry | Abort | Notify |
|---------|--------|---------|-------|-------|--------|
| Browser crashes | Extension WebSocket disconnects | Signal bridge; mark run FAILED | None — user must restart browser | After 30s no reconnection | Toast: "Browser disconnected. Restart and run /planloop resume." |
| Extension disconnects | Bridge health check fails every 5s | Attempt reconnect with backoff | 3 attempts, exponential backoff | After 3 failed attempts | Toast: "Extension disconnected. Reload extension." |
| Bridge dies | Plugin health check on startup | Restart bridge process | Auto-restart once | If restart fails, abort run | Toast: "Bridge process died. Run bun run doctor." |
| OpenCode exits | Session status event | Persist run state to manifest.json | On restart, resume from manifest | If manifest corrupt, start new run | N/A — user restarted |
| JSON invalid | Protocol validator rejects | Request re-submission from adapter | 1 re-submit attempt | After invalid response, abort run | Toast: "Invalid response from reviewer. Retrying." |
| ChatGPT refuses | extractResponse returns empty | Clipboard fallback | 1 clipboard attempt | After clipboard empty, abort run | Toast: "ChatGPT returned empty. Paste response manually." |
| Review timeout | No response after 120s | Cancel adapter handle | 1 retry with fresh submission | After timeout, abort run | Toast: "Review timed out. Retrying." |
| Protocol mismatch | Compat check fails | Reject packet; log error | None — sender must update | Reject and abort | Toast: "Protocol version incompatible. Check adapter version." |
| Field Guide write fails | Storage write throws | Log error; skip extraction | None — extraction is non-critical | Extraction skipped; run continues | Warning in run archive |
| Setup fails | Setup pipeline error | Diagnostics identify broken component | None — user must fix | Setup aborts with actionable error | Console output with fix instructions |
