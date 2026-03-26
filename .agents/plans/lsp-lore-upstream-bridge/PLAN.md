# Plan: lsp-lore-upstream-bridge

Bridge editor LSP startup in this rewrite repo to the upstream `lore` remote when local LSP server sources are absent.

## Goal

The current IntelliJ LSP startup path assumes `scripts/lsp/stdio-server.ts` exists in this repository, but that server implementation lives in the upstream `lore` remote. This plan introduces a stable launcher contract (`npm run lsp`) that resolves local-or-upstream server paths and makes editor integrations work without manual command overrides. The implementation emphasizes correctness and layering by keeping editor surfaces dependent on one runtime command instead of hard-coded filesystem assumptions.

**Taste note:** improve **correctness** and **layering** by centralizing LSP startup resolution.

## Scope

- **In scope**: add a root LSP launcher script with upstream fallback, add `npm run lsp`, point IntelliJ default startup and settings copy to the shared command, update extension docs.
- **Out of scope**: importing full upstream LSP runtime modules into this rewrite repo; changing VS Code extension runtime architecture.

## Files

[NEW] `scripts/lsp/stdio-upstream-bridge.ts`
[MOD] `package.json`
[MOD] `extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerSupportProvider.kt`
[MOD] `extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspConfigurable.kt`
[MOD] `extensions/intellij-spw/README.md`

### Craft guard

No file is expected to exceed 600 lines or 12 imports. Responsibility split remains single-purpose: resolver script for runtime lookup; IntelliJ provider for process startup.

## Commits

1. `.[plan] — add lsp-lore-upstream-bridge plan and wip artifacts`
2. `&[lsp] — add root launcher that resolves local or lore-remote stdio server`
3. `&[intellij] — switch default startup to npm run lsp and align settings copy`
4. `.[docs] — document lore upstream fallback path for IntelliJ users`

## Agentic Hygiene

- Rebase target: `main@5dc14d6`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none
