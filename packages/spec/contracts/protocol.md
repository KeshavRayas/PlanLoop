# Protocol Package Contract

## Inputs
- ReviewRequestPacket (from plugin)
- ContextFulfillmentPacket (from plugin)

## Outputs
- ReviewResponsePacket (to plugin)
- ContextRequestPacket (to plugin)
- PlanRevisionInstruction (internal)

## Public API
- validate(packet, schema): ValidationResult
- checkCompat(version, range): boolean
- evaluateApproval(response, verification, userConfirmed): ApprovalResult
- buildReasoningTrace(prev, current, verification): ReasoningTrace

## Internal API
- fingerprintIssue(issue): string
- diffIterations(prev, current): TraceDelta

## Dependencies
- ajv (JSON schema validation)

## Forbidden Dependencies
- NO browser APIs
- NO OpenCode SDK
- NO network calls
- NO file system writes (pure functions only)
