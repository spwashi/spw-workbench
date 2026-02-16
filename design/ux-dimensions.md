# UX Dimensions — Spw Workbench Design Principles
**Date:** 2026-02-15  
**Status:** Active  
**Related:** [`ATTENTIONAL_SEMANTICS.md`](/src/design/ATTENTIONAL_SEMANTICS.md), [`keyboard-navigation-design.md`](/docs/design/keyboard-navigation-design.md), [`interaction-semantics-design.md`](/docs/design/interaction-semantics-design.md)

---

## Overview

The workbench evaluates its interface quality along **10 UX dimensions**. These dimensions are not independent — they form tension pairs where improving one may degrade another. Good design navigates these tensions deliberately, not accidentally.

```
    ┌─────────────────────────────────────────────────────────────┐
    │                      SIGNAL QUALITY                         │
    │                                                             │
    │   Expressiveness ◄──────────────────────► Level of Noise    │
    │   Level of Detail ◄─────────────────────► Level of Noise    │
    │   Register Utility ◄────────────────────► Register Clarity  │
    │                                                             │
    │                      NAVIGATION                             │
    │                                                             │
    │   Vim Navigation ◄──────────────────────► Arrow Navigation  │
    │   Tab Navigation ◄── Layer-dependent ──►  Arrow Navigation  │
    │                                                             │
    │                      META                                   │
    │                                                             │
    │   Alignment ◄───── structural backbone ──► Expressiveness   │
    │   Interface as Prompt ◄───── affordance ─► Level of Noise   │
    └─────────────────────────────────────────────────────────────┘
```

---

## 1. Expressiveness

**Definition:** How richly the interface communicates the system's internal state, capabilities, and the relationships between elements.

**Measures:** Color variety, typographic weight distribution, badge density, relational indicators (connector lines, arrows), modal context temperature.

**Token mapping:**
- `color.modalContext.*` — temperature-coded mode colors
- `color.operator.*` — 9-operator color wheel
- `--spw-attention-saturation-*` — saturation tiers

**Component touchpoints:**
- `context-tuner.ts` — System State table, mode buttons, readout tuples
- `keyboard-hints.ts` — contextual shortcut rendering
- `prism-view.ts` — operator/token visual rendering

**Tension pair:** ↔ **Level of Noise**. More expressive elements increase cognitive load. The mitigator is **LoD gating** — expressiveness scales with layer depth (Fine = full expression, Coarse = minimal).

**Principle:** *Express more when the user has asked for more.* The user opts into expressiveness via Layer and Disclosure settings. Never express at the cost of legibility.

---

## 2. Alignment

**Definition:** The visual and structural consistency of elements across panels, modes, and states. Spatial grid coherence, typographic alignment, badge sizing and placement.

**Measures:** Grid snap accuracy, consistent padding/margin ratios, header-level alignment across Editor/Inspector/Context columns.

**Token mapping:**
- `space.*` — spacing scale tokens
- `size.*` — sizing tokens
- `radius.*` — border-radius consistency

**Component touchpoints:**
- `index.html` — three-column panel layout
- All panel headers — badge row alignment (`EDIT·BAS`, `FINE`, `TECHNICAL T…`)
- Footer status bar — three-zone alignment

**Tension pair:** ↔ **Expressiveness**. Strict alignment constrains creative layout; excessive expression breaks grid lines. The mitigator is **component-level containment** — each panel is an alignment domain, and cross-panel alignment follows CSS Grid tracks.

**Principle:** *Align structurally across panels; express freely within panels.* The three-column grid is sacred. Badge rows, tab bars, and section headers should snap to consistent vertical rhythms.

---

## 3. Register Utility

**Definition:** How useful the register bank is as a working-memory aid. Can the user leverage registers for yank/paste workflows, cross-region data transfer, and state inspection?

**Measures:** Register population rate (how often registers contain useful data vs. `EMPTY`), representation coverage (source, semantic, pragma), cross-region paste success rate.

**Token mapping:**
- No CSS tokens — this is a runtime/state concern
- `register-bank.ts` — `RegisterRepresentations` types

**Component touchpoints:**
- Context panel register display (geology region in `index.html`)
- `command-bar.ts` — register select shortcut (`"a`, `"b`)
- `interaction-semantics-design.md` §B — yank/paste state machine

**Tension pair:** ↔ **Register Clarity**. Richer register data (more representations, longer values) makes registers harder to scan. The mitigator is **LoD-keyed truncation** — Fine shows full register values; Medium shows labels only; Coarse shows count badges.

**Principle:** *A register that's never populated is visual noise. A register that's always populated is a tool.* Default registers should populate automatically from parse/selection events. Named registers require explicit user action.

---

## 4. Register Clarity

**Definition:** How easy it is to read, identify, and distinguish between registers in the UI. Can the user quickly find the register they need?

**Measures:** Label legibility, empty-state informativeness, truncation strategy, visual distinguishability between empty/populated/active states.

**Token mapping:**
- `--spw-attention-dormant-opacity` — empty register dimming
- `--spw-attention-primary-opacity` — active register emphasis
- `--spw-attention-weight-medium` — label weight

**Component touchpoints:**
- Context panel register section (`index.html`)
- Register palette overlay (`interaction-semantics-design.md` §B3)

**Tension pair:** ↔ **Register Utility**. See above.

**Principle:** *Empty is a state, not an absence.* Empty registers should communicate what would populate them (e.g., "yank to fill" or "set via `\"a`") rather than showing `EMPTY` / `_`. This transforms dead space into an affordance.

---

## 5. Interface as Prompt

**Definition:** The degree to which the interface itself teaches usage. Every visible element should either be actionable or explain what action would change it.

**Measures:** Affordance density (how many elements communicate their interaction model), contextual hint coverage, progressive disclosure effectiveness.

**Token mapping:**
- `--spw-attention-*-opacity` — dimming hierarchy for passive vs. active prompts
- `motion.*` tokens — hover/focus transitions that reveal affordance

**Component touchpoints:**
- `keyboard-hints.ts` — `HINT_COPY` localized labels, tooltip system
- `prompting-rail.ts` — step-by-step prompt overlay
- `onboarding-tour.ts` — guided discovery
- Footer keybinding reference — passive prompt surface
- `ARROWS/HOME/END · ESC NEXT` badge — inline navigation prompt

**Tension pair:** ↔ **Level of Noise**. More prompts = more visual elements competing for attention. The mitigator is **Disclosure gating** — prompts appear at higher disclosure levels (Guide, Deep, Full) and recede at Basic.

**Principle:** *The interface should be legible as a sentence, not just a layout.* Mode buttons, navigation badges, and register labels should read as instructions when the user is learning and as landmarks when the user is fluent.

---

## 6. Vim Navigation

**Definition:** The completeness and consistency of vim-modal keyboard navigation (hjkl motions, modes, operators, registers).

**Measures:** Mode coverage (normal/insert/visual/inspect/transform/command/stepping), motion coverage (word, sentence, paragraph, AST-semantic equivalents), operator coverage (yank, paste, delete, change, surround).

**Token mapping:** None — pure behavioral concern.

**Component touchpoints:**
- `features/keyboard/keyboard-manager.ts` — mode dispatch
- `features/keyboard/vim/vim-ast-motions.ts` — AST motions
- `command-bar.ts` — `:` and `/` command entry

**Tension pair:** ↔ **Arrow Navigation**. Both systems drive the same cursor. In `inspect` mode, hjkl and arrows must produce identical results. The mitigator is **shared cursor state** — both vim motions and arrow-key tree navigation update the same `RovingTabindex` index.

**Principle:** *Vim is the expert path, not the only path.* Every vim-accessible action must also be reachable through non-vim means (arrows, mouse, command bar). Vim motions extend; they don't gatekeep.

---

## 7. Arrow Navigation

**Definition:** Standard arrow-key navigation behavior (Up/Down for lists, Left/Right for expand/collapse, Home/End for boundaries).

**Measures:** ARIA compliance (`role="tree"` with expand/collapse), focus ring visibility, announced region transitions.

**Token mapping:**
- `--spw-attention-focus-glow` — focus ring glow radius
- `--spw-attention-layer-*` — z-index layering for focus overlays

**Component touchpoints:**
- `RovingTabindex` class in `features/keyboard/navigation/scoped-navigation.ts`
- AST tree in `spw-workbench.ts` — `setupASTKeyboardNavigation()`
- Token list — `setupTokenKeyboardNavigation()`

**Tension pair:** ↔ **Vim Navigation**. See above.

**Principle:** *Arrow keys are the accessibility baseline.* Arrow navigation must work without vim mode, without any prerequisite knowledge, and with screen readers. It's the floor, not the ceiling.

---

## 8. Tab Navigation

**Definition:** Tab-key behavior across the interface, including tab stop ordering, region cycling, and layer-dependent scope.

**Measures:** Tab stop count per region, tab wrapping behavior (sticky vs. permeable), boundary announcements.

**Token mapping:** None directly — behavior is in `scoped-navigation.ts`.

**Component touchpoints:**
- `keyboard-navigation-design.md` §2 — layer-dependent tab behavior
- `RegionFocusManager` — `cycleRegion()` at Coarse LoD
- `ScopedNavigationManager` — token/block roving at Fine/Medium LoD

**Layer-dependent behavior:**

| Layer | Tab Scope | Wrapping |
|-------|----------|----------|
| Fine | Within active region (tokens) | Sticky — wraps within region |
| Medium | Block-level, permeable | Announces "Leaving [region]" on wrap |
| Coarse | Region cycling | `sidebar → editor → inspector → geology` |

**Tension pair:** ↔ **Arrow Navigation** at Fine LoD, where both Tab and arrows navigate item-level elements. The mitigator is **orientation** — Tab moves sequentially through items; arrows respect spatial layout (left/right for expand/collapse, up/down for siblings).

**Principle:** *Tab follows the content stream; arrows follow the spatial structure.* Tab is linear; arrows are 2D. Don't conflate them.

---

## 9. Level of Detail

**Definition:** The granularity of information displayed, controlled by the Layer axis (Fine/Medium/Coarse).

**Measures:** Element count per panel at each LoD, information density (characters per visible pixel), semantic compression ratio.

**Token mapping:**
- `--spw-attention-scale-*` — typographic scale multipliers
- `data-lod` attribute — CSS selectors gate visibility per LoD

**Component touchpoints:**
- Every panel's CSS — `[data-lod="fine"]`, `[data-lod="medium"]`, `[data-lod="coarse"]` selectors
- `context-tuner.ts` — LoD readout in footer and headers
- `keyboard-hints.ts` — hint density varies by LoD

**Tension pair:** ↔ **Level of Noise**. Higher LoD means more information, which means more visual competition. The mitigator is **semantic filtering** — at Fine LoD, show all tokens; at Medium, show only expression boundaries; at Coarse, show only region summaries. Detail doesn't mean "show everything" — it means "show deeper into the structure."

**Principle:** *Detail is depth, not width.* Increasing LoD should drill into the focused region's structure, not spread more information across all panels equally. Fine LoD in the inspector shows token-level data; Fine LoD in the context panel shows system-state cards. Each panel interprets "fine" through its own lens.

---

## 10. Level of Noise

**Definition:** The cognitive load imposed by visual elements that don't contribute to the user's current task. Elements that demand attention without rewarding it.

**Measures:** Empty-state element count, competing color signals, label density, border/separator count, animation frequency.

**Token mapping:**
- `--spw-attention-ambient-opacity` — environmental cues (should be low)
- `--spw-attention-dormant-opacity` — inactive states (should be very low)
- `--spw-attention-saturation-minimal` — near-grayscale for dormant elements

**Component touchpoints:**
- Register empty states — `EMPTY` / `_` placeholders contribute noise without utility
- Footer keybinding reference — dense at full width (finding T-3)
- System State card borders — compete for attention (finding T-2)
- Badge truncation — `AMBIENT / MED…` creates ambiguity noise (finding P-1)

**Noise reduction strategies:**
1. **LoD gating** — hide elements below the user's chosen depth
2. **Disclosure gating** — hide guidance elements when user is at Basic disclosure
3. **Empty-state semantics** — replace inert placeholders with dormant-opacity contextual prompts
4. **Progressive saturation** — ambient elements use `--spw-attention-saturation-minimal`; only the focused region uses full saturation

**Principle:** *If it's not informing the current task, it should be at dormant opacity or hidden.* Noise is not about the number of elements — it's about the number of elements at above-ambient attention level. Push non-essential elements below the attention threshold.

---

## Dimension Interaction Matrix

How each dimension affects the others (↑ = increases, ↓ = decreases, · = neutral):

|  | Express. | Align. | Reg. Util. | Reg. Clar. | Prompt | Vim | Arrow | Tab | Detail | Noise |
|--|----------|--------|------------|------------|--------|-----|-------|-----|--------|-------|
| **Expressiveness** | — | ↓ | · | · | ↑ | · | · | · | ↑ | ↑ |
| **Alignment** | ↓ | — | · | ↑ | · | · | · | · | · | ↓ |
| **Reg. Utility** | · | · | — | ↓ | ↑ | ↑ | · | · | ↑ | ↑ |
| **Reg. Clarity** | · | ↑ | ↓ | — | ↑ | · | · | · | ↓ | ↓ |
| **Prompt** | ↑ | · | ↑ | ↑ | — | · | · | · | ↑ | ↑ |
| **Vim Nav** | · | · | ↑ | · | · | — | · | · | · | · |
| **Arrow Nav** | · | · | · | · | · | · | — | ↑ | · | · |
| **Tab Nav** | · | · | · | · | · | · | ↑ | — | · | · |
| **Detail** | ↑ | · | ↑ | ↓ | ↑ | · | · | · | — | ↑ |
| **Noise** | ↑ | ↓ | · | ↓ | ↑ | · | · | · | ↑ | — |

---

## Governing Heuristic

> **Utility and noise scale together. The interface's job is to maximize the ratio, not minimize the terms.**

The transition from empty-context (screenshot 2) to command-mode (screenshot 3) demonstrates this: entering command mode populates targets and registers, increasing both utility *and* noise. The correct response is not to suppress the new information, but to ensure every new element earns its attention cost — through LoD gating, opacity hierarchy, and spatial alignment.
