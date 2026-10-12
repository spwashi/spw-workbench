# Plan: refactor-import-sprawl

## Goal

Make the package DAG (seed, then runtime, then cli and lsp) and the 12-import craft guard mechanically checked, so the layer rules in `CLAUDE.md` describe something a script enforces.

Measured 2026-10-12: `spw-seed` imports no other package; `spw-runtime` imports seed; `spw-cli` and `spw-lsp` import seed and runtime and nothing else. No `package.json` declares an `@spwashi` dependency, `scripts/pre-commit` holds no import check, and `lib/spw` (named in `CLAUDE.md`) does not exist. Nine non-test, non-barrel files exceed 12 import lines; `packages/spw-cli/src/commands.ts` leads with 43 but is a dispatcher with a help and run pair per subcommand.

The original plan (a 26-commit bootstrap extraction over `src/platform`, `src/app`, and `src/features`) was stranded when that layout vanished; on 2026-10-12 the user chose to rescope rather than archive.

**Taste Note:** layering and clarity. A boundary stated in prose gets a failing case, and a size guard reports its outliers.

## Scope

- **In scope**: a new analyzer under `scripts/analyzers`, its fixture test, an npm script, optional pre-commit wiring, and `CLAUDE.md` Layer Boundaries text.
- **Out of scope**: moving files between packages, intra-package cycles (one value-level cycle exists in the seed grammar and is recorded, not planned), and `extensions/`.

## Agentic Hygiene

- **Rebase target**: `main@551bb419` (2026-10-12)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated drift into `feature/refactor-import-sprawl-agentic-hygiene` before implementation commits

## Files

```
[NEW] scripts/analyzers/package-dag-check.ts
[NEW] scripts/analyzers/__tests__/package-dag-check.test.ts
[MOD] package.json                      (lint:arch)
[MOD] scripts/pre-commit                (only if ?[gate_home] says so)
[MOD] CLAUDE.md                         (Layer Boundaries, commit 6)
[MOD] packages/spw-cli/src/commands.ts  (only if ?[dispatcher_exempt] says split)
```

### Craft guard

- The analyzer must run in well under a second so it can sit in a pre-commit hook.
- The 12-import table is warn-only until the allowlist is agreed.

## Commits

1. `^seed[arch] — add scripts/analyzers/package-dag-check.ts: read imports in packages/*/src and fail on any edge outside seed to runtime to cli and lsp`
2. `![arch] — fixture the failing case in scripts/analyzers/__tests__: a temp tree where seed imports runtime exits 1, and the live tree exits 0`
3. `#[arch] — wire the check as npm run lint:arch, and into lint or the pre-commit hook per ?[gate_home]`
4. `![arch] — extend the analyzer with a warn-only table of non-test, non-barrel files over 12 imports, with a dispatcher allowlist per ?[dispatcher_exempt]`
5. `&[cli] — split commands.ts by command group, only if ?[dispatcher_exempt] answers split`
6. `.[docs] — restate CLAUDE.md Layer Boundaries as the package DAG once ~[3] lands, per ?[claude_md_layers]`

## Dependencies

- None. `audit-data-attributes` no longer waits on this plan.

## Spw Artifact

None planned. The analyzer and its fixture are the checkable record.
