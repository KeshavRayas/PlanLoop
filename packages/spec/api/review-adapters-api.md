# Review Adapters Package — Frozen Public API

Package: `packages/review-adapters`

Every exported function, type, and constant is frozen at Spec v1.0. Changes require a new spec version.

## Interface

```typescript
interface ReviewAdapter {
  readonly id: string
  readonly supportedProtocolVersions: { minimum: string; maximum: string }
  submit(packet: ReviewRequestPacket | ContextFulfillmentPacket): Promise<Handle>
  awaitResponse(handle: Handle): Promise<ReviewResponsePacket | ContextRequestPacket>
  fulfillContext(handle: Handle, packet: ContextFulfillmentPacket): Promise<void>
  cancel(handle: Handle): Promise<void>
}
```

## Exceptions

- `submit` rejects if adapter is not available
- `awaitResponse` rejects after timeout (configurable, default 120s)
- `cancel` is idempotent

## Implementations

| Adapter | Transport | Notes |
|---------|-----------|-------|
| `chatgpt-browser.adapter.ts` | ChatGPTChatAdapter + BrowserTransport | **Default** |
| `manual.adapter.ts` | Clipboard / TUI paste | Same protocol validation |
| `openai-api.adapter.ts` | `fetch` to OpenAI | Secondary; `response_format: json_schema` |

## Registry

`registry.ts` — config-driven adapter selection.

## Performance expectations

- `ReviewAdapter.submit`: <10s (network/browser dependent)
- `ReviewAdapter.awaitResponse`: <120s (configurable)
