# Plan: editor-reading-hierarchy

Every Spw editor shows glyphs and errors first, one hover answer second, and counts and instruments on demand, all drawn from one parse-derived role stream. A reader can then scan a file's topography (frames, anchors, claims, commits) instead of its chrome. (Card and next move: [wip.spw](./wip.spw) · rules and fact owners: [editor-reading-hierarchy.spw](./editor-reading-hierarchy.spw) · index: [../index.spw](../index.spw))

## Goal

The owner's screenshots of plan files in VS Code and Neovim showed:
- stream lines with identical bytes rendered two ways
- method names and bare paths in prose colored as paths
- frame lenses reading "7 topic" and "1 lens"
- incoming refs shown twice and naming deleted copies
- a cryptic header lens
- a resolved-path inlay on every root
- a metrics inlay on every wonder
- commits that don't scan by state or order

A pass over the caches tree traced each of these to code, and the tree's `spw/` surfaces already argue for the fix:
- a care ladder for what comes first
- glyphs before hue
- one role stream
- anti-echo with one owner per fact
- errors first
- declared modes
- lenses that act

Taste note: clarity and containment. The plan removes or relocates more than it adds.

## Scope

- **In scope:**
  - Semantic tokens, TextMate highlighting, code lenses, inlay hints, hover layering, and diagnostics tiering in `spw-lsp` and the shared grammar.
  - Neovim's inlay default.
  - VS Code's claim-status and valence palette.
  - Commit-frame rendering (derived ordinal and state role).
  - A census before and after.
- **Out of scope:**
  - The executeCommand route for lenses (owned by `vscode-authoring-probe-loop` `~[code_lens_commands]`).
  - Which files the annotation index holds (owned by `apposition-cache-granules`).
  - The gesture and owner tables as a contract (owned by `vscode-editor-contract`).
  - Pulses, garden stats, and brace metrics (staying in `spw-garden-geometry`).
  - New chrome.

## Files

```
[NEW] .agents/plans/editor-reading-hierarchy/{PLAN.md,wip.spw,editor-reading-hierarchy.spw}
[NEW] packages/spw-lsp/src/__tests__/hierarchy-census.test.ts (+ fixtures) — lenses, inlays, duplicates, painted prose per 100 lines
[MOD] packages/spw-lsp/src/handlers/analysis.ts — lexer errors as diagnostics
[MOD] packages/spw-lsp/src/server-index.ts — parse with the file path
[MOD] packages/spw-lsp/src/handlers/semantic-tokens.ts — plan streams and inline # comments as text
[MOD] extensions/vscode-spw/syntaxes/spw.tmLanguage.json (+ generated IntelliJ copy) — no path color for a word with a slash
[MOD] extensions/vscode-spw/src/surface-decorations.ts — apostrophe mask stays on its line
[MOD] packages/spw-lsp/src/handlers/display.ts — frame lens units, one incoming owner, anchor trial off, resolved-path inlay, header banner
[NEW] packages/spw-lsp/src/handlers/hover-layers.ts, inlay-hints.ts — moved out of display.ts as they change
[MOD] packages/spw-lsp/src/handlers/wonder.ts — off-page facts only
[MOD] extensions/neovim-spw/lua/spw/lsp.lua — no forced inlay hints at attach
[MOD] extensions/vscode-spw/package.json, src/capture-plan.ts — status glyphs, AA valence palette, capture as a profile client
```

### Craft guard

`display.ts` is over 1,400 lines. Every builder that changes moves to its own module in the same commit, and none of them may grow `display.ts`.

## Commits

Canonical list: `wip.spw` `^["commits"]`. The order:
1. The census.
2. Honesty: lexer errors, then the path-aware parse.
3. Stream prose as text, path color, and inline `#` comments.
4. Anti-echo: lens units, one incoming owner, the anchor trial, the resolved-path and wonder inlays, and hover layers.
5. Commit-frame roles.
6. Profiles as modes, then status and palette.
7. The census again.

## Agentic Hygiene

- Rebase target: `main@813444dc`. Planned on `feature/caches-living-tree`; implementation on `feature/editor-reading-hierarchy`.
- Hygiene split: none.

## Dependencies

- **Needs:** `local-numbering-vcs` (the derived-ordinal rule, for `~[commit_frame_roles]` only).
- **Supersedes:** `vscode-cognitive-surface`, whose hierarchy commits move here.
- **Shares:**
  - `vscode-editor-contract` (gesture and owner tables)
  - `spw-garden-geometry` (hover and inlay commits move here)
  - `vscode-plugin-performance` (`semantic-tokens.ts`)
  - `plan-plugin-integration` (a commit-ref token type)
  - `citation-navigation` (refs outside strings)
  - `apposition-cache-granules` (index scope)
  - `neovim-spw-surfaces`
  - `plan-stream-parse-health`

## Failure Modes

- **Hard:**
  - A host keeps painting prose because one layer still reads Spw on its own.
  - A removed surface was the only route to a fact.
- **Soft:** hosts drift apart.
- **Non-negotiable:**
  - Errors are never hidden by a profile.
  - No meaning rides on hue alone.
  - Capture mode restores every surface exactly.

## Validation

- **Hypotheses:**
  - Lenses and inlays per 100 lines fall by at least half, with no fact lost.
  - Stream prose and `#` comments carry zero painted tokens in every host.
  - Every lens has a unit and an action.
- **Demo:** open `citation-navigation/wip.spw`. Stream lines render alike, and commits scan by state and derived order.
