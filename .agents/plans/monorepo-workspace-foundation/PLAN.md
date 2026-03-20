# Plan: monorepo-workspace-foundation

Establish the first visible `v0.3.0` workspace seams by turning the root into a workspace coordinator and adding package entrypoint scaffolds for the seed, runtime, CLI, and LSP surfaces without breaking the current `src/` and `scripts/` flows.

## Goal

The implementation plan for `v0.3.0` names monorepo structure as the release theme, but the repo still presents itself as one flat Node application with `src/` and `scripts/` acting as the only ownership boundaries. This pass introduces the workspace skeleton and package-level entrypoints so the repository can start speaking truthfully about package seams before the deeper extraction and relocation work lands. The end state is a root package that knows about `packages/*`, baseline package manifests for `@spw/seed`, `@spw/runtime`, `@spw/cli`, and `@spw/lsp`, and TypeScript path/build scaffolding that lets later extraction happen incrementally rather than as a single disruptive move.
Taste note: improve **layering**, **clarity**, and **containment** by making package ownership explicit without forcing a full physical move in one pass.

## Scope

- **In scope**: add workspace declarations at the root, add `packages/spw-seed/`, `packages/spw-runtime/`, `packages/spw-cli/`, and `packages/spw-lsp/` package manifests and entrypoint scaffolds, add shared TypeScript base/build config as needed, and update root exports/scripts only where the new package seams can be adopted without breaking current workflows.
- **Out of scope**: physically moving all `src/seed`, `src/runtime`, `scripts/lsp`, or CLI implementation files into packages; updating every internal import to `@spw/*`; extension build rewiring; agent-tool decoupling.

## Files

[NEW] .agents/plans/monorepo-workspace-foundation/PLAN.md  
[NEW] .agents/plans/monorepo-workspace-foundation/wip.spw  
[NEW] packages/spw-seed/package.json  
[NEW] packages/spw-seed/src/index.ts  
[NEW] packages/spw-seed/src/parser.ts  
[NEW] packages/spw-runtime/package.json  
[NEW] packages/spw-runtime/src/index.ts  
[NEW] packages/spw-runtime/src/pipeline.ts  
[NEW] packages/spw-runtime/src/substrate.ts  
[NEW] packages/spw-runtime/src/resonance.ts  
[NEW] packages/spw-cli/package.json  
[NEW] packages/spw-cli/src/index.ts  
[NEW] packages/spw-lsp/package.json  
[NEW] packages/spw-lsp/src/index.ts  
[NEW] tsconfig.base.json  
[MOD] package.json  
[MOD] tsconfig.json  

Craft guard:
- Keep the package scaffolds minimal and truthful; they should expose ownership boundaries, not duplicate the whole tree.
- Do not leave root/package export surfaces contradicting each other.
- Avoid introducing more than one compatibility indirection layer per package in this pass.

## Commits

1. `.[plans] — scaffold monorepo-workspace-foundation planning artifacts`
2. `#[workspace] — declare root workspaces and shared TypeScript base config`
3. `&[packages] — add seed/runtime/cli/lsp package manifests and entrypoint facades`
4. `.[release-track] — align root exports and scripts to the new package seams where safe`

Fuzz strategy:
- Explore: `npm run build`
- Stabilize: `npm run test:run`
- Ship: `npm run build && npm run test:run && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@a411cd6`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

none
