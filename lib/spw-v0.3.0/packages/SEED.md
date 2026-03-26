# SEED (Spw v0.3.0)

## Status

Package boundary documentation for `spw-seed` — the parser kernel.

## v0.3.0 Contract

`spw-seed` is the foundational package. It owns:
- Spw parser (tokenizer, grammar, AST construction)
- Seed normalization (AST → ONF)
- Query dialect (`Spw.q`) and selector algebra
- Core type definitions for the Spw language

No package may depend on `spw-seed` internals — only its public exports.

## Source Links

- Package root: `packages/spw-seed/`
- Parser entry: `src/seed/` (pending extraction into package)
- Query subsystem: `src/seed/query/`

## Invariants

- Parse output is deterministic for identical input.
- The parser has no runtime or LSP dependencies.
- All exported types are serializable.

## Migration Notes

In v0.2.0, parser code lived under `src/seed/` without formal package boundaries. v0.3.0 names the boundary; v0.4.0 will enforce it.

## Open Questions

- Should seed include the normalize step, or does that belong to runtime?
- What is the minimal public API surface for external consumers?

## v0.4.0 Candidates

- Extract `src/seed/` into `packages/spw-seed/src/` with own tsconfig.
- Publish `@spw/seed` as an independent npm package.
- Seed-specific test suite isolated from workspace tests.
