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

## Affected Files

- `[MOD]` `.spw/workspace.spw` — Add `^"beat_config"{}` and `^"diff_analysis"{}` organelle blocks.
- `[MOD]` `packages/spw-lsp/src/types.ts` — Add `BeatConfig`, `DiffAnalysisParams`, `SpwStateReloadParams` types.
- `[MOD]` `packages/spw-lsp/src/workspace-authority.ts` — Parse `beat_config` and `diff_analysis` from workspace authority files.
- `[MOD]` `packages/spw-lsp/src/server-index.ts` — Integrate dynamic beat TTLs, object/property diffing engine, and state precipitation triggers.
- `[NEW]` `packages/spw-lsp/src/handlers/diff-precipitation.ts` — Handler module for document/line diffing, object diffing, and register precipitation.
- `[MOD]` `packages/spw-lsp/src/stdio-server.ts` — Broadcast `$spw/stateReload` notifications on hot write beats.
- `[MOD]` `extensions/neovim-spw/lua/spw/lsp.lua` — Register `$spw/stateReload` notification listener for live inline register updates.
- `[MOD]` `extensions/neovim-spw/lua/spw/commands.lua` — Add `:SpwStateReload` command and statusline integration.

---

## Commits

1. `.[spw,workspace] =beat[configuration] — add beat_config and diff_analysis organelles to workspace schema`
2. `&[spw-lsp] *beat[telemetry-ttl] — make beat TTLs configurable and emit $spw/stateReload on hot write beats`
3. `![spw-lsp] *diff[precipitation] — implement object/property/line diffing and state precipitation pipeline`
4. `&[neovim] =surface[hot-reload] — add $spw/stateReload listener and live register overlay statusline`

---

## Verification Plan

- `node --import tsx scripts/analyzers/spw-syntax-validate.ts` — Validate syntax of updated `.spw/workspace.spw`.
- `npx tsc -p tsconfig.typecheck.json --noEmit` — Typecheck entire monorepo (`0 errors`).
- `npx tsx scripts/lsp/smoke-navigation.ts` — Verify LSP navigation and custom probes.
- `nvim --headless -l extensions/neovim-spw/tests/mounted-consumer-smoke.lua` — Verify Neovim extension commands and statusline integration.
