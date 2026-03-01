# Spw Workbench

Spw is a brace-first language where **operators are semantic actors** and **containers are structural facts**. The workbench ships that vision as working runtime, inspectable exhibits, and durable specification surfaces.

## Operators

Every operator has a role, a physics, and a phase in the [six-phase interpreter cycle](docs/design/spw/spirit-sequence.spw). The semantics table is defined in [semantics.ts](extensions/vscode-spw/src/semantics.ts).

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

Operator combinatorics are queryable via [`spw:ls`](scripts/spw-ls.ts) (and `spw:seq` alias). See [operator-lattice skill](.agents/skills/spw-operator-lattice/SKILL.md) for probe recipes.

## Containers

Braces are primordial and universal. See the [invariant proof](docs/design/spw/spirit-sequence.spw) (lines 29–38):

| Brace | Meaning | Spirit Sequence Role |
|:---:|:--|:--|
| `< >` | channel — directed, typed | `<#.>` — name the coupling |
| `( )` | grouping — parenthetical | `(#.)` — observe ground truth |
| `[ ]` | selection — ordered, indexable | `[#.]` — merge categorized truths |
| `{ }` | scope — the fundamental container | `{#.}` — materialize properties |

## Annotations

The `#` operator has four kinds. The [annotation index](extensions/vscode-spw/src/annotation-index.ts) tracks these across the workspace:

```
#topic        — plain annotation (topic tag)
#:lens        — lens (viewing perspective)
#!intent      — intent (action/purpose marker)
#>anchor      — anchor (cross-file reference point)
```

## Frames

Frames are the primary structural unit. See [cache.spw](.spw/biome/ocean/algos/cache.spw) and [material.spw](.spw/biome/ocean/algos/material.spw) for real examples:

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

Spw has seven dialect markers, unified in [dialect-spec.spw](.spw/registries/dialect-spec.spw). The [workspace manifest](.spw/workspace.spw) declares the default. Query dialects are in [dialect.spw](.spw/biome/ocean/query/dialect.spw).

### Lexing Dialects

| Dialect | Lexing Rule | Scope | Spec |
|:--|:--|:--|:--|
| **Spw.b** | newline = statement boundary | exhibits, formal specs | [workspace.spw](.spw/workspace.spw) |
| **Spw.l** | single-line expression, search-bar compact | query expressions, probe args | [dialect.spw](.spw/biome/ocean/query/dialect.spw) |
| **Spw.m** | pure ONF (F2-idempotent) | hash source, canonicalization | [canon-mount.spw](.spw/canon-mount.spw) |
| **Spw.x** | live + advisory `@lock` | runtime state, hot replacement | [hot.spw](.spw/hot.spw) |
| **Spw.o** | dense, operator-forward | experimental biome surface | [syntax.spw](.spw/biome/ocean/experiments/syntax.spw) |

### Query Perspectives

| Dialect | Focus | Source |
|:--|:--|:--|
| **Spw.q** | selector registry + symbolic handles | [q.spw](.spw/biome/ocean/query/q.spw) |
| **Spw.t** | repeatable run templates | [t.spw](.spw/biome/ocean/template/t.spw) |

## Spatial Architecture

The [`.spw/`](.spw/) directory is the canon root. Shelf convention is in [shelves.spw](.spw/shelves.spw), routing in [topology.spw](.spw/topology.spw), consequences in [consequence.spw](.spw/consequence.spw). The [canon-mount seed](.spw/canon-mount.spw) formalizes the mount.

```
.spw/
├── index.spw              # workspace manifest
├── registries/
│   ├── dialect-spec.spw       # unified dialect registry
│   ├── register-bank.spw      # operator-typed register slots
│   └── curiosity-brace.spw    # brace-side and symmetry ergonomics
├── applications/
│   └── symmetry/              # native dihedral actions
│       ├── symmetry-ui-design.spw
│       └── ...
├── tooling/
│   └── intellij-plugin.spw    # native syntax/structural features
├── canon-mount.spw        # multi-dialect mount seed
├── shelves.spw            # @-root convention
├── topology.spw           # subroot routing
├── consequence.spw        # projection/nesting effects
├── biome/
│   └── ocean/             # primary biome (index.spw)
│       ├── runtime.spw    # interpreter tick contracts
│       ├── lsp.spw        # language server architecture
│       ├── query/         # q.spw, dialect.spw, sel.spw, hot.spw
│       ├── algos/         # cache.spw, geom.spw, material.spw
│       └── experiments/   # syntax.spw (Spw.o dense forms)
├── gen/                   # generated projections (index.spw)
├── harness/               # evals (baseline-evals.spw), probes, runs
└── hot.spw                # hot replacement state
```

### Shelf Categories

Roots are defined in [roots.ts](extensions/vscode-spw/src/roots.ts):

| Category | Roots | Purpose |
|:--|:--|:--|
| **runtime** | `@biome` `@src` `@core` `@hot` | Engine, selectors, [interpreter](docs/design/spw/spirit-sequence.spw) |
| **measurement** | `@harness` `@state` | [Evals](.spw/harness/evals/baseline-evals.spw), [probes](.spw/harness/probes/probe-loop.spw) |
| **prose** | `@docs` `@library` `@theory` `@spec` | Architecture scaffolds, [theory](docs/research/spw/research.spw) |
| **macro** | `@spw` `@gen` `@scripts` `@agents` | [Tooling](scripts/), [generation](.spw/gen/index.spw), [agents](.agents/) |

## Material Properties

The [material model](.spw/biome/ocean/algos/material.spw) maps physical intuition to query tuning:

| Property | Meaning | Tuning |
|:--|:--|:--|
| **density** | concept packing / coupling pressure | cluster first, narrow lens |
| **viscosity** | resistance to change under hot iteration | [hot replacement guard](.spw/biome/ocean/query/hot.spw) |
| **elasticity** | recovery from projection perturbation | [scoped evolution](.spw/scoped-evolution.spw) |
| **porosity** | cross-boundary permeability | root convention, [selector grounding](.spw/biome/ocean/query/sel.spw) |
| **anisotropy** | directional bias in query traversal | [consequence trace](.spw/consequence.spw) |

The geometry formulas are in [geom.spw](.spw/biome/ocean/algos/geom.spw).

## Tooling

### Editor Extensions

| Editor | Source | Features |
|:--|:--|:--|
| **VS Code** | [extension.ts](extensions/vscode-spw/src/extension.ts) | [LSP client](scripts/lsp/stdio-server.ts), [semantic tokens](extensions/vscode-spw/src/providers/semantic-tokens.ts), [concepts tree](extensions/vscode-spw/src/views/concepts-tree.ts) |
| **IntelliJ** | [plugin.xml](extensions/intellij-spw/src/main/resources/META-INF/plugin.xml) | TextMate, LSP, [folding](extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwFoldingBuilder.kt), [structure view](extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwStructureViewFactory.kt), [templates](extensions/intellij-spw/src/main/resources/liveTemplates/spwTemplates.xml) |

### Scripts

| Command | Source | What |
|:--|:--|:--|
| `npm run spw:seq` | [spw-ls.ts](scripts/spw-ls.ts) | Operator/brace/label query with ranking (compat alias) |
| `npm run spw:ls` | [spw-ls.ts](scripts/spw-ls.ts) | Liminal selection CLI with [probe expressions](scripts/spw-ls/probe.ts) |
| `npm run spw:mem:dump` | [spw-mem.ts](scripts/spw-mem.ts) | Snapshot [runtime memory](.spw/harness/memory-surface.spw) lattice |
| `npm run spw:format` | [spw-format.ts](scripts/spw-format.ts) | Canonical formatting ([Spw.m ONF](.spw/canon-mount.spw)) |
| `npm run spw:dev` | [spw-dev.ts](scripts/spw-dev.ts) | Polling dev server with parse validation |

### LSP Server

The [language server](scripts/lsp/stdio-server.ts) provides definition, document links, hover, completion, document symbols, workspace symbols, CodeLens, and formatting — all via `@-root` [path resolution](extensions/vscode-spw/src/roots.ts) across 22 roots.

## Design Documents

| Doc | What |
|:--|:--|
| [spirit-sequence.spw](docs/design/spw/spirit-sequence.spw) | Six-phase interpreter cycle |
| [affordance-ladder.spw](docs/design/spw/affordance-ladder.spw) | Progressive disclosure design |
| [stage-scaling-architecture.spw](docs/design/spw/stage-scaling-architecture.spw) | Stage scaling model |
| [component-adaptation.spw](docs/design/spw/component-adaptation.spw) | Component adaptation patterns |
| [architecture.spw](docs/plans/spw/architecture.spw) | Implementation architecture plan |
| [query-projection-workbench.spw](docs/plans/spw/query-projection-workbench.spw) | Query + projection workflow |

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
npm run compile          # build VS Code extension
npm run spw:dev          # start .spw dev watcher
npm run spw:seq -- --seq '?~@&*^' --root .spw  # query operator sequences
```
