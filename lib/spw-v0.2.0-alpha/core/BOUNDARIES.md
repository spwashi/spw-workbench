# BOUNDARIES (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha boundary semantics.

## v0.2.0 Contract Stub

Boundaries specify what may cross between syntax, semantics, and runtime projection layers. v0.2.0-alpha boundary prep defines:
- legal cross-layer dependencies
- ownership of normalization and validation steps
- controlled extension points for profiles and tooling

## Invariants

- Import and dependency direction flows inward (infra <- platform <- app <- ui).
- Seed/kernel code remains portable and environment-agnostic.
- Boundary violations are detectable by lint/audit tooling.

## Implementation Hooks

- Layer audit guide: `src/seed/docs/audit-guide.spw`
- Hook checks and analyzers: `.git/hooks/`, `scripts/analyzers/`
- Layer contract companion: [LAYERS.md](./LAYERS.md)

## Open Questions

- Which boundary checks should be hard errors in alpha?
- How should profile-specific extensions declare boundary-safe integration?
