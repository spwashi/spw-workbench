# TRAJECTORY (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha runtime trajectory.

## v0.2.0 Contract Stub

Runtime trajectory tracks staged maturation from release-day scaffold to full runtime:
- Phase A: parse-to-runtime bridge + register core
- Phase B: richer operator semantics and cache optimization profiles
- Phase C: VM/bytecode execution and platform integration

## Invariants

- Each phase preserves compatibility with core parse contracts.
- New runtime behavior ships behind explicit, testable contracts.
- Deferred phases remain documented with implementation hooks.

## Implementation Hooks

- Current foundation source: `src/runtime/`
- Runtime docs index: `docs/runtime/index.spw`
- Runtime release notes: `docs/runtime/md/runtime-foundation.md`

## Open Questions

- What is the minimal VM milestone required for v0.2.0 stable?
- How should trajectory milestones map to conformance gates?
