# Plan: vscode-cognitive-surface

Define what experienced engineers should **notice, learn, infer, and enjoy** when the Spw VS Code surfaces reveal workspace structure, field state, phase, and change over time — without adding noise.

## Goal

Core atlas/concepts/strip surfaces exist, but orientation language is still uneven. This plan is a **speculative / teaching** rung: user questions, surface taxonomy, comparison language, and joy-under-discipline. It improves legibility and cross-surface coherence *after* performance and capability honesty land.

**Taste note**: legibility, delight, containment, cross-surface coherence.

## Scope

- **In scope**: user-question catalog (“where am I?”, “what changed?”, “what is inherited?”, “what can I ignore?”); copy and badge dialect; comparative reading; reading/review/teaching/compact transform profiles; explicit familiarity and enjoyment studies; learner babble and steward-promotion copy; noise budget; links to strip, hover, atlas, concepts; optional render-only experiments that do not require new LSP methods first
- **Out of scope**: new semantic engines; webview consoles; implementing authoring probe loop features; performance packaging (rung 2)

## Relationship to ladder

Roadmap rung **5** — polish after rungs 0–4. May draft copy earlier; must not block performance or capability work.

**Doctrine inputs:** `operational-topography` and `vscode-editor-contract` own evidence eligibility, grades, authority, and differential shape. Garden profiles may own measurement recipes; cognitive profiles own wording, disclosure, rendered rotations, and explicit learning/joy experiments.

## Files

```text
[NEW] .agents/plans/vscode-cognitive-surface/PLAN.md
[MOD] .agents/plans/vscode-cognitive-surface/wip.spw
[NEW] .agents/plans/vscode-cognitive-surface/vscode-cognitive-surface.spw
[MOD?] extensions/vscode-spw/src/context-strip.ts
[MOD?] extensions/vscode-spw/src/views/workspace-tree.ts
[MOD?] extensions/vscode-spw/src/views/concepts-tree.ts
[REF] .agents/plans/vscode-editor-contract/PLAN.md
[REF] .agents/plans/vscode-lsp-roadmap/PLAN.md
```

### Craft guard

- Delight is subordinate to orientation and evidence truth; it is explicitly reported, not inferred from dwell time or syntax density.
- Prefer reusing existing surfaces over adding panels.
- Any copy change should reuse Spw vocabulary already in interaction contract.

## Commits

1. `.[plans] — formalize vscode-cognitive-surface PLAN and artifact`
2. `.[plans] — publish user-question catalog and noise budget`
3. `.[vscode]? — apply copy/badge dialect once lower rungs are quiet`

## Agentic Hygiene

- Rebase target: `main@b4832193891b2b89b7e1e20dc0e462e2e4c9236e`
- Rebase cadence: before implementation commits
- Hygiene split: none

## Dependencies

- Hard: operational-topography and editor-contract
- Soft: plugin-performance (so polish is not applied to thrashing UI)
- Related: workspace-atlas, authoring-probe-loop

## Spw Artifact

`.agents/plans/vscode-cognitive-surface/vscode-cognitive-surface.spw`
