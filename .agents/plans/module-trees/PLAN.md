# Plan: module-trees

Each package's folder tree says what the module is made of. Families sit in folders named for what they do, files are named for their verb, tests sit beside what they test, and no file only repeats another. (Card and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A read-only survey on 2026-10-13 (main at `71a6ce96`) measured six source trees:

- **CLI:** 103 files flat at the root of `packages/spw-cli/src`. Seven are named for an alias instead of their verb: census lives in `inventory.ts`, graph in `map.ts`.
- **Language server:** the only package that keeps its tests apart, under `__tests__` (29 files). `handlers/` mixes protocol methods with pure readers.
- **Seed:** `canonical/` holds 44 source files flat, and four root files do nothing but re-export their folders.
- **VS Code extension:** two views pass the 600-line guard, each with its own copy of the density bar.

The owner reads trees to orient. A folder should say what its files share, and a name should say where to look.

Taste: group by reason to change, one move per commit, no churn for its own sake.

## Scope

- **In scope:** the moves in [wip.spw](./wip.spw), lowest risk first:
  1. zero-rewrite deletions
  2. language-server tests beside their sources
  3. CLI family folders
  4. VS Code `commit/` and the view splits
  5. language-server `reading/` and the `display.ts` split
  6. seed `canonical/` subfolders
  7. the CLI `inspect/` and `pulse/` splits
  8. the `server-index` split and an `index/` folder
- **Routed elsewhere:**
  - runtime splits and the `src/` shims: runtime-maintenance
  - `scripts/`: tooling-scripts-consolidation
  - the sigil-table copies: audit-ui-data-models
  - a CLI `commands/` folder: waits for cli-mode-overhaul to settle command groups
- **Never moved:** the entries pinned by `package.json`, tsconfig paths, vitest aliases and the release scripts (listed in the card's survey frame).

## How a move is made

1. `git mv` the files and let `tsc` name every relative import to rewrite.
2. `spw refactor --rename path:from=to --write` rewrites `.spw` citations. Markdown links are fixed by hand.
3. Update plan `touches` and `roots`; `plan-index --check` fails on a missing path.
4. Run `test:lsp`, `test:vscode` and `test:analyzers` by hand, because `test:run` skips them.

## Questions for the owner

- `?[test_placement]`: is a sibling `name.test.ts` the one convention?
- `?[verb_names]`: are CLI files named for their verb?
- `?[disclose_word]`: disclose or disclosure?
- `?[canonical_name]`: does `canonical/` stay as an umbrella over its new subfolders?

## Agentic Hygiene

- Rebase target: `main@71a6ce96`.
- The seed `edit/` and `measure/` moves wait for runtime-maintenance `one_hash_module`, which edits four of their files. The `pulse/` split waits for `legacy_tests_home`, which moves the tests that import `pulse.ts`.
