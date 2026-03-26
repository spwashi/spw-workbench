# Plan: liminal-probe-seq

Add a liminal selection surface for Spw pattern matching and sequence/operator probing.

## Goal

Introduce a cleaner query/probe tool surface that treats operator/bracket sequences as first-class, probeable patterns, including compact probe expressions like `?(subject).[`.
The quality target is expressiveness + clarity: less CLI redundancy, clearer semantics for what is selected vs. what is probed, and better mapping from metaphor (register charge/disposition) to measurable output.
This also preserves continuity by keeping `spw:seq` as an alias while introducing a more meaningful name.

Taste note: improve expressiveness and naming clarity while preserving correctness.

## Scope

- In scope: split/rename script surface, add `--probe` expression parsing, support operator-only and sequence probe modes, model sequence charge/disposition scores, update docs and `.spw` examples, keep compatibility alias.
- Out of scope: deep parser changes in `src/seed`, new runtime evaluator, extension hover/tree-view redesign.

## Files

[NEW] scripts/spw-ls.ts — liminal selection CLI entry and probe semantics.
[MOD] scripts/spw-ls.ts — unified CLI with --entry-name and --compat flags (absorbs spw-seq.ts).
[MOD] package.json — add `spw:ls` and route `spw:seq` alias.
[MOD] .spw/biome/ocean/query/dialect.spw — update query recipe commands.
[MOD] .spw/harness/evals/baseline-evals.spw — include liminal probe eval target.
[MOD] docs/plans/spw/query-projection-workbench.spw — document probe expression examples.

### Craft guard

No file should exceed 600 lines or 12 imports. The new CLI will keep one responsibility: scan + rank by pattern/probe semantics.

## Commits

1. `&[scripts] — introduce spw:ls liminal selection CLI with probe expression semantics`
2. `&[scripts] — keep spw:seq compatibility alias and adjust npm commands`
3. `.[spw] — update dialect/eval/docs examples for liminal probe usage`

## Agentic Hygiene

- Rebase target: `main@2b2de77`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

None beyond updating existing `.spw` query/eval planning surfaces.
