# Spw Editor + LSP Integration

This note is the current integration and design reference for the Spw language server and its editor surfaces.

## Current Posture

- The VS Code extension is a **preview thin client** for `v0.3.0`.
- The language server is the **semantic truth surface** for editor behavior.
- The extension currently expects a **workbench checkout layout** so it can launch `packages/spw-lsp/src/stdio-server.ts`.
- Mounted `.spw/_workbench` startup is an active quality/design lane, not a capability the extension should currently overclaim.

## Current Capability Surface

The current stdio server advertises:

- `textDocument/definition`
- `textDocument/declaration`
- `textDocument/references`
- `textDocument/prepareRename`
- `textDocument/rename`
- `textDocument/documentLink`
- `textDocument/hover`
- `textDocument/documentSymbol`
- `workspace/symbol`
- `textDocument/codeAction`
- `textDocument/completion`
- `textDocument/codeLens`
- `textDocument/formatting`
- `textDocument/rangeFormatting`
- `textDocument/inlayHint`
- `textDocument/foldingRange`
- `textDocument/semanticTokens/full`
- `textDocument/publishDiagnostics`

In practical Spw terms, that currently covers:

- path navigation for `~"..."`, `~<path>` (LSP compatibility projection), `~<label>"..."`, and `@root/...`
- annotation and path reference lookup
- scope-aware completion for roots, annotations, sigil snippets, template `$slots`, form wrap sequences, and file-system paths
- semantic tokens layered over the grammar
- formatting and range formatting
- diagnostics for parse errors, broken refs, stale projections, brace physics, and runtime-informed checks

### Custom `spw/*` methods (editor probes)

| Method | Purpose |
|--------|---------|
| `spw/annotations` | Workspace annotation index |
| `spw/contextAtPosition` | Frame path + braid field at cursor |
| `spw/workspaceManifest/v1` | URI-first workspace roots |
| `spw/workspaceTemperature` | `{ entries, dualReadSpw }` — retention tier + Spw card |
| `spw/referenceGraph` / `spw/corpus` | Hubs/orphans/edges + `dualReadSpw` |
| `spw/operatorFrequency` | Sigil histogram for document or sample |
| `spw/phaseContext` | Spirit-phase of sigil under cursor |
| `spw/resonance` | Annotation co-occurrence edges from a URI |
| `spw/registerSnapshot` | Heuristic `$%[]` / `~#` / observable registers |
| `spw/formSequence` | Parse confluence wrap/reduce form chains |
| `spw/geometry` | Brace projection + operator rhythm + nesting lessons |
| `spw/select` | Path-ref selector hits for a document |

Graph and temperature always include `dualReadSpw` (seed `formatSpwCard`, same as CLI census/graph). Temperature `tier` is access-age retention (`accessAgeRequests`), not beat-cache warmth — `docs/theory/spw/cache-field.spw`.

### VS Code surface distinctness

Configurable decorations (`spw.surface.*`) paint path refs, annotations, braces, and optional operators so Spw structure stays distinct from host TypeScript/Markdown. Compute/cache knobs: `spw.compute.decorationRefreshMs`, `spw.compute.geometryOnSave`, `spw.cache.probeTtlMs` (client probe cache for geometry/frequency).

Clients: VS Code commands (`Spw: Show Operator Frequency`, form sequence insert/explain, temperature, restart server); Neovim `:SpwOperatorFreq`, `:SpwPhase`, `:SpwFormSeq`, `:SpwTemperature`, `:SpwActivity`.

Research only (not registered in canon roots): [polyglot LSP search design](./polyglot-lsp-search.md).

## Quality Bar

The extension and LSP should be judged by these rules:

- **Capability truth**: initialize results, README copy, marketplace metadata, and tooling specs should all describe the same surface.
- **Thin-client discipline**: the client owns packaging, tree views, snippets, and typed `spw/*` requests; the server owns semantic behavior.
- **Useful affordances**: each hover, completion, link, lens, or rename should answer a real author question, not just expose engine internals.
- **Quiet feedback**: trees, status copy, hovers, and quick picks should each earn their interruption cost.
- **Reversible editing**: rename and semantic refactors should stay bounded, previewable, and calmer than blind workspace churn.
- **Startup honesty**: do not imply mounted-consumer readiness until the extension can resolve the server from consumer-owned `.spw/_workbench` without checkout assumptions.

## Startup Modes

### VS Code Preview Path

The extension currently resolves the server from a workbench checkout:

- `packages/spw-lsp/src/stdio-server.ts`
- `packages/spw-lsp/src/upstream-bridge.ts`

That is the truthful preview path today.

### Standalone Editor Path

External editors can run the language server from a workbench root with:

```bash
npm run lsp
```

`npm run lsp` resolves through the upstream bridge, which keeps server discovery outside the VS Code extension itself.

## Validation

- `npm run test:lsp` runs the handler unit test suite (80 tests across semantic tokens, editing, and navigation).
- `npm run lsp:smoke` checks definition and document-link navigation over stdio.
- `npm --prefix extensions/vscode-spw run compile` verifies the VS Code client bundle.
- `npm run spw -- select docs/index.spw --selector=pathRefs --format=lines` is still a useful selector-side sanity check for path references.

### Handler Test Coverage

| Handler cluster | Tests | Covers |
|---|---|---|
| semantic-tokens | 43 | 12 operators, 4 containers, 3 string types, comments, delta encoding, compound patterns, realistic fragments |
| editing | 21 | @-root completion, annotation prefix, sigil snippets, file-system paths, code actions (trait↔binding, wrap-in-frame), formatting |
| navigation | 16 | definition, document links, prepareRename (4 targets), cascading rename across files, annotation references |

## External Editors

### Neovim (`nvim-lspconfig`)

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.spw then
  configs.spw = {
    default_config = {
      cmd = { 'npm', '--prefix', vim.fn.getcwd(), 'run', 'lsp' },
      filetypes = { 'spw' },
      root_dir = lspconfig.util.root_pattern('.git', 'package.json'),
      settings = {},
    },
  }
end

lspconfig.spw.setup({})
```

### Vim (`vim-lsp`)

```vim
if executable('npm')
  au User lsp_setup call lsp#register_server({
      \ 'name': 'spw-lsp',
      \ 'cmd': {server_info->['npm', '--prefix', getcwd(), 'run', 'lsp']},
      \ 'allowlist': ['spw'],
      \ 'workspace_config': {},
      \ })
endif
```

Both examples resolve the workbench root via `getcwd()` / `vim.fn.getcwd()`. Launch the editor from a workbench root, or replace that with an explicit path.

## Mindful Development Questions

- Which editor surface teaches the most real Spw structure per unit of interruption?
- What belongs in the LSP because it is semantic truth, and what belongs in the client because it is navigation or packaging taste?
- Which multi-file edits deserve preview-first ceremony before they become ordinary code actions?
- What must change before mounted `.spw/_workbench` startup becomes truthful extension copy instead of future work?
