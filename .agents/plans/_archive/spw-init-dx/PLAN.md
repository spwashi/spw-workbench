# Plan: spw-init-dx

Make `spw` the root command identity, move bootstrap/install behavior behind a package-owned `init` command, and preserve compatibility for `spw-workbench install` plus local `spw:install` workflows.

## Goal

The desired end state is one truthful CLI identity: `spw` is both the operational umbrella and the future published binary, while installation/bootstrap becomes an explicit subcommand rather than the package’s primary face. This improves naming clarity, layering, and DX continuity by letting `spw init` scaffold a workspace without leaving installer logic stranded in a root script. Taste note: improve naming, layering, and correctness of the published command surface.

## Scope

- **In scope**: add package-owned `init`/`install` command handling, move installer logic into `@spwashi/spw-cli`, change the root package `bin` contract to publish `spw` as primary, keep `spw-workbench` as a compatibility alias to the same umbrella CLI, update local npm scripts/help/docs to prefer `spw init`, and document the compatibility behavior.
- **Out of scope**: publishing compiled JS bins, removing `spw-workbench` entirely, redesigning the scaffolded `.spw` payload, or refactoring unrelated analyzer/release scripts into packages.

## Files

[MOD] package.json
[MOD] packages/spw-cli/package.json
[MOD] packages/spw-cli/src/run.ts
[MOD] packages/spw-cli/src/index.ts
[NEW] packages/spw-cli/src/init.ts
[MOD?] packages/spw-cli/src/types.ts
[MOD] scripts/spw-install.ts
[MOD] README.md
[MOD] .spw/conventions/cli.spw
[MOD] .spw/conventions/naming.spw
[MOD] docs/runtime/md/lsp-editor-integration.md
[MOD?] lib/spw-v0.2.0-alpha/infra/index.spw

Craft guard:
- Keep `packages/spw-cli/src/init.ts` single-purpose: scaffold/install behavior only, not general CLI parsing.
- Avoid creating a second umbrella parser for `init`; route through the existing command table.
- Keep compatibility semantics explicit in help/docs so the command surface reads as intentional, not transitional residue.

## Commits

1. .[spw-init-dx] — plan the root-bin and init DX slice
2. &[spw-init] — move bootstrap/install logic behind the package-owned init command
3. &[spw-bin] — rebind package bin and compatibility wrappers to the root spw CLI
4. .[spw-dx-docs] — update help and docs to prefer spw init while documenting compat aliases

Fuzz strategy:
- Explore loop: `npm run spw -- init --help`
- Stabilize loop: `npm run build && npm run spw -- help && npm run spw:install -- --help`
- Ship gate: `npm run build && npm run test:seed && npm run lsp:smoke`

## Agentic Hygiene

- Rebase target: `main@9995888`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

If the bin/installer split needs a durable design note, record it as:

`.agents/plans/spw-init-dx/spw-init-dx.spw`
