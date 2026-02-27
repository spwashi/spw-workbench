# PIPELINE (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha runtime pipeline.

## v0.2.0 Contract Stub

Runtime pipeline stages are explicit and ordered:
1. parse (with optional desugar)
2. normalize (AST -> ONF)
3. interpret (ONF -> RuntimeValue)
4. report (parse output + runtime traces + register snapshot)

## Invariants

- Stage boundaries are observable and traceable.
- Parse failures short-circuit runtime interpretation.
- Successful runs always include a register snapshot.

## Implementation Hooks

- Pipeline orchestrator: `src/runtime/pipeline/run-spw.ts`
- ONF normalization bridge: `src/seed/normalize.ts`
- Runtime result contracts: `src/runtime/pipeline/types.ts`

## Open Questions

- Should normalization be cached per source hash in alpha?
- Which stages need independent timing metrics for release telemetry?
