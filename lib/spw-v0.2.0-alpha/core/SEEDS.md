# SEEDS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha seed lifecycle.

## v0.2.0 Contract Stub

A seed is the minimal reproducible Spw unit carrying intent, structure, and provenance. v0.2.0-alpha seed contracts focus on:
- canonical seed shape for parser output
- normalization rules for equivalent textual forms
- seed-level provenance to support audits and replay

## Invariants

- Seed identity is stable after normalization.
- Equivalent source forms collapse to equivalent seed structure.
- Seed metadata fields are explicit rather than inferred by side effects.

## Implementation Hooks

- Canonicalization pipeline: `src/seed/canonical/`
- Normalization logic: `src/seed/normalize.ts`
- Seed-facing docs: `src/seed/docs/index.spw`

## Open Questions

- Which provenance fields are mandatory in alpha versus optional in stable?
- How strict should seed normalization be for style-only differences?
