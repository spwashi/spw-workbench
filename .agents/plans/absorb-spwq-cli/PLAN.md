# Plan: absorb-spwq-cli

Normalize the selector CLI surface by moving `spwq` behind `@spw/cli`, repairing selector traversal so the command is behaviorally truthful on real corpus files, and trimming alias drift where names no longer reflect distinct behaviors.

## Goal

The desired end state is a single package-owned CLI surface where selector behavior is real rather than nostalgic, and where compatibility aliases exist for migration rather than because ownership is unclear. This slice improves correctness first, then layering and naming clarity: `spwq` should either be a thin compatibility face over the same selector engine as `spw`, or disappear as a separate implementation. Taste note: improve correctness, layering, and naming.

## Scope

- **In scope**: repair selector traversal, add selector dogfood coverage on real `.spw` corpus files, absorb `spwq` into `@spw/cli`, normalize overlapping command names and help text, update CLI conventions/docs to describe the canonical surface, and record the later DX direction that the published binary should become `spw` while install remains a supporting workflow.
- **Out of scope**: changing the published npm `bin` contract in this slice, redesigning `spw-ls`, reorganizing analyzer scripts into packages, or removing compatibility aliases that may still be used externally.

## Files

[MOD] package.json
[MOD] .spw/conventions/cli.spw
[MOD] packages/spw-cli/src/main.ts
[MOD] packages/spw-cli/src/run.ts
[MOD] packages/spw-cli/src/query.ts
[NEW] packages/spw-cli/src/spwq.ts
[MOD] packages/spw-seed/src/instrumentation/audit.ts
[MOD] packages/spw-seed/src/query/spwq.ts
[MOD?] packages/spw-seed/src/query/presets.ts
[NEW] test/seed/spwq-corpus.test.ts
[MOD] scripts/spwq.ts
[MOD] docs/runtime/md/lsp-editor-integration.md
[MOD] lib/spw-v0.2.0-alpha/applications/QUERY.md

Craft guard:
- Keep CLI entrypoints thin; avoid adding another large argument parser if `spwq` can reuse package-owned selector formatting.
- `packages/spw-seed/src/instrumentation/audit.ts` already carries multiple responsibilities; prefer a focused child-discovery repair rather than piling on more selector policy.
- Keep docs aligned with the actual public command names so the user-facing surface does not exceed what the implementation can sustain.

## Commits

1. .[selector-dogfood] — plan and document the selector normalization slice
2. &[selector-dogfood] — repair AST traversal and add corpus-level selector coverage
3. &[spwq-cli] — absorb spwq into the package-owned CLI with compatibility wrappers
4. .[cli-conventions] — normalize alias/docs language and record future bin DX direction

Fuzz strategy:
- Explore loop: `npm run test:seed -- spwq-corpus`
- Stabilize loop: `npm run test:seed && npm run lsp:smoke`
- Ship gate: `npm run build && npm run test:run && npm run test:seed`

## Agentic Hygiene

- Rebase target: `main@d0c8d2d`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

If the command taxonomy solidifies into a stable durable model, record it as:

`.agents/plans/absorb-spwq-cli/absorb-spwq-cli.spw`
