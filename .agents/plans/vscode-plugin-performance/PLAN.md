# Plan: vscode-plugin-performance

Improve the VS Code extension's startup, indexing, and live-update behavior without turning the client into a second semantic engine.

## Goal

The current preview extension pays too much work too early: it starts the LSP through `tsx`, scans the workspace eagerly, rebuilds full annotation snapshots on save, and asks for cursor context from multiple surfaces independently. The desired end state is a faster, quieter extension that still preserves the repo's thin-client posture: semantic truth remains in `packages/spw-lsp/`, while the VS Code client becomes more selective about when it activates, refreshes, and recomputes. This branch improves performance, layering, and quiet feedback by removing duplicate work rather than hiding it behind longer debounce windows.

The plan should teach which costs belong to startup, which belong to steady-state editing, and which belong only to visible UI surfaces. It should also make the tradeoffs legible enough that future editor work does not reintroduce the same drift under a different feature name.

**Taste note**: performance, layering, quiet feedback.

## Scope

- **In scope**: audit advertised/configured/invoked/observed/tested behavior; compiled LSP launch strategy for shipped/editor-preview use; activation gating for tree views and sidecars; incremental annotation sync; deduplicated cursor-context transport; selective refresh rules; semantic-token reuse; bounded-concurrency scanning; mounted-consumer measurements.
- **Out of scope**: adding new editor capabilities, changing Spw language semantics, redesigning atlas or concepts UX beyond refresh policy, broad mount-protocol redesign, or building a full telemetry pipeline before performance fixes land.

## Files

```text
[NEW] .agents/plans/vscode-plugin-performance/PLAN.md
[NEW] .agents/plans/vscode-plugin-performance/wip.spw
[NEW] .agents/plans/vscode-plugin-performance/vscode-plugin-performance.spw
[REF] .spw/tooling/editor-surface-audit.spw
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/annotation-index.ts
[MOD] extensions/vscode-spw/src/context.ts
[MOD] extensions/vscode-spw/src/context-strip.ts
[MOD] extensions/vscode-spw/src/views/workspace-tree.ts
[MOD?] extensions/vscode-spw/src/views/concepts-tree.ts
[MOD] packages/spw-lsp/package.json
[MOD] packages/spw-lsp/src/stdio-server.ts
[MOD] packages/spw-lsp/src/server-index.ts
[MOD] packages/spw-lsp/src/handlers/semantic-tokens.ts
[MOD?] packages/spw-lsp/src/handlers/workspace.ts
[DEL] (none)
```

### Craft guard

- Keep semantic/editor truth in the LSP; performance work must not create a client-only semantics fork.
- `packages/spw-lsp/src/stdio-server.ts` is already a hot, oversized file; extract helper logic instead of widening the dispatcher further if launch or refresh logic expands.
- `extensions/vscode-spw/src/extension.ts` should remain orchestration-only; activation gating belongs in small helpers, not in one accumulating switchboard.
- Prefer incremental invalidation over global refresh. A faster-looking system that still recomputes everything is not actually lower concept count.
- Avoid solving every latency issue with longer debounce values. Debounce hides noise; it does not remove duplicate work.
- Visibility matters: if a tree view or status surface is not visible, it should not drive LSP traffic unless it owns a correctness-critical invariant.

## Commits

1. `.[plans] — stage vscode-plugin-performance planning artifacts`
2. `&[vscode-startup] — ship compiled LSP launch path and lean activation wiring`
3. `&[vscode-index] — replace full annotation rebuilds with incremental workspace sync`
4. `&[vscode-context] — share cursor context and gate view refreshes by visibility`
5. `&[spw-lsp] — reuse parse output for semantic tokens and tighten workspace scan cost`
6. `![vscode-performance] *audit[mounted-consumer] — verify startup, save, cursor, and sidebar behavior`

## Fuzz Strategy

- Explore loop: `fuzz:explore --target=vscode-plugin-performance`
- Stabilize loop: `fuzz:stabilize --target=vscode-plugin-performance`
- Ship gate: `fuzz:ship --target=vscode-plugin-performance`

The branch should pair these loops with concrete manual probes: activation time from window open to ready LSP, save-to-sidebar freshness, cursor-move request rate, semantic-token latency on a representative `.spw` file, and initialize-to-scan-complete time on the same workspace corpus.

## Agentic Hygiene

- Rebase target: `main@d503198758b88f5894102609473997e02ca196ce`
- Rebase cadence: before commit 1, before merge
- Hygiene split: no committed branch drift relative to `main`; one unrelated local edit exists at `.agents/plans/v030-release-prep/wip.spw` and should remain untouched throughout this branch

## Dependencies

- `mounted-consumer-tooling` — shared identity-free fixture and evidence states

Adjacent VS Code plans share hot files such as `extensions/vscode-spw/src/extension.ts`, `extensions/vscode-spw/src/context.ts`, and `packages/spw-lsp/src/stdio-server.ts`; treat them as coordination risks rather than reasons to skip the shared audit contract.

## Spw Artifact

This branch warrants a distilled artifact because the value is not only the patch set; it is the operational doctrine for future editor work. The sidecar `.spw` records the learning principles, performance axes, and tradeoffs so later VS Code or LSP features can reuse the same judgment instead of rediscovering it by profiling regressions.

`.agents/plans/vscode-plugin-performance/vscode-plugin-performance.spw`
