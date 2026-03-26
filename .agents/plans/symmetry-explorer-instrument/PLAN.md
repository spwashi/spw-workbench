# Plan: symmetry-explorer-instrument

Create a visual 'Symmetry Explorer' instrument to visualize and validate D4/Z4 symmetry group actions in the workbench.

## Goal

The user is exploring symmetry applications in `.spw` files (e.g., `symmetry-applications.spw`). To move beyond static text and "wonder blocks," this plan proposes a visual **instrument** using the `spw-css-dom-lab` skill. The instrument will allow real-time visualization of D4 transformations (rotations, reflections) applied to a 2x2 grid, bridging the gap between mathematical theory and visual experience.

## Scope

- **In scope**: Create `src/ui/viz/symmetry-explorer.ts` (DOM/instrument logic); add `src/styles/viz/symmetry-explorer.css` (CSS transformations and animators); register the component as `[data-spw-component="symmetry-explorer"]`; integrate a basic D4 controller (buttons for R90, MX, MY).
- **Out of scope**: Full integration with the Spw runtime bytecode, complex WebGL shaders, or multiplayer synchronization. This is a local "exhibit" for conceptual validation.

## Files

[NEW] `src/ui/viz/symmetry-explorer.ts`
[NEW] `src/styles/viz/symmetry-explorer.css`
[MOD] `src/ui/index.ts` (exporting the new instrument)
[MOD] `src/styles/index.css` (importing the new styles)
[NEW] `.agents/plans/symmetry-explorer-instrument/PLAN.md`
[NEW] `.agents/plans/symmetry-explorer-instrument/wip.spw`

## Commits

1. `viz[ui] — implement Symmetry Explorer DOM instrument and D4 state`
2. `styles[ui] — add CSS transformation layer for D4 symmetry group`
3. `exhibit[docs] — embed symmetry-explorer instrument in documentation context`

## Agentic Hygiene

- Rebase target: historical baseline not recorded in the original branch memory; rebase onto current `main` before commit 1.
- Rebase cadence: before commit 1, before merge
- Hygiene split: none recorded in the original branch memory; verify worktree drift before implementation.

## Dependencies

none

## Spw Artifact

None beyond `wip.spw`; the branch memory is the retained operational surface for this plan.
