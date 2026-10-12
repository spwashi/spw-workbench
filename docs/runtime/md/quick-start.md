# Spw Quick Start

The current source-first install mounts this workbench at `.spw/_workbench`. The consumer repository remains authoritative for the surrounding `.spw` tree.

## Mount and Initialize

Prerequisites: Git and Node `^20.19.0 || >=22.12.0`.

```bash
git init
mkdir -p .spw
git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench
npm --prefix .spw/_workbench install
npm --prefix .spw/_workbench run spw:init -- ../..
npm --prefix .spw/_workbench run spw:doctor -- ../..
```

Initialization adds the consumer-owned workspace files and commit-review workflow without replacing existing files.

## Orient

```bash
npm --prefix .spw/_workbench run spw -- roots
npm --prefix .spw/_workbench run spw -- tree @spw --depth 3
npm --prefix .spw/_workbench run spw -- select .spw/index.spw --selector navigable --summary
```

`roots` reads `.spw/workspace.spw`. `tree` lists only `.spw` files and excludes `_workbench` unless `--include-workbench` is explicit. Relative paths resolve from the consumer root even though npm runs the mounted package.

## Result

```text
consumer-repository/
├── .agents/workflows/commit-review.md
├── .git/hooks/pre-commit        # commit review gate, when the target is a git repository
└── .spw/
    ├── README.md                # orientation, grow moves, verify commands
    ├── index.spw                # routing table, a ^["grow"] frame, a first question
    ├── mount.spw                # where the workbench is mounted
    ├── workspace.spw            # workspace roots and LSP configuration
    └── _workbench/              # the mounted workbench (infrastructure)
```

## Next: grow

```bash
npm --prefix .spw/_workbench run spw -- quest
```

The quest walks seven lines, from a plain sentence to a cited page with a question in it, and the parser reads each one back. Its last step runs `lint .spw` and `resolve --from .spw` against this repository. Then take one move from the `^["grow"]` frame in `.spw/index.spw` and verify it:

```bash
npm --prefix .spw/_workbench run spw -- lint .spw
npm --prefix .spw/_workbench run spw -- resolve --from .spw
```

## Then: play

```bash
npm --prefix .spw/_workbench run spw:init -- ../.. --preset quest
```

The quest preset adds `.spw/quest/`, a folder to play in. One open question runs through it: should `door~` bind to `door` the way `~door` does?

- `forks.spw` writes one thought several ways, each with what the parser read, and a `felt` line for you.
- `experiments.spw` cites syntax the workbench is still deciding, by catalog id and status.
- `shelves.spw` moves a claim from felt to proposed to measured; `spw measure .spw/quest` checks the size it declares.
- `wonders.spw` asks questions that carry a probe you can run.
- `asks.spw` keeps requests for the workbench in one shape, ready to send upstream.

Nothing here commits. Read the diff, then commit it yourself.

Continue with the [mounted-workbench contract](mounted-workbench.md) or run `npm --prefix .spw/_workbench run spw -- help`.

## Learn next

| Goal | Doc |
|------|-----|
| First steps, checked line by line | [docs/learn/quest.spw](../../learn/quest.spw) · `spw quest` |
| 15 min / 1 h / 1 day paths | [docs/learn/README.md](../../learn/README.md) |
| Operators + CLI one-pager | [docs/learn/cheat-sheet.md](../../learn/cheat-sheet.md) |
| invent → map → formula session | [docs/learn/worked-cli.md](../../learn/worked-cli.md) · [sense-loop.md](sense-loop.md) |
| Teachable surfaces | [docs/examples/](../../examples/) |
