# CONFORMANCE (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha conformance checks.

## v0.2.0 Contract Stub

Conformance defines what it means for an implementation to satisfy core Spw behavior. v0.2.0-alpha conformance includes:
- parser/lexer contract checks over representative corpora
- profile-aware behavior accounting
- explicit pass/fail criteria for release-prep gates

## Invariants

- Conformance checks are reproducible locally and in CI.
- Failing core contracts block release candidates.
- Conformance suite tracks expected warnings separately from errors.

## Implementation Hooks

- Local parser checks: `npm run lint:spw`
- Writerside/path checks: `npm run lint:docs:strict`
- Core stub check: `npm run lint:v020`

## Open Questions

- Which conformance gates are mandatory before tagging v0.2.0 stable?
- Should profile-specific conformance be split by target environment?
