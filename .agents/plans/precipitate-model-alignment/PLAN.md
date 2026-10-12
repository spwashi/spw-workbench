# Plan: precipitate-model-alignment

Align the precipitate model to the shipped runtime and formalize its runtime chemistry.

## Goal

The current runtime already has a concrete precipitate pipeline in `packages/spw-runtime/src/pipeline/stages.ts`, but the adjacent spec and theory surfaces still describe older or looser stage stories. This pass will make the precipitate model explicit, canonical, and falsifiable: what counts as a precipitate, what does not, and how precipitates relate to substrate events and resonances. The taste target is clarity + correctness: implementors should be able to read one contract and know the runtime chemistry without reconstructing it from scattered notes.

## Scope

- **In scope**: define the canonical precipitate vocabulary; align runtime/spec docs to the shipped `desugar -> parse -> normalize -> interpret` pipeline; sharpen the distinction between stage artifacts, substrate events, and resonances; add the smallest enforceable check that catches future vocabulary drift.
- **Out of scope**: semicolon grammar promotion, broad `RegisterBank` metaphysics redesign, VM/bytecode work, and opportunistic refactors unrelated to precipitate semantics.

## Files

[NEW] `.agents/plans/precipitate-model-alignment/PLAN.md`  
[NEW] `.agents/plans/precipitate-model-alignment/wip.spw`  
[NEW] `.agents/plans/precipitate-model-alignment/precipitate-model-alignment.spw`  
[MOD] `docs/specs/spw/spec-alignment.spw`  
[MOD] `docs/runtime/spw/runtime-foundation.spw`  
[MOD] `packages/spw-runtime/src/pipeline/stages.ts`  
[MOD?] `packages/spw-runtime/src/pipeline/types.ts`  
[MOD?] `docs/runtime/md/runtime-foundation.md`  
[MOD?] `scripts/analyzers/`

Craft guard:
- `packages/spw-runtime/src/pipeline/stages.ts` is already concept-dense; prefer terminology tightening and helper extraction over expanding one file further.
- Keep the chemistry vocabulary single-sourced; avoid a second parallel ontology in both docs and comments.
- Any enforcement should be narrow and local, not a new sprawling analyzer.

## Commits

1. `.[precipitate] — retarget the note's src/runtime paths to packages/spw-runtime and label spec-alignment's distill_extract stages as a proposal beside the shipped four` (the note itself already exists)
2. `vocab[runtime] — doc-comment Precipitate as strictly per-stage and PipelineProjection as a keyed view, once telemetry_locality and failure_continuity are answered`
3. `![runtime] — test that collectPrecipitates yields the four stages in STAGE_ORDER for valid source (no runtime test covers runSpwStepped today)`

Fuzz strategy:
- Explore: `npm run fuzz:explore`
- Stabilize: `npm run fuzz:stabilize`
- Ship: `npm run fuzz:ship`

## Agentic Hygiene

- Rebase target: `main@46d4a17`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

None. This plan assumes the runtime telemetry baseline already merged on `main`.

## Spw Artifact

`.agents/plans/precipitate-model-alignment/precipitate-model-alignment.spw` — distilled runtime chemistry note covering precipitates, substrate, telemetry, resonance, and falsifiers.
