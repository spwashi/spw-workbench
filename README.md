# Spw Workbench

Spw is a brace-first language where **operators are semantic actors** and **containers are structural facts**. The workbench ships that vision as working runtime, inspectable exhibits, and durable specification surfaces.

## Operators

Every operator has a role, a physics, and a phase in the six-phase interpreter cycle:

| Sigil | Role | Physics | Phase |
|:---:|:--|:--|:--|
| `?` | probe / wonder | measurement onset | 1 |
| `~` | potential / superposition | wavefunction — defer, name | 2 |
| `@` | perspective / observer | observation — push scope | 3 |
| `&` | confluence / merge | entanglement — combine frames | 4 |
| `*` | value / collapse | collapse — scope to concrete | 5 |
| `^` | integration / framing | emission — bind upward | 6 |
| `!` | action / injection | kinetic — fires effect | 0 |
| `=` | config / constraint | bias — forcing state | binding |
| `%` | measure / observation | scalar — quantify | observe |
| `#` | annotation / resonance | vibration — self-reference | meta |
| `.` | ground / access | ground state — context | access |

## Containers

Braces are primordial and universal:

| Brace | Meaning |
|:---:|:--|
| `{ }` | scope — the fundamental container |
| `[ ]` | selection — ordered, indexable |
| `( )` | grouping — parenthetical |
| `< >` | channel — directed, typed |

## Annotations

The `#` operator has four kinds:

```
#topic        — plain annotation (topic tag)
#:lens        — lens (viewing perspective)
#!intent      — intent (action/purpose marker)
#>anchor      — anchor (cross-file reference point)
```

## Frames

Frames are the primary structural unit — a named scope with annotations:

```spw
^["intent"]{
  ~#goal: "Cache expensive selector/link resolution."
  #:cache #!optimization
}

^property[density]{
  meaning: "how many refs/concepts are packed in the active scope"
  measure: [metric, coupling_density]
}
```

## Dialects

Spw has four lexing modes:

| Dialect | Lexing Rule | Scope |
|:--|:--|:--|
| **Spw.b** | newline = statement boundary | exhibits, formal specs |
| **Spw.l** | newline-as-space | seeds, prose-heavy files |
| **Spw.x** | live + advisory `@lock` | runtime state |
| **Spw.m** | pure ONF (F2-idempotent) | hash source, canonicalization |

## Spatial Architecture

The `.spw/` directory is the canon root. Content is organized by `@-root` shelves:

```
.spw/
├── index.spw              # workspace manifest
├── canon-mount.spw        # multi-dialect mount seed
├── shelves.spw            # @-root convention
├── topology.spw           # subroot routing
├── consequence.spw        # projection/nesting effects
├── editing.spw            # category heuristics
├── biome/
│   └── ocean/             # primary biome
│       ├── index.spw
│       ├── runtime.spw    # interpreter tick contracts
│       ├── lsp.spw        # language server architecture
│       ├── query/         # selector registry, dialect contracts
│       └── algos/         # cache, geometry, material properties
├── gen/                   # generated projections
├── harness/               # eval baseline + probes
└── hot.spw                # hot replacement state
```

### Shelf Categories

| Category | Roots | Purpose |
|:--|:--|:--|
| **runtime** | `@biome` `@src` `@core` `@hot` | Engine, selectors, interpreter |
| **measurement** | `@harness` `@state` | Evals, probes, snapshots |
| **prose** | `@docs` `@library` `@theory` `@spec` | Narrative, specification |
| **macro** | `@spw` `@gen` `@scripts` `@agents` | Tooling, generation, agents |

## Tooling

### Editor Extensions

| Editor | Features |
|:--|:--|
| **VS Code** | LSP client, semantic tokens, concepts TreeView, operator envelope hover, phase mini-bar CodeLens, shelf-category @-root hover |
| **IntelliJ** | TextMate grammar, LSP, code folding, structure view, 7 live templates, gutter icons |

### Scripts

| Command | What |
|:--|:--|
| `npm run spw:seq` | Operator/brace/label query with ranking |
| `npm run spw:ls` | Liminal selection CLI with probe expressions |
| `npm run spw:mem:dump` | Snapshot runtime memory lattice |
| `npm run spw:mem:load` | Restore from snapshot |
| `npm run spw:format` | Canonical formatting (ONF) |
| `npm run spw:dev` | Polling dev server with parse validation |

### LSP Server

The language server (`scripts/lsp/stdio-server.ts`) provides:
- Definition, document links, hover, completion
- Document symbols, workspace symbols, CodeLens
- `@-root` path resolution across 22 roots
- Annotation index with cross-file references

## Commits

Episodes-only — subject as title card, body as one `#[episode]{...}` block:

```
&[refactor] ^[hover] — extract HoverProvider

#[episode]{
  ~[scene]{ "hover module — sigil, annotation, @-root, path peek" }
  ![change]{ intent: "141 lines, 4 hover strategies" }
}
```

## Getting Started

```bash
npm install
npm run compile          # build VS Code extension (dist/extension.js)
npm run spw:dev          # start .spw dev watcher
npm run spw:seq -- --seq '?~@&*^' --root .spw  # query operator sequences
```
