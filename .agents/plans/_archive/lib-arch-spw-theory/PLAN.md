# Plan: lib-arch-spw-theory

Revise the v0.2.0-alpha library markdown architecture/layout and begin `.spw` architecture integration with an explicit theory bridge for cross-plane concept selection.

## Goal

The current library surface has strong core/runtime stubs, but no explicit architecture layout document and no `.spw` architecture companions in `lib/spw-v0.2.0-alpha`. This pass will add a normalized architecture map, integrate `.spw` supports, and formalize a plane-axis vocabulary for selecting/referencing concepts across liminality, tangibility, conception, familiarity, salience, objectivity-subjectivity, valence, and composition. The result should make theory legible and checkable at both markdown and `.spw` levels.
Taste note: improve **expressiveness**, **clarity**, and **correctness**.

## Scope

- **In scope**: add library architecture markdown docs, create `.spw` architecture supports, bridge to theory docs, add a lightweight checker for architecture/theory coverage.
- **Out of scope**: runtime behavior changes, parser grammar changes, full migration of all non-core/non-runtime redirect stubs.

## Files

[NEW] .agents/plans/lib-arch-spw-theory/PLAN.md  
[NEW] .agents/plans/lib-arch-spw-theory/wip.spw  
[NEW] .agents/plans/lib-arch-spw-theory/lib-arch-spw-theory.spw  
[NEW] lib/spw-v0.2.0-alpha/ARCHITECTURE.md  
[NEW] lib/spw-v0.2.0-alpha/LAYOUT.md  
[NEW] lib/spw-v0.2.0-alpha/architecture/index.spw  
[NEW] lib/spw-v0.2.0-alpha/architecture/layout.spw  
[NEW] lib/spw-v0.2.0-alpha/architecture/theory-bridge.spw  
[NEW] scripts/analyzers/v020-lib-architecture-check.ts  
[MOD] lib/spw-v0.2.0-alpha/README.md (add architecture/layout and `.spw` support links)  
[MOD] lib/spw-v0.2.0-alpha/DELTAS.md (record architecture/theory support milestone)  
[MOD] lib/spw-v0.2.0-alpha/CHANGELOG.md (note architecture layout + `.spw` integration)  
[MOD] docs/theory/index.spw (link to library architecture theory bridge)  
[MOD] package.json (add `lint:v020:architecture`)

Craft guard:
- New docs under 400 lines each.
- Analyzer owns one concern: verify architecture files + plane-axis/theory bridge presence.
- Runtime/core contract docs remain untouched in this pass.

## Commits

1. `.[plans] — scaffold lib-arch-spw-theory planning artifacts`
2. `.[lib-architecture] — add architecture/layout markdown and .spw support surfaces`
3. `#[lib-architecture] — add architecture theory-check lint and wire package script`

Fuzz strategy:
- Explore: `FUZZ=boonhonk npx eslint scripts/analyzers/v020-lib-architecture-check.ts`
- Stabilize: `npm run lint:v020:architecture`
- Ship: `npm run lint:v020 && npm run lint:v020:runtime && npm run lint:spw`

## Agentic Hygiene

- Rebase target: `main@5866dd3`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Create a distilled bridge at:
- `.agents/plans/lib-arch-spw-theory/lib-arch-spw-theory.spw`

This artifact captures the plane-axis model and falsifiability hooks for release reviewers.
