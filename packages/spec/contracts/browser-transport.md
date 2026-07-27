# Browser Transport Package Contract

## Inputs
- RPC requests from the client SDK: `{ id, method, params }`
- Extension messages over WebSocket (DOM injection results, response text, clipboard content)

## Outputs
- RPC responses: `{ id, result | error }`
- `BrowserTransport` primitives: `openTab`, `focusTab`, `injectPrompt`, `waitForCompletion`, `extractResponse`, `closeTab?`
- `TabHandle`, `WaitOptions`, `TransportError` types
- Bridge health endpoint for plugin startup check
- `clipboard_fallback` signal when `extractResponse` returns empty

## Public API
- `BrowserTransport` interface (frozen, see api/browser-transport-api.md)
- Bridge server (`bridge-server.ts`): WebSocket server on `ws://127.0.0.1:9477` (configurable port), request/response RPC, methods map 1:1 to transport primitives
- Client SDK (`client.ts`): WebSocket client used by the chat-adapters layer

## Internal API
- RPC method dispatch (1:1 with transport primitives)
- Extension session tracking and reconnect handling

## Dependencies
- ws (WebSocket server/client)

## Forbidden Dependencies
- NO `@planloop/protocol` imports — never imports protocol types
- NO JSON parsing of payloads — primitives only, no review semantics
- NO knowledge of ReviewPacket, PlanLoop, or OpenCode
- NO knowledge of ChatGPT or any AI service
- NO browser APIs in the Node bridge (DOM access lives in the extension)
