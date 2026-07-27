# Conformance — Performance Tests

```
For each operation with a budget:
  1. Run operation 100 times
  2. Measure p50, p95, p99 latency
  3. Assert p99 < budget

Example:
  validate() budget: 20ms
    p50: 8ms ✓
    p95: 15ms ✓
    p99: 18ms ✓

  checkCompat() budget: 1ms
    p50: 0.2ms ✓
    p95: 0.5ms ✓
    p99: 0.8ms ✓
```

Budget sources: `../performance-budgets.md`. Violations fail the build.
