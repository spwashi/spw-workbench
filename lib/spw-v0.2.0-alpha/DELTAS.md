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

Architecture support status (2026-02-26):
- Added `ARCHITECTURE.md` + `LAYOUT.md` as normalized library architecture surfaces.
- Added `architecture/*.spw` supports for layout navigation and theory bridging.
- Introduced UAL framing for brace-first semantics and opposite-spin/operator-reality research prompts.
- Introduced plane-axis concept selection model:
  - liminality
  - tangibility
  - conception
  - familiarity
  - salience
  - objectivity-subjectivity
  - valence
  - composition

Dialect status (2026-02-27):
- `dialects/*.md` redirect stubs replaced with v0.2.0 contract stubs.
- Dialect docs now follow the shared scaffold (Status/Contract/Invariants/Hooks/Questions).
- Added `dialects/index.spw` as navigable architecture support surface.
- `Spw.q` (query) now has implementation backing in `src/seed/query/`.
- Phase composition model documented with shorthands and defaults.
- Geometry dialects document `Spw.l ↔ Spw.b` conversion rules and `canonicalize()` hook.

Domains/Applications/Infra status (2026-02-27):
- `domains/*.md` redirect stubs replaced with v0.2.0 contract stubs (TASTE, PROFILES, POSTURE).
- `applications/*.md` redirect stubs replaced with v0.2.0 contract stubs (HARDWARE, THEATRE, BROADCAST, QUERY).
- `infra/CONFORMANCE.md` upgraded with 6 conformance levels mapped to implementation locations.
- QUERY.md now links to the shipped `spwq` toolchain.

All strata are now authored v0.2.0 contract stubs. No redirect stubs remain.

## Proposed v0.2.0 focus areas

- Operator fusion / composition semantics (formalize what was previously "planned").
- Stronger conformance rules (placeholders, currying, boundary semantics).
- Runtime registers and reflection story (what becomes reified in v0.2.0).
- Profiles as first-class experimentation surfaces (taste, posture, fuzz).
- Brace-first semantics as cross-language augmentation primitives (UAL).

## Redirect policy

A redirect stub MUST:
- Declare itself as a redirect stub.
- Point to the v0.1.0-alpha canonical source path.
- Point to this DELTAS.md for planned/known differences.

## Release-prep checks

For v0.2.0-alpha prep, run:
- `npm run lint:v020` (core contract-stub integrity)
- `npm run lint:v020:runtime` (runtime contract-stub + filename integrity)
- `npm run lint:v020:architecture` (lib architecture surface + theory bridge integrity)
- `npm run lint:spw` (parse validation for `.spw`)
- `npm run lint:docs:strict` (path and Writerside consistency)
