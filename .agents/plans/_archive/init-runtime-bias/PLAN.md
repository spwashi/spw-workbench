# Plan: init-runtime-bias

Make `spw init` runtime-aware so it provisions a portable base scaffold everywhere, augments from a source checkout when richer workbench assets are available, and tells the truth about what each mode can provision.

## Goal

The desired end state is an installer/bootstrap path that behaves correctly from both a checkout and a packaged JS artifact while remaining portable across target repos. `spw init` should stop assuming the source tree layout, resolve its own package root robustly, and separate portable scaffold truth from optional workbench-specific augmentation. Taste note: improve correctness, clarity, portability, and layering by making runtime-mode detection explicit instead of implicit path folklore.

## Scope

- **In scope**: detect package root/runtime mode for `spw init`, define a portable base scaffold that works across target repos, prefer checkout-native support assets when present, provide a packaged fallback for release bundles, make agent-affordance installation truthful when full checkout affordances are unavailable, and document the behavior.
- **Out of scope**: redesign the scaffolded workspace structure beyond portability fixes, make the existing commit-review skill universally portable to arbitrary repos in one step, or flip the workspace/runtime contract away from source-first authoring.

## Files

[MOD] packages/spw-cli/src/init.ts
[NEW?] packages/spw-cli/templates/init/*
[MOD] scripts/release/build-js-dist.ts
[MOD] README.md
[MOD] .spw/conventions/packaging.spw
[MOD?] package.json
[MOD?] packages/spw-cli/src/run.ts

Craft guard:
- Keep `packages/spw-cli/src/init.ts` focused on bootstrap/runtime-context resolution only; do not turn it into a general package locator utility sink.
- Avoid encoding brittle path depth assumptions; package-root detection should be structural.
- Keep packaged fallback messaging explicit so users can tell when they have full checkout affordances versus a portable reduced scaffold.
- Prefer canonical portable templates over repo-bound file copying when the target needs to interoperate outside this workbench checkout.

## Commits

1. .[init-runtime-bias] — plan the source-vs-packaged init runtime split
2. &[init-runtime-bias] — make spw init resolve runtime context and provision a portable scaffold truthfully
3. .[init-runtime-bias] — document the source-first, portable installer/runtime contract

Fuzz strategy:
- Explore loop: `npm run spw -- init --help`
- Stabilize loop: `npm run build && npm run build:jsdist && npm run spw:init -- <tmpdir>`
- Ship gate: `npm run build && npm run test:run && node dist/bin/spw.js init <tmpdir>`

## Agentic Hygiene

- Rebase target: `main@1d34c0d8d22856f7c4fdf3527d3643299fecf421`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none
