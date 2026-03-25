# Plan: image-prompt-split

Split the image prompt surface into brief, renderer profile, and emit layers.

## Goal

The desired end state is a prompt surface that can be read in three passes: image intent, renderer-specific overrides, and emitted output. This addresses clarity and expressiveness by separating domain semantics from model knobs while preserving the richer prompt architecture already present in the file. The taste note is clarity: a reader should be able to tell what the image is, how it should render, and what text to send to a model without mentally untangling all three concerns at once.

## Scope

- **In scope**: restructure `prompts/image.prompt.spw` into `brief`, `renderer_profile`, and `emit`; move existing fields into the right layer; keep the noir example concrete and usable.
- **Out of scope**: parser/runtime changes, LSP changes, adding a generic prompt compiler, editing other prompt files for consistency.

## Files

```text
[MOD] prompts/image.prompt.spw
[NEW] .agents/plans/image-prompt-split/PLAN.md
[NEW] .agents/plans/image-prompt-split/wip.spw
[DEL] (none)
```

### Craft guard

`prompts/image.prompt.spw` stays single-file but concept count improves by making the three responsibilities explicit. No import risk applies here. File length increases slightly, but the responsibility split should make the surface easier to scan and maintain.

## Commits

1. `.[prompts] — plan image prompt surface split into brief, renderer profile, and emit`
2. `&[prompts] — restructure image prompt into semantic and renderer layers`
3. `.[prompts] — tighten emitted prompt guidance and model notes`

Fuzz strategy:
- Explore loop: `fuzz:explore --target=prompts`
- Stabilize loop: `fuzz:stabilize --target=prompts`
- Ship gate: `fuzz:ship --target=prompts`

## Agentic Hygiene

- Rebase target: `main@375bc1910b82024cf7e7fa35e29614206aa1ce1f`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; only in-scope drift is `prompts/image.prompt.spw`

## Dependencies

none

## Spw Artifact

None beyond `wip.spw`; this refactor does not introduce a new durable protocol.
