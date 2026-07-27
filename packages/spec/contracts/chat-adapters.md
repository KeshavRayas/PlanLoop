# Chat Adapters Package Contract

## Inputs
- ReviewRequestPacket / ContextFulfillmentPacket (as structured data to serialize into prompt text; validated by the caller, never by this package)
- Raw extracted response text (from BrowserTransport)

## Outputs
- ChatGPT prompt text (packet wrapped with JSON-only system contract)
- Raw JSON string pulled from extracted response text (code block or raw `{...}`)
- `ChatGPTChatAdapter` — inject-and-await flow on top of `BrowserTransport` primitives

## Public API
- `prompt-builder.ts` — wraps ReviewRequestPacket / ContextFulfillmentPacket into ChatGPT prompt text (includes JSON-only system contract)
- `response-extractor.ts` — pulls JSON from extracted text (code block or raw `{...}`)
- `chatgpt-chat-adapter.ts` — uses `BrowserTransport` primitives; knows ChatGPT DOM expectations via the extension

## Internal API
- Prompt formatting helpers
- JSON candidate scanning within extracted text

## Dependencies
- `@planloop/browser-transport`

## Forbidden Dependencies
- NO implementation of the ReviewAdapter interface (that's review-adapters)
- NO knowledge of OpenCode
- NO browser tab management (that's browser-transport)
- NO protocol packet validation (that's protocol)
