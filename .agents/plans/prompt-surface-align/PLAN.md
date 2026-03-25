# Plan: prompt-surface-align

Align the remaining prompt surfaces to the `brief` / `renderer_profile` / `emit` structure established in the image prompt.

## Goal

The desired end state is a `prompts/` directory where every prompt surface exposes the same three reading modes: semantic brief, execution profile, and emitted handoff. This improves clarity and maintainability by making prompt files comparable across domains instead of forcing each file to invent its own top-level contract. The taste note is naming and clarity: prompt structure should communicate responsibility at a glance.

## Scope

- **In scope**: restructure `website`, `design`, `experience`, `media`, `outreach`, and `song` prompt files into `brief`, `renderer_profile`, and `emit`; update internal references and `boonhonk` formulas to match.
- **Out of scope**: parser/runtime changes, cross-file code generation, filling every placeholder with fully resolved examples, editing non-prompt `.spw` files.

## Files

```text
[MOD] prompts/website.prompt.spw
[MOD] prompts/design.prompt.spw
[MOD] prompts/experience.prompt.spw
[MOD] prompts/media.prompt.spw
[MOD] prompts/outreach.prompt.spw
[MOD] prompts/song.prompt.spw
[NEW] .agents/plans/prompt-surface-align/PLAN.md
[NEW] .agents/plans/prompt-surface-align/wip.spw
[DEL] (none)
```

### Craft guard

`prompts/design.prompt.spw` already exceeds 400 lines and remains the highest concept-count file, but the split will reduce cognitive load by grouping concerns. No import guard applies. The main risk is stale internal references after nesting; verification will focus on those.

## Commits

1. `.[prompts] — plan prompt surface alignment across prompts directory`
2. `&[prompts] — align website experience media and outreach surfaces to brief/profile/emit`
3. `&[prompts] — align design and song surfaces to brief/profile/emit`
4. `.[prompts] — tighten emit guidance and consistency across prompt files`

Fuzz strategy:
- Explore loop: `fuzz:explore --target=prompts`
- Stabilize loop: `fuzz:stabilize --target=prompts`
- Ship gate: `fuzz:ship --target=prompts`

## Agentic Hygiene

- Rebase target: `main@375bc1910b82024cf7e7fa35e29614206aa1ce1f`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; current prompt and plan edits are in scope

## Dependencies

none

## Spw Artifact

None beyond `wip.spw`; this is a structural alignment pass, not a new durable protocol.
