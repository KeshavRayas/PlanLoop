# Architecture Tests

Automated tests that verify the architecture itself. These run in CI and are required to pass.

## Import tests

```
Test: No forbidden imports
  For each package P:
    Scan all imports in P/src/**
    Assert no import references a forbidden package (from non-goals)
    Fail: "packages/protocol imports from browser-transport"
```

## Dependency graph tests

```
Test: Dependency graph matches spec
  Parse package.json dependencies for each package
  Compare against architecture.md dependency edges
  Fail: "packages/field-guide has unexpected dependency on browser-transport"
```

## Ownership tests

```
Test: No concept duplication
  For each concept in ownership table:
    Scan all packages for implementations of that concept
    Assert exactly one package implements it
    Fail: "Validation logic found in both protocol and opencode-plugin"
```

## API surface tests

```
Test: Every export is documented
  For each package:
    Extract all exported symbols
    Compare against api/<package>-api.md
    Fail: "packages/protocol exports 'helperFn' which is not in the API spec"
```

## Invariant tests

```
Test: Invariants are enforced at runtime
  For each invariant in invariants.md:
    Create a test that attempts to violate it
    Assert the violation is caught/prevented
    Fail: "Invariant 9 not enforced: approval granted with 1 major issue"
```

## Enforcement

- Architecture tests run in CI on every PR
- Failure blocks merge
- Tests are generated from spec files (single source of truth)
- `packages/spec/architecture-tests.md` describes the test logic; implementation in `packages/spec/tests/`
