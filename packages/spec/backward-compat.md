# Backward Compatibility

Release rules for the entire project.

## Protocol package (strict)

| Change type | Version | Rules |
|-------------|---------|-------|
| Patch | 1.0.x | Bug fixes in validators, typo fixes in schemas (non-breaking) |
| Minor | 1.x.0 | New optional fields in packets, new packet types, new validators |
| Major | x.0.0 | Required field changes, removed fields, renamed packet types |

## All other packages

| Change type | Version | Rules |
|-------------|---------|-------|
| Patch | 1.0.x | Bug fixes, internal refactors, test additions, no API changes |
| Minor | 1.x.0 | New exported functions/types, new optional config, backward-compatible |
| Major | x.0.0 | Removed exports, renamed exports, changed signatures, new required config |

## Breaking changes require

1. ADR documenting the decision
2. Spec version bump
3. Migration guide in README
4. Field Guide lesson about the change
5. CI pass on both old and new (if applicable)

## What cannot change in minor/patch

- Ownership table entries
- Non-goal lists
- ADR decisions (only additions, never modifications)
- Invariants (only additions, never modifications)
- Quality gate thresholds (only tightening, never loosening)
