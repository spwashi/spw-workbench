# Plan: fuzz-profiles-experimental-dev

Evolve fuzz profiles from single checks into a composable experimentation surface.

## Goal

Make fuzz profiles more useful for rapid, hypothesis-driven development by supporting composition, intent-based bundles, and adjustable strictness.
Developers should be able to run narrow checks when exploring or broad checks when stabilizing, without rewriting lint configuration.
Taste note: improve clarity and expressiveness by making profile intent explicit (`explore`, `stabilize`, `ship`) and keeping command ergonomics simple.

## Scope

- **In scope**: ESLint fuzz-profile composition (`FUZZ=types+async`), profile aliases for experiment stages, optional strict/warn override, updated npm scripts, and documentation updates for usage.
- **Out of scope**: replacing ESLint, adding new external tooling, changing domain/layer boundary semantics, or large refactors outside fuzz-profile entry points.

## Files

[MOD] eslint.config.js
[MOD] package.json
[MOD] audit-guide.spw
[MOD] Writerside/topics/experiments-and-skills.md
[MOD] docs/contributing/md/common-tasks.md
[MOD] CLAUDE.md

### Craft guard

Changes stay localized to lint profile definitions and docs. No file is expected to cross 600 lines or exceed 12 imports due to this work.

## Commits

1. #[fuzz] — make fuzz profiles composable and intent-oriented in ESLint config
2. #[fuzz] — add experiment-stage npm commands for composed profiles
3. .[fuzz-docs] — update audit and contributor docs for new fuzz workflow

## Agentic Hygiene

- Rebase target: historical baseline `e7f84b0bb3b0024a238dda1bf2f471045361d22f` (lore-era; not on rewritten main)
- Rebase cadence: before commit 1, before merge
- Hygiene split: pre-existing local drift in `Writerside/*` and `package.json`; keep fuzz edits scoped to relevant sections only

## Dependencies

none

## Spw Artifact

none
