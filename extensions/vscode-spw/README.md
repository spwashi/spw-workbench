# Spw Language Support for VS Code / Antigravity

Syntax highlighting for the **Spw** (Symbolic Processing Workbench) language.

## Features

- **Operator physics semantics** — each sigil (`!`, `@`, `^`, `?`, `~`, `*`, `.`, `#`, `&`, `=`) has its own color mapping to Spw's cognitive register system
- **3-layer visual hierarchy** — bright sigils/content, dimmed containers, neutral operators
- **Contained string highlighting** — `^seed[curriculum]`, `Lab 1.01`, `scaffold`, and `—` are highlighted even inside quoted strings
- **WIP constructs** — `^["section"]{}` headers, `>>[timestamp] action —` stream entries, `~[N]` commit entries, `~[N..M]` ranges
- **Annotation tags** — `~#focus`, `~#taste`, `~#goal`, `~#status` each with distinct styling
- **Valence pentad** — `!boon`, `!bane`, `!bone`, `!bonk`, `!honk` with semantic colors

## Installation

### VS Code
```bash
# Symlink into VS Code extensions directory
ln -s /path/to/extensions/vscode-spw ~/.vscode/extensions/spw-language-0.1.0
```

### Antigravity / Cursor
```bash
# Symlink into extensions directory
ln -s /path/to/extensions/vscode-spw ~/.cursor/extensions/spw-language-0.1.0
```

Then reload the editor window.

## Color Palette (Gruvbox-aligned)

| Semantic | Color | Hex |
|---|---|---|
| Boon (!) action | Green | `#b8bb26` |
| Bone (@) observer | Teal | `#83a598` |
| Honk (^) integration | Gold | `#fabd2f` |
| Bonk (?) wonder | Orange | `#fe8019` |
| Bane (!) danger | Red | `#fb4934` |
| Potential (~) | Purple | `#b16286` |
| Containers | Dimmed echoes | varies |
| Operators | Warm grey | `#a89984` |
| Punctuation | Dim grey | `#665c54` |
