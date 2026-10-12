# Plan: symmetry-explorer-instrument

Create a visual 'Symmetry Explorer' instrument to visualize and validate D4/Z4 symmetry group actions in the workbench.

## Goal

Rescoped 2026-10-12 (user decision: do not archive). The five surfaces under `.spw/applications/symmetry/` (shipped by `spw mount`) use `.{sym:D4}` and `.{sym:Z4}` facets as prose, but no code in `packages/spw-seed`, `spw-cli` or `spw-runtime` defines the group. The live slice is a pure, tested D4/Z4 module; a visual instrument is a later consumer, not the first deliverable.

## Scope

- **In scope**: a pure D4/Z4 module (eight actions E, R90, R180, R270, MX, MY, MD1, MD2 acting on a 2x2 tile; composition table; inverses; Z4 as the rotation subgroup) under `packages/spw-seed/src/math/`, with vitest coverage; pointing the symmetry surfaces at it.
- **Out of scope**: DOM/CSS instrument (home undecided, see `?[home]`), bytecode integration, WebGL, multiplayer.

## Files

[NEW] `packages/spw-seed/src/math/symmetry.ts` and `symmetry.test.ts` (name provisional)
[MOD] `packages/spw-seed/src/math/index.ts`
[MOD] `.spw/applications/symmetry/symmetry-applications.spw`
[MOD] `.agents/plans/symmetry-explorer-instrument/wip.spw`

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

## Agentic Hygiene

- Rebase target: historical baseline not recorded in the original branch memory; rebase onto current `main` before d4_failing_tests.
- Rebase cadence: before d4_failing_tests, before merge
- Hygiene split: none recorded in the original branch memory; verify worktree drift before implementation.

## Dependencies

none

## Spw Artifact

None beyond `wip.spw`; the branch memory is the retained operational surface for this plan.
