# Plan: register-phase-evolution

Evolve registers from a minimal value+address cell into a phased enrichment model, while introducing operational and positional register surfaces for query/runtime coherence.

## Goal

The desired end state is a register model that starts simple (`address + value`) and can be incrementally enriched as processing advances (lexing, parsing, semantics, optimization, pragmatics) without schema rewrites. This keeps early pipeline stages cheap and deterministic while enabling richer analysis later. In parallel, we split register concerns into operational intent and positional context so selection/update flows become explicit instead of overloaded.

**Taste note**: clarity, layering, expressiveness.

## Scope

- **In scope**: register core type evolution, phase-facet enrichment API, in-place facet upgrades with lineage hooks, Spw-native selector expression grammar (`Spw.q`) for operational/positional queries, docs alignment with implemented behavior, targeted runtime/query tests.
- **Out of scope**: full UI autocomplete brace-capture workflow, semantic optimizer implementation, full rewrite engine (`spwq` mutation mode), broad ONF redesign.

## Decisions Locked

- `parse` and `sem` remain coarse phase buckets in this increment.
- selector surface is **Spw-native grammar first**, not preset-alias-only.
- phase enrichment uses **in-place cell upgrades** (lineage optional, not mandatory per transition).

## Files

```text
[MOD] src/runtime/state/types.ts
[MOD] src/runtime/state/register-bank.ts
[MOD] src/runtime/state/type-affinities.ts
[MOD] src/runtime/interpreter/interpreter.ts
[MOD] src/runtime/pipeline/run-spw.ts
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
[NEW] .agents/plans/register-phase-evolution/wip.spw
[NEW] .agents/plans/register-phase-evolution/PLAN.md
[DEL] (none)
```

### Craft guard

- `src/runtime/state/register-bank.ts` is the main growth risk; keep below 600 LOC by extracting helpers if needed.
- `scripts/spwq.ts` should remain a thin CLI adapter; selector parsing/evaluation belongs in `src/seed/query/`.
- Maintain inward layering: `src/runtime` depends on `src/seed` types/interfaces, not app/UI modules.

## Commits

1. `.[plans] — add/refresh plan artifacts with locked decisions`
2. `vocab[runtime] — introduce register address/phase/facet types with backward-compatible defaults`
3. `&[runtime] — evolve RegisterBank for in-place phase annotations and optional lineage`
4. `![runtime] — extend runtime tests for phased enrichment invariants`
5. `^seed[query] — add Spw-native selector expression grammar for operational/positional selectors`
6. `&[spwq] — wire --selectorExpr in CLI and preserve preset compatibility`
7. `![query] — validate selector semantics (including seq behavior and new expression parsing)`
8. `.[docs] — align runtime/query docs to implemented register model and explicitly mark deferred brace-cursor flow`

## Agentic Hygiene

- Rebase target: `main@0c38b72659c72f1bea276176693ace20adb2e1dd`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none for branch divergence (`main...HEAD` clean). Local working tree contains unrelated edits; this plan isolates changes to the files listed above.

## Dependencies

none

## Spw Artifact

A distilled artifact is warranted to preserve semantics decisions:

`.agents/plans/register-phase-evolution/register-phase-evolution.spw`

## Fuzz Strategy

- Explore: `npm run test:runtime -- src/runtime/__tests__/register-bank.test.ts` and `npm run test:runtime -- src/seed/query/__tests__/selector-expr.test.ts`
- Stabilize: `npm run test:runtime` and `npm run test:run`
- Ship gate: `npm run lint:spw && npm run lint:v020:runtime && npm run test:run`
