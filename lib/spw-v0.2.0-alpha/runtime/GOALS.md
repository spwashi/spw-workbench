# GOALS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha runtime goals.

## v0.2.0 Contract Stub

The runtime goal surface defines what execution behavior is guaranteed in alpha:
- deterministic parse-to-runtime bridging for identical inputs
- explicit execution traces for debugging and review
- register-aware state transitions with inspectable snapshots

## Invariants

- Runtime entrypoint returns structured success/failure, not implicit exceptions.
- Trace and snapshot surfaces are serializable.
- Runtime core remains portable (no UI/platform hard dependency).

## Implementation Hooks

- Runtime pipeline: `src/runtime/pipeline/run-spw.ts`
- Runtime interpreter: `src/runtime/interpreter/interpreter.ts`
- Runtime index exports: `src/runtime/index.ts`

## Open Questions

- Which runtime guarantees become hard conformance gates for stable v0.2?
- Which debug traces should remain available in production mode?
