# Spw Language Support for VS Code / Antigravity

Language support for the **Spw** (Symbolic Processing Workbench) language.

## Modern Architecture

This extension is a **thin client** that delegates most language intelligence to the `spw-lsp` server, including parsing, semantic tokens, hover, diagnostics, completion, and code lens. This keeps the editor surface aligned with the current Spw language implementation.

## Features

- **LSP-Powered Semantic Tokens** — each sigil (`!`, `@`, `^`, `?`, `~`, `*`, `.`, `#`, `&`, `=`) is semantically tokenized by the server and mapped to your active theme's colors.
- **Cognitive Register System** — 3-layer visual hierarchy (bright sigils, dimmed containers, neutral operators) derived from the language's core semantics.
- **Annotation & Metadata** — rich styling for `~#focus`, `~#taste`, `~#goal`, and more, using standard theme scopes.
- **Valence Awareness** — `!boon`, `!bane`, `!bone`, `!bonk`, `!honk` with semantic meanings recognized by the engine.

## Installation

The extension is part of the `spw-workbench` repository. It is bundled via `esbuild`.

To install locally:
1. `npm run compile` in the extension directory.
2. Symlink `extensions/vscode-spw` to your VS Code/Cursor extensions folder:
   `ln -s $(pwd)/extensions/vscode-spw ~/.vscode/extensions/spw-language-0.3.2`

## Documentation & Specs

For more information on the Spw language and its cognitive model, see the `docs/` folder in the root of the repository.
