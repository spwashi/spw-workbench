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
└── .spw/
    ├── README.md
    ├── index.spw
    ├── mount.spw
    ├── workspace.spw
    └── _workbench/
```

Continue with the [mounted-workbench contract](mounted-workbench.md) or run `npm --prefix .spw/_workbench run spw -- help`.

## Learn next

| Goal | Doc |
|------|-----|
| 15 min / 1 h / 1 day paths | [docs/learn/README.md](../../learn/README.md) |
| Operators + CLI one-pager | [docs/learn/cheat-sheet.md](../../learn/cheat-sheet.md) |
| invent → map → formula session | [docs/learn/worked-cli.md](../../learn/worked-cli.md) · [sense-loop.md](sense-loop.md) |
| Teachable surfaces | [docs/examples/](../../examples/) |
