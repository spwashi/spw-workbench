# Plan: obsidian-spw

Obsidian plugin as the fourth interaction target for Spw: vault-native syntax, intelligence, and views, shaped to Obsidian's manifesto.

## Goal

Establish Obsidian as a first-class Spw interaction target beside VS Code, IntelliJ, and Neovim. The plugin should make `.spw` durable inside an Obsidian vault in three ways at once: as direct files, as fenced islands inside markdown, and as queryable structure inside vault-local views.

The staff-level bar is not "port the editor features." It is to show ownership of the whole substrate boundary: CodeMirror 6 integration, view lifecycle, vault-relative pathing, subprocess orchestration, graceful degradation, and proof that the architecture remains local-first and reversible.

Taste note: improve layering, correctness, and architectural legibility. The design should read as a transfer system with clear seams, not as a pile of Obsidian callbacks.

### Manifesto alignment

- **Yours**: free and open-source, with no locked data path and no gated capability.
- **Durable**: `.spw` remains plain text at rest; the plugin renders it, but never encloses it in a proprietary store.
- **Private**: all parsing, indexing, and LSP work stays on-device; no network calls, no telemetry, no hosted dependency.
- **Malleable**: settings, views, colors, and server path remain configurable; the architecture admits future parser and editor upgrades.
- **Independent**: the integration depends on local code and open file formats, not cloud services or investor-shaped product constraints.

## Scope

- **In scope**: plugin scaffold; CM6 token-map bridge over `spw-seed`; `TextFileView` for `.spw`; reading-view code fence renderer; custom stdio LSP bridge; Concepts and Workspace Atlas views; context strip; settings; styles; planning sidecars covering API, substrate, failure, and evidence.
- **Out of scope**: Lezer grammar in the first implementation branch; mobile support; shared protocol extraction into `packages/spw-lsp`; graph view integration; community submission mechanics; remote services of any kind.

## Files

```
[NEW] .agents/plans/obsidian-spw/obsidian-spw.spw
[NEW] .agents/plans/obsidian-spw/references/index.spw
[NEW] .agents/plans/obsidian-spw/references/cm6-substrate.spw
[NEW] .agents/plans/obsidian-spw/references/lezer-parser-scope.spw
[NEW] .agents/plans/obsidian-spw/references/runtime-resilience.spw
[NEW] .agents/plans/obsidian-spw/references/validation-evidence.spw
[MOD] .agents/plans/obsidian-spw/PLAN.md
[MOD] .agents/plans/obsidian-spw/wip.spw
[NEW] extensions/obsidian-spw/manifest.json
[NEW] extensions/obsidian-spw/package.json
[NEW] extensions/obsidian-spw/tsconfig.json
[NEW] extensions/obsidian-spw/esbuild.config.mjs
[NEW] extensions/obsidian-spw/styles.css
[NEW] extensions/obsidian-spw/src/main.ts
[NEW] extensions/obsidian-spw/src/settings.ts
[NEW] extensions/obsidian-spw/src/editor/token-map.ts
[NEW] extensions/obsidian-spw/src/editor/spw-language.ts
[NEW] extensions/obsidian-spw/src/editor/decorations.ts
[NEW] extensions/obsidian-spw/src/renderer/code-block.ts
[NEW] extensions/obsidian-spw/src/renderer/tokenize-dom.ts
[NEW] extensions/obsidian-spw/src/lsp/server-process.ts
[NEW] extensions/obsidian-spw/src/lsp/json-rpc.ts
[NEW] extensions/obsidian-spw/src/lsp/client.ts
[NEW] extensions/obsidian-spw/src/lsp/protocol.ts
[NEW] extensions/obsidian-spw/src/views/concepts-leaf.ts
[NEW] extensions/obsidian-spw/src/views/atlas-leaf.ts
[NEW] extensions/obsidian-spw/src/data/semantics.ts
[NEW] extensions/obsidian-spw/src/data/roots.ts
[MOD] package.json
```

### Craft guard

No source file should exceed 600 lines or 12 imports. The likely pressure points are `concepts-leaf.ts`, `atlas-leaf.ts`, `json-rpc.ts`, and `token-map.ts`; if any starts to become "the architecture file," split helpers immediately.

The planning surfaces also have a craft bar: each sidecar needs a single job. `cm6-substrate.spw` explains editor placement, `runtime-resilience.spw` explains failure ownership, `validation-evidence.spw` explains proof, and `obsidian-spw.spw` is the distilled abstraction.

## Architecture

### Interaction-target thesis

Spw already has three targets. Obsidian is the first whose native substrate is not "editor plus project" but "vault plus markdown plus local graph." That changes the integration shape:

1. Syntax is not enough; `.spw` must coexist with markdown.
2. Views are not add-ons; they are how vault topology becomes legible.
3. LSP is not just an enhancement; in Obsidian it becomes infrastructure the plugin must own.

### Token-map adapter

`spw-seed` lexes a whole document into `Token[]` with line/column spans. CM6 `StreamLanguage` expects line-oriented streaming with `token(stream, state)`.

The architectural move is to insert a token-map adapter:

1. Lex the current text with `spw-seed`.
2. Build a line-indexed token table.
3. Wrap that table in a `StreamParser` state machine that advances the CM6 stream to token boundaries.
4. Rebuild the map on document changes.

This is deliberately transitional. If Spw later acquires a Lezer grammar, the plugin's public surface stays intact while the internals swap underneath. That is the correct malleability boundary.

### Lezer follow-on scope

The Lezer work should be a follow-on track, not a last-minute rewrite inside `extensions/obsidian-spw`. The right structural move is a new portable package, tentatively `packages/spw-lezer/`, consumed by Obsidian and potentially other targets later.

Key scoping decision:

1. **Do not replace `spw-seed` first.** Start by making Lezer the editor-structural parser for syntax tree, highlighting, folding, selection, and incremental reparsing.
2. **Keep `spw-seed` as semantic truth initially.** LSP, normalization, canonicalization, and current AST-based semantics continue to rely on `spw-seed` until a separate equivalence effort is justified.
3. **Split strict grammar from prose-heavy fallback.** The current seed parser's prose fallback and context-sensitive path sugar are the main conflict risks. The first Lezer grammar should target the strict symbolic core, not every prose affordance.
4. **Treat markdown fence integration as a host-integration problem, not a grammar problem.** A working Lezer parser does not automatically solve fenced code activation inside Obsidian's markdown editor.

Predicted Lezer package surface:

```
[NEW] packages/spw-lezer/package.json
[NEW] packages/spw-lezer/tsconfig.json
[NEW] packages/spw-lezer/src/spw.grammar
[NEW] packages/spw-lezer/src/external-tokens.ts
[NEW] packages/spw-lezer/src/highlight.ts
[NEW] packages/spw-lezer/src/language.ts
[NEW] packages/spw-lezer/src/index.ts
[NEW] packages/spw-lezer/test/corpus/*.txt
[MOD] extensions/obsidian-spw/src/editor/spw-language.ts
[MOD] extensions/obsidian-spw/src/main.ts
[MOD?] package.json
```

The detailed scope is recorded in:

```
.agents/plans/obsidian-spw/references/lezer-parser-scope.spw
```

### Three rendering pipelines

Obsidian demands three distinct render sites for one language:

1. `registerEditorExtension()` for live editing behavior.
2. `registerMarkdownCodeBlockProcessor('spw', ...)` for reading-view fences.
3. `registerExtensions(['spw'], viewType)` plus `TextFileView` for direct `.spw` files.

All three consume the same token truth. The plugin should not invent one regex grammar for preview, one for CM6, and another for file view. One lexer, three adapters.

### Subprocess ownership

Obsidian has no built-in LSP client. The plugin must therefore own:

1. Process launch and restart policy.
2. JSON-RPC framing over stdio.
3. Request correlation and lifecycle.
4. Vault-path to `file://` URI translation.
5. Degraded behavior when the server is absent or unhealthy.

This is the novel engineering contribution on the branch. In the other targets, the host editor owns most of this surface.

### Vault-native views

The Atlas and Concepts views are not copies of VS Code trees. They are Obsidian-native leaf views over vault-local structure:

- Concepts exposes annotations, co-occurrence, density, and frame structure.
- Atlas exposes roots, projections, temperature, phase distribution, and vault adjacency.
- Context strip surfaces cursor-local meaning without requiring a panel.

The transfer unit is the data model, not the UI widget.

## Failure Modes and Recovery

The plan must own failure before implementation does. The main classes are:

- **Boot failures**: bundled CM6 mismatch, missing LSP path, desktop-only constraints, invalid manifest wiring.
- **Steady-state failures**: child process exit, JSON-RPC framing drift, stale request promises, duplicate registration on hot reload, view refresh races.
- **Restore failures**: workspace restores a leaf before server readiness, saved leaf state references missing files, renamed files leave stale URIs.
- **Interaction failures**: syntax works but views stall, views work but context strip goes stale, status surfaces spam the user.

Recovery posture:

- Syntax stays available even if the LSP is unavailable.
- Views show last-known-good or explicit empty/error states rather than collapsing silently.
- The plugin exposes explicit operator commands such as restart server and show health.
- Notices are reserved for actionable failures; passive state belongs in status or view chrome.
- The plugin never corrupts or rewrites `.spw` content as part of recovery.

This branch should read like it knows how it fails.

## Validation and Evidence

The plugin needs an evidence plan, not just a feature list.

### Questions to answer

- Can one lexer truth drive all three render pipelines without visible drift?
- Can the custom LSP bridge behave like infrastructure rather than demo glue?
- Does the Obsidian-specific substrate add real value beyond "VS Code, but elsewhere"?
- Do failure paths degrade locally and honestly?

### Evidence packet

- Architecture diagram covering lexer, adapters, views, and subprocess seams.
- Measured timings for lex, initialize, refresh, and view rebuild loops.
- Failure drill notes: bad server path, killed child, hot reload, restore-before-ready.
- Screenshot set: direct `.spw` file, fenced markdown block, Concepts view, Atlas view, degraded health state.
- Short written defense of why CM6, markdown post-processing, and file views each exist.

### Negative controls

- Markdown notes without `spw` fences should not show new editor churn.
- Plugin disable/unload should leave no duplicate view or process residue.
- LSP unavailability should not break syntax or file opening.

## Commits

1. `#[obsidian-spw]` — scaffold plugin, build config, styles, and entry point
2. `^seed[obsidian-spw]` — build token-map adapter from `spw-seed` into CM6 stream semantics
3. `&[obsidian-spw]` — register `.spw` file view and shared DOM token renderer
4. `&[obsidian-spw]` — add reading-view renderer for `` ```spw `` fences
5. `&[obsidian-spw]` — ship stdio process manager and JSON-RPC transport
6. `&[obsidian-spw]` — add Concepts leaf using annotation and co-occurrence data
7. `&[obsidian-spw]` — add Workspace Atlas leaf with vault-native topology and temperature
8. `&[obsidian-spw]` — add context strip and cursor-driven refresh plumbing
9. `&[obsidian-spw]` — add settings, health controls, and resilience polish
10. `.[obsidian-spw]` — finalize README, workspace wiring, and planning artifacts

Fuzz strategy:

- Explore: scaffold build and empty plugin load
- Stabilize: syntax parity across file, fence, and editor paths
- Stabilize: LSP lifecycle, restart, and degraded states
- Ship: full build plus manual vault walkthrough with failure drills

## Agentic Hygiene

- Rebase target: `origin/main@37b6f42b`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; only the `obsidian-spw` plan directory is currently untracked

## Dependencies

none

## Spw Artifact

Warranted.

Distilled artifact:

```
.agents/plans/obsidian-spw/obsidian-spw.spw
```

Reference dossier:

```
.agents/plans/obsidian-spw/references/index.spw
.agents/plans/obsidian-spw/references/obsidian-api.spw
.agents/plans/obsidian-spw/references/interaction-targets.spw
.agents/plans/obsidian-spw/references/cm6-substrate.spw
.agents/plans/obsidian-spw/references/lezer-parser-scope.spw
.agents/plans/obsidian-spw/references/runtime-resilience.spw
.agents/plans/obsidian-spw/references/validation-evidence.spw
```

The artifact carries the branch thesis. The sidecars carry the contracts, risks, and evidence standards that justify it.

## Open Questions

- Does `registerEditorExtension()` alone reach the exact fence-scoped editing surface needed for `spw` inside markdown, or does the plugin need markdown language injection work beyond that registration?
- Is `TextFileView` sufficient for the first iteration, or does a usable `.spw` experience require an editable view from day one?
- Is `vault.adapter.getBasePath()` a stable enough bridge for URI construction, or should the plugin isolate that dependency behind its own path service immediately?
- Which suggestion layer belongs to future Spw authoring in Obsidian: `EditorSuggest`, CM6 autocomplete, or both with sharply separated roles?
- Where should Lezer stop in phase one: strict symbolic Spw only, or the full prose-fallback dialect currently accepted by `spw-seed`?
