# LSP (Spw v0.3.0)

## Status

Package boundary documentation for `spw-lsp` — the language server.

## v0.3.0 Contract

`spw-lsp` owns:
- Stdio-based language server (`packages/spw-lsp/src/stdio-server.ts`)
- Semantic token provider
- Hover, completion, document symbol, workspace symbol providers
- CodeLens and document link providers

It depends on `spw-seed` (for parsing) and `spw-runtime` (for interpretation). Editor extensions connect to this server via stdio.

## Source Links

- Package root: `packages/spw-lsp/`
- Server entry: `packages/spw-lsp/src/stdio-server.ts`
- VS Code client: `extensions/vscode-spw/src/extension.ts`
- IntelliJ client: `extensions/intellij-spw/src/main/kotlin/`
- Neovim client: `extensions/neovim-spw/lua/`

## Invariants

- The LSP server is editor-agnostic — it communicates via stdio only.
- Provider responses are deterministic for identical document state.
- The server never writes to the filesystem.

## Migration Notes

In v0.2.0, the LSP server existed under `packages/spw-lsp/` but its boundary with seed/runtime was implicit. v0.3.0 documents the dependency contract.

## Open Questions

- Should the LSP server expose diagnostic-level runtime errors or only parse errors?
- How should workspace-wide symbol indexing scale for large `.spw` workspaces?

## v0.4.0 Candidates

- LSP server extracted as independently startable binary.
- Diagnostic integration with runtime pipeline errors.
- Workspace indexing with incremental updates.
