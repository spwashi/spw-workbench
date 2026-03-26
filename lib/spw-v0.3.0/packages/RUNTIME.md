# RUNTIME (Spw v0.3.0)

## Status

Package boundary documentation for `spw-runtime` — the execution engine.

## v0.3.0 Contract

`spw-runtime` owns:
- Interpreter (ONF → RuntimeValue)
- Register bank (state management, snapshots)
- Pipeline orchestration (parse → normalize → interpret → report)
- Substrate event system

It depends on `spw-seed` for parse/normalize. No other package may depend on runtime internals.

## Source Links

- Package root: `packages/spw-runtime/`
- Runtime source: `src/runtime/`
- State types: `src/runtime/state/types.ts`
- Register bank: `src/runtime/state/register-bank.ts`
- Interpreter: `src/runtime/interpreter/interpreter.ts`
- Pipeline: `src/runtime/pipeline/run-spw.ts`

## Invariants

- Pipeline stages are observable and traceable.
- Parse failures short-circuit interpretation.
- Successful runs always include a register snapshot.
- Runtime has no UI, LSP, or CLI dependencies.

## Migration Notes

In v0.2.0, runtime stubs were created under `src/runtime/` with 44 passing tests. v0.3.0 documents the package boundary and dependency contract.

## Open Questions

- Should the register bank support custom register types for extensibility?
- How should pipeline stage hooks (before/after) be exposed?

## v0.4.0 Candidates

- Register bank extensibility seams.
- Pipeline stage hooks for telemetry and debugging.
- Runtime telemetry as first-class substrate events.
- Cache-IR exploration for repeated parse patterns.
