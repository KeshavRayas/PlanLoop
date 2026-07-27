# Quality Gates

Deterministic "definition of done" for every phase.

## Per-package gate

```yaml
quality_gate:
  lint: pass              # ESLint with project config
  typecheck: pass         # TypeScript strict mode, no errors
  tests: pass             # All unit + integration tests green
  coverage: ">=90%"       # Line coverage threshold
  forbidden_deps: none    # No imports from forbidden packages
  circular_deps: none     # No circular dependencies detected
  bundle_size: within_budget  # For packages that ship artifacts
  api_surface: documented  # Every export has JSDoc
```

## Per-phase gate (includes package gate plus)

```yaml
phase_gate:
  acceptance_tests: pass   # All Given/When/Then scenarios pass
  architecture_test: pass  # Generated architecture test passes
  self_check: pass         # Self-verification checklist all green
  field_guide: updated     # Lessons extracted if applicable
  adr: current             # ADRs reflect all decisions made
  failure_matrix: covered  # All identified failures handled
```

## CI enforcement

- GitHub Actions runs quality gates on every PR
- Phase gate is a required check before merging
- Coverage regression blocked (must maintain >=90%)
- Forbidden dependency violation fails build
