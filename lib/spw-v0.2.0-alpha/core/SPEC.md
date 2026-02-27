# SPEC (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha. This file replaces the redirect placeholder and defines the core spec scaffold used by implementation and review.

## v0.2.0 Contract Stub

`SPEC` is the index contract for core semantics. It defines what the parser/kernel must expose as stable behavior for v0.2.0-alpha:
- deterministic lex + parse outputs for valid input
- explicit failure surfaces for invalid input
- portable seed kernel with no UI/runtime coupling

## Invariants

- Core behavior is deterministic for identical input and profile.
- Public kernel outputs are serializable and testable.
- Core contracts in this folder are normative for v0.2.0-alpha prep.

## Implementation Hooks

- Kernel parser and lexer surface: `src/seed/`
- Canon examples for contract checks: `docs/examples/spw/`
- Conformance targets: [CONFORMANCE.md](./CONFORMANCE.md)

## Open Questions

- Which contracts graduate from alpha to hard guarantees in v0.2.0 stable?
- Which profile-level deviations are allowed without violating core determinism?
