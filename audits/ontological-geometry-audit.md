# Ontological Geometry Audit

**Date**: 2026-01-18  
**Status**: Draft (progressive disclosure / learnability audit in progress)  
**Related**: `src/features/keyboard/VIM-KEYBINDINGS.md`, `docs/design/research-episodes-plan.md`, `docs/design/cognitive-hierarchy-visual-theming.md`, `docs/design/semantic-features-model.md`, Keybinding Geology component, fluency audit, Spw configuration layer.

## Purpose

Treat CSS + keybinding layers as an *ontological geometry*—a topology of semantic surfaces where salience, binding density, and structural similarity encode meaning for human and machine learners. This audit should trace that geometry across the vim-keybinding system to ensure the representation remains navigable, explainable, and extensible.

## Audit Scope

1. **Mapping Vim Keybindings to Semantics** (`src/features/keyboard/VIM-KEYBINDINGS.md`, `keybinding-geology.ts`)
   - Are binding groups (Base / Activation / Operator) documented in terms meaningful to new personas (e.g., visual vs editing semantics)?
   - Does the geometry metaphor stay consistent through the guide + walkthrough? Tag as `@spw:boundary`.
2. **Differential Topology via CSS** (`keybinding-geology.css`, design tokens)
   - Do colors/borders highlight relative salience between layers (dominant vs background sources)?
   - Are shared structural features (e.g., layer toggle buttons, documentation blocks) still recognizable when the walkthrough runs?
3. **Walkthrough / Plan Mode Instrumentation**
   - How is the plan state exposed (data attributes, flows, API hooks)? Ensure there is a documented reset/replay path. Mark gaps with `@spw:todo`.
   - Connect the steps to cognitive manifolds (Beginner/Intermediate/Advanced) and note how Lindy structures (durable patterns that outlast tooling) map onto these temporal sequences.
4. **Configuration / Future Spw Integration**
   - Link defaults (e.g., walkthrough running=true, activation context default) to Spw config keys (`spw config keybinding-geology...`).
   - Identify where future Spw scripts can toggle contexts/plan steps programmatically.

## Lindy Anchors (Durable Reference Points) `@spw:term`

Treat a small set of interactions as the “stable basis vectors” of the topology:

- `Esc` — escape hatch between capture regimes (typing ↔ command ↔ dialog).
- `h/j/k/l` — structural navigation grammar (tree movement).
- `w/b/e` — structural traversal at constant depth (“word motions”).
- `<space> v/e` — activation-context toggles (semantic lens switches).
- `d/y/c` — operators (transform semantics over a motion).

Audit goal: ensure these anchors remain present, discoverable, and semantically consistent across panels, overlays, and future refactors. `@spw:boundary`

## Mapping to Other Cognitive Manifolds `@spw:todo`

The “ontological geometry” framing should support mapping beyond Vim motion grammar:

- **Operator glyph manifold**: `~ # . ? ! * & @ <> () [] {} ^` as cognitive operators, with composition rules and undoable inverses.
- **Container-force manifold**: circumfix containers as fundamental “forces” that other operators compose from (original 4-force framing).
- **Lindy structures**: identify patterns that persist across tools (vim motions, leader keys, operator+motion grammar) and treat them as stable coordinate systems.
- **Register manifold**: registers/buffers as addressable state for operators and undo/redo stacks.

This document should eventually link to a formal glossary of terms (`@spw:term`) and a table of “manifold projections” (UI ↔ keybindings ↔ language operators). `@spw:doclint`

## Progressive Disclosure Checklist `@spw:todo @spw:doclint`

Add a closeable checklist that can be linted:

1. **Tier labels**: every binding group has a tier (Beginner/Intermediate/Advanced/Expert).
2. **Availability**: docs + UI agree on when a binding is active vs dormant (capture regime, mode, activation context).
3. **Bridging hints**: when a binding is dormant, UI provides a single “next step” hint (e.g., “Press `Esc` to enable command shortcuts”).
4. **Reset/Replay**: walkthrough/plan mode always documents how to pause, reset, and replay. `@spw:boundary`
5. **Audit links**: new keybinding groups must link to relevant audits (this document + inconsistencies audit).

## Next Steps

- Capture walkthrough metrics in `fluency-audit.ts` to show how learners progress through cognitive manifolds.
- Add a “Lindy structure” appendix that records which gestures (hjkl, <space>v/e, d/y/c) stay persistent across plans and could become durable reference points.
- Formalize a `@spw:todo` checklist inside this document so future sprints can close each audit item and link back to updated docs/components.

Once the audit is in place, we can treat CSS/Geology as directives for future interface layers and keep the learnability pathways synchronized with hyperlexical semantics.
