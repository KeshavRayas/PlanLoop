# Acceptance Tests — Phase 3: Plugin

```gherkin
Scenario: /planloop triggers planning
  Given the plugin is registered in OpenCode
  When the developer types "/planloop"
  Then a new run is created
  And the plan agent extracts the implementation plan
  And a RepositoryBrief is built
  And the review adapter is invoked

Scenario: Issues-only revision
  Given a ReviewResponsePacket with 2 major issues
  When the plugin processes the response
  Then a PlanRevisionInstruction is built with issues only
  And the plan agent is prompted to revise
  And a reasoning trace is archived showing 0 resolved, 2 stillOpen, 0 new

Scenario: Deterministic approval gate
  Given a ReviewResponsePacket with 0 critical and 0 major issues
  And all verification passed
  And userConfirmed is true
  When evaluateApproval is called
  Then approved is true
  And the Build session is created
```
