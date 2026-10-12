# Plan: lukewarm-backlog

A short, queryable holding place for findings that are real but not hot. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

Each finding is verified against the repo, owned by a home plan, and reheated by a named event. Nothing here is scheduled; the plan stays dormant until a trigger fires, then the item moves into its home plan as a commit and is struck into `^["done"]`.

Taste note:
- claim discipline: a row says what was read; a wrong row is corrected or dropped.

## Row shape

Each `?[name]` in `^["open"]` carries: the evidence (a path or command that re-verifies it), `home` (the plan that owns the fix), `heat` (the event that reheats it) and `cost` (S under an hour, M a commit, L a series).

## Items (12) and their homes

| Item | Home plan | Heat trigger | Cost |
|------|-----------|--------------|------|
| eslint_unwired | typescript-upgrade-ladder | rung C decides the typescript6 alias | S |
| skills_overclaim | audit-fuzz-truthfulness | its commit 4 renames the aliases | S |
| mass_undeclared | measure-invariant-generalization | ~[10] canon declaration | S |
| old_grade_spelling | seed-roundness-grades, syntax-hardware-alignment | either plan edits those files | S |
| span_collapsed_text | syntax-profile-stack, runtime-dx-foundation | a position shown for an Spw.l file | M |
| dream_orphan | curiosity-mutation-ergonomics | `?[reuse_dream]` answered | S |
| precipitate_failure_untested | precipitate-model-alignment | `?[failure_continuity]` answered | S |
| spwq_open_decisions | spw-q-stabilization | a Spw.q parser or exporter commit | S |
| gap_probe_order | gap-affinity-tooling | its ~[8] starts | S |
| obsidian_hot_unscaffolded | obsidian-spw | ~[1] scaffolds the plugin | S |
| base_ref_gaps | hygiene-index-consolidation | any listed plan reheats | S |
| register_explorer_silence | vscode-register-explorer | the plan is reheated | S |

## Dropped and corrected on verification

- Dropped: the second `baseUrl` in `extensions/vscode-spw/tsconfig.json`. `typescript-upgrade-ladder` already names it in its 2026-10-12 14:38 stream entry and splits it into ~[11].
- Corrected: `eslint.config.js` exists, so eslint is unwired by script, not by config.
- Corrected: the `S3` in `docs/design/md/goals.md` is a storage label and the `S1`-`S3` in the UX audit are screenshot ids; only the 7 `docs/theory/spw` files and the `!probe[S0]` samples spell grades.
- Corrected: `spw-gap-census.ts` is a planned `[NEW]` file; the defect is only probe ordering.
- Corrected: no `%mass` file count is claimed; it depends on scope. The measured fact is 0 subjects declaring `@self` with `%mass`.

## Files

[MOD] none; this plan edits nothing outside `.agents/plans`.

## Commits

1. .[plans] — stage lukewarm-backlog and route its items to home plans

## Agentic Hygiene

- Rebase target: `main`
- Hygiene split: none

## Dependencies

none
