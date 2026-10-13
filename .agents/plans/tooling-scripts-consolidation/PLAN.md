# Plan: tooling-scripts-consolidation

Every script and npm name states what it runs. Spw-native analyzers live inside `spw` verbs. Dead and UI-era scripts retire behind warnings. Nothing a hook, skill, or mounted consumer runs breaks along the way. (Card and next move: [wip.spw](./wip.spw) · the review, per script: [tooling-scripts-consolidation.spw](./tooling-scripts-consolidation.spw) · index: [../index.spw](../index.spw))

## Goal

A read-only review on 2026-10-13 covered every script, npm name, hook source, and skill loader. Its sorting:
- **Keep:** the commit gate and the caches gate.
- **Consolidate:** three groups (archive checks, agent context, bundles).
- **Reintegrate:** seven analyzers into existing verbs or packages (`spw resolve`, `delta --ast`, `form`, `lint --particles`, one `spw review`, `spw plan` and `spw agent`, and the LSP smoke into `packages/spw-lsp`).
- **Deprecate:** UI-era and stale loaders.
- **Remove:** nine `scripts/lsp` re-export shims that nothing imports.

It also found work that needs doing:
- A hazard: `spw:reset` runs `git clean` on `.spw` with `--force` built in, and the local allowlist runs `spw:*` without a prompt.
- Hidden failures: `test:analyzers` fails 3 of 34 tests and `lsp:smoke` fails 2 of 22. Neither is in `test:run`.
- A broken source bundle: it omits `packages/`.
- Gate checks that test nothing.
- About a dozen npm names that misdescribe what they run.

Taste note: truthful names and one home per behavior, with shims before removals.

## Scope

- **In scope:** the commit sequence in [wip.spw](./wip.spw):
  1. a safe reset, `test:all`, and the bundle fix
  2. analyzer tests that pass and run
  3. gate dead checks removed
  4. truthful aliases
  5. docs, skills, and commands brought to canonical names
  6. the LSP entry and shims
  7. one archive check
  8. analyzers moved into verbs
  9. `spw review`
  10. `spw plan` and `spw agent`
  11. retirement of UI-era scripts
- **Out of scope:**
  - Changing the commit gate's behavior.
  - Editing local agent settings. The allowlist is the owner's; this plan only removes the hazard from the script.
  - The VCS adapter, which belongs to `local-numbering-vcs`.

## Files

```
[MOD] package.json, packages/*/package.json — names, test:all, lint:spw:strict, aliases that warn
[MOD] scripts/release/bundle-*.sh → scripts/release/bundle.sh — one preamble; srcdist includes packages/
[MOD] scripts/commit-review/run-review.sh, .agents/skills/spw-commit-review/scripts/poll-review.sh — dead checks, inert flags
[MOD] scripts/analyzers/* — v020 checks merged; path-check, refactor-check, topography, flow, particle census routed into verbs
[MOD] packages/spw-cli/src/{resolve,delta,form,lint,review,plan,agent}.ts — absorbing verbs
[DEL] scripts/lsp/{context,helpers,server-index,spw-selector,types}.ts, scripts/lsp/handlers/*.ts
[MOD] CLAUDE.md, .agents/skills/*/SKILL.md, agent command files, docs/contributing/* — canonical names
```

### Craft guard

`spw-lib.sh` (980 lines) and `agent-lib.sh` (1,105) are past the 600-line guard. The plan and agent verbs shrink the second.

## Agentic Hygiene

- Rebase target: `main@813444dc`. Planned on `feature/caches-living-tree`; implementation on its own branch.
- Every move updates plan `touches`, because `plan-index --check` fails on missing paths.

## Dependencies

- **Shares:**
  - `audit-fuzz-truthfulness` and `hygiene-index-consolidation` (their alias steps moved here)
  - `plan-tooling-design` (the `spw plan` verbs)
  - `cli-mode-overhaul` (effect ceilings for the absorbing verbs)
  - `local-numbering-vcs` (git calls in scripts)
  - `caches-living-tree` (the cut gate is invoked by path)
  - `citation-navigation` (`spw resolve` absorbs the path check)

## Failure Modes

- **Hard:**
  - A hook or a consumer hook sources a moved script.
  - A rename leaves the allowlisted prefixes.
- **Non-negotiable:**
  - `poll-review.sh` and `spw-syntax-review.ts` stay working, as shims if they move.
  - No destructive script carries a built-in force flag.
