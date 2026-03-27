# Plan: absorb-spwq-cli

Normalize the selector CLI surface for the packages-era, submodule-era workbench by moving `spwq` behind `@spwashi/spw-cli`, repairing selector traversal so the command is behaviorally truthful on real corpus files, and trimming alias drift where names no longer reflect distinct behaviors.

## Goal

The desired end state is a single package-owned CLI surface where selector behavior is real rather than nostalgic, and where compatibility aliases exist for migration rather than because ownership is unclear. For site codebases mounting the workbench at `.spw/_workbench`, the public verbs should be `spw query`, `spw select`, and `spw ls`; `spwq` should survive only as a compatibility face over the same selector engine. This slice improves correctness first, then layering and naming clarity, while explicitly leaving install plumbing to the site-install branch. Taste note: improve correctness, layering, and naming.

## Scope

- **In scope**: repair selector traversal, add selector dogfood coverage on real `.spw` corpus files, absorb `spwq` into `@spwashi/spw-cli`, normalize overlapping command names and help text, update CLI conventions/docs to describe the canonical surface, and record that site codebases invoke these verbs through `.spw/_workbench/packages/spw-cli/` or a thin local wrapper.
- **Out of scope**: changing `.spw/_workbench` resolution mechanics, implementing `spw init` or `spw doctor`, redesigning `spw-ls`, or removing compatibility aliases that may still be used externally.

## Files

```text
[MOD?] package.json
[MOD] .spw/conventions/cli.spw
[MOD] packages/spw-cli/src/main.ts
[MOD] packages/spw-cli/src/run.ts
[MOD] packages/spw-cli/src/query.ts
[NEW] packages/spw-cli/src/spwq.ts
[MOD] packages/spw-seed/src/instrumentation/audit.ts
[MOD] packages/spw-seed/src/query/spwq.ts
[MOD?] packages/spw-seed/src/query/presets.ts
[MOD] src/seed/query/__tests__/spwq-corpus.test.ts
[MOD] scripts/spwq.ts
[MOD] docs/runtime/md/lsp-editor-integration.md
[MOD] lib/spw-v0.2.0-alpha/applications/QUERY.md
```

### Craft guard
- Keep CLI entrypoints thin; avoid adding another large argument parser if `spwq` can reuse package-owned selector formatting.
- `packages/spw-seed/src/instrumentation/audit.ts` already carries multiple responsibilities; prefer a focused child-discovery repair rather than piling on more selector policy.
- Keep docs aligned with the actual public command names so the user-facing surface does not exceed what the implementation can sustain.
- This branch owns verb truth, not install plumbing; do not smuggle `.spw/_workbench` bootstrap logic into selector work.

## Commits

Commits 2-3 establish selector truth and package ownership. Commit 4 hardens the public vocabulary so site-install, DX, and release docs can speak about one CLI surface.

1. .[selector-dogfood] — plan and document the selector normalization slice
2. &[selector-dogfood] — repair AST traversal and add corpus-level selector coverage
3. &[spwq-cli] — absorb spwq into the package-owned CLI with compatibility wrappers
4. .[cli-conventions] — normalize alias/docs language and record future bin DX direction

Fuzz strategy:
- Explore loop: `npm run test:seed -- spwq-corpus`
- Stabilize loop: `npm run test:seed && npm run lsp:smoke`
- Ship gate: `npm run build && npm run test:run && npm run test:seed`

## Agentic Hygiene

- Rebase target: `main@3b1747c4` (updated 2026-03-27)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

- `register-phase-evolution` — selector/phase terminology should stay aligned with the canonical runtime-query vocabulary when help text and docs harden.

## Spw Artifact

If the command taxonomy solidifies into a stable durable model, record it as:

`.agents/plans/absorb-spwq-cli/absorb-spwq-cli.spw`
