# Plan: runtime-v020-release

Ship a concrete runtime foundation for v0.2.0-alpha by creating missing runtime source stubs, aligning `.spw` runtime docs to real files, and replacing runtime redirect specs with actionable contracts.

## Goal

The repo currently has runtime design artifacts but no `src/runtime` implementation surface, which blocks release-readiness and makes many `.spw` references stale. This pass creates a minimal but compilable runtime foundation (state, register bank, interpreter, parse-to-runtime pipeline), then updates runtime docs/spec stubs so source and narrative surfaces match. The end state is a coherent runtime baseline that can be extended incrementally under schedule pressure without rework.
Taste note: improve **correctness**, **naming**, and **layering** by giving runtime a clear ownership boundary and normalized file conventions.

## Scope

- **In scope**: create `src/runtime` core stubs, add runtime tests/config, flesh out `lib/spw-v0.2.0-alpha/runtime/*.md`, update runtime `.spw` docs to point at implemented files, add runtime readiness lint checks.
- **Out of scope**: full VM/bytecode execution, UI/platform runtime features in `src/features` or `src/design`, resolving all historical broken doc paths outside runtime scope.

## Files

[NEW] .agents/plans/runtime-v020-release/PLAN.md  
[NEW] .agents/plans/runtime-v020-release/wip.spw  
[NEW] src/runtime/README.md  
[NEW] src/runtime/index.ts  
[NEW] src/runtime/state/types.ts  
[NEW] src/runtime/state/type-affinities.ts  
[NEW] src/runtime/state/register-bank.ts  
[NEW] src/runtime/interpreter/types.ts  
[NEW] src/runtime/interpreter/interpreter.ts  
[NEW] src/runtime/pipeline/types.ts  
[NEW] src/runtime/pipeline/run-spw.ts  
[NEW] src/runtime/__tests__/register-bank.test.ts  
[NEW] src/runtime/__tests__/run-spw.test.ts  
[NEW] vitest.runtime.config.ts  
[NEW] scripts/analyzers/v020-runtime-stub-check.ts  
[NEW] scripts/analyzers/runtime-filename-check.ts  
[MOD] package.json (runtime test + lint scripts)  
[MOD] docs/runtime/index.spw (add runtime foundation pointers)  
[MOD] docs/runtime/spw/register-bank.spw (source links to implemented runtime files)  
[MOD] docs/runtime/spw/brace-registers.spw (source links to implemented runtime files)  
[NEW] docs/runtime/spw/runtime-foundation.spw  
[NEW] docs/runtime/md/runtime-foundation.md  
[MOD] lib/spw-v0.2.0-alpha/runtime/CACHE-IR.md  
[MOD] lib/spw-v0.2.0-alpha/runtime/GOALS.md  
[MOD] lib/spw-v0.2.0-alpha/runtime/PIPELINE.md  
[MOD] lib/spw-v0.2.0-alpha/runtime/REGISTERS.md  
[MOD] lib/spw-v0.2.0-alpha/runtime/TRAJECTORY.md  
[MOD] lib/spw-v0.2.0-alpha/README.md  
[MOD] lib/spw-v0.2.0-alpha/DELTAS.md

Craft guard:
- Keep every new runtime source file under 300 lines.
- Keep imports per file under 10.
- Enforce kebab-case filenames in `src/runtime/**` via analyzer to normalize naming going forward.

## Commits

1. `.[plans] — scaffold runtime-v020-release planning artifacts`
2. `&[runtime-foundation] — add runtime state/interpreter/pipeline stubs with tests`
3. `.[runtime-docs] — integrate runtime .spw docs and author v0.2 runtime contract stubs`
4. `#[runtime-release] — add runtime lint checks for spec stubs and filename normalization`

Fuzz strategy:
- Explore: `FUZZ=boonhonk npx eslint src/runtime/**/*.ts`
- Stabilize: `npm run test:runtime`
- Ship: `npm run lint:v020:runtime && npm run lint:spw`

## Agentic Hygiene

- Rebase target: `main@bc0396c`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Add a distilled runtime bridge artifact at:
- `.agents/plans/runtime-v020-release/runtime-v020-release.spw`

It will summarize parse-to-runtime flow and register-bank invariants for release reviewers.
