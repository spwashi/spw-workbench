# Plan: construction-onf

## Goal
Retain expression heads and source-ordered postfix attachments in structural ONF with AST span provenance. Taste: structural fidelity and explicit loss at the existing value evaluator boundary.

## Scope
One align episode. Preserve frame/body/scope/capsule and bare identifier shape. Add a disclosed value projection to preserve existing evaluation; no handler rewrite. No grammar, field, query, focus, microcosm, website, or pin changes.

## Files
[MOD] packages/spw-seed/src/normalize.ts — preserve expression attachments
[MOD] packages/spw-seed/src/types/ast/onf.ts — construction metadata and provenance
[NEW] packages/spw-seed/src/normalize-construction.ts — construction builder and value projection
[NEW] packages/spw-seed/src/normalize-construction.test.ts — structure/order/provenance/negative controls
[MOD] packages/spw-seed/src/index.ts — public projection export
[MOD] packages/spw-runtime/src/interpreter/interpreter.ts and types.ts — projection boundary and loss receipt
[NEW] packages/spw-runtime/src/interpreter/construction.test.ts — value/effect compatibility
[MOD] docs/research/spw/construction-worlds.spw — structural status only
[NEW] .agents/plans/construction-onf/PLAN.md and wip.spw — bounded plan and evidence

### Craft guard
normalize.ts remains below 600 lines; construction logic stays in a focused helper. index.ts is already above the guard and receives exports only. Runtime changes are confined to its entry boundary, not evaluator dispatch.

## Commits
1. &[seed,runtime] — preserve normalized construction attachments
Plan recorded before code and included in the single requested episode.

## Agentic Hygiene
Base main@9bcf96f5. Initial status clean. New codex/construction-onf isolated worktree, no existing-branch rebase needed. Preserve concurrent main and other worktrees. No stash, push, merge, or website changes.

## Dependencies
none; follows noun-postfix-containers, whose ONF redesign was explicitly out of scope.

## Validation
Explore: inspect AST span ownership and ONF consumers. Stabilize: distinct structures, reversed attachment order, nested constructions, source provenance, newline/operator/medial controls, and runtime value/write parity. Ship: full seed and runtime suites, typecheck, scoped lint/review. No retargeting expected; disclose any necessary test changes with a receipt.

## Failure Modes
Eager traversal could execute annotation-like attachments; the explicit value projection omits them and reports their provenance. AST spans are source-local, not file/revision identity: callers retain their source receipt. Existing source metadata cannot manufacture missing delimiter tokens or lexical trivia.

## Evidence
- `npm run test:seed` — 71 files, 756 tests pass, including existing field and noun tests.
- `npm run test:runtime` — 19 files, 190 tests pass, including value, trace and register-write compatibility controls.
- `npm run build` — typecheck passes. Scoped ESLint on changed implementation and test files passes.
- New tests cover attachment order, copied source spans, nested path references, all five requested specimens, newline juxtaposition, operator-owned attachments and medial capsules. No existing tests retargeted or snapshots changed.
- Consumer audit: the interpreter eagerly visits ONF arguments, so it now explicitly projects for value evaluation and exposes loss receipts while returning structural ONF. LSP form context selects boundary/operation AST nodes; canonical form-ladder tests remain green.
- Completion applies to structural construction preservation and disclosed value projection. Microcosms, membranes, navigable focus and attachment evaluation laws remain open research.
