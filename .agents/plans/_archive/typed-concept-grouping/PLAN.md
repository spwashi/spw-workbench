# Plan: typed-concept-grouping

Make the VS Code concepts tree preserve semantic distinction when annotation names recur across topic, lens, intent, and anchor sigils.

## Goal

The desired end state is a concepts tree where "Concept" grouping still reads as a concept-first view, but no longer collapses unrelated annotation kinds into one flat bucket just because they share a name. In practice, mixed concepts should expand into explicit kind subgroups so the user can see whether a name is acting as a topic, lens, intent, or anchor before drilling into files. The quality bar here is clarity and expressiveness in the VS Code plugin UI, not a broader rethink of the annotation index.

**Taste note**: clarity, expressiveness, naming.

## Scope

- **In scope**: refine the VS Code tree node model, preserve concept-first top-level grouping, add explicit kind subdivision for mixed concepts, and improve concept node descriptions/tooltips so the grouped semantics are legible.
- **Out of scope**: new tree view commands, new grouping modes, annotation parser/index changes, LSP behavior changes, and broader extension docs work.

## Files

```text
[NEW] .agents/plans/typed-concept-grouping/PLAN.md
[NEW] .agents/plans/typed-concept-grouping/wip.spw
[MOD] extensions/vscode-spw/src/views/concepts-tree.ts
[DEL] (none)
```

### Craft guard

- Keep `extensions/vscode-spw/src/views/concepts-tree.ts` focused on tree modeling/rendering; avoid leaking this UI concern into `annotation-index.ts`.
- The file is already the full tree surface, so new helpers should reduce branching rather than add another dense switch tree.
- Preserve the existing import boundary and keep the change dependency-free inside the extension package.

## Commits

1. `.[plans] — stage typed concept grouping plan artifacts`
2. `&[vscode-concepts] — preserve kind boundaries inside concept grouping`
3. `![vscode-concepts] — compile the extension after the grouping refactor`

## Agentic Hygiene

- Rebase target: `main@32f60915721162c640854973333c0b28567a5a52`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Fuzz Strategy

- Explore: `npm --prefix extensions/vscode-spw run compile`
- Stabilize: `npm --prefix extensions/vscode-spw run compile`
- Ship gate: `npm --prefix extensions/vscode-spw run compile && git diff --check`
