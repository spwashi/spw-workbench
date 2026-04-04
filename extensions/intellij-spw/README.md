# Spw WebStorm/IntelliJ Plugin

This is the IntelliJ Platform plugin for the Spw (Symbolic Processing Workbench) language.

## Features

- **Semantic Syntax Highlighting**: TextMate scopes map to IntelliJ color semantics for clearer structure.
- **File Type Recognition**: Automatically recognizes `.spw` files.
- **LSP Support (optional)**: Starts the Spw language server when available, with per-project settings.
- **Navigation Aids**: Folding rules for section blocks and headings.

## Getting Started

### Prerequisites

- Java 21 (required by IntelliJ Platform 2024.2+)
- IntelliJ Platform 2024.2+ (build 242+) (IntelliJ IDEA Ultimate, WebStorm)
- Node.js 18+ (only required if you enable LSP)

### Building the Plugin

To build the plugin, run:

```bash
./gradlew buildPlugin
```

The built plugin ZIP will be in `build/distributions/`.

### Running/Debugging

To run a development instance of IntelliJ with the plugin installed:

```bash
./gradlew runIde
```

### LSP Configuration

By default, the plugin starts the LSP server using:

```
npm run lsp
```

If your project layout differs, open **Settings | Tools | Spw LSP** and configure a custom command
and/or working directory.

Tips:
- Leave fields empty to use defaults.
- Set the working directory to the repo root containing `package.json` with an `lsp` script.
- The stable launcher contract is `npm run lsp`, which runs `scripts/lsp/stdio-upstream-bridge.ts`.
- That launcher checks, in order: `SPW_LSP_SERVER_PATH`, local `packages/spw-lsp/src/stdio-server.ts`,
  local `scripts/lsp/stdio-server.ts`, then the `remote.lore.url` checkout path for those same paths.

### Color Semantics

The TextMate grammar now emits IntelliJ-friendly scopes for headings, annotations, sigils, paths,
operators, and valences. This improves contrast and visual grouping across themes.

To customize colors: **Settings | Editor | Color Scheme | TextMate Bundles | Spw Language**.

### Navigation

Section blocks like `^['roots']{ ... }`, `^["roots"]{ ... }`, `^[Integration]['roots']{ ... }`,
and `^seed[...]` are foldable and indexed in Structure View to keep large files scannable.

## Implementation Roadmap

Currently, the plugin uses the TextMate grammar from the VS Code extension for syntax highlighting. To provide deeper language support, the following steps are recommended:

1. **Custom Lexer and Parser**: Use JFlex and Grammar-Kit to implement a full BNF-based parser for Spw.
2. **PSI (Program Structure Interface)**: Define PSI elements to enable advanced features like:
   - Go to Definition
   - Find Usages
   - Rename Refactoring
   - Code Completion
3. **Annotators/Inspectors**: Add custom logic for semantic validation and highlighting.
4. **LSP Integration**: Alternatively, if Spw has a Language Server, use the IntelliJ LSP API.

## Project Structure

- `src/main/kotlin`: Plugin source code (Kotlin).
- `src/main/resources/META-INF/plugin.xml`: Plugin configuration.
- `src/main/resources/textmate`: Shared TextMate grammar and configuration.
