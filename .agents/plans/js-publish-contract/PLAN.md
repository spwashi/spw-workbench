# Plan: js-publish-contract

Harden the JS distribution into a publishable contract by adding declaration output and explicit type-aware export metadata without disturbing the repo's source-TypeScript workspace flow. The end state should let `dist/` behave like a package artifact with runtime JS, entrypoint declarations, and version metadata derived from the root manifest. Taste note: this slice prioritizes correctness, layering, and TypeScript ergonomics.

## Scope

- **In scope**: emit declarations for the public runtime/parser entrypoints into `dist/`, write top-level declaration facades, add `types` metadata to the generated dist manifest, and verify the artifact with build plus `npm pack --dry-run`.
- **Out of scope**: flipping the root workspace to resolve through `dist/`, publishing internal package declarations as separate packages, and Bun/Deno-specific packaging.

## Files

[NEW] `.agents/plans/js-publish-contract/wip.spw`  
[MOD] `scripts/release/build-js-dist.ts` — add declaration emission and type-aware dist manifest generation  
[MOD?] `package.json` — add any verification scripts needed for dist-package validation  
[MOD?] `README.md` — document declaration-aware dist packaging if the public surface becomes user-facing

Craft guard

- Keep the dist builder focused on artifact generation; avoid turning it into a general package manager or release orchestrator.
- Preserve root version truth in `package.json`; dist metadata stays derived.
- Prefer explicit generated declaration facades over clever post-processing of bundled JS.

## Commits

1. `.[js-publish] — plan declaration-aware dist packaging`
2. `&[js-publish] — emit declarations and type-aware dist exports`
3. `.[js-publish-docs] — document and verify the publish contract`

## Agentic Hygiene

- Rebase target: `main@12663dcf37686916960170678ee29147690692b3`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

Optional. If the dist/package contract needs a lasting semantic note, record it at `.agents/plans/js-publish-contract/js-publish-contract.spw`.
