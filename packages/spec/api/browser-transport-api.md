# Browser Transport Package — Frozen Public API

Package: `packages/browser-transport`

Every exported function, type, and constant is frozen at Spec v1.0. Changes require a new spec version.

## Interface

```typescript
interface BrowserTransport {
  openTab(url: string): Promise<TabHandle>
  focusTab(handle: TabHandle): Promise<void>
  injectPrompt(handle: TabHandle, text: string): Promise<void>
  waitForCompletion(handle: TabHandle, options: WaitOptions): Promise<void>
  extractResponse(handle: TabHandle, selector?: string): Promise<string>
  closeTab?(handle: TabHandle): Promise<void>
}
```

Primitives only. No JSON parsing, no review semantics.

## Exceptions

- All methods reject with `TransportError` on failure
- `extractResponse` returns `""` on clipboard fallback — caller checks

## Bridge server

- Local server: `ws://127.0.0.1:9477` (configurable port)
- Request/response RPC: `{ id, method, params }` → `{ id, result | error }`
- Methods map 1:1 to transport primitives
- Health endpoint for plugin startup check
- Clipboard fallback RPC: `extractResponse` returns empty → bridge signals `clipboard_fallback` → user pastes → extension reads clipboard

## Client SDK

`client.ts` — WebSocket client used by the chat-adapters layer.

## Performance expectations

- `BrowserTransport.injectPrompt`: <5s (browser DOM dependent)
- `BrowserTransport.extractResponse`: <5s
- Bridge health check: <2s
