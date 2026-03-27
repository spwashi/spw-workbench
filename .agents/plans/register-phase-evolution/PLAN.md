# Plan: register-phase-evolution

Refine the phased register model from the shipped runtime baseline into a queryable, documented surface that matches the current canonical vocabulary.

## Goal

The desired end state is a register model whose phase vocabulary is shared by runtime, query tooling, tests, and docs: `lex`, `parse`, `semantic`, `optimize`, `pragmatic`. The additive enrichment mechanics and P0 runtime stabilization already landed on `main@181071e`, so this plan now narrows to selector/query alignment and documentation rather than reopening the build-fix work. Keep enrichment incremental, queryable, and cheap at early stages without another schema reset. Stable phase vocabulary is also what lets public literature, editor UX, and ecosystem governance speak about Spw without semantic drift.

**Taste note**: clarity, naming, layering.

## Scope

- **In scope**: selector expression grammar (`Spw.q`), `spwq` integration, canonical phase-name alignment across runtime/query/docs, targeted tests, narrow runtime touch-ups needed to support the shipped baseline, and enough documentation alignment that surface/release plans can reuse the same vocabulary.
- **Out of scope**: revisiting the P0 phase/liminality repair, renaming `RegisterBank`, the broader chemistry/metaphysics redesign, full optimizer semantics, and UI autocomplete / brace-capture workflows.

## Decisions Locked

- Canonical phase vocabulary is `lex`, `parse`, `semantic`, `optimize`, `pragmatic`.
- Phase enrichment remains additive and in-place on existing cells.
- Selector surface is **Spw-native grammar first**, not preset-alias-only.
- `src/runtime/state/register-helpers.ts` is unrelated untracked extraction drift and stays out of scope unless adopted in a dedicated change.

## Files

```text
[MOD?] src/runtime/state/types.ts
[MOD?] src/runtime/state/register-bank.ts
[MOD] src/runtime/__tests__/register-bank.test.ts
[MOD] src/seed/query/types.ts
[MOD] src/seed/query/match.ts
[MOD] src/seed/query/presets.ts
[NEW] src/seed/query/selector-expr.ts
[MOD] src/seed/query/__tests__/match.test.ts
[NEW] src/seed/query/__tests__/selector-expr.test.ts
[MOD] scripts/spwq.ts
[MOD] docs/runtime/spw/register-bank.spw
[MOD] docs/runtime/spw/brace-registers.spw
[MOD] lib/spw-v0.2.0-alpha/runtime/REGISTERS.md
[MOD] lib/spw-v0.2.0-alpha/applications/QUERY.md
[MOD] .agents/plans/register-phase-evolution/wip.spw
[MOD] .agents/plans/register-phase-evolution/PLAN.md
[DEL] (none)
```

### Craft guard

- `src/runtime/state/register-bank.ts` stays a narrow touch-up surface only; if helper extraction becomes necessary, do it as a deliberate follow-on instead of silently adopting the untracked draft helper file.
- `scripts/spwq.ts` remains a thin CLI adapter; selector parsing and evaluation belong in `src/seed/query/`.
- Maintain inward layering: `src/runtime` depends on `src/seed` types/interfaces, not app/UI modules.

## Commits

1. `.[plans] — refresh plan artifacts after P0 runtime stabilization`
2. `^seed[query] — add Spw-native selector expression grammar for operational/positional selectors`
3. `vocab[query] — align selector/runtime phase terminology on canonical names`
4. `&[spwq] — wire selector expressions and canonical phase predicates into CLI flows`
5. `![query] — validate selector semantics against shipped runtime phase invariants`
6. `.[docs] — align register/query docs and mark chemistry redesign as a follow-on`

## Agentic Hygiene

- Rebase target: `main@181071ef85bc2e505dfc99925fe55ebc5adcf3c9`
- Rebase cadence: before commit 1, before merge
- Hygiene split: keep unrelated untracked drift in `src/runtime/state/register-helpers.ts` out of this branch; do not adopt or delete it implicitly from this plan.

## Dependencies

none

### Downstream consumers

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
