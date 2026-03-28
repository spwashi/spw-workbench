# Spw Quick Start

This is the current public install shape for Spw `v0.3.0`.

The goal is not npm-first package consumption. The goal is to let a site codebase keep its own `.spw/` identity while mounting the workbench at `.spw/_workbench` as infrastructure.

## Prerequisites

- Git
- Node `^20.19.0 || >=22.12.0`
- An existing site repository or an empty directory you are willing to `git init`

## 5-Minute Setup

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

## What Those Commands Do

`git submodule add ... .spw/_workbench`

- mounts the workbench as infrastructure instead of copying its canon into your site

`npm run spw:init -- ../..`

- seeds a portable site scaffold:
  - `.spw/index.spw`
  - `.spw/workspace.spw`
  - `.spw/mount.spw`
  - `.agents/workflows/commit-review.md`
- arms `.git/hooks/pre-commit` when the site is already a git repo

`npm run spw:doctor -- ../..`

- checks:
  - `.spw/` exists
  - `.spw/_workbench` exists
  - workbench dependencies are installed
  - the seeded site scaffold is present

## What “Ready” Looks Like

After `spw:init` and `spw:doctor`, your site should look like this:

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

Your seeded `.spw/mount.spw` should declare:

- the mounted workbench root
- the tracked `0.3.0` spec version
- engaged surfaces such as `seed`, `runtime`, `cli`, and `lsp`
- resolution paths for spec, CLI, and LSP roots

## Running Commands From The Site

Until a site-local wrapper is standardized, invoke Spw through the mounted workbench:

```bash
npm --prefix .spw/_workbench run spw -- help
npm --prefix .spw/_workbench run spw -- doctor .
```

That keeps the current release story truthful: the workbench is mounted infrastructure, and the site stays the author of its own `.spw/` surfaces.

## Common First Errors

Missing `.spw/_workbench`

```bash
git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench
```

Workbench dependencies not installed

```bash
cd .spw/_workbench && npm install
```

Missing site scaffold

```bash
cd .spw/_workbench && npm run spw:init -- ../..
```

Re-check readiness

```bash
cd .spw/_workbench && npm run spw:doctor -- ../..
```

## Boundary Rule

The site owns `.spw/`.

The workbench owns `.spw/_workbench`.

That asymmetry is the point of the current `v0.3.0` install model.
