# Plan: monorepo-workspace-foundation

Establish the first visible `v0.3.0` workspace seams by turning the root into a workspace coordinator, adding package entrypoint scaffolds for the seed and runtime surfaces, making the CLI/LSP entrypoints package-owned, clearing the known runtime blockers, and then moving the LSP and runtime implementation modules behind the package boundary without breaking the current `src/` and `scripts/` flows.

## Goal

The implementation plan for `v0.3.0` names monorepo structure as the release theme, but the repo still presents itself as one flat Node application with `src/` and `scripts/` acting as the only ownership boundaries. This pass introduces the workspace skeleton and package-level entrypoints so the repository can start speaking truthfully about package seams before the deeper extraction and relocation work lands. The end state is a root package that knows about `packages/*`, baseline package manifests for `@spw/seed`, `@spw/runtime`, `@spw/cli`, and `@spw/lsp`, package-owned CLI/LSP launch paths, package-owned runtime interpreter/pipeline/state modules, a clean runtime build/test baseline for the moved seams, and TypeScript path/build scaffolding that lets later extraction happen incrementally rather than as a single disruptive move.
Taste note: improve **layering**, **clarity**, and **containment** by making package ownership explicit without forcing a full physical move in one pass.

## Scope

- **In scope**: add workspace declarations at the root, add `packages/spw-seed/`, `packages/spw-runtime/`, `packages/spw-cli/`, and `packages/spw-lsp/` package manifests, move CLI and LSP launch ownership into package source files, clear the known runtime build/test blockers that prevent truthful verification, add shared TypeScript base/build config as needed, and update root exports/scripts and editor defaults where the new package seams can be adopted without breaking current workflows.
- **Out of scope**: physically moving all `src/seed` or all `src/runtime` into packages; extension build rewiring; agent-tool decoupling.

## Files

[NEW] .agents/plans/monorepo-workspace-foundation/PLAN.md  
[NEW] .agents/plans/monorepo-workspace-foundation/wip.spw  
[NEW] packages/spw-seed/package.json  
[NEW] packages/spw-seed/src/index.ts  
[NEW] packages/spw-seed/src/parser.ts  
[NEW] packages/spw-runtime/package.json  
[NEW] packages/spw-runtime/src/index.ts  
[NEW] packages/spw-runtime/src/interpreter/interpreter.ts  
[NEW] packages/spw-runtime/src/interpreter/types.ts  
[NEW] packages/spw-runtime/src/pipeline.ts  
[NEW] packages/spw-runtime/src/pipeline/resonance.ts  
[NEW] packages/spw-runtime/src/pipeline/run-spw.ts  
[NEW] packages/spw-runtime/src/pipeline/stages.ts  
[NEW] packages/spw-runtime/src/pipeline/substrate.ts  
[NEW] packages/spw-runtime/src/pipeline/types.ts  
[NEW] packages/spw-runtime/src/substrate.ts  
[NEW] packages/spw-runtime/src/resonance.ts  
[NEW] packages/spw-runtime/src/state/register-bank.ts  
[NEW] packages/spw-runtime/src/state/type-affinities.ts  
[NEW] packages/spw-runtime/src/state/types.ts  
[NEW] packages/spw-cli/package.json  
[NEW] packages/spw-cli/src/args.ts  
[NEW] packages/spw-cli/src/index.ts  
[NEW] packages/spw-cli/src/main.ts  
[NEW] packages/spw-cli/src/query.ts  
[NEW] packages/spw-cli/src/run.ts  
[NEW] packages/spw-cli/src/types.ts  
[NEW] packages/spw-lsp/package.json  
[NEW] packages/spw-lsp/src/context.ts  
[NEW] packages/spw-lsp/src/helpers.ts  
[NEW] packages/spw-lsp/src/server-index.ts  
[NEW] packages/spw-lsp/src/spw-selector.ts  
[NEW] packages/spw-lsp/src/index.ts  
[NEW] packages/spw-lsp/src/stdio-server.ts  
[NEW] packages/spw-lsp/src/types.ts  
[NEW] packages/spw-lsp/src/upstream-bridge.ts  
[NEW] packages/spw-lsp/src/handlers/analysis.ts  
[NEW] packages/spw-lsp/src/handlers/display.ts  
[NEW] packages/spw-lsp/src/handlers/editing.ts  
[NEW] packages/spw-lsp/src/handlers/navigation.ts  
[NEW] tsconfig.base.json  
[MOD] extensions/intellij-spw/README.md  
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspConfigurable.kt  
[MOD] extensions/neovim-spw/README.md  
[MOD] extensions/neovim-spw/lua/spw-lsp.lua  
[MOD] extensions/vscode-spw/src/extension.ts  
[MOD] package.json  
[MOD] src/seed/index.ts  
[MOD] src/seed/types/ids.ts  
[MOD] src/seed/types/index.ts  
[MOD] src/runtime/index.ts  
[MOD] src/runtime/interpreter/interpreter.ts  
[MOD] src/runtime/interpreter/types.ts  
[MOD] src/runtime/pipeline/run-spw.ts  
[MOD] src/runtime/pipeline/stages.ts  
[MOD] src/runtime/pipeline/resonance.ts  
[MOD] src/runtime/pipeline/substrate.ts  
[MOD] src/runtime/pipeline/types.ts  
[MOD] src/runtime/state/register-bank.ts  
[MOD] src/runtime/state/type-affinities.ts  
[MOD] src/runtime/state/types.ts  
[MOD] src/runtime/__tests__/substrate.test.ts  
[MOD] scripts/lsp/context.ts  
[MOD] scripts/lsp/helpers.ts  
[MOD] scripts/lsp/server-index.ts  
[MOD] scripts/lsp/smoke-navigation.ts  
[MOD] scripts/lsp/spw-selector.ts  
[MOD] scripts/lsp/stdio-upstream-bridge.ts  
[MOD] scripts/lsp/types.ts  
[MOD] scripts/lsp/handlers/analysis.ts  
[MOD] scripts/lsp/handlers/display.ts  
[MOD] scripts/lsp/handlers/editing.ts  
[MOD] scripts/lsp/handlers/navigation.ts  
[MOD] scripts/spw-cli/args.ts  
[MOD] scripts/spw-cli/query.ts  
[MOD] scripts/spw-cli/run.ts  
[MOD] scripts/spw-cli/types.ts  
[MOD] tsconfig.json  
[MOD] vitest.runtime.config.ts  
[MOD] vitest.dom.config.ts  

Craft guard:
- Keep the package scaffolds minimal and truthful; they should expose ownership boundaries, not duplicate the whole tree.
- Do not leave root/package/editor launch surfaces contradicting each other.
- Avoid introducing more than one compatibility indirection layer per package in this pass.
- Keep `scripts/` launchers as compatibility wrappers only; new logic should land under `packages/`.
- Keep `src/runtime/*` as a compatibility skin once the package runtime owns the implementation; do not leave a split-brain interpreter or pipeline.

## Commits

1. `.[plans] — scaffold monorepo-workspace-foundation planning artifacts`
2. `#[workspace] — declare root workspaces and shared TypeScript base config`
3. `&[packages] — add seed/runtime/cli/lsp package manifests and entrypoint facades`
4. `&[workspace-imports] — route scripts through package facades`
5. `.[plans] — extend monorepo workspace scope to package-owned cli/lsp entrypoints`
6. `&[cli-lsp] — extract package-owned cli and lsp entrypoints with compatibility wrappers`
7. `&[runtime-blockers] — restore branded register flows and substrate binding`
8. `&[lsp-modules] — move lsp implementation modules behind the package boundary`
9. `&[runtime-modules] — move runtime implementation modules behind the package boundary`

Fuzz strategy:
- Explore: `node --import tsx packages/spw-cli/src/main.ts help` and `node --import tsx -e "import { resolveSpwLspServerTarget } from '@spw/lsp'; console.log(resolveSpwLspServerTarget(process.cwd()))"`
- Stabilize: `npm run build && npm run test:runtime -- src/runtime/__tests__/substrate.test.ts`
- Ship: `npm run build && npm run test:run && npm run lint:docs`

## Agentic Hygiene

- Rebase target: `main@a411cd6`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

none
