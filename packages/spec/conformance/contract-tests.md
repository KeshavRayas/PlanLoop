# Conformance — Contract Tests

```
For each package P with contract C:
  1. Read C.inputs → assert P accepts those types
  2. Read C.outputs → assert P produces those types
  3. Read C.publicAPI → assert every function exists with correct signature
  4. Read C.forbiddenDependencies → assert no imports from those packages
  5. Read C.exceptions → assert exceptions match documented behavior

Example:
  packages/protocol matches packages/spec/contracts/protocol.md
    ✓ validate(packet, schemaName) exists
    ✓ Returns ValidationResult
    ✓ Never throws
    ✓ No browser imports
```
