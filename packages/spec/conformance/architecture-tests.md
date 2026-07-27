# Conformance — Architecture Tests

```
1. Import graph matches spec
   - Parse all imports across all packages
   - Compare against architecture.md dependency edges
   - Fail on any unexpected dependency

2. Ownership rules enforced
   - For each concept in ownership table
   - Scan all packages for implementations
   - Assert exactly one package owns it

3. Non-goal violations detected
   - For each package's non-goals
   - Scan for code that violates those goals
   - Fail on any violation

4. API surface matches documentation
   - For each package's api/<package>-api.md
   - Extract all exported symbols
   - Assert every export is documented
   - Assert no undocumented exports exist
```
