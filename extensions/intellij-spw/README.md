# Spw WebStorm/IntelliJ Plugin

This is the IntelliJ Platform plugin for the Spw (Symbolic Processing Workbench) language.

## Features

- **Semantic Syntax Highlighting**: TextMate scopes map to IntelliJ color semantics for clearer structure.
- **File Type Recognition**: Automatically recognizes `.spw` files.
- **LSP Support (optional)**: Starts the Spw language server when available, with per-project settings.
- **Navigation Aids**: Folding rules for section blocks and headings.

## Getting Started

### Prerequisites

- Java 21
- WebStorm 2024.2.1 through 2026.2.x (IntelliJ Platform builds 242 through 262)
- Node.js 18+ (only required if you enable LSP)

The repository includes `.java-version` for Java version managers. On an Intel macOS Homebrew
installation, the equivalent environment setup is:

```bash
brew install openjdk@21
brew link --force openjdk@21
java -version
```

The final command should report Java 21 before running Gradle.

### Building the Plugin

To build the plugin, run:

```bash
./gradlew buildPlugin
```

The built plugin ZIP will be in `build/distributions/`.

From the repository root, `npm run test:intellij` runs focused plugin tests and
`npm run verify:intellij` runs the project, structure, and WebStorm compatibility gates.

### Compatibility coordinates

| Coordinate | Value |
|---|---|
| Build host | WebStorm 2024.2.1 |
| Verified hosts | WebStorm 2026.2.0.1 and 2026.2.1 |
| Declared range | `since-build=242`, `until-build=262.*` |
| Build runtime | Java 21, Gradle 9.5 |

Building against the oldest host protects the backwards-compatible floor. Plugin Verifier checks
the packaged artifact against the two 2026.2 hosts before a release bundle is assembled.

### Running/Debugging

To run a development instance of IntelliJ with the plugin installed:

```bash
./gradlew runIde
```

### LSP Configuration

By default, the plugin starts the LSP server using:

```
npm run --silent lsp
```

If your project layout differs, open **Settings | Tools | Spw LSP** and configure a custom command
and/or working directory.

Tips:
- Leave fields empty to use defaults.
- The plugin first checks the open project for a `package.json` with an `lsp` script, then checks
  the project's mounted `.spw/_workbench`.
- Set the working directory to explicitly override that discovery order.
- The stable package-script contract is `npm run lsp`; the plugin invokes it with `--silent` so npm
  does not add presentation output to the LSP stdio channel.
- The script runs `scripts/lsp/stdio-upstream-bridge.ts`.
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
