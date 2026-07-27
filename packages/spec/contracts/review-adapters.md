# Review Adapters Package Contract

## Inputs
- ReviewRequestPacket (from plugin)
- ContextFulfillmentPacket (from plugin)

## Outputs
- ReviewResponsePacket (to plugin)
- ContextRequestPacket (to plugin)
- `Handle` — opaque per-submission handle for await/fulfill/cancel

## Public API
- `ReviewAdapter` interface (frozen, see api/review-adapters-api.md):
  - `id: string`
  - `supportedProtocolVersions: { minimum: string; maximum: string }`
  - `submit(packet): Promise<Handle>`
  - `awaitResponse(handle): Promise<ReviewResponsePacket | ContextRequestPacket>`
  - `fulfillContext(handle, packet): Promise<void>`
  - `cancel(handle): Promise<void>` (idempotent)
- Adapter implementations:
  - `chatgpt-browser.adapter.ts` — **default**; ChatGPTChatAdapter + BrowserTransport
  - `manual.adapter.ts` — clipboard / TUI paste; same protocol validation
  - `openai-api.adapter.ts` — `fetch` to OpenAI; `response_format: json_schema`
- `registry.ts` — adapter registry, config-driven selection

## Internal API
- Response validation against protocol schemas (delegated to `@planloop/protocol`)
- Timeout enforcement (default 120s, configurable)

## Dependencies
- `@planloop/protocol`
- `@planloop/chat-adapters`
- `@planloop/browser-transport`

## Forbidden Dependencies
- NO implementation of ChatGPTChatAdapter (that's chat-adapters)
- NO knowledge of the OpenCode state machine
- NO browser tab management
- NO Repository Brief construction
