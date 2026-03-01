# Spw Workbench

Spw is a brace-first language where **operators are semantic actors** and **containers are structural facts**. The workbench ships that vision as working runtime, inspectable exhibits, and durable specification surfaces.

Install it in a project, point it at a `.spw/` directory, and it gives you a parser, interpreter, LSP, and a substrate-driven event system for layered UI generativity.

## Quick Start

```bash
npm install
npm run spw:dev          # start .spw dev watcher
npm run lsp              # start language server
```

Each site creates its own `.spw/` directory:

```
your-project/
├── .spw/
│   ├── index.spw              # workspace manifest
│   ├── state/
│   │   └── observable.spw     # runtime metrics (%[key] measurement points)
│   ├── surfaces/
│   │   └── publish.spw        # projection rules (frames → HTML/RSS/JSON)
│   └── substrates/
│       └── structural.spw     # substrate bindings (event-driven processing)
├── content/
└── package.json
```

## Substrates

A **substrate** is a processing context where register events react. Expressions *bind to* a substrate; `~` deferral is a substrate binding — it waits for the right catalyst.

```typescript
import { Substrate, RegisterBank, detectResonances } from 'spw-workbench'

// Create a substrate and attach it to a register bank
const substrate = new Substrate('reactive')
const registers = new RegisterBank({}, substrate)

// Bind a handler — like ~ deferral in Spw
substrate.bind('write:*', event => {
  console.log(`${event.key} wrote ${event.value}`)
})

// Writes emit events to the substrate
registers.set('greeting', 'hello', { source: 'user' })

// After processing, scan for emergent coupling
const resonances = detectResonances(substrate)
// → value-echo, phase-sync, frequency-lock, implicit-couple
```

### Resonance Detection

The resonance detector scans a substrate's event log for implicit coupling:

| Resonance | What It Finds | Chemistry Analogy |
|:--|:--|:--|
| **value-echo** | Two registers with identical values | Same precipitate in two vessels |
| **phase-sync** | Registers reaching the same phase simultaneously | Synchronized crystallization |
| **frequency-lock** | Similar write frequency | Harmonic vibration |
| **implicit-couple** | Value of A references key of B | Covalent bond discovered |

### Pipeline Precipitates

Each stage of the pipeline produces a **precipitate** — the product that crystallizes out:

```typescript
import { collectPrecipitates, precipitateToSpw, projectionToSpw } from 'spw-workbench'

const { precipitates, result } = collectPrecipitates('!["hello"]')
// precipitates: [desugar, parse, normalize, interpret]

// Render any stage's state as operable Spw text
const spw = precipitateToSpw(precipitates[3])  // interpret → register expressions

// Coagulate all stages into a single aggregate Spw frame
const projection = projectionToSpw(precipitates)
```

## Operators

Every operator has a role, a physics, and a phase in the [six-phase interpreter cycle](docs/design/spw/spirit-sequence.spw).

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

Operator combinatorics are queryable via [`spw:ls`](scripts/spw-ls.ts). See the [operator-lattice skill](.agents/skills/spw-operator-lattice/SKILL.md) for probe recipes.

## Containers

| Brace | Meaning |
|:---:|:--|
| `< >` | channel — directed, typed |
| `( )` | grouping — parenthetical |
| `[ ]` | selection — ordered, indexable |
| `{ }` | scope — the fundamental container |

## Annotations

```
#topic        — plain annotation (topic tag)
#:lens        — lens (viewing perspective)
#!intent      — intent (action/purpose marker)
#>anchor      — anchor (cross-file reference point)
```

## The `.spw/` Directory

The `.spw/` directory is the workspace root. Each site creates one:

```
.spw/
├── index.spw              # workspace manifest
├── state/
│   ├── observable.spw     # runtime metrics (bound to $%[metric] hover)
│   └── locks.spw          # agent claim locks
├── surfaces/
│   ├── index.spw          # output format definitions
│   ├── publish.spw        # projection rules
│   ├── domains.spw        # domain registry
│   └── plugin-protocol.spw # plugin framework
├── substrates/
│   └── structural.spw     # default batch substrate
├── runtime/
│   └── precipitates.spw   # pipeline concept definition
├── registries/            # operator/brace registries
├── harness/               # evals and probes
└── conventions/           # naming and selection rules
```

### Material Properties

The [material model](.spw/biome/ocean/algos/material.spw) maps physical intuition to processing:

| Property | Meaning |
|:--|:--|
| **density** | concept packing / coupling pressure |
| **viscosity** | resistance to change under hot iteration |
| **elasticity** | recovery from projection perturbation |
| **porosity** | cross-boundary permeability |
| **anisotropy** | directional bias in traversal |

## Tooling

### Editor Extensions

| Editor | Source |
|:--|:--|
| **VS Code** | [extension.ts](extensions/vscode-spw/src/extension.ts) — LSP, semantic tokens, concepts tree |
| **IntelliJ** | [plugin.xml](extensions/intellij-spw/src/main/resources/META-INF/plugin.xml) — LSP, folding, structure view |

### CLI

| Command | What |
|:--|:--|
| `npm run spw:dev` | Polling dev server with parse validation |
| `npm run spw:ls` | Operator/brace/label query with ranking |
| `npm run spw:format` | Canonical formatting (Spw.m ONF) |
| `npm run spw:mem:dump` | Snapshot runtime memory lattice |
| `npm run lsp` | Start language server (stdio) |

### LSP Server

The [language server](scripts/lsp/stdio-server.ts) provides definition, hover (with runtime trial), completion, document symbols, CodeLens, diagnostics, and formatting — all via `@-root` path resolution.

## Dialects

| Dialect | Rule | Use |
|:--|:--|:--|
| **Spw.b** | newline = statement boundary | exhibits, specs |
| **Spw.l** | single-line expression | search bar, probes |
| **Spw.m** | pure ONF (idempotent) | canonicalization |
| **Spw.x** | live + advisory `@lock` | hot replacement |

## Commits

Subject as title card, body as `#[episode]{...}` block:

```
&[refactor] ^[hover] — extract HoverProvider

#[episode]{
  ~[scene]{ "hover module — sigil, annotation, @-root, path peek" }
  ![change]{ intent: "141 lines, 4 hover strategies" }
}
```

## Design Documents

| Doc | What |
|:--|:--|
| [spirit-sequence.spw](docs/design/spw/spirit-sequence.spw) | Six-phase interpreter cycle |
| [affordance-ladder.spw](docs/design/spw/affordance-ladder.spw) | Progressive disclosure |
| [stage-scaling-architecture.spw](docs/design/spw/stage-scaling-architecture.spw) | Stage scaling model |
