# Spw Language Support for VS Code

This preview extension is a thin client over `spw-lsp`.

It provides syntax highlighting, snippets, standard LSP editing features, Concepts and Workspace views, and `Spw: Navigate Roots and Landmarks`. The navigator searches declared workspace roots and indexed annotations, then opens the selected file, directory, or source location.

## Server Resolution

The extension looks for the language server in this order:

1. `SPW_WORKBENCH_ROOT`
2. the open workspace as a canonical checkout
3. `.spw/_workbench` in the open workspace
4. `node_modules/spw-workbench`
5. the extension-relative fallback

## Build

```bash
npm --prefix extensions/vscode-spw run compile
```

The extension owns editor wiring and view composition. Parsing, indexing, navigation data, diagnostics, and other language meaning belong to [`spw-lsp`](../../packages/spw-lsp/src/stdio-server.ts).

Working references:

- [`src/navigation.ts`](src/navigation.ts)
- [`src/views/workspace-tree.ts`](src/views/workspace-tree.ts)
- [`src/views/concepts-tree.ts`](src/views/concepts-tree.ts)
- [mounted workbench guide](../../docs/runtime/md/mounted-workbench.md)
