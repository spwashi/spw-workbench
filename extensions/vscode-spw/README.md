# Spw Language Support for VS Code

Language support for the **Spw** (Symbolic Processing Workbench) language.

## Release Posture

This extension is the current **preview** editor surface for `v0.3.0`.

It is intentionally a **thin client**: syntax highlighting, snippets, and the Concepts view live in the extension, while parsing, semantic tokens, hover, diagnostics, completion, and code lens come from `spw-lsp`.

The current startup path still expects a **workbench checkout layout** so the extension can launch `packages/spw-lsp/src/stdio-server.ts`. That means the marketplace/discoverability story should stay narrower than the future site-install editor story for mounted `.spw/_workbench` repos.

## Modern Architecture

This extension is a **thin client** that delegates most language intelligence to the `spw-lsp` server, including parsing, semantic tokens, hover, diagnostics, completion, and code lens. This keeps the editor surface aligned with the current Spw language implementation.

## Features

- **Syntax Highlighting & Snippets** — TextMate grammar, snippets, and language configuration for `.spw` files.
- **LSP-Powered Semantic Tokens** — each sigil (`!`, `@`, `^`, `?`, `~`, `*`, `.`, `#`, `&`, `=`) is semantically tokenized by the server and mapped to your active theme's colors.
- **Language Intelligence** — hover, diagnostics, completion, document links, code lens, and formatting are delegated to `spw-lsp`.
- **Concepts View** — activity-bar explorer for navigating the current concepts tree.
- **Annotation & Metadata Styling** — rich styling for `~#focus`, `~#taste`, `~#goal`, and related metadata.

## Local Use

The extension is part of the `spw-workbench` repository and is bundled via `esbuild`.

For the current preview path:

1. Build the extension from the repo root or the extension directory.

```bash
npm --prefix extensions/vscode-spw run compile
```

2. Symlink the extension into your VS Code or Cursor extensions directory.

```bash
ln -s "$(pwd)/extensions/vscode-spw" ~/.vscode/extensions/spw-language-0.3.0
```

3. Open a checkout that contains the workbench package layout so the extension can resolve:

- `packages/spw-lsp/src/stdio-server.ts`
- `packages/spw-lsp/src/upstream-bridge.ts`

The mounted-site editor startup path is still part of the active install/editor work, so this README stays explicit about the current preview boundary.

## Documentation & Specs

For more information on the Spw language and the current `v0.3.0` release story, start with:

- `README.md`
- `docs/runtime/md/quick-start.md`
- `docs/runtime/md/migration-v02-v03.md`
- `docs/runtime/md/site-install-release-story.md`
