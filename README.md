# Spw Workbench

Spw Workbench is the source-first language, runtime, and tooling organelle for `.spw` workspaces.

It ships a portable parser, runtime, language server, CLI, VS Code extension, and the canon used to develop them. A repository can mount the workbench at `.spw/_workbench` while retaining authority over its own `.spw` tree.

## Start Here

- [Reading map](docs/runtime/md/github-reading-map.md) — shortest route through this repository
- [Quick start](docs/runtime/md/quick-start.md) — create or mount a workspace
- [Mounted workbench](docs/runtime/md/mounted-workbench.md) — prompt, ownership, and navigation contract
- [Workspace manifest](.spw/workspace.spw) — canonical roots and language settings

For a local checkout:

```bash
npm install
npm run build
npm run spw -- roots
npm run spw -- tree @spw --depth 2
```

## Mounted Workbench Organelle

```text
consumer-repository/
└── .spw/
    ├── README.md
    ├── index.spw
    ├── mount.spw
    ├── workspace.spw
    └── _workbench/     # mounted infrastructure
```

The consumer owns `.spw/`; the workbench owns `.spw/_workbench`. Normal scans exclude mounted infrastructure. Explicit inspection remains available:

```bash
npm --prefix .spw/_workbench run spw -- doctor ../..
npm --prefix .spw/_workbench run spw -- roots
npm --prefix .spw/_workbench run spw -- tree @spw --depth 3
npm --prefix .spw/_workbench run spw -- tree @workbench --include-workbench --depth 2
```

This is an organelle rather than a repository center: it supplies machinery, preserves a membrane around ownership, and can be upgraded or removed without making consumer canon illegible.

## Repository Map

| Area | Responsibility |
|:--|:--|
| [`packages/spw-seed/`](packages/spw-seed) | lexer, parser, shared syntax utilities |
| [`packages/spw-runtime/`](packages/spw-runtime) | interpreter and substrate events |
| [`packages/spw-lsp/`](packages/spw-lsp) | semantic editor behavior |
| [`packages/spw-cli/`](packages/spw-cli) | workspace discovery, selection, queries, and diagnostics |
| [`extensions/vscode-spw/`](extensions/vscode-spw) | thin VS Code client and navigation surfaces |
| [`.spw/`](.spw) | canon, conventions, exhibits, and tooling contracts |
| [`docs/`](docs) | public narrative documentation |
| [`.agents/`](.agents) | plans, skills, workflows, and local instruments |

## Language Sketch

Spw is brace-first: operators carry semantic roles and containers carry structural facts.

| Sigil | Role | Sigil | Role |
|:---:|:--|:---:|:--|
| `?` | probe | `~` | potential/reference |
| `@` | perspective/root | `&` | merge |
| `*` | value/collapse | `^` | frame/integration |
| `!` | action | `=` | constraint |
| `%` | measure | `#` | annotation |
| `.` | ground/access | | |

Containers are `<channel>`, `(group)`, `[selection]`, and `{scope}`. Read [the spirit sequence](docs/design/spw/spirit-sequence.spw) for the semantic model.

## Editor Surface

The VS Code extension provides syntax support, standard LSP features, Concepts and Workspace views, and `Spw: Navigate Roots and Landmarks`. The client owns editor wiring; `spw-lsp` owns language meaning. See the [extension README](extensions/vscode-spw/README.md).

## Development

```bash
npm run test:seed
npm run test:runtime
npm run test:lsp
npm --prefix extensions/vscode-spw run compile
```

Before changing behavior, read [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), and [.agents/README.md](.agents/README.md).
