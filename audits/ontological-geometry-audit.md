# Ontological Geometry Audit

**Date**: 2026-01-26  
**Status**: Draft (progressive disclosure / learnability audit in progress)  
**Related**: `src/features/keyboard/VIM-KEYBINDINGS.md`, `docs/design/research-episodes-plan.md`, Keybinding Geology component, fluency audit, Spw configuration layer.

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

## Next Steps

- Capture walkthrough metrics in `fluency-audit.ts` to show how learners progress through cognitive manifolds.
- Add a “Lindy structure” appendix that records which gestures (hjkl, <space>v/e, d/y/c) stay persistent across plans and could become durable reference points.
- Formalize a `@spw:todo` checklist inside this document so future sprints can close each audit item and link back to updated docs/components.

Once the audit is in place, we can treat CSS/Geology as directives for future interface layers and keep the learnability pathways synchronized with hyperlexical semantics.
