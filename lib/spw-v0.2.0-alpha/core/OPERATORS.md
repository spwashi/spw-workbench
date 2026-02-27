# OPERATORS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha operator semantics.

## v0.2.0 Contract Stub

Operators encode transformation intent and must preserve parseability and traceability. v0.2.0-alpha formalizes:
- operator sigil identity and token stability
- composition order rules (left-to-right unless explicitly grouped)
- clear error signaling when operator arity/context is invalid

## Invariants

- Operator tokens map to stable sigils across profiles.
- Operator evaluation order is explicit or derivable from grouping.
- Unknown operators fail with actionable diagnostics.

## Implementation Hooks

- Token types and operator values: `src/seed/types/token.ts`
- Lexer operator matching: `src/seed/lexer/matchers/operators.ts`
- Parse-expression composition: `src/seed/parser/parse-expression.ts`

## Open Questions

- Should v0.2.0 lock operator precedence classes or keep profile-driven precedence?
- Which legacy forms remain accepted under compatibility mode?
