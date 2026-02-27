# REGISTERS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha register runtime.

## v0.2.0 Contract Stub

Register runtime defines how execution state is written, read, measured, and indexed:
- active/default/history register flows
- typed access helpers (`access`, `resonate`, `observe`, `confluent`, `materialize`, `measure`)
- lens-indexed resonance writes for cache-targeted retrieval

## Invariants

- Active register is always defined.
- Register writes preserve provenance and timestamp metadata.
- Lens index can be reconstructed from register metadata.

## Implementation Hooks

- RegisterBank implementation: `src/runtime/state/register-bank.ts`
- Descriptor and affinity map: `src/runtime/state/type-affinities.ts`
- Runtime state contracts: `src/runtime/state/types.ts`

## Open Questions

- Should lens index support weighted recency for cache prioritization?
- Which register metadata fields must be persisted across sessions?
