# Plan: register-phase-evolution

Refine the phased register model from the shipped runtime baseline into a queryable, documented surface that matches the current canonical vocabulary.

## Goal

The desired end state is a register model whose phase vocabulary is shared by runtime, query tooling, tests, CLI help, and docs: `lex`, `parse`, `semantic`, `optimize`, `pragmatic`. The additive enrichment mechanics and P0 runtime stabilization already landed, so this plan narrows to selector/query alignment and documentation rather than reopening build-fix work. Keep enrichment incremental, queryable, and cheap at early stages without another schema reset. Stable phase vocabulary is also what lets public literature, editor UX, CLI naming, and ecosystem governance speak about Spw without semantic drift.

This is the language-design rung in the current ecology. Its real value is not just that the runtime gets cleaner names; it is that selector grammar, phase naming, and query examples become a study surface for Spw web linguistics. The branch should leave behind reviewable syntax, small reusable selector snippets, and a tighter bridge between how the language is implemented, taught, and discussed.

**Taste note**: clarity, naming, layering.

## Scope

- **In scope**: selector expression grammar (`Spw.q`), `spwq` and package-owned CLI integration, canonical phase-name alignment across runtime/query/docs, targeted tests, narrow runtime touch-ups needed to support the shipped baseline, enough documentation alignment that surface/release/install plans can reuse the same vocabulary, review of selector/code-pattern precedents in `.spw/workspace.spw` and `.spw/patterns/query-composition.spw`, and extraction of a small reusable selector-snippet corpus for docs/help/tests.
- **Out of scope**: revisiting the P0 phase/liminality repair, renaming `RegisterBank`, the broader chemistry/metaphysics redesign, full optimizer semantics, and UI autocomplete / brace-capture workflows.

## Decisions Locked

- Canonical phase vocabulary is `lex`, `parse`, `semantic`, `optimize`, `pragmatic`.
- Phase enrichment remains additive and in-place on existing cells.
- Selector surface is **Spw-native grammar first**, not preset-alias-only.
- Helper extraction is out of scope for this pass; do not smuggle structural cleanup into vocabulary work.

## Files

```text
[MOD?] packages/spw-runtime/src/state/types.ts
[MOD?] packages/spw-runtime/src/state/register-bank.ts
[MOD] src/runtime/__tests__/register-bank.test.ts
[MOD] packages/spw-seed/src/query/types.ts
[MOD] packages/spw-seed/src/query/match.ts
[MOD] packages/spw-seed/src/query/presets.ts
[MOD] packages/spw-seed/src/query/selector-expr.ts
[MOD] src/seed/query/__tests__/match.test.ts
[MOD] src/seed/query/__tests__/selector-expr.test.ts
[MOD] packages/spw-cli/src/query.ts
[MOD?] scripts/spwq.ts
[MOD] docs/runtime/spw/register-bank.spw
[MOD] docs/runtime/spw/brace-registers.spw
[MOD] lib/spw-v0.2.0-alpha/runtime/REGISTERS.md
[MOD] lib/spw-v0.2.0-alpha/applications/QUERY.md
[MOD] .agents/plans/register-phase-evolution/wip.spw
[MOD] .agents/plans/register-phase-evolution/PLAN.md
[DEL] (none)
```

### Craft guard

- `packages/spw-runtime/src/state/register-bank.ts` stays a narrow touch-up surface only; if helper extraction becomes necessary, do it as a deliberate follow-on instead of silently mixing refactor work into vocabulary alignment.
- `packages/spw-cli/src/query.ts` and `scripts/spwq.ts` remain thin adapters; selector parsing and evaluation belong in `packages/spw-seed/src/query/`.
- Maintain inward layering: runtime depends on seed types/interfaces, not app/UI modules.

## Commits

1. `.[plans] — refresh plan artifacts after P0 runtime stabilization`
2. `^seed[query] — add Spw-native selector expression grammar for operational/positional selectors`
3. `vocab[query] — align selector/runtime phase terminology on canonical names`
4. `&[spwq] — wire selector expressions and canonical phase predicates into CLI flows`
5. `![query] — validate selector semantics against shipped runtime phase invariants`
6. `.[docs] — align register/query docs and mark chemistry redesign as a follow-on`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none recorded beyond the normal caution against opportunistic helper extraction; keep structural drift out of this branch.

## Dependencies

- `plan-ecology-clustering` — this plan is the `language` rung in the current design ladder and should convert linguistic study into reusable query/doc/editor vocabulary.

## Principal Engineering Orientation

- Ladder position: `language`
- Judgment target: make selector grammar and phase naming reviewable enough that the team can discuss Spw query language with the same rigor it would apply to HTML, CSS, or SQL surface design.
- Commit bar: each commit should make one user-facing phrase clearer, one selector example truer, and one downstream teaching surface easier to reuse.

## Review Surfaces

- Code: `packages/spw-seed/src/query/selector-expr.ts`, `packages/spw-seed/src/query/spwq.ts`, `packages/spw-seed/src/query/presets.ts`, `packages/spw-seed/src/query/match.ts`
- Pattern/literature: `.spw/patterns/query-composition.spw`, `.spw/workspace.spw`, `docs/runtime/spw/register-bank.spw`, `docs/runtime/spw/brace-registers.spw`
- Tooling consumers: `packages/spw-cli/src/query.ts`, downstream VS Code plans that need stable phase/query language

## Capability Transfer

- Runtime capability: selector traversal, phase predicates, provenance reading, and cheap early-stage register inspection
- Interaction capability: CLI help text, LSP explanation, and editor UI can all reuse the same selector and phase vocabulary instead of inventing adjacent dialects
- Literature capability: query examples should become a small, durable corpus that can appear in docs, tests, tutorials, and release notes without translation

## Syntax and Snippet Discipline

- Stable syntax: canonical phase predicates and selector forms should appear together in tests, docs, and CLI help so drift is visible immediately
- Experimental syntax: any new selector affordance needs an explicit rollback path and should not silently replace the stable surface
- Snippet corpus: maintain a compact set of selector examples that can be lifted into tests, docs, hover text, and `spwq` examples with minimal editing

### Downstream consumers

- **absorb-spwq-cli**: consumes canonical selector and phase vocabulary so the public CLI surface does not invent its own terms.
- **vscode-register-explorer**: consumes canonical pipeline-phase vocabulary (`lex`, `parse`, `semantic`, `optimize`, `pragmatic`) for tree grouping and detail view. Without this plan, the explorer falls back to spirit-sequence phase from `SIGIL_SEMANTICS`.
- **vscode-authoring-probe-loop**: consumes the phase vocabulary to bridge between spirit-sequence operators and register pipeline phases in hover and completion. Without this plan, the authoring loop maps only spirit-sequence operators.
- **vscode-interaction-contract**: references this plan in `^["phase_vocabularies"]` and `^["cross_theme_enrichments"]`. The two phase axes (spirit-sequence and pipeline) are declared orthogonal there.
- **ecosystem-surface-governance**: uses canonical phase vocabulary when describing how ideas mature into launchable surfaces, so public-facing language does not diverge from runtime/query language.

### Adjacent scope opportunity

The VS Code authoring loop's phase-aware completion needs a **cursor-offset-to-phase-context query** from the seed parser: given an offset in a parsed document, return the nearest enclosing spirit operator, its phase index, and the materialization stage. This could be scoped as a targeted addition to `src/seed/query/` alongside the selector-expression grammar work in this plan, or as a standalone micro-plan. See `vscode-interaction-contract.spw ^["cross_theme_enrichments"].seed_phase_context`.

## Spw Artifact

A distilled artifact remains warranted to preserve the selector/phase semantics decisions:

`.agents/plans/register-phase-evolution/register-phase-evolution.spw`

## Fuzz Strategy

- Explore: `npm run test:runtime -- src/seed/query/__tests__/selector-expr.test.ts`
- Stabilize: `npm run test:runtime`
- Ship gate: `npm run build && npm run test:run && npm run lint:spw`
