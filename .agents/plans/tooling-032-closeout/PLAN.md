# Plan: tooling-032-closeout

Close out the remaining 0.3.2 formatter, LSP, CLI, VS Code, and surface tasks.

## Goal

Finish the already-started formatter work and carry the rest of the 0.3.2 tooling slice to a coherent stop: formatter coverage, LSP range formatting, CLI flag/help cleanup, VS Code concepts tree improvements, the plugin surface stub, and version bumps. The end state should tighten correctness at the formatting boundary while making the command and editor surfaces more legible and easier to operate. Taste note: this plan optimizes for clarity and correctness first, with a secondary push on naming and UI expressiveness.

## Scope

- **In scope**: finish canonical formatting behavior already in the worktree; add formatter tests for braces/comments/blank lines/brackets; add document-range formatting in the LSP; add `--full` to `spw:format`; extract shared CLI flag parsing; unify help rendering for the CLI; fix stale `@spec` root in the VS Code client; add grouping modes plus commands to the concepts tree; add concepts tree search/filter; add a `.spw/surfaces/plugins/` stub; bump package/workspace versions to `0.3.2`.
- **Out of scope**: broader formatter redesign, non-tooling language changes, unrelated VS Code UX work outside the concepts tree, release packaging changes beyond version numbers, and any edits to Claude's `.claude` plan artifacts.

## Files

[MOD] packages/spw-seed/src/canonical/index.ts — finish bracket-aware indentation and frame blank-line behavior already started locally.
[MOD] src/seed/__tests__/canonical.test.ts — land the expanded formatter regression coverage.
[MOD] packages/spw-lsp/src/handlers/editing.ts — add range-formatting support alongside whole-document formatting.
[MOD] packages/spw-lsp/src/stdio-server.ts — advertise and dispatch `textDocument/rangeFormatting`.
[MOD] packages/spw-lsp/src/types.ts — add the range-formatting request shape.
[MOD] packages/spw-cli/src/args.ts — extract shared/common flag parsing.
[MOD] packages/spw-cli/src/format.ts — add `--full`, use shared flag parsing, and switch to shared help rendering.
[MOD] packages/spw-cli/src/run.ts — unify top-level help output and route subcommand help more consistently.
[MOD?] scripts/spw-format.ts — only if wrapper/help examples need to change.
[MOD] extensions/vscode-spw/src/roots.ts — point `@spec` at `lib/spw-v0.3.0`.
[MOD] extensions/vscode-spw/src/views/concepts-tree.ts — grouping modes, commands, and search/filter.
[MOD] extensions/vscode-spw/src/extension.ts — register concepts tree commands/input flow if needed.
[MOD] extensions/vscode-spw/package.json — command/menu metadata and version bump.
[NEW] .spw/surfaces/plugins/ — stub surface entry for plugins canon.
[MOD] package.json — workspace version/scripts bump to `0.3.2`.
[MOD] packages/spw-cli/package.json — bump to `0.3.2`.
[MOD] packages/spw-lsp/package.json — bump to `0.3.2`.
[MOD] packages/spw-runtime/package.json — bump to `0.3.2`.
[MOD] packages/spw-seed/package.json — bump to `0.3.2`.
[MOD] extensions/vscode-spw/package.json — bump to `0.3.2`.

### Craft guard

No predicted file should cross 600 lines or 12 imports from this slice. The main concept-density risk is `extensions/vscode-spw/src/views/concepts-tree.ts`, which is currently single-purpose; grouping/search state should stay contained there or in a tiny adjacent helper if it starts mixing view state and command orchestration too aggressively. `packages/spw-cli/src/run.ts` should remain a router/help surface and not absorb formatting logic.

## Commits

1. `![seed] — finish canonical formatting behavior and regression coverage`
2. `&[lsp-cli] — add range formatting and shared format/help flag plumbing`
3. `&[vscode] — fix @spec root and add concepts tree grouping/filter controls`
4. `#[release] — add plugin surface stub and bump 0.3.2 versions`

## Agentic Hygiene

- Rebase target: `main@41943d222d88ffec897f70edab8becc37d44cec6`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none in `main...HEAD`; current uncommitted edits in `packages/spw-seed/src/canonical/index.ts` and `src/seed/__tests__/canonical.test.ts` are treated as in-scope carry-forward work, not unrelated drift

## Dependencies

none

## Fuzz Strategy

- Explore: `npm run test:seed`
- Stabilize: `npm run build`
- Ship: `npm run test:seed && npm run build`
