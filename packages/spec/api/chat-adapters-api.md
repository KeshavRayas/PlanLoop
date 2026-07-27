# Chat Adapters Package — Public API

Package: `packages/chat-adapters`

## Module surface

| Module | Responsibility |
|--------|----------------|
| `prompt-builder.ts` | Wraps ReviewRequestPacket / ContextFulfillmentPacket into ChatGPT prompt text (includes JSON-only system contract) |
| `response-extractor.ts` | Pulls JSON from extracted text (code block or raw `{...}`) |
| `chatgpt-chat-adapter.ts` | Uses `BrowserTransport` primitives; knows ChatGPT DOM expectations via extension |

## Flow

```
ReviewAdapter (chatgpt-browser)
  → serializes packet to prompt string
  → ChatGPTChatAdapter.injectAndAwait(prompt)
  → BrowserTransport.injectPrompt / waitForCompletion / extractResponse
  → response-extractor → raw JSON string
  → protocol validator → ReviewResponsePacket | ContextRequestPacket
```

## Boundaries

- Packet validation is delegated to `@planloop/protocol` (by the caller — review-adapters)
- Tab management is delegated to `@planloop/browser-transport`
- No ReviewAdapter interface implementation (owned by review-adapters)
