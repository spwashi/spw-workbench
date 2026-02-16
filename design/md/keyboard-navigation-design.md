# Keyboard Navigation Design — Spw Workbench
**Date:** 2026-02-15  
**Status:** Design Proposal  
**Depends on:** `infra/state/state.ts`, `infra/accessibility/focus.ts`, `features/keyboard/keyboard-manager.ts`, `features/keyboard/navigation/scoped-navigation.ts`, `core/layers/layers.ts`

---

## Preamble: The Existing Topography

The workbench already has a rich keyboard infrastructure. This document doesn't propose starting over — it identifies **six design tensions** in the current model and proposes resolutions that extend, rather than replace, the existing architecture.

The current model operates on three interlocking axes:

```
Mode (normal/insert/visual/inspect/transform/command/stepping)
  × Layer (fine/medium/coarse)  
  × Region (sidebar/editor/inspector/geology/header/footer)
```

Each axis participates in navigation differently:
- **Mode** determines *what keys mean* (hjkl = vim motion in inspect, letters in insert)
- **Layer** determines *what Tab visits* (tokens at fine, blocks at medium, regions at coarse)
- **Region** determines *where focus physically lives* in the DOM

The attention model adds four ownership channels on top:
- `activeRegion` — where keyboard focus physically sits
- `selectionOwner` — which region holds the active text/node selection
- `actionTarget` — which region is targeted for the next operator (yank/paste)
- `interactionActive` — which region is being pointer-interacted with

These derive into a single `attentionOwner` via deterministic priority (`settings > modal > interaction > selection > action > activeRegion`).

---

## 1. Escape Cascade and Region Topography

### The Current Problem

Escape currently behaves differently depending on what's open:

```
Escape in insert       → normal mode
Escape in inspect      → close drawer
Escape in visual       → exit visual + normal
Escape in normal       → focusPreviousRegion() || blur
Escape with prism view → close prism
Escape with context    → closeTopContext()
```

The issue isn't that Escape does different things — a cascading dismiss is expected. The issue is that the cascade has **no guaranteed ground state**. If `focusPreviousRegion()` fails (empty history) and no context is open, Escape results in `document.activeElement.blur()` — the user loses their place entirely. Focus exits the application.

### Region Topography

The regions form a spatial hierarchy, but this hierarchy isn't codified:

```
┌──────────────────────────────────────┐
│ header (not focusable)               │
├────┬─────────┬───────────┬───────────┤
│side│         │           │           │
│bar │ editor  │ inspector │ geology   │
│    │         │           │           │
├────┴─────────┴───────────┴───────────┤
│ footer (not focusable)               │
└──────────────────────────────────────┘
```

The `getFocusableRegions()` returns `['sidebar', 'editor', 'inspector', 'geology']` — a flat list. But the user's mental model is spatial: editor is "center," inspector is "right of center," geology is "far right," sidebar is "left edge." Escape should move focus **inward** (toward center), not backward through a temporal history stack.

### Proposed Design: Topographic Escape

Define a region topology with a "ground" region (editor) and directional adjacency:

```typescript
const REGION_TOPOLOGY: Record<Region, {
  ground: boolean        // Is this the escape cascade's final landing zone?
  inward: Region | null  // "Escape" moves focus here (toward center)
  label: string          // Human-readable name for announcements
}> = {
  sidebar:   { ground: false, inward: 'editor',    label: 'Sidebar' },
  editor:    { ground: true,  inward: null,         label: 'Editor' },
  inspector: { ground: false, inward: 'editor',    label: 'Inspector' },
  geology:   { ground: false, inward: 'inspector', label: 'Context Engine' },
  header:    { ground: false, inward: null,         label: 'Header' },
  footer:    { ground: false, inward: null,         label: 'Footer' },
}
```

The escape cascade then becomes deterministic:

```
1. Close overlay/modal/prism (if any)        → stop
2. Close drawer (if any)                     → stop
3. Exit sub-mode (visual/transform/command)  → normal mode, stop
4. Move focus inward via topology            → stop when ground reached
5. If already at ground: blur editor focus but keep region as 'editor'
```

**Key property:** The user never "falls off" the DOM. Escape always converges on the editor region. This matches the mental model of "Escape = retreat to safe base."

### Open Question: Should Geology escape through Inspector?

The topology above chains `geology → inspector → editor`. This mirrors the spatial layout. But if the user jumped *directly* to geology (via a future shortcut), they might expect Escape to go back to wherever they came from, not to the inspector. 

The resolution: **inward is the default, but history overrides when available.** If the region history stack has an entry, use it. If not, fall back to topographic inward movement. This preserves both spatial and temporal escape semantics.

---

## 2. Region Entry Announcements and Tab Flow

### The Current Problem

`RegionFocusManager.focusRegion()` moves focus and updates `appState.setActiveRegion(name)`, but **never announces the region name.** A keyboard-only user who presses Tab at Coarse LoD cycles through regions silently — they only know they've moved because the focus ring appears somewhere new.

The `focusin` handler in `initFocusTracking()` dispatches `spw-region-focus` events, but these are for internal telemetry, not user-facing announcements.

### Tab Flow Considerations

Tab flow interacts with LoD in the current implementation:

| Layer | Tab Behavior | Mechanism |
|-------|-------------|-----------|
| Fine | Token-level roving tabindex | `ScopedNavigationManager` with `[data-ast-node], [data-token]` |
| Medium | Block-level roving tabindex | `ScopedNavigationManager` with `[data-expression], [data-block]` |
| Coarse | Region cycling | `regionFocus.cycleRegion()` |

The problem with Fine and Medium: the `ScopedNavigationManager` uses a single roving group scoped to `rootSelector` (typically the whole app). Tab moves between *all* matching items globally, crossing region boundaries silently. A user Tabbing through AST tokens can suddenly find themselves in the editor's token list without realizing they've left the inspector.

### Proposed Design: Announced Region Transitions

**Layer 1: Announce region on entry**

Add announcements to `RegionFocusManager.focusRegion()`:

```typescript
focusRegion(name: Region): boolean {
  // ... existing logic ...
  appState.setActiveRegion(name)
  a11y.announce(`Region: ${REGION_TOPOLOGY[name].label}`, 'assertive')
  return true
}
```

**Layer 2: Region-scoped Tab navigation**

Instead of one global roving group, scope the roving group to the *active region's* DOM subtree. When Tab wraps past the last item within a region:

- **Option A (Sticky):** Wrap within the region. Shift+Tab from first item → last item of same region. User must explicitly Escape or use a region-jump shortcut to leave.
- **Option B (Permeable):** On wrap, announce "Leaving [region name]" and move to the first item of the next region.
- **Option C (Layer-dependent):** At Fine LoD, use Option A (sticky — you're focused on detail, don't want accidental escape). At Medium LoD, use Option B (permeable — you're navigating structure, crossing boundaries is expected).

**Recommendation:** Option C. It aligns with the semantic intent of each layer:
- Fine = "I'm examining this specific thing" → don't yank me out
- Medium = "I'm navigating the structure" → let me flow between sections
- Coarse = already handled by `cycleRegion()` → no change needed

---

## 3. Direct Region Jump Shortcuts and Gradient Navigation

### The Current Problem

Region navigation is **sequential only.** Tab at Coarse LoD cycles through `sidebar → editor → inspector → geology` in order. There's no way to jump directly to a specific region.

The one exception is `Ctrl+\`` which toggles between editor and inspector. But sidebar and geology have no direct shortcuts.

### Gradient Navigation Considerations

The workbench has a spatial-semantic gradient:

```
← raw structure                    interpretation →
   sidebar  │  editor  │  inspector  │  geology
   files    │  source  │  AST/tokens │  system state
   meta     │  content │  analysis   │  context
```

This gradient maps onto the layer model:
- **Fine** concerns (tokens) are densest in the inspector
- **Coarse** concerns (system state, regions) are densest in the geology panel
- **Medium** concerns (expressions, blocks) span editor ↔ inspector

The gradient suggests that the jump shortcuts should feel like "zooming" toward different points on this spectrum, not just arbitrary panel switches.

### Proposed Design: Space+Number Region Jumps

Extend the existing Space leader key with region targets:

```typescript
// In handleSpaceKeyLeader():
case '1': {
  regionFocus.focusRegion('sidebar')
  a11y.announce('Region: Sidebar')
  return { consume: true, handled: true, keys: ['<space>', '1'], action: 'region.sidebar' }
}
case '2': {
  regionFocus.focusRegion('editor')
  a11y.announce('Region: Editor')
  return { consume: true, handled: true, keys: ['<space>', '2'], action: 'region.editor' }
}
case '3': {
  regionFocus.focusRegion('inspector')
  a11y.announce('Region: Inspector')
  return { consume: true, handled: true, keys: ['<space>', '3'], action: 'region.inspector' }
}
case '4': {
  regionFocus.focusRegion('geology')
  a11y.announce('Region: Context Engine')
  return { consume: true, handled: true, keys: ['<space>', '4'], action: 'region.geology' }
}
```

**Why Space+Number?** 
- Ctrl+1/2/3 is already taken (layer switching)
- Number keys 1-4 in normal mode are already taken (inspector tabs)
- Space leader is the established "meta-action" prefix
- The numbers follow the left-to-right spatial order

**Bonus: Gradient shortcut**.  `Space+0` could cycle the "attention gradient" — moving focus to whichever region has the highest `perspectiveWeight` for the current activation context. In a 'visual' context, that's the editor. In an 'editing' context, it might be the inspector. This lets the system guide focus based on *intent*, not spatial memory.

### Conflict Check

Space+1/2/3/4 currently falls through to the `consume: false` branch (unbound leader combos). No conflicts.

---

## 4. Tab Boundary Announcements and Select/Focus/Active Semantics

### The Current Problem

The state model tracks four ownership channels:

| Signal | Meaning | Set by |
|--------|---------|--------|
| `activeRegion` | Where keyboard focus physically resides | `focusin` handler |
| `selectionOwner` | Which region holds the active selection | Programmatic (yank target) |
| `actionTarget` | Which region is targeted for next action | Programmatic (paste target) |
| `interactionActive` | Which region is being pointer-touched | `pointerdown`/`pointerup` |

These derive into `attentionOwner` and CSS receives `data-attention-level="0-3"` per region.

The problem: **a keyboard user can only feel `activeRegion`** (through the focus ring). The other three signals are communicated visually — border color changes, background dimming — but not through any non-visual channel. A keyboard user who sets a selection in the inspector, then Tabs to the editor to paste, has no way to confirm that the inspector still "holds" their selection.

### Select / Focus / Active — Differential Semantics

These three concepts are genuinely different and the user needs to distinguish them:

**Focused** — "My keyboard input goes here right now."
- Maps to: `activeRegion`
- Visual cue: Focus ring (outline)
- Keyboard cue: Where keystrokes land

**Selected** — "I've chosen something, and it's being held for me."
- Maps to: `selectionOwner` + the specific selected node/text
- Visual cue: Highlight/selection color on the selected content
- Missing: No announcement when selection crosses region boundaries

**Active** — "This region is the target of my next action."
- Maps to: `actionTarget`
- Visual cue: Enhanced border/glow
- Missing: No keyboard-discoverable way to *set* the action target explicitly

### Proposed Design: Boundary Announcements + Selection Persistence Cues

**1. Tab boundary announcements (ties to §2):**

When focus crosses a `[data-region]` boundary (detected by comparing the region ancestor of the previous and new focused elements), announce:

```
"Entering [region label]. Selection held in [selection owner label]."
```

This is accomplished by augmenting the `focusin` handler in `initFocusTracking()`:

```typescript
function handleFocusIn(e: FocusEvent): void {
  const target = e.target as HTMLElement
  if (!target) return

  const newRegion = target.closest('[data-region]')?.getAttribute('data-region') as Region | null
  const previousRegion = appState.getActiveRegion()
  
  if (newRegion && newRegion !== previousRegion) {
    const label = REGION_TOPOLOGY[newRegion]?.label ?? newRegion
    const selectionRegion = appState.get().selectionOwner
    const selectionNote = selectionRegion && selectionRegion !== newRegion
      ? `. Selection held in ${REGION_TOPOLOGY[selectionRegion]?.label ?? selectionRegion}`
      : ''
    a11y.announce(`${label}${selectionNote}`)
  }

  updateActiveRegion(target)
  // ... rest of existing logic
}
```

**2. Make `actionTarget` settable via keyboard:**

Currently `actionTarget` is only set programmatically. Add a Space-leader combo to designate the action target:

```
Space+a → set actionTarget to activeRegion
Space+A → clear actionTarget
```

This lets a power user say "I want to paste here" before navigating away to yank.

**3. Selection persistence indicator in status bar:**

The footer already shows `focus Editor · selection none · action none`. When selection is in a *different* region than focus, this becomes critical navigation information. Ensuring the status bar updates these fields in real-time is the minimum viable version.

---

## 5. ARIA Roles for AST Inspector and Visual/Keyboard Utility

### The Current Problem

The AST tree renders structural nodes (Seed > Expression > Operation > Frame > Parameter > Literal) as a visual tree with disclosure triangles. The DOM uses `[data-ast-node]` attributes and the roving tabindex system targets these elements for keyboard navigation at Fine LoD.

However, there's no semantic tree structure communicated to assistive technology. Without `role="tree"`, `role="treeitem"`, `role="group"`, `aria-expanded`, and `aria-level`, a screen reader perceives the AST as a flat list of focusable items.

### Visual / Keyboard Utility Considerations

The AST tree serves two distinct audiences:

**Visual users** interact with it through:
- Mouse click on nodes to select
- Visual indentation cues for nesting depth
- Disclosure triangles to expand/collapse
- Color coding for node types (operators in accent, literals in string color)
- Position annotations (1:1, 1:6, etc.)

**Keyboard users** interact with it through:
- Arrow-Down/Up to traverse siblings (current: via roving tabindex)
- Enter to select a node (current: partially implemented)
- hjkl in inspect mode for vim-style AST motions (current: fully implemented)
- **Missing:** Arrow-Right to expand a collapsed subtree
- **Missing:** Arrow-Left to collapse or move to parent
- **Missing:** Type-ahead to jump to a node by type name

### Proposed Design: ARIA Tree Roles + Expand/Collapse

**1. Add semantic tree roles to AST render output:**

```html
<div role="tree" aria-label="Abstract Syntax Tree">
  <div role="treeitem" aria-level="1" aria-expanded="true" 
       data-ast-node="seed" tabindex="0">
    ▼ Seed 1:1
    <div role="group">
      <div role="treeitem" aria-level="2" aria-expanded="true" 
           data-ast-node="expression" tabindex="-1">
        ▼ Expression 1:1
        <div role="group">
          <div role="treeitem" aria-level="3" aria-expanded="true"
               data-ast-node="operation" tabindex="-1">
            ▼ Operation [!] 1:1
            <!-- ... children ... -->
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**2. Wire `RovingTabindex` expand/collapse callbacks:**

The `RovingTabindex` class already supports `expandable: true`, `onExpand`, and `onCollapse`. These should be wired to toggle `aria-expanded` and show/hide the child `role="group"`:

```typescript
const astRoving = new RovingTabindex({
  container: astContainer,
  itemSelector: '[role="treeitem"]',
  orientation: 'vertical',
  expandable: true,
  onExpand: (item) => {
    item.setAttribute('aria-expanded', 'true')
    const group = item.querySelector(':scope > [role="group"]')
    if (group instanceof HTMLElement) group.hidden = false
    a11y.announce(`Expanded ${item.textContent?.trim().slice(0, 30)}`)
  },
  onCollapse: (item) => {
    item.setAttribute('aria-expanded', 'false') 
    const group = item.querySelector(':scope > [role="group"]')
    if (group instanceof HTMLElement) group.hidden = true
    a11y.announce(`Collapsed`)
  },
})
```

**3. Arrow-Left on leaf → move to parent:**

When Arrow-Left is pressed on a leaf or already-collapsed item, the `onCollapse` callback should fall back to focusing the parent treeitem:

```typescript
onCollapse: (item) => {
  const isExpanded = item.getAttribute('aria-expanded') === 'true'
  if (isExpanded) {
    // Collapse this node
    item.setAttribute('aria-expanded', 'false')
    // ...
  } else {
    // Already collapsed or leaf — move to parent
    const parentGroup = item.closest('[role="group"]')
    const parentItem = parentGroup?.closest('[role="treeitem"]')
    if (parentItem instanceof HTMLElement) {
      astRoving.focusItem(parentItem)
    }
  }
}
```

### Coexistence with Vim Motions

In inspect mode, hjkl bindings already handle AST navigation via `handleVimMotion()`. The ARIA tree navigation (arrow keys) should coexist:

- **In normal mode at Fine LoD:** Arrow keys drive the tree (ARIA pattern)
- **In inspect mode:** hjkl drives the tree (vim pattern), arrow keys are suppressed or also drive the tree
- **Both patterns** update the same selection state (`getCurrentSelectedNode()`)

This means the tree needs two "drivers" that share one cursor. The simplest approach: both vim motions and arrow-key tree navigation update the same `RovingTabindex` index, so the focus state is always consistent.

---

## 6. Footer Interactivity and Relevance

### The Current Problem

The footer bar displays a dense row of keyboard hints, mode indicators, focus path telemetry, and stage information. It's currently `focusable: false` in the region state defaults:

```typescript
footer: { ...DEFAULT_REGION_STATE, focusable: false },
```

This means the footer is never part of Tab cycling. Users can see the keybinding reference but can't interact with it. The footer's purpose is purely passive — showing context about what's happening elsewhere.

### Relevance Considerations

The footer serves three distinct functions that have different interaction requirements:

**1. Keybinding reference (left zone)** — `? Ctrl+1/2/3 Shift+L Shift+M ...`
- Relevance: High for newcomers, low for experts
- Interaction need: None (read-only reference), but **discoverability** could benefit from hover/focus tooltips
- At narrow viewports: This section overwhelms the space (audit finding R-1)

**2. Status telemetry (center zone)** — `focus Editor · selection none · action none`
- Relevance: High for power users, medium for everyone
- Interaction need: Should update in real-time (it does). Could benefit from being an aria-live region
- At narrow viewports: Most critical content — should survive when space is limited

**3. Stage/mode badges (right zone)** — `◇ STAGE 0 · FUNCTIONAL · i v t / or : Ctrl+...`
- Relevance: Varies by disclosure level
- Interaction need: Low — these are informational badges
- At narrow viewports: Least critical — can be hidden behind disclosure

### Proposed Design: Layered Footer Relevance

Rather than making the footer fully interactive (which would add a 5th region to the Tab cycle and increase cognitive load), make it **contextually responsive** to the active LoD:

**At Fine LoD:** Full footer with all three zones. Keybinding hints are expanded.

**At Medium LoD:** Compact footer. Status telemetry + current mode only. Keybinding hints reduced to the 3-4 most relevant shortcuts for the current mode.

**At Coarse LoD:** Minimal footer. Only the status telemetry line. Everything else behind a disclosure toggle (`?` to expand).

**Status telemetry as `aria-live`:**

```html
<div class="footer-status" role="status" aria-live="polite" aria-atomic="true">
  focus Editor · selection none · action none
</div>
```

This means screen readers automatically announce status changes without the user needing to navigate to the footer.

**Keybinding tooltip on focus (partial interactivity):**

Instead of making each `kbd-hint` focusable (which would create dozens of tab stops), provide a single focusable "Keyboard Reference" button in the footer that opens the existing `?` shortcuts modal. The button gets `role="button"` and `tabindex="0"`, but it's the *only* focusable item in the footer.

```html
<button class="footer-help-trigger" 
        aria-label="Open keyboard shortcuts reference"
        tabindex="0">
  ?
</button>
```

This keeps the footer lean for Tab navigation while providing a keyboard-accessible entry point to the full reference.

---

## Summary of Design Decisions

| # | Decision | Principle |
|---|----------|-----------|
| 1 | Escape always converges on the editor (topographic inward, history overrides when available) | **Predictable grounding** — the user is never lost |
| 2 | Region changes are announced; Tab is region-scoped at Fine LoD, permeable at Medium, cycling at Coarse | **Layer-appropriate flow** — granularity matches intent |
| 3 | Space+1/2/3/4 for direct region jumps; Space+0 for attention-gradient focus | **O(1) navigation** — don't force sequential cycling |
| 4 | Boundary crossing announces both destination and selection persistence | **Three-state awareness** — focused ≠ selected ≠ active |
| 5 | AST tree gets ARIA roles; expand/collapse via arrow keys coexists with vim motions | **Two audiences, one cursor** — visual and keyboard utility converge |
| 6 | Footer stays non-focusable but gains `aria-live` status and a single `?` entry point | **Passive context, active reference** — the footer informs, doesn't demand attention |
