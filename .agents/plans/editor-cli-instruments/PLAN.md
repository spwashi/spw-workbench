# Plan: editor-cli-instruments

Give VS Code, IntelliJ/WebStorm, and Neovim a recognizable set of Spw workbench instruments without creating three new semantic engines.

## Goal

The three editor clients should expose the same conceptual moves: inspect a file's `form`, read its `stack` profile, inspect cache behavior, use standard LSP Rename at the caret, and preview broader corpus refactors through the plan-first CLI. Live-document clients may use the shared LSP for file probes; saved-file and corpus operations use parameterized CLI invocations whose working directory remains the consumer repository even when `.spw/_workbench` owns the executable.

Taste note: improve recognizability, reversibility, performance legibility, and cross-editor resonance while preserving thin-client layering.

## Scope

- **In scope**: canonical instrument names and effect grades; safe CLI argument construction; workbench/mounted-consumer discovery; explicit file probes for form, surface stack, and cache; cache hit/miss/age receipts where the client owns a cache; standard LSP rename guidance; read-only corpus refactor planning; background execution, cancellation, and recoverable error copy; editor-native result surfaces; focused tests and documentation for VS Code, IntelliJ/WebStorm, and Neovim.
- **Out of scope**: applying corpus refactors from an editor; a second parser or rewrite engine; automatic probe traffic on cursor movement; persistent user-activity telemetry; migrating IntelliJ to another LSP client; changing Spw grammar or CLI compatibility aliases; implementing the full revisioned refactor experiment lifecycle.

## Files

```text
[NEW] .agents/plans/editor-cli-instruments/PLAN.md
[NEW] .agents/plans/editor-cli-instruments/wip.spw
[NEW] .agents/plans/editor-cli-instruments/editor-cli-instruments.spw
[NEW] .agents/plans/editor-cli-instruments/references/index.spw

[NEW] .spw/tooling/editor-instruments.spw
[MOD] .spw/tooling/editor-surface-audit.spw
[MOD] .spw/tooling/intellij-plugin.spw
[MOD?] .spw/tooling/neovim-spw.spw

[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwCliInvocation.kt
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwCliRunner.kt
[NEW] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwInstrumentActions.kt
[NEW?] extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwInstrumentConsole.kt
[MOD] extensions/intellij-spw/src/main/resources/META-INF/plugin.xml
[NEW] extensions/intellij-spw/src/test/kotlin/com/spwashi/spw/SpwCliInvocationTest.kt
[MOD] extensions/intellij-spw/README.md

[NEW] extensions/vscode-spw/src/instruments/cli-invocation.ts
[NEW] extensions/vscode-spw/src/instruments/cli-invocation.test.ts
[NEW] extensions/vscode-spw/src/instruments/commands.ts
[MOD] extensions/vscode-spw/src/commands.ts
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/surface-decorations.ts
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/README.md

[NEW] extensions/neovim-spw/lua/spw/cli.lua
[NEW] extensions/neovim-spw/lua/spw/instruments.lua
[MOD] extensions/neovim-spw/lua/spw/commands.lua
[MOD] extensions/neovim-spw/lua/spw/init.lua
[MOD?] extensions/neovim-spw/lua/spw/lsp.lua
[MOD] extensions/neovim-spw/tests/mounted-consumer-smoke.lua
[MOD] extensions/neovim-spw/README.md
```

### Craft guard

- `extensions/vscode-spw/src/commands.ts` is already 401 lines and has multiple responsibilities; move instrument projections out instead of adding to it.
- Keep every new source file below 400 lines and below 12 imports. Kotlin actions hold no project-lifetime fields.
- The CLI process layer only constructs argument arrays and launches processes; semantic interpretation remains in `spw-cli`/`spw-lsp`.
- `npm --prefix <tool-root> ...` selects the executable while process `cwd=<consumer-root>` preserves consumer authority.
- Never include `--write` in editor corpus-refactor actions. Never interpolate shell strings.
- Instrumentation is explicit and local. Do not infer people, authority, or behavior from cache/session data.

## Commits

1. `.[plans] — define cross-editor CLI instrument contract`
2. `&[editor-instruments] — add parameterized CLI launch models and focused tests`
3. `&[intellij] — expose form, stack, cache, rename, and refactor-plan actions`
4. `&[vscode,neovim] — align live probes and corpus refactor planning`
5. `![editors] *verify[instruments] — prove mounted roots, cache receipts, builds, and copy`
6. `.[tooling] — publish editor instrument and recovery guidance`

## Fuzz Strategy

- Explore: focused Kotlin, Vitest, and headless Lua tests for argument vectors, root ownership, cache receipts, and failure copy.
- Stabilize: `npm run test:vscode`, `npm run build:vscode`, `npm run test:intellij`, and the Neovim mounted-consumer smoke test.
- Ship: `npm run build`, `npm run test:lsp`, `npm run verify:intellij`, plugin package smoke checks, and `poll-review --scope=staged --fuzz=ship --fuzz-level=error`.

## Agentic Hygiene

- Rebase target: `main@0db31751a7639c63736e689fa190639a97ec7ce2`
- Rebase cadence: before commit 1 and before merge
- Hygiene split: none; `main...codex/editor-cli-instruments` was empty before planning

## Dependencies

- Existing standard LSP prepareRename/rename handlers and custom file-probe requests.
- Existing plan-first `spw refactor` CLI behavior.
- Related but not blocking: `refactor-experiment-lifecycle`, `vscode-plugin-performance`, and `neovim-spw-surfaces`.

## Failure Modes

- **Hard**: a mounted consumer launches the correct workbench executable from the wrong authority root.
- **Hard**: an editor action applies a corpus refactor without a reviewable plan.
- **Hard**: editor-specific logic disagrees with the parser, LSP, or CLI.
- **Soft**: unsaved IntelliJ buffers cannot be represented by a file-backed CLI probe; the action must explain save/retry rather than inspect stale content silently.
- **Soft**: missing Node/npm, missing mount, cancellation, or non-zero exit leaves a clear, copyable command receipt and recovery suggestion.
- **Non-negotiable**: argument arrays only; explicit invocation only; local output only; no absolute paths in durable artifacts or commit messages.

## Validation

- **Hypotheses**: contributors can find the same five moves by nearly the same names in each editor; explicit probes add no idle traffic; cache output distinguishes client-cache receipts from LSP/runtime cache reflection; corpus refactor preview never writes.
- **Negative controls**: standard LSP rename edits remain byte-for-byte owned by the server; syntax, folding, navigation, and LSP-disabled fallback behavior remain unchanged; existing CLI aliases remain available.
- **Demo sequence**: open a `.spw` file in a mounted consumer; inspect Form; inspect Surface Stack; inspect Cache; invoke native Rename at a mark; enter a mark rename for Corpus Refactor Plan and review the no-write output.

## Spw Artifact

`.agents/plans/editor-cli-instruments/editor-cli-instruments.spw` records the portable cross-editor contract. The earned canon projection will live at `.spw/tooling/editor-instruments.spw`.
