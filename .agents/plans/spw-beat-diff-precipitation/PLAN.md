# Feature Plan: spw-beat-diff-precipitation

## Intent

Implement configurable beat mechanics, multi-layered diff analysis (object/property/line), state precipitation, and a live hot-reloading loop across Spw LSP and editor extensions.

## Goal & Taste

- **Goal**: Allow `.spw/workspace.spw` to configure beat TTLs and precipitation policies, while enabling live reactive hot-reloading of register states upon write beats.
- **Taste**: Self-describing organelle contracts, zero un-indexed file I/O, deterministic state diffing, and zero runtime crashes.

---

## Agentic Hygiene

- Base reference SHA: `main@d9da60ad0bbfd90ebaa5742709f162b61f041bae`
- Rebased state: Clean
- Unrelated drift: None

---

## Rescope (2026-10-12)

User decision: rescope, do not archive. The configurable-TTL idea survives, but the authority already exists: `.spw/biome/ocean/algos/cache.spw` `^"tiers"` declares ttlBeats 8/64/256, while `packages/spw-lsp/src/server-index.ts` hardcodes `WARM_TTL = 64` and `COLD_TTL = 256`. The diff engine is superseded by `ChangeReport` (`packages/spw-seed/src/canonical/change-report.ts`). `spw beat` in the CLI is a pure cadence tick and is untouched. `stateReload` and the Neovim listener are dormant.

## Affected Files

- `[MOD]` `packages/spw-lsp/src/server-index.ts` — take tier TTLs from the authority.
- `[MOD]` `packages/spw-lsp/src/workspace-authority.ts` — read `ttlBeats` from cache.spw.
- `[NEW]` a test under `packages/spw-lsp/src/__tests__/` pinning constants to the authority.
- `[MOD]` `.spw/biome/ocean/algos/cache.spw` only if the hot TTL question resolves toward editing the authority.

---

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

---

## Verification Plan

- `node --import tsx scripts/analyzers/spw-syntax-validate.ts` — Validate syntax of updated `.spw/workspace.spw`.
- `npx tsc -p tsconfig.typecheck.json --noEmit` — Typecheck entire monorepo (`0 errors`).
- `npx tsx scripts/lsp/smoke-navigation.ts` — Verify LSP navigation and custom probes.
- `nvim --headless -l extensions/neovim-spw/tests/mounted-consumer-smoke.lua` — Verify Neovim extension commands and statusline integration.
