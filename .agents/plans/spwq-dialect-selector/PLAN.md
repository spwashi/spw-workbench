# Plan: spwq-dialect-selector

Promote the thin `spw-selector.ts` filter into a real selector algebra native to Spw's own syntax. Selectors expressed as structural patterns (`$!_`, `$@_`, `$~"_"`, `$^[_]{_}`) rather than string type names. This is the `spw.q` dialect surface.

## Goal

Replace the current `maybePathRef`/`maybeRootRef` walk with a composable **pattern-based selector** that uses Spw's own operators, braces, and wildcards. The selector should be usable from the LSP server, CLI, and potentially the VSCode extension, and should be serializable for lore-remote `spw/select` dispatch.

**Taste note**: expressiveness, layering. Moving selector logic into `src/seed/query/` (library layer) from `scripts/lsp/` (script layer).

## Scope

- **In scope**: selector types, pattern matcher, `spwq()` core, position queries, presets, LSP integration, CLI update, vitest coverage
- **Out of scope**: string DSL parser (selectors are TS-constructed for now), SeNF-tier selectors, cross-file selectors, update/rewrite path

## Files

```
[NEW] src/seed/query/types.ts          — SpwPattern, SpwMatch, combinator types
[NEW] src/seed/query/match.ts          — pattern matcher over ASTNode
[NEW] src/seed/query/spwq.ts           — spwq() and spwq.at() entry points
[NEW] src/seed/query/presets.ts        — NAVIGABLE, DOMAIN_ROOTS, OPERATIONS, etc.
[NEW] src/seed/query/index.ts          — barrel export
[MOD] src/seed/index.ts                — re-export src/seed/query
[MOD] scripts/lsp/spw-selector.ts      — rewrite to use src/seed/query instead of inline walk
[MOD] scripts/lsp/stdio-server.ts      — use new selector API
[MOD] scripts/spwq.ts                  — use presets from src/seed/query
[NEW] src/seed/query/__tests__/match.test.ts   — vitest unit tests
[NEW] .agents/plans/spwq-dialect-selector/wip.spw
```

### Craft guard

All new files target <200 lines. `stdio-server.ts` (463 lines) stays within budget after changes — selector logic moves *out* of it.

## Commits

1. `^seed[query] — define selector pattern types and SpwMatch interface`
2. `^seed[query] — implement pattern matcher over ASTNode tree`
3. `^seed[query] — add spwq() and spwq.at() entry points`
4. `^seed[query] — define preset selectors (NAVIGABLE, DOMAIN_ROOTS, OPERATIONS)`
5. `&[seed] — barrel export src/seed/query from src/seed/index.ts`
6. `&[lsp] — rewire spw-selector.ts and stdio-server.ts to use src/seed/query`
7. `&[spwq] — update CLI to use presets and pattern API`
8. `![query] — add vitest unit tests for pattern matching and presets`
9. `.[plans] — commit plan artifacts and selector algebra design doc`

## Agentic Hygiene

- Rebase target: `origin/main@fd98d97`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none — the existing `spw-selector.ts` and `stdio-server.ts` changes from the other agent are already on main

## Dependencies

- `lsp-lore-upstream-bridge` (merged) — provides the stdio bridge that will consume selectors
- `vscode-lsp-integration` (parallel) — will consume presets once available; no blocking dependency

## Spw Artifact

The design exploration at `spwq-selector-algebra.md` (in the Antigravity brain) captures the full algebra design. A distilled `.spw` artifact will be written at commit 9 if the implementation validates the pattern approach.
