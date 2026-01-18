# Research-Oriented Development Episodes (Workbench)

This document outlines a paced development plan structured as “episodes” suitable for research audiences and for producing screen recordings where visual semantics make both learning and video editing easier.

The immediate target is **Vim Geology + layered navigation**: auditable key combinations, progressive disclosure, undo/redo foundations, and theming hooks that remain legible under motion and compression.

## Episode Contract `@spw:episode`

Each episode ships:

1. **One visible UX change** (small, demonstrable, reviewable).
2. **One instrumentation/audit improvement** (key combos remain auditable; state changes observable).
3. **One documentation update** with `@spw:*` markers for follow-up and standardization.

Each episode ends with:
- A **repeatable demo script** (steps + expected UI cues).
- A **reset path** (restore state for retakes and learner re-entry). `@spw:boundary`

## Visual Semantics for Recording + Editing

### Broadcast/Recording Mode `@spw:todo`

Goal: stable, readable composition for viewers.
- Stabilize layout (reduce shifting panels, predictable focus rings).
- Reduce visual noise (optional reduced motion, calmer backgrounds).
- Optional **keystroke overlay** that reuses the same semantic palette as Vim Geology.

### Chapter Markers `@spw:todo`

Goal: make video editing easier by producing edit points.
- Provide a command that emits a timestamped **chapter marker** into the audit stream.
- Markers should include: active region, activation context, and current walkthrough step.

### “What Changed” Highlighting `@spw:todo`

Goal: help viewers track edits without narration.
- When operations mutate code/structure, visually mark affected spans/nodes and log the delta.
- Ensure these highlights are undoable and replayable (ties into command history).

## Progressive Disclosure Audit + Feature Granularity Labeling

Progressive disclosure is treated as a first-class audit lane:
- See `docs/audits/ontological-geometry-audit.md` for the “ontological geometry” framing.
- See `src/features/keyboard/VIM-KEYBINDINGS.md` for current Vim Geology behavior and audit notes.

### Labeling Pass `@spw:todo`

Tag binding groups and contexts with a tier:
- **Beginner**: core navigation, focus movement, basic mode switching.
- **Intermediate**: activation contexts, operator preparation, common object motions.
- **Advanced**: operator-focused motions, structural transforms, specialized inspection.

Goal: reduce cognitive load while preserving automaticity by making *relevance* explicit and hiding/revealing detail by default.

### Documentation Markers + Linting `@spw:doclint @spw:todo`

Standardize documentation conventions using `@spw:*` markers that can later be linted:
- `@spw:todo` — actionable gaps with intended follow-up.
- `@spw:boundary` — where resetting, determinism, and “what counts as state” must stay precise.
- `@spw:episode` — episode deliverables and demo scripts.
- `@spw:term` — glossary-worthy terminology (activation context, semantic lens, operator layers).

Linting targets (future):
- Enforce consistent binding tables (keys → meaning → context → tier).
- Require “Reset / Replay” section when walkthroughs or plan state are discussed.
- Require links to the relevant audits for any new disclosure/UI layer.

## Theming as Differential Topology (CSS)

Treat CSS as a handle for differential topology:
- Components expose **state-sensitive surfaces** (focus, active region, activation context, layer depth).
- Themes encode **relative salience** as continuous fields (opacity, glow intensity, border weight, temperature).
- Structural similarity stays legible through consistent primitives (chips, borders, strata, badges).

This supports “hyperlexical communication”: viewers can infer meaning by *shape + color temperature + motion* without reading everything.

### Theme Contract (Artist-Friendly) `@spw:todo`

Goal: enable artists to ship cohesive skins without breaking layout/accessibility.
- Bound the surface area: CSS variables + a small set of component hooks.
- Provide validation gates: contrast checks, reduced-motion compliance, selector restrictions, performance budgets.
- Package as “theme seeds”: palette + motion preset + component recipes + optional assets.

## Companion Specs

- `docs/design/semantic-features-model.md` — semantics-first theming primitives (intensity/proximity/clarity) + LOD + grounding.
- `docs/design/cognitive-hierarchy-visual-theming.md` — mathematical/visual foundations (salience, temperature, learnability) and unification plan.
- `docs/design/phase-3-flow-inspector-plan.md` — Episode 9 implementation plan for making the Flow inspector real and synchronized with geology.

## Season Plan (Episodes)

### Season 1 — Foundations (4 episodes)

1) **Baseline + Recording Mode**
- Add a broadcast/recording preset and ensure a stable “reset to baseline” action. `@spw:boundary`

2) **Auditable Keybinding Extraction**
- Deterministic export of binding groups and the audit stream (grouped by context + layer + active element).

3) **Context-Aware Vim Geology**
- Vim Geology updates from `activeElement`, `mode`, and semantic/activation context; show “why relevant now”.

4) **Undo/Redo Scaffolding**
- Introduce command history (undo/redo stacks) with serialization and audit entries per command.

### Season 2 — Reduce Cognitive Load (3 episodes)

5) **Modal Temperature + Salience**
- Visual semantics encode mode/activation context (temperature) and layer relevance (salience curve).

6) **Progressive Disclosure Defaults**
- Beginner/intermediate/advanced labeling pass; defaults collapse advanced layers unless requested/earned.

7) **Operational Deltas**
- “What changed” highlighting + audit deltas tied to undo/redo.

### Season 3 — Walkthroughs + Flow Unification (3 episodes)

8) **Walkthrough Player (Plan Mode)**
- Timed tutorial events driven by a real structure (not hardcoded narration); reset/replay guaranteed.

9) **Flow Inspector Becomes Real**
- Wire Flow Inspector to real graphs; cross-highlight between geology and flow.

10) **Cognitive Manifolds + Lindy Mapping**
- Extend audit documentation to map bindings/operators/containers onto other manifolds and lindy structures.

## Velocity Expectations

Two useful pacing profiles:
- **2–4 hours/week**: 1 episode every ~2–3 weeks (tight scope, minimal refactors).
- **8–12 hours/week**: 1 episode per week (more polish + instrumentation per episode).

## Future: Spw-Configurable Defaults `@spw:todo`

Longer-term, expose configuration defaults via Spw (e.g., walkthrough on/off, disclosure tier, theme seed selection) so the workbench can be “re-scripted” without manual UI tweaks.
