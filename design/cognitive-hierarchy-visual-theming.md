# Cognitive Hierarchy & Visual Theming Design Theory

**Date**: 2026-01-18  
**Status**: Imported plan (design theory; pre-implementation)  
**Related**: `docs/audits/ontological-geometry-audit.md`, `docs/design/semantic-features-model.md`, `src/features/keyboard/VIM-KEYBINDINGS.md`

This document establishes **mathematical and theoretical foundations** for refactoring the UI's visual hierarchy before further implementation.

`@spw:boundary` This is a theory document. Code references may drift as the workbench evolves; treat them as intent and update during implementation.

---

## Executive Summary

Based on current priorities:

1. **Cognitive layering system** with salience functions and attention modeling
2. **Modal context highlighting** (Visual/Editing/Structural) via color temperature
3. **Unified design language** for Keybinding Geology + Flow Inspector
4. **Emergence path** for operator-affinity through color composition

**Key Insight**: By treating visual hierarchy as a continuous mathematical function of layer depth, modal context, and learnability, the system becomes predictable, testable, and self-teaching.

---

## Current State Analysis

### What Works
- **Keybinding Geology**: semantic layers with context-aware filtering
- **Design Token System**: hierarchical tokens with component topology
- **Flow Graph Infrastructure**: graph building + rendering functions
- **Layered Architecture**: separation of concerns with boundaries

### What's Broken/Hard to Parse
- **Keybinding Geology**: information density too high, no visual salience encoding (yet)
- **Flow Inspector**: placeholder implementation, not connected to FlowGraph
- **Theming Layer**: no semantic color mapping to operators or modal contexts
- **Cognitive Hierarchy**: no visual distinction between "possible vs loaded" states

---

## I. Cognitive Layering System (Visual Hierarchy Math)

### Salience Function Theory

Define salience `S` as a continuous function:

```
S(λ, μ, τ) → [0, 1]

Parameters:
  λ = layer depth (0-5)
  μ = modal context (Visual/Editing/Structural)
  τ = learnability time (interaction count)
```

### Base Salience (Exponential Decay)

```
S_base(λ) = e^(-0.4λ)

Layer Mappings:
  Layer 0 (Base):        S ≈ 1.00  → Full opacity, always visible
  Layer 1 (Operator):    S ≈ 0.67  → Primary attention
  Layer 2 (Activation):  S ≈ 0.45  → Secondary attention
  Layer 3 (Text Object): S ≈ 0.30  → Tertiary, discoverable
  Layer 4 (Op-Focused):  S ≈ 0.20  → Advanced, de-emphasized
  Layer 5 (Val-Focused): S ≈ 0.13  → Expert, minimal presence
```

**Rationale**: Exponential decay mirrors human attention allocation. Base navigation (hjkl) dominates, advanced features fade to periphery.

### Modal Context Modulation

```
S_modal(λ, μ) = S_base(λ) × M(μ)

M(μ) = {
  1.2    if μ = Editing and λ ∈ {1, 3, 4, 5}  (amplify editing layers)
  0.85   if μ = Visual and λ ∈ {1, 3}         (de-emphasize editing)
  1.0    otherwise                             (neutral baseline)
}
```

**Effect**: In Editing mode, operator bindings (d/y/c) gain 20% salience. In Visual mode, they recede 15%.

### Learnability Curve (Progressive Disclosure)

```
S_learn(λ, μ, τ) = S_modal(λ, μ) × L(τ)

L(τ) = 1 - (0.85)^τ    where τ = interaction count

Behavior:
  τ=0:   L(0) = 0.00   (unfamiliar → invisible until discovered)
  τ=1:   L(1) ≈ 0.15   (first exposure → partial salience)
  τ=5:   L(5) ≈ 0.56   (moderate familiarity)
  τ=10:  L(10) ≈ 0.80  (high familiarity → near-full salience)
  τ→∞:   L(∞) = 1.00   (expert → full salience)
```

**Progressive Disclosure**: New users see collapsed advanced layers. As `τ` accumulates, layers "energize"—borders glow brighter, text becomes more opaque, animations intensify.

### Three-Zone Attention Model

```
Zone Allocation (aligns with cognitive capacity):
  Primary   (P): 60% cognitive capacity → Layers 0-1
  Secondary (S): 30% cognitive capacity → Layers 2-3
  Tertiary  (T): 10% cognitive capacity → Layers 4-5
```

**Context-Sensitive Shifts**:

```
Visual Mode:
  Primary:   Layer 0 only (hjkl navigation)
  Secondary: Layer 2 (context toggles)
  Tertiary:  Layers 1,3,4,5 (editing features muted)

Editing Mode:
  Primary:   Layers 0+1 (navigation + operators d/y/c)
  Secondary: Layer 3 (text objects aw/ab/as/af)
  Tertiary:  Layers 2,4,5

Structural Mode:
  Primary:   Layer 0 exclusively (context-independent)
  Secondary: All context-dependent layers equally de-emphasized
```

### Information Theory Validation

**Entropy Minimization**: Collapsed layers reduce visual entropy by ~29% (~1.5 bits).

```
All Layers Expanded:  H ≈ 5.1 bits (35 visible bindings)
Strategic Collapse:   H ≈ 3.6 bits (12 visible bindings)
Reduction:           ΔH = 1.5 bits → saves ~0.75-1.0s per decision
```

**Chunking (Miller's Law)**: Present 3–6 layer chunks instead of 35 individual bindings to stay within working memory limits (7±2).

---

## II. Color Temperature Theory (Modal Context Highlighting)

### Three Temperature Zones

Map modal contexts to color temperature based on cognitive semantics:

```
Visual Semantic Mode:
  Temperature: Cool (4500K-5500K)
  Hue Range:   180°-240° (cyan → blue)
  Rationale:   "Viewing" = receptive, passive, observational
  Base Color:  hsl(200, 70%, 50%)  // Cool blue

Editing Semantic Mode:
  Temperature: Warm (3000K-4000K)
  Hue Range:   30°-60° (amber → yellow)
  Rationale:   "Modifying" = active, transformative
  Base Color:  hsl(45, 75%, 55%)   // Warm amber

Structural Mode:
  Temperature: Neutral (5000K-6000K)
  Hue Range:   120°-160° (green → cyan-green)
  Rationale:   "Navigating" = neutral, context-independent
  Base Color:  hsl(140, 50%, 50%)  // Neutral green
```

### Transition Behavior

```
C(t) = C_from + (C_to - C_from) × ease_out(t)
ease_out(t) = 1 - (1 - t)³
duration = 400ms
```

**Visual Effect**: Switching Visual → Editing shifts entire geology panel from cool blue to warm amber over 400ms. Operator layers "warm up" (increase saturation), structural layers remain neutral.

### Saturation and Lightness Curves

Salience affects saturation + lightness (double fade for low-salience):

```
Saturation: Sat(S) = Sat_base × (0.5 + 0.5 × S)
  High salience (S=1.0): Full saturation (vivid)
  Low salience (S=0.0):  50% saturation (muted, gray-shifted)

Lightness: L(S) = L_base + (1 - S) × 0.2
  High salience (S=1.0): Base lightness
  Low salience (S=0.0):  +20% lighter (fades toward background)
```

---

## III. Unified Visual Language (Geology + Flow Inspector)

### Shared Visual Primitives

Both views encode the same semantic information through different spatial metaphors:

| **Primitive** | **Geology Panel** | **Flow Inspector** | **Meaning** |
|---------------|-------------------|-------------------|-------------|
| Operator Type | Border color (left edge) | Node fill color | Which operator (!^~<>?*=@) |
| Modal Context | Background temperature | Edge color temperature | Visual/Editing/Structural mode |
| Layer Depth | Vertical stacking (z-index) | Node size (larger = shallower) | Specialization/expertise |
| Salience | Opacity + glow intensity | Stroke width + shadow | Current relevance |
| Learnability | Animation speed | Pulse frequency | User familiarity (τ value) |

### Complementary Information Architecture

**Keybinding Geology** (Vertical Layering Metaphor):
- **Purpose**: Show WHAT bindings exist at each semantic depth
- **Metaphor**: Geological strata (deeper = more specialized knowledge)
- **Navigation**: Collapse/expand toggles, scroll through bindings
- **Focus**: Keybinding discovery, learning progression

**Flow Inspector** (Graph Topology Metaphor):
- **Purpose**: Show HOW operators compose in execution flow
- **Metaphor**: Directed graph (nodes = operators, edges = data flow via connectors)
- **Navigation**: Pan/zoom canvas, follow edges, click nodes for details
- **Focus**: Operator relationships, execution paths, data transformations

### Cross-View Synchronization

When user interacts with one view, the other responds sympathetically:

```
Event: User clicks operator binding in Geology Panel (e.g., "d" operator)
  → Geology: Highlight selected binding (glow + border emphasis)
  → Flow:    Highlight all nodes with "reduce" operator type

Event: User hovers over flow node in Flow Inspector (e.g., "~ wave")
  → Flow:    Show tooltip with operator details
  → Geology: Temporarily boost salience of corresponding layer (Layer 1)
              via glow pulse animation
```

**Principle**: Two views are synchronized projections of the same semantic model. Interaction in one reinforces learning in the other.

---

## IV. Operator-Affinity Emergence Path

### Foundational Principle

**"Operator-affinity emerges naturally from modal context highlighting through semantic composition, not manual assignment."**

No lookup tables. Color mixing rules cause affinity to EMERGE.

### Emergence Mechanism

**Step 1: Define Base Operator Colors** (8 operators, evenly distributed hue wheel):

```
! (Inject):   hsl(0, 70%, 55%)     // Red
^ (Tap):      hsl(30, 75%, 50%)    // Orange
~ (Wave):     hsl(180, 70%, 50%)   // Cyan
<> (Couple):  hsl(280, 65%, 55%)   // Purple
? (Probe):    hsl(240, 70%, 60%)   // Blue
* (Branch):   hsl(120, 60%, 50%)   // Green
= (Bias):     hsl(60, 75%, 55%)    // Yellow
@ (Emit):     hsl(330, 70%, 55%)   // Magenta
```

**Step 2: Modal Context Temperatures** (defined above):

```
Visual Mode:    hsl(200, 70%, 50%)  // Cool blue
Editing Mode:   hsl(45, 75%, 55%)   // Warm amber
Structural Mode: hsl(140, 50%, 50%) // Neutral green
```

**Step 3: Color Mixing Rule** (additive blend in perceptual space):

```
Final_Color = Operator_Base × (1 - α) + Context_Temp × α
where α = 0.3 (30% context influence)

Example (Inject "!" in Editing mode):
  Base operator:     hsl(0, 70%, 55%)    // Red
  Context temp:      hsl(45, 75%, 55%)   // Warm amber
  Mixed (α=0.3):     hsl(18, 72%, 55%)   // Red-orange (warmed)

Example (Wave "~" in Visual mode):
  Base operator:     hsl(180, 70%, 50%)  // Cyan
  Context temp:      hsl(200, 70%, 50%)  // Cool blue
  Mixed (α=0.3):     hsl(186, 70%, 50%)  // Cyan-blue (cooled)
```

### Natural Affordance Learning

Users intuitively learn **WITHOUT EXPLICIT LABELS**:
- **Warm-shifted colors** = editing-affinity operators (active transformation: d/y/c)
- **Cool-shifted colors** = visual-affinity operators (passive observation)
- **Neutral colors** = structural operators (context-independent: hjkl)

**No color legend needed**—temperature encodes semantic affordance directly. Users learn by feeling: "Warm colors are for changing things, cool colors are for looking at things."

---

## V. Geometric Integrity & Metalinguistic Consistency

### Spatial Consistency

Both views use consistent geometric transforms:

| **Metaphor** | **Geology Panel** | **Flow Inspector** | **Meaning** |
|--------------|-------------------|-------------------|-------------|
| **Depth** | Vertical stacking order | Node size (larger = shallower) | Specialization/expertise |
| **Proximity** | Vertical adjacency in layer | Edge connection | Semantic relatedness |
| **Emphasis** | Border thickness | Stroke width | Salience/importance |
| **Activation** | Glow intensity | Shadow depth | Current focus/selection |

### UI Mirrors Spw Language Structure

**Spw's Three Layers** → **UI's Three Modal Contexts**:

```
Spw Language Layers:
  Syntactic:  WHAT it is (structure, form, tokens)
  Semantic:   WHAT it means (values, types, relationships)
  Pragmatic:  WHY it matters (effects, execution)

UI Modal Contexts:
  Structural: WHAT navigation does (hjkl = tree traversal)
  Visual:     WHAT viewing shows (component structure, AST rendering)
  Editing:    WHY operators matter (code transformation)
```

**Isomorphism Principle**: UI structure is isomorphic to language structure. Learning the interface teaches the language's compositional rules.

---

## VI. Mathematical Properties & Proofs

### Salience Monotonicity Theorem

**Theorem**: For fixed modal context μ and learnability τ, salience decreases monotonically with layer depth λ.

```
Proof:
  S(λ, μ, τ) = e^(-0.4λ) × M(μ) × L(τ)

  Since e^(-0.4λ) is strictly decreasing in λ for α > 0,
  and M(μ) and L(τ) are constant with respect to λ,
  S(λ, μ, τ) is strictly decreasing in λ.

  ∴ Layer 0 ALWAYS has highest salience, regardless of context or expertise.
```

### Context Symmetry Breaking

**Theorem**: Modal context modulation M(μ) creates perceptually significant salience shifts.

```
Operator Layer (λ=1) in Editing mode:
  S_modal(1, 1) = e^(-0.4) × 1.2 ≈ 0.804

Operator Layer (λ=1) in Visual mode:
  S_modal(1, 0) = e^(-0.4) × 0.85 ≈ 0.569

Relative change:
  ΔS / S_visual = 0.235 / 0.569 ≈ 41% increase
```

**Implication**: Switching Visual → Editing creates ~41% salience boost for operator bindings—well above perceptual discrimination threshold (~10%).

---

## VII. Critical Files for Implementation

When implementation begins, these files will be most critical:

### Keybinding Geology
- `src/features/keyboard/components/keybinding-geology.ts` — state management, rendering
- `src/features/keyboard/components/keybinding-geology.css` — visual styling (temperature, salience)
- `src/features/keyboard/geology-schema.ts` — layer definitions, binding structure

### Flow Inspector
- `src/viz/flow/graph.ts` — FlowGraph data structure, graph building
- `src/viz/flow/renderer.ts` — flow rendering
- `docs/design/phase-3-flow-inspector-plan.md` — planned wiring and UX

### Design/Theming
- `src/design/tokens.ts` — token system (color primitives, modal context colors)
- `src/design/themes/topology.ts` — component topology, cascade system

---

## VIII. Validation & Success Metrics

### Quantitative (Testable)

1. **Entropy Reduction**: H_collapsed / H_expanded < 0.7 (30%+ reduction)
2. **Salience Distribution**: Primary zone = 55–65% of visual weight
3. **Context Shift Magnitude**: |S(λ, Editing) - S(λ, Visual)| > 0.15 for editing layers
4. **Learnability Convergence**: |S(λ, μ, τ=10) - S_modal(λ, μ)| < 0.05

### Qualitative (User Studies)

1. **Learnability**: New users identify Layer 0–1 within 30 seconds
2. **Discoverability**: Users discover Layer 2–3 within first 5-minute session
3. **Fluency**: Expert users navigate with <10% visual reference to panel
4. **Coherence**: Users describe operator colors using temperature terms ("warm", "cool") unprompted

---

## IX. Implementation Phases (When Ready)

### Phase 1: Modal Context Color Temperature
**Goal**: Entire interface shifts color temperature based on Visual/Editing/Structural mode.

**Changes**:
- Add CSS custom properties for `--modal-context-hue` (200/45/140)
- Transition geology panel background/borders over 400ms on mode change
- Apply color temperature to operator bindings (30% modal influence)

**Files**: `src/features/keyboard/components/keybinding-geology.css`, `src/design/tokens.ts`

**Validation**: Users notice temperature shift, can identify mode by color feel

### Phase 2: Salience-Based Visual Hierarchy
**Goal**: Layers encode salience through opacity, saturation, lightness, glow.

**Changes**:
- Compute salience function S(λ, μ, τ) in TypeScript
- Map salience → CSS variables (`--opacity`, `--saturation`, `--glow-intensity`)
- Progressive disclosure: collapsed layers by default, expand on context relevance
- Learnability tracking: increment τ on layer interaction, persist to localStorage

**Files**: `src/features/keyboard/components/keybinding-geology.ts`, `src/features/keyboard/components/keybinding-geology.css`

**Validation**: Entropy reduction >30%, primary zone dominance 55–65%

### Phase 3: Flow Inspector + Geology Unification
**Goal**: Connect flow inspector to FlowGraph, share visual language with geology.

**Changes**:
- Wire Flow Inspector to real graphs
- Apply same color temperature system to flow nodes (operator-based fill colors)
- Implement cross-view synchronization (click binding → highlight flow nodes)
- Match salience encoding (node size = layer depth, stroke width = salience)

**Files**: `docs/design/phase-3-flow-inspector-plan.md`, `src/viz/flow/**`

**Validation**: Flow inspector shows actual operator graph, shares geology colors

### Phase 4: Operator-Affinity Emergence
**Goal**: Operator colors naturally emerge from modal context mixing.

**Changes**:
- Define base operator colors (8 operators, hue wheel distribution)
- Apply color mixing formula: `Final = Base × 0.7 + Context × 0.3`
- Operators shift warm/cool based on active context
- No lookup tables—affinity is computed, not declared

**Files**: `src/design/tokens.ts`, `src/features/keyboard/**`, `src/viz/flow/**`

**Validation**: Users learn "warm = editing, cool = viewing" without labels

### Phase 5: Editor-First Layout Rebalancing
**Goal**: Editor is first-class, Actions sidebar is compact, Inspector is convenient.

**Changes**:
- Increase editor min-width to ~50% viewport
- Reduce Actions sidebar to icon-only mode with tooltips
- Make Inspector collapsible by default (expand on demand)
- Adjust z-index hierarchy: Editor > Geology > Inspector > Actions

`@spw:todo` Validate layout contracts against accessibility + recording mode.

### Phase 6: Zoom Level & Feature Granularity Indicators
**Goal**: UI communicates "what's possible vs what's loaded" via color/opacity.

**Changes**:
- Add zoom level indicator to header (current depth in layer stack)
- Use feature lifecycle system to color-code component readiness
  - **Pending**: Low saturation, dotted borders
  - **Ready**: Full saturation, solid borders
  - **Error**: Red tint, warning icon
  - **Active**: Glow + elevated shadow
- Extend topology cascade to show which components are initialized

`@spw:todo` Fold these indicators into a doc-lintable tier system (beginner → expert).

---

## X. Open Questions `@spw:todo`

1. **Learnability Persistence**: Should τ (interaction count) persist across sessions via localStorage, or reset each session?
2. **Default Collapsed Layers**: For beginners, should Layers 1,3,4,5 all be collapsed, or should Layer 1 (operators) be expanded by default since it's editing-critical?
3. **Color Accessibility**: Provide a high-contrast mode that replaces temperature with patterns for color-blind users?
4. **Animation Intensity**: Opt-in energization, or always-on with adjustable intensity?
5. **Flow Inspector Initial State**: Default to ASCII view (fast) or HTML graph view (rich)?

---

## XI. Conclusion

This design theory establishes:

- **Mathematical foundations**: salience functions with provable properties
- **Perceptual grounding**: temperature theory rooted in cognitive associations
- **Information architecture**: entropy minimization + chunking from cognitive science
- **Geometric consistency**: spatial metaphors preserved across complementary views
- **Metalinguistic alignment**: UI structure mirrors the language's compositional nature
- **Emergence path**: operator-affinity arises from color mixing, not lookup tables

**Philosophy**: design theory first, implementation second. Mathematical rigor + geometric integrity guide all visual decisions.

