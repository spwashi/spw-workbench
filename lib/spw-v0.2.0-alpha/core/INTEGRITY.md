# INTEGRITY (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha integrity and provenance guarantees.

## v0.2.0 Contract Stub

Integrity ensures outputs are trustworthy, reproducible, and attributable to source inputs and configuration. v0.2.0-alpha integrity prep includes:
- deterministic outputs under fixed input/profile
- stable normalization and formatting behavior
- provenance notes for transformed artifacts

## Invariants

- Equal input/profile pairs yield equal token + AST structures.
- Canonicalization does not drop semantic information.
- Integrity checks are automatable in CI/local lint loops.

## Implementation Hooks

- Determinism coverage: `src/seed/__tests__/parser.determinism.test.ts`
- Canonical outputs: `src/seed/canonical/index.ts`
- Golden snapshots: `src/seed/__tests__/snapshots/`

## Open Questions

- What hash/provenance schema should be standard in v0.2 stable?
- Which drift classes are acceptable for alpha-only iteration?
