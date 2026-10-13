# Plan: local-numbering-vcs

One rule for local numbering (labels are identity, ordinals are derived for display), and a version-control setting in `.spw/workspace.spw`, detected by default, that every VCS touchpoint reads. (Card and next move: [wip.spw](./wip.spw) · inventory: [local-numbering-vcs.spw](./local-numbering-vcs.spw) · index: [../index.spw](../index.spw))

## Goal

The workbench numbers things in several ways at once.
- Commits are labels: `~[name]` planned, `.[name](hash)` landed.
- Proposals are authored numbers: p1 to p11.
- Receipts and some next-step lists are positional: r1, `~[1]`.
- Streams, journal entries, releases, and tags use dates.

The owner liked the old `~[N]` prefix because the number took its own color and the order could be scanned. But predicted numbers were hard to maintain, and positional numbers hid which commit was which (`90c58bbc`). So the rule keeps labels and derives the ordinal:
- Tools number a plan's commits by frame order.
- Tools color them by state.
- No one authors or renumbers the ordinal.

Every tool also assumes git:
- The lexer's commit-ref pattern.
- LSP commit hovers.
- `spw init` hooks and submodules.
- `agent-lib.sh`'s hardcoded `main`.
- Release and analyzer scripts.

A `^["vcs"]` setting in the workspace, auto-detected, lets a jj, SHA-256 git, or VCS-less workspace use the same plans and tools, with gaps named instead of errors.

Taste note: derive what can be derived; one adapter owns the VCS.

## Scope

- **In scope:**
  - The numbering rule in the plan schema.
  - The inventory.
  - The workspace setting and its detection.
  - One VCS adapter for the CLI, LSP, agent scripts, and release and analyzer scripts.
  - The commit-ref id pattern as a lexer option.
  - Fixtures for git, jj-colocated, and none.
- **Out of scope:**
  - Rendering the derived ordinal and state color. That is the editor visual hierarchy plan's work, and this plan supplies the rule.
  - Changing the commit gate beyond naming its git-only status (`?[jj_hooks]`).
  - Rewriting history or existing `.[name](hash)` lines.

## Files

```
[NEW] .agents/plans/local-numbering-vcs/{PLAN.md,wip.spw,local-numbering-vcs.spw}
[MOD] .agents/plans/_schema/wip.spw, .agents/plans/_schema/wip-template.spw — numbering rule; stale ~[N] section removed
[MOD] .spw/workspace.spw — ^["vcs"] setting
[NEW] packages/spw-cli/src/vcs.ts (+ test) — detect, head, default branch, is-ancestor, short id, status, log
[MOD] packages/spw-cli/src/{doctor,init,atlas,commands}.ts — use the adapter; doctor reports it; `spw vcs --json`
[MOD] .agents/scripts/agent-lib.sh — default branch and base sha from the adapter
[MOD] packages/spw-lsp/src/handlers/commit-refs.ts, packages/spw-lsp/src/upstream-bridge.ts — through the adapter
[MOD] packages/spw-seed/src/lexer/commit-ref.ts (+ test) — id pattern as an option; default unchanged
[MOD] scripts/release/build-parser-release.ts, scripts/analyzers/spw-episode-corpus.ts — through the adapter
```

Craft guard: `vcs.ts` stays under 300 lines and owns every git call it replaces. The seed stays portable: it takes a pattern and never reads workspace files.

## Commits

Canonical list: `wip.spw` `^["commits"]`. In order: numbering inventory, then the schema rule, the settings, the adapter, agent-lib, the LSP, the commit-ref pattern, scripts, and fixtures.

## Agentic Hygiene

- Rebase target: `main@813444dc`. Planned on `feature/caches-living-tree`. Implementation takes its own branch.
- Hygiene split: none.

## Dependencies

None to merge first.
- **Shares:** `caches-living-tree` (tags and journal dates), `parser-releases` (release ids), `plan-tooling-design`, `hygiene-index-consolidation`.
- **Feeds:** `plan-stream-parse-health` (the commit-ref token), and the editor visual hierarchy plan (derived ordinals).

## Failure Modes

- **Hard:**
  - A widened id pattern lexes hex-looking prose words as ids.
  - Detection picks the wrong kind and the commit gate stops running.
- **Soft:**
  - A jj or VCS-less workspace shows commit refs as unresolved ids.
- **Non-negotiable:**
  - With no setting, a git repository behaves exactly as today.
  - No planned commit is given an authored number.

## Spw Artifact

`local-numbering-vcs.spw` records the rule, the numbering inventory, the VCS touchpoints, and the setting sketch.
