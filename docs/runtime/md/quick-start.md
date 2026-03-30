# Spw Quick Start

This is the current setup path for `v0.3.0`.

The install model is:

- the site owns `.spw/`
- the workbench is mounted at `.spw/_workbench`
- parser, runtime, CLI, and LSP resolve through that mounted workbench

## Prerequisites

- Git
- Node `^20.19.0 || >=22.12.0`
- a site repo or an empty directory

## Setup

From the future site root:

```bash
git init
mkdir -p .spw
git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench
cd .spw/_workbench
npm install
npm run spw:init -- ../..
npm run spw:doctor -- ../..
```

## Result

`spw:init` seeds:

- `.spw/index.spw`
- `.spw/workspace.spw`
- `.spw/mount.spw`
- `.agents/workflows/commit-review.md`

If the site is already a Git repo, it also installs the pre-commit review hook.

`spw:doctor` verifies:

- the mounted workbench exists
- workbench dependencies are installed
- the site scaffold is present
- the current resolution contract works

## Expected Layout

```text
your-site/
├── .spw/
│   ├── _workbench/
│   ├── index.spw
│   ├── mount.spw
│   └── workspace.spw
└── .agents/
    └── workflows/
        └── commit-review.md
```

## Running Commands

Run through the mounted workbench:

```bash
npm --prefix .spw/_workbench run spw -- help
npm --prefix .spw/_workbench run spw -- doctor .
```

## Common Fixes

Missing workbench mount:

```bash
git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench
```

Missing workbench dependencies:

```bash
cd .spw/_workbench && npm install
```

Missing site scaffold:

```bash
cd .spw/_workbench && npm run spw:init -- ../..
```

Re-run verification:

```bash
cd .spw/_workbench && npm run spw:doctor -- ../..
```

## Boundary

- the site owns `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`
- the workbench owns `.spw/_workbench`

That is the install contract for the current release.
