# Spw Language Support for VS Code

This extension is the VS Code client for the Spw workbench.

It stays thin by delegating language behavior to `spw-lsp`.

## Features

- syntax highlighting and snippets for `.spw`
- LSP-backed hover, diagnostics, completion, formatting, and links
- Concepts and Workspace Atlas views
- semantic-token and display surfaces driven by the server

## Architecture

The split is straightforward:

- the extension owns editor wiring and view composition
- `spw-lsp` owns parsing, index state, and language semantics

That keeps editor behavior aligned with the server.

## Server Resolution

The extension looks for the language server in this order:

1. `SPW_WORKBENCH_ROOT`
2. the open workspace root as a canonical checkout
3. `.spw/_workbench` inside the open workspace
4. `node_modules/spw-workbench`
5. the extension's repo-relative fallback

## Local Use

Build:

```bash
npm --prefix extensions/vscode-spw run compile
```

Symlink into the editor extensions directory:

```bash
ln -s "$(pwd)/extensions/vscode-spw" ~/.vscode/extensions/spw-language-0.3.0
```

## Main Surfaces

Start with:

- [`src/extension.ts`](src/extension.ts)
- [`src/lsp/custom-requests.ts`](src/lsp/custom-requests.ts)
- [`src/views/concepts-tree.ts`](src/views/concepts-tree.ts)
- [`src/views/workspace-tree.ts`](src/views/workspace-tree.ts)
- [`../../packages/spw-lsp/src/stdio-server.ts`](../../packages/spw-lsp/src/stdio-server.ts)
- [`../../packages/spw-lsp/src/server-index.ts`](../../packages/spw-lsp/src/server-index.ts)

## Related Docs

- [`../../README.md`](../../README.md)
- [`../../docs/runtime/md/github-reading-map.md`](../../docs/runtime/md/github-reading-map.md)
- [`../../docs/runtime/md/quick-start.md`](../../docs/runtime/md/quick-start.md)
