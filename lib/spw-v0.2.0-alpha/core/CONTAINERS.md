# CONTAINERS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha container semantics.

## v0.2.0 Contract Stub

Containers encode grouping, scope, and attachment context. v0.2.0-alpha defines:
- legal container forms and nesting rules
- disambiguation behavior for borderline syntax
- parse tree guarantees for grouped expressions

## Invariants

- Container boundaries are preserved in AST output.
- Ambiguous container shapes resolve consistently under one rule-set.
- Invalid nesting fails fast with position-rich diagnostics.

## Implementation Hooks

- Grammar container rules: `src/seed/grammar/containers.ts`
- Container parser tests: `src/seed/__tests__/container-disambiguation.test.ts`
- Parsing entry points: `src/seed/parser/parse.ts`

## Open Questions

- Should mixed container families be normalized or preserved as-authored?
- Which ambiguity cases need profile toggles versus one canonical rule?
