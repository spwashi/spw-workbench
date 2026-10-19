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

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

Fuzz strategy:
- Explore: `npm run fuzz:explore`
- Stabilize: `npm run fuzz:stabilize`
- Ship: `npm run fuzz:ship`

## Agentic Hygiene

- Rebase target: `main@46d4a17`
- Rebase cadence: before `align_note_and_spec`, before merge
- Hygiene split: none

## Dependencies

None. This plan assumes the runtime telemetry baseline already merged on `main`.

## Spw Artifact

`.agents/plans/precipitate-model-alignment/precipitate-model-alignment.spw` — distilled runtime chemistry note covering precipitates, substrate, telemetry, resonance, and falsifiers.

## IR insight and cognitive-surface direction — 2026-10-19

Use the proposed `.spw/tooling/cognitive-surfaces.spw` IR journey to make one question inspectable: where did a named source construct change meaning or cease to have a representation? `stages.ts` already supplies stage, input, output, timestamp and delta, with registersAfter for interpretation; it does not supply a proof of equivalence or a universal source map between stages. The parse product is ParseOutput, not a bare AST; normalization consumes the parsed root.

Before redesigning the surface, pair one valid-source stage trace with the existing `failure_continuity` question. Prefer displaying an absent/skipped/failed stage honestly over inventing an empty successful product. The parse-failure branch is established by source inspection but still needs a reproducible fixture or controlled test of that branch. Record that distinction. Keep substrate events, register snapshots and stage products in separate fields.

A first design trial compares today's stage dump with an artifact passport: source revision, stage, producer, input/output references, omissions and next inspection action. Unsupported fields read unknown. Ask a reader to locate where the result changed and cite the evidence. Correctness and effort are measured independently of aesthetic preference. Stop at the trial and its result before adding a new debugger UI.

Source inspection also finds that `runSpwStepped` records the normalized ONF as the interpret precipitate input, while `interpretSeed(parseOutput.ast)` normalizes again internally. Compare the recorded and executed normalization under the same options before calling this duplication either an optimization opportunity or a semantic defect. An IR view must disclose the distinction; object identity and structural equivalence are different claims.
