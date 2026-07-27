# Repository Manifest

```yaml
repository: PlanLoop
description: Planning loop for OpenCode with ChatGPT review, persistent knowledge engine

packages:
  - name: spec
    path: packages/spec
    responsibility: Product definition, contracts, events, ADRs, acceptance tests
    dependencies: []
    commands: []

  - name: bootstrap
    path: packages/bootstrap
    responsibility: Environment detection, setup, diagnostics, health checks
    dependencies: []
    commands: [setup, doctor]

  - name: protocol
    path: packages/protocol
    responsibility: JSON schemas, validators, approval evaluator, reasoning traces
    dependencies: [ajv]
    commands: [test]

  - name: browser-transport
    path: packages/browser-transport
    responsibility: WebSocket bridge, browser automation primitives, client SDK
    dependencies: [ws]
    commands: [build, dev]

  - name: chat-adapters
    path: packages/chat-adapters
    responsibility: ChatGPT prompt builder, response extractor, chat adapter
    dependencies: [@planloop/browser-transport]
    commands: [test]

  - name: review-adapters
    path: packages/review-adapters
    responsibility: ReviewAdapter implementations, adapter registry
    dependencies: [@planloop/protocol, @planloop/chat-adapters, @planloop/browser-transport]
    commands: [test]

  - name: opencode-plugin
    path: packages/opencode-plugin
    responsibility: Plugin entry, state machine, orchestrator, brief builder, revision loop
    dependencies: [@planloop/protocol, @planloop/review-adapters, @planloop/field-guide]
    commands: [test]

  - name: field-guide
    path: packages/field-guide
    responsibility: Knowledge extraction, Field Guide storage, index, planner injection
    dependencies: [@planloop/protocol]
    commands: [test]

apps:
  - name: browser-extension
    path: apps/browser-extension
    responsibility: Chrome/Edge MV3 extension, DOM selectors, WebSocket client
    dependencies: [@planloop/browser-transport]

config_files:
  - package.json (workspace root)
  - opencode.json (OpenCode registration)
  - .opencode/planloop/config.json (PlanLoop config)

generated_files:
  - .field-guide/ (created by setup or first run)
  - .opencode/planloop/runs/ (created per run)
  - apps/browser-extension/dist/ (built by setup)
```
