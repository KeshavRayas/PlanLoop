# Acceptance Tests — Phase 0: Protocol

```gherkin
Scenario: Valid packet passes validation
  Given a ReviewRequestPacket matching the schema
  When validate(packet) is called
  Then the result is { valid: true, errors: [] }

Scenario: Forbidden field rejected
  Given a ReviewResponsePacket with "revised_plan" field
  When validate(packet) is called
  Then the result is { valid: false, errors: ["Forbidden key: revised_plan"] }

Scenario: Compatibility check passes
  Given a packet with protocolVersion "1.1"
  And a receiver supporting "1.0" to "1.x"
  When checkCompat is called
  Then the result is true

Scenario: Compatibility check fails
  Given a packet with protocolVersion "2.0"
  And a receiver supporting "1.0" to "1.x"
  When checkCompat is called
  Then the result is false

Scenario: Approval with no issues
  Given a ReviewResponsePacket with no critical or major issues
  And verification all passed
  And userConfirmed is true
  When evaluateApproval is called
  Then the result is { approved: true }
```
