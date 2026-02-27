# CAPSULES (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha capsule semantics.

## v0.2.0 Contract Stub

Capsules represent bounded semantic packets that can be composed without leaking unrelated concerns. v0.2.0-alpha capsule work frames:
- capsule boundaries and ownership
- composition constraints between capsules
- predictable extraction for tooling and instrumentation

## Invariants

- Capsules have explicit start/end boundaries.
- Cross-capsule links are declared, not implicit.
- Capsule extraction does not mutate source semantics.

## Implementation Hooks

- Capsule-oriented examples: `docs/examples/spw/`
- Instrumentation stream/audit surfaces: `src/seed/instrumentation/`
- Core boundary contracts: [BOUNDARIES.md](./BOUNDARIES.md)

## Open Questions

- Should capsule composition support profile-specific merge strategies?
- Which capsule metadata is required for downstream tooling interoperability?
