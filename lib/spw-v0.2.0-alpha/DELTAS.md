# Spw v0.2.0-alpha Deltas

This document is the working delta map from v0.1.0-alpha -> v0.2.0-alpha.

Principle: changes should read like an argument.
- Spw: the evolution force (syntax + semantics become more precise).
- Boonhonk: the field of wonder (taste/posture/quality become observable).

## Status

Core status (2026-02-26):
- `core/*.md` redirect stubs replaced with v0.2.0 contract stubs.
- Core files now follow a shared scaffold:
  - `## Status`
  - `## v0.2.0 Contract Stub`
  - `## Invariants`
  - `## Implementation Hooks`
  - `## Open Questions`

Runtime status (2026-02-26):
- `runtime/*.md` redirect stubs replaced with v0.2.0 contract stubs.
- Runtime docs now align to `src/runtime` foundation surfaces (state, interpreter, pipeline).
- `#` operator framing in runtime docs now includes aggregation/intersection + lens-indexed cache targeting.

Remaining status:
- Non-core folders still include redirect stubs and should migrate incrementally.
- Redirect stubs remain acceptable outside `core/` and `runtime/` during alpha.

## Proposed v0.2.0 focus areas

- Operator fusion / composition semantics (formalize what was previously "planned").
- Stronger conformance rules (placeholders, currying, boundary semantics).
- Runtime registers and reflection story (what becomes reified in v0.2.0).
- Profiles as first-class experimentation surfaces (taste, posture, fuzz).

## Redirect policy

A redirect stub MUST:
- Declare itself as a redirect stub.
- Point to the v0.1.0-alpha canonical source path.
- Point to this DELTAS.md for planned/known differences.

## Release-prep checks

For v0.2.0-alpha prep, run:
- `npm run lint:v020` (core contract-stub integrity)
- `npm run lint:v020:runtime` (runtime contract-stub + filename integrity)
- `npm run lint:spw` (parse validation for `.spw`)
- `npm run lint:docs:strict` (path and Writerside consistency)
