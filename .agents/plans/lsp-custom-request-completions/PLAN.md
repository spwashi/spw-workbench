# Plan: lsp-custom-request-completions

Implement the 4 declared-but-unimplemented custom LSP request handlers so all editors (VSCode, IntelliJ/LSP4IJ, Neovim) can consume semantic workspace metadata.

## Goal

The LSP server exposes a type-safe interface for 4 custom requests (`spw/resonance`, `spw/registerSnapshot`, `spw/operatorFrequency`, `spw/phaseContext`), but their handlers are missing or stubbed. This plan implements them fully. Once complete, IntelliJ (via LSP4IJ) and Neovim plugins can build workspace atlases, register explorers, and authoring-loop surfaces that depend on this metadata.

Taste note: correctness, layering (ownership stays in the LSP server).

## Scope

- **In scope:** Implement 4 custom request handlers; expose new server-side APIs via `ServerIndex` and analysis handlers; add named convenience methods to the VSCode client wrapper; verify existing tests still pass.
- **Out of scope:** Editor client surfaces (those happen in Plans B and C); runtime/probe/harness changes (register semantics stay the same).

## Files

```
[MOD] packages/spw-lsp/src/stdio-server.ts          — wire 4 new request handlers
[MOD] packages/spw-lsp/src/handlers/analysis.ts     — add operatorFrequency, phaseContext handlers
[NEW] packages/spw-lsp/src/handlers/runtime.ts      — add registerSnapshot, resonance handlers
[MOD] packages/spw-lsp/src/server-index.ts          — expose APIs: getResonanceEdges(), getPhaseAtPosition()
[MOD] extensions/vscode-spw/src/lsp/custom-requests.ts — add named convenience methods
```

Craft guard: `handlers/runtime.ts` is new; keep it focused on custom request logic. No file should exceed 600 lines.

## Implementations

### `spw/resonance` `{ uri: string }` → `SpwResonanceEdge[]`

Walk the annotation index for the given file. Find all names that co-occur across other files (same logic as VSCode `AnnotationIndex` co-occurrence matrix). Return `{ channel: name, strength: sharedFileCount, targetUri }[]`.

**Implementation location:** `handlers/runtime.ts`

### `spw/registerSnapshot` `{ uri: string }` → `SpwRegisterSnapshot`

Call `deps.trialRunSpw(source, uri)` on the document text. Extract the register bank snapshot from the result. Return `{ registers: SpwRegisterEntry[], timestamp: number, fileUri: string }`.

**Implementation location:** `handlers/runtime.ts`

### `spw/operatorFrequency` `{ uri?: string, root?: string }` → `SpwOperatorFrequencyResult`

If `uri`: parse and tokenize that file, count operators, compute percentages, identify dominant.
If `root`: scan all files under the named root path (via `serverIndex.getShelfRoots()`), aggregate counts.
Return `{ target: string, dominantOperator: string | null, entries: SpwOperatorFrequencyEntry[] }`.

**Implementation location:** `handlers/analysis.ts`

### `spw/phaseContext` `{ uri, position }` → `SpwPhaseContextResult`

Use `serverIndex.getContextAtPosition(uri, position)` to find the frame at the cursor. Infer phase from the leading operator: `?` = wonder, `~` = potential, `@` = observer, `!` = action, `^` = integration. Return `{ phase: number | null, sigil: string | null, materializationState: SpwMaterializationState | null }`.

**Implementation location:** `handlers/analysis.ts`

## Commits

1. `^seed[lsp] — add resonance and register-snapshot handlers`
2. `^seed[lsp] — add operator-frequency and phase-context handlers`
3. `![lsp] — verify custom request completions against server smoke tests`

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

None beyond `wip.spw` yet; create `.agents/plans/lsp-custom-request-completions/lsp-custom-request-completions.spw` only if the branch earns a distilled artifact.
