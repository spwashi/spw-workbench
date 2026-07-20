# Spw Workbench

Spw Workbench is a source-first language, runtime, and tooling stack for `.spw` workspaces.

It combines:

- a parser and type model
- a runtime and substrate/event system
- a language server and editor surfaces
- workspace contracts, specs, and research notes

The repo currently ships:

- a parser kernel in [`packages/spw-seed/`](packages/spw-seed)
- a runtime and substrate/event model in [`packages/spw-runtime/`](packages/spw-runtime)
- a language server in [`packages/spw-lsp/`](packages/spw-lsp)
- a CLI in [`packages/spw-cli/`](packages/spw-cli)
- a VS Code extension in [`extensions/vscode-spw/`](extensions/vscode-spw)
- canon/spec/research surfaces under [`.spw/`](.spw) and [`docs/`](docs)

## What This Project Is

Spw itself is a brace-first language where operators carry semantic roles and containers carry structural facts.

This repository is the working bench where:

- language semantics are specified
- parser and runtime behavior are implemented
- editor affordances are tested against real corpus files
- install, publishing, and research workflows are made explicit

For a first read from GitHub, this README is the top-level orientation surface: what the repo contains, what is currently true, and where the main contracts live.

## Current Truth

- **Source-first**: checkouts are the primary development surface.
- **Consumer-first install**: independent repositories currently mount the workbench at `.spw/_workbench`.
- **Thin client editor**: the VS Code extension delegates language behavior to `spw-lsp`.
- **Narrow public claim**: the install story is intentionally smaller than the long-term packaging story.

For the current install boundary, start with [docs/runtime/md/quick-start.md](docs/runtime/md/quick-start.md).

## Start Reading

If you want the shortest useful route through the repo:

1. Read [docs/runtime/md/github-reading-map.md](docs/runtime/md/github-reading-map.md).
2. Read [docs/runtime/md/quick-start.md](docs/runtime/md/quick-start.md) for the current install truth.
3. Read [`.spw/workspace.spw`](.spw/workspace.spw) for the workspace contract.
4. Read [`packages/spw-seed/src/parser.ts`](packages/spw-seed/src/parser.ts) if you care about syntax/parsing.
5. Read [`packages/spw-lsp/src/stdio-server.ts`](packages/spw-lsp/src/stdio-server.ts) and [`packages/spw-lsp/src/server-index.ts`](packages/spw-lsp/src/server-index.ts) if you care about editor behavior.
6. Read [`packages/spw-runtime/src/`](packages/spw-runtime/src) if you care about runtime/substrate behavior.

## Quick Start For This Checkout

```bash
npm install
npm run spw -- help
npm run test:lsp
npm run build
```

Useful local commands:

| Command | Purpose |
|:--|:--|
| `npm run spw -- help` | CLI entrypoint |
| `npm run spw:dev` | dev watcher |
| `npm run lsp` | stdio language server |
| `npm run test:lsp` | LSP test suite |
| `npm run test:runtime` | runtime test suite |
| `npm run build` | TypeScript typecheck |
| `npm --prefix extensions/vscode-spw run compile` | build VS Code extension |

## Site Install Shape

The current public install model is site-first:

```text
your-site/
├── .spw/
│   ├── _workbench/      # mounted spw-workbench
│   ├── index.spw
│   ├── mount.spw
│   └── workspace.spw
└── .agents/
```

The boundary is deliberate:

- the site owns `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`
- the workbench owns `.spw/_workbench`

That keeps site canon and workbench infrastructure distinct.

Bootstrap details are in [docs/runtime/md/quick-start.md](docs/runtime/md/quick-start.md) and [docs/runtime/md/site-install-release-story.md](docs/runtime/md/site-install-release-story.md).

## Repo Map

| Area | Why read it |
|:--|:--|
| [`packages/spw-seed/`](packages/spw-seed) | lexer/parser/types |
| [`packages/spw-runtime/`](packages/spw-runtime) | interpreter and substrate-driven events |
| [`packages/spw-lsp/`](packages/spw-lsp) | hover, diagnostics, completion, symbols, display logic |
| [`packages/spw-cli/`](packages/spw-cli) | CLI verbs and workspace tooling |
| [`extensions/vscode-spw/`](extensions/vscode-spw) | thin client over the LSP |
| [`.spw/`](.spw) | canon specs, conventions, install surfaces, probes |
| [`docs/`](docs) | public-facing runtime/design docs |
| [`.agents/`](.agents) | agent workflows, plans, and local automation |

## Language Sketch

This is enough to orient quickly without reading the whole corpus first.

### Core operators

| Sigil | Role |
|:---:|:--|
| `?` | probe / question |
| `~` | potential / deferral / reference |
| `@` | perspective / root |
| `&` | merge / confluence |
| `*` | value / collapse |
| `^` | frame / integration |
| `!` | action / injection |
| `=` | config / constraint |
| `%` | measure |
| `#` | annotation / metadata |
| `.` | ground / access |

### Containers

| Brace | Meaning |
|:---:|:--|
| `< >` | channel |
| `( )` | grouping |
| `[ ]` | selection |
| `{ }` | scope |

### Annotation forms

```text
#topic
#:lens
#!intent
#>anchor
```

For the actual semantic model, read:

- [docs/design/spw/spirit-sequence.spw](docs/design/spw/spirit-sequence.spw)
- [`.spw/workspace.spw`](.spw/workspace.spw)
- [`.spw/tooling/vscode-spw.spw`](.spw/tooling/vscode-spw.spw)

## What Looks Stable vs Exploratory

Relatively stable:

- package boundaries
- source-first repo posture
- mounted-consumer install model
- LSP thin-client direction
- `.spw/workspace.spw` as workspace contract surface

Still actively evolving:

- mounted-consumer editor startup polish
- public packaging/distribution convenience
- some display vocabulary and atlas surfaces in the VS Code extension
- publishing flows derived directly from Spw sources

## Why This Repo Exists

The project keeps the main layers close together:

- language tooling that stays inspectable end to end
- editor affordances grounded in actual corpus structure
- a parser/runtime/LSP stack that keeps its research surfaces close to the code
- explicit install and authorship boundaries for multi-repo systems

The goal is direct extension, not a flattened generated scaffold.

## VS Code Extension

The VS Code extension lives in [`extensions/vscode-spw/`](extensions/vscode-spw).

It currently provides:

- syntax highlighting and snippets
- LSP-powered hover, diagnostics, completion, links, and formatting
- Concepts and Workspace Atlas views

The extension README is here:

- [extensions/vscode-spw/README.md](extensions/vscode-spw/README.md)

## Design And Runtime Docs

Useful documentation surfaces:

- [docs/runtime/md/github-reading-map.md](docs/runtime/md/github-reading-map.md)
- [docs/runtime/md/quick-start.md](docs/runtime/md/quick-start.md)
- [docs/runtime/md/migration-v02-v03.md](docs/runtime/md/migration-v02-v03.md)
- [docs/runtime/md/site-install-release-story.md](docs/runtime/md/site-install-release-story.md)

## Contributing

Before changing behavior, read the local workflow rules in:

- [AGENTS.md](AGENTS.md)
- [CLAUDE.md](CLAUDE.md)
- [.agents/README.md](.agents/README.md)

If you want to extend the system rigorously, the best first move is to follow an actual request path end to end:

1. pick a `.spw` source
2. inspect parser/runtime/LSP handling
3. run the targeted tests
4. tighten the docs and contracts alongside the code
