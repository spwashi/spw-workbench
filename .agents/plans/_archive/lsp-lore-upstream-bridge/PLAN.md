# Plan: lsp-lore-upstream-bridge

Bridge editor LSP startup in this rewrite repo to the upstream `lore` remote when local LSP server sources are absent.

## Goal

The current editor startup story should not depend on whichever local path happens to exist today. This plan introduces a stable launcher contract (`npm run lsp`) that resolves local-or-upstream server paths, bridges the packages-era server layout, and makes IntelliJ and adjacent editor surfaces work without manual command overrides. The implementation emphasizes correctness and layering by keeping editor surfaces dependent on one runtime command instead of hard-coded filesystem assumptions. It is the launcher-truth lane: once this contract is stable, site-install docs, IntelliJ defaults, and editor troubleshooting can proceed in parallel.

**Taste note:** improve **correctness** and **layering** by centralizing LSP startup resolution.

## Scope

- **In scope**: add or harden a root LSP launcher script with upstream fallback, keep `npm run lsp` as the stable contract, point IntelliJ default startup and settings copy to the shared command, and update docs where editor startup truth matters.
- **Out of scope**: importing full upstream LSP runtime modules into this rewrite repo; changing VS Code extension runtime architecture.

## Files

```text
[MOD] scripts/lsp/stdio-upstream-bridge.ts
[MOD] package.json
[MOD?] packages/spw-lsp/src/upstream-bridge.ts
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerSupportProvider.kt
[MOD] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/settings/SpwLspConfigurable.kt
[MOD] extensions/intellij-spw/README.md
[MOD?] extensions/vscode-spw/README.md
```

### Craft guard

No file is expected to exceed 600 lines or 12 imports. Responsibility split remains single-purpose: resolver script for runtime lookup; IntelliJ provider for process startup.

## Commits

Commit 2 serializes launcher truth. After that lands, IntelliJ defaults and downstream install/docs surfaces can depend on one startup contract.

1. `.[plan] — add lsp-lore-upstream-bridge plan and wip artifacts`
2. `&[lsp] — add root launcher that resolves local or lore-remote stdio server`
3. `&[intellij] — switch default startup to npm run lsp and align settings copy`
4. `.[docs] — document lore upstream fallback path for IntelliJ users`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none
