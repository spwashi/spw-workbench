# Spw WebStorm/IntelliJ Plugin

This is the IntelliJ Platform plugin for the Spw (Symbolic Processing Workbench) language.

## Get started

1. Install the plugin and open a project.
2. Choose **Help | Start the Spw quest** (also under **Tools**, and in Find Action). It opens `quest.spw`,
   a scratch file with seven short panels. Each panel says what Spw reads in its line, what to notice,
   and what it lets you grow, then gives the line to try.
3. Change the lines or write your own under them. The scratch file lives outside the project; running
   the action again reopens it as you left it.

When a project with a `.spw` directory opens, one balloon offers the quest. **Don't show again** turns
the offer off in every project; starting the quest turns it off too.

The same panels run in a terminal, from a project with the workbench mounted at `.spw/_workbench`:

```bash
npm --prefix .spw/_workbench run spw -- quest
```

## Features

- **Semantic Syntax Highlighting**: TextMate scopes map to IntelliJ color semantics for clearer structure.
- **File Type Recognition**: Automatically recognizes `.spw` files.
- **LSP Support (optional)**: Starts the Spw language server when available, with per-project settings.
- **Navigation Aids**: Folding rules for section blocks and headings.
- **Workbench Instruments**: Saved-file Form, Surface Stack, and Cache inspection; standard LSP Rename; plan-only corpus refactors.

## Build and configure

### Prerequisites

- Java 21
- WebStorm 2024.2.1 through 2026.2.x (IntelliJ Platform builds 242 through 262)
- Node.js `^20.19.0` or `>=22.12.0` with npm (required for LSP and CLI instruments)

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

### Quest steps

`src/main/resources/quest/quest.json` is generated from `docs/learn/quest.spw` with the spw-seed parser.
After the quest changes, run from the repository root:

```bash
node --import tsx extensions/intellij-spw/scripts/sync-quest.mjs           # rewrite quest.json
node --import tsx extensions/intellij-spw/scripts/sync-quest.mjs --check   # exit 1 when quest.json is stale
```

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

### Workbench Instruments

Open **Tools | Spw Instruments** or use Find Action:

| Action | Behavior |
|---|---|
| **Inspect Spw Form** | Runs `spw form <surface> --resonance --spw` and opens a read-only Spw preview. |
| **Inspect Spw Surface Stack** | Runs `spw stack <surface> --json` and opens reusable JSON. |
| **Inspect Spw Cache** | Runs `spw inspect cache <surface> --json`; cache tier and hit state remain CLI-owned. |
| **Rename Spw Symbol** | Delegates to the standard IntelliJ Rename action backed by LSP prepareRename/rename. |
| **Plan Spw Corpus Refactor...** | Runs `spw refactor . --rename kind:from=to --json`; the action never adds `--write`. |

The process runs from the open consumer project while npm selects the project or mounted-workbench tool root. A dirty editor buffer is not silently inspected as stale disk content: save it, then rerun the file instrument. Results run in cancellable background tasks and open as read-only typed previews.

This host's creative contour is structural: keep Structure View, folding, and native Rename close while opening reusable Spw/JSON products as ordinary editor documents. The plugin does not reproduce the parser in Kotlin; it lets the same surface feel different when seen as outline, folded architecture, live LSP symbol, and saved intermediate form.

### Color Semantics

The TextMate grammar now emits IntelliJ-friendly scopes for headings, annotations, sigils, paths,
operators, and valences. This improves contrast and visual grouping across themes.

To customize colors: **Settings | Editor | Color Scheme | TextMate Bundles | Spw Language**.

### Navigation

Section blocks like `^['roots']{ ... }`, `^["roots"]{ ... }`, `^[Integration]['roots']{ ... }`,
and `^seed[...]` are foldable and indexed in Structure View to keep large files scannable.

## Design Boundary

TextMate supplies syntax fallback and native IntelliJ components supply folding, structure, gutter, actions, and previews. The shared Spw LSP owns semantic navigation, completion, diagnostics, and caret rename; the CLI owns saved-file and corpus instruments. A future PSI or client-substrate change should follow observed gaps, not duplicate parser meaning inside Kotlin.

## Project Structure

- `src/main/kotlin`: Plugin source code (Kotlin).
- `src/main/resources/META-INF/plugin.xml`: Plugin configuration.
- `src/main/resources/textmate`: Shared TextMate grammar and configuration.
- `src/main/resources/quest/quest.json`: Quest steps, generated by `scripts/sync-quest.mjs`.
