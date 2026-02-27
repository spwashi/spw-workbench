# CACHE-IR (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha cache intermediate representation.

## v0.2.0 Contract Stub

Cache-IR in alpha is represented by runtime snapshots plus lens indexes:
- register snapshot as cacheable state packet
- lens->register lookup table for targeted invalidation and prewarm
- trace-aligned provenance for replay and diagnostics

## Invariants

- Cache-IR is derivable from runtime execution output.
- Lens index entries map to existing register keys.
- Cache-IR structures avoid UI-only data dependencies.

## Implementation Hooks

- Snapshot emitter: `RegisterBank.snapshot()` in `src/runtime/state/register-bank.ts`
- Lens index data shape: `RegisterSnapshot` in `src/runtime/state/types.ts`
- Runtime foundation docs: `docs/runtime/spw/runtime-foundation.spw`

## Open Questions

- Should cache keys be hash-only or hash + lens tuples?
- What eviction policy belongs to alpha versus post-alpha optimization passes?
