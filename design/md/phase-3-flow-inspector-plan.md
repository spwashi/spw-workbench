# Phase 3: Flow Inspector Becomes Real

**Episode**: 9 (Season 3: Walkthroughs + Flow Unification)
**Status**: Ready for implementation
**Date**: 2026-01-18
**Related**: `docs/design/research-episodes-plan.md`, `docs/audits/ontological-geometry-audit.md`, `src/viz/flow/`, `src/features/keyboard/`

---

## Episode Contract `@spw:episode`

Following the research-oriented development ethos, this episode delivers:

### 1. One Visible UX Change
**Flow Inspector shows actual operator flow graph with cross-highlighting**
- FLOW tab displays real data flow relationships (not placeholder)
- Click operator binding in Geology → highlights corresponding flow nodes
- Click flow node → highlights corresponding geology layers
- Smooth transitions (400ms) matching modal temperature system

### 2. One Instrumentation/Audit Improvement
**Breadcrumb navigation shows current context path**
- Navigation path: `Region → Tab → Selection`
- Example: `Inspector → FLOW → !inject[boon]`
- Helps with screen recording (viewers can track location)
- Supports chapter markers for video editing

### 3. One Documentation Update
**Document flow graph semantics with `@spw:*` markers**
- `@spw:term` — Flow graph terminology (nodes, edges, topology)
- `@spw:boundary` — Where flow state resets (parse → build graph → render)
- `@spw:todo` — Future enhancements (zoom/pan, layout algorithms)

---

## Visual Semantics: Unified Language

### Color Temperature Integration

Flow nodes inherit modal context temperature from geology panel:

```
Visual Mode (Cool):
  - Flow nodes: hsl(200, 60%, N%)  ← cyan-blue tint
  - Edges: hsla(200, 70%, 50%, 0.4)

Editing Mode (Warm):
  - Flow nodes: hsl(45, 65%, N%)   ← amber tint
  - Edges: hsla(45, 75%, 55%, 0.4)
```

**Transition**: 400ms cubic-bezier (same as geology panel)

### Operator-Specific Colors `@spw:term`

Each operator gets a base hue, then modal context shifts it by ±20°:

| Operator | Base Hue | Visual Mode | Editing Mode |
|----------|----------|-------------|--------------|
| ! inject | 0° (red) | 20° (red-orange) | 340° (magenta-red) |
| ^ tap    | 30° (orange) | 50° (yellow-orange) | 10° (red-orange) |
| ~ wave   | 180° (cyan) | 200° (cyan-blue) | 160° (cyan-green) |
| <> couple | 280° (purple) | 300° (magenta-purple) | 260° (blue-purple) |
| ? probe  | 240° (blue) | 260° (blue-purple) | 220° (blue-cyan) |
| * branch | 120° (green) | 140° (green-cyan) | 100° (yellow-green) |
| = bias   | 60° (yellow) | 80° (yellow-green) | 40° (orange-yellow) |
| @ emit   | 330° (magenta) | 350° (red-magenta) | 310° (purple-magenta) |

**Emergence**: Color affinity emerges naturally from modal context + operator base color.

### Salience Encoding

Flow node size/opacity encodes layer depth and relevance:

```css
Layer 0 (Base):           scale(1.0), opacity: 1.0   ← Largest
Layer 1 (Operator):       scale(0.9), opacity: 0.85
Layer 2 (Activation):     scale(0.85), opacity: 0.75
Layer 3 (Text Object):    scale(0.8), opacity: 0.65
Advanced layers:          scale(0.75), opacity: 0.5  ← Smallest, faded
```

**Result**: Visual hierarchy mirrors geology panel's salience function.

---

## Breadcrumb Navigation `@spw:boundary`

### Component Structure

```
┌─────────────────────────────────────────────────────┐
│ [Icon] Workbench  ›  Inspector  ›  FLOW  ›  !inject │
└─────────────────────────────────────────────────────┘
```

**Location**: Header of Inspector panel, below tab bar

**Data Attributes**:
```html
<nav class="breadcrumb-nav" data-spw-component="breadcrumbs">
  <span class="breadcrumb-item" data-breadcrumb-level="0">Workbench</span>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-item" data-breadcrumb-level="1">Inspector</span>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-item" data-breadcrumb-level="2" data-breadcrumb-active="true">FLOW</span>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-item" data-breadcrumb-level="3">!inject[boon]</span>
</nav>
```

### Breadcrumb Levels

| Level | Content | Example |
|-------|---------|---------|
| 0 | App name | "Workbench" |
| 1 | Region | "Inspector", "Editor", "Geology" |
| 2 | Tab/Section | "FLOW", "AST", "TOKENS", "STEPS" |
| 3 | Selection | "!inject[boon]", "~ wave", "@out" |

**Behavior**:
- Click breadcrumb → navigate to that level (close deeper views)
- Hover → tooltip with full path
- Current level has accent color + bold weight

### Styling (Salience)

```css
.breadcrumb-item {
  opacity: 0.6;  /* Low salience for context */
  transition: opacity 200ms ease;
}

.breadcrumb-item[data-breadcrumb-active="true"] {
  opacity: 1.0;
  font-weight: 600;
  color: hsl(var(--modal-context-hue), 70%, 60%);
}

.breadcrumb-item:hover {
  opacity: 1.0;
  cursor: pointer;
}

.breadcrumb-separator {
  opacity: 0.3;  /* Very low salience */
  margin: 0 0.3rem;
}
```

---

## Projection Indicators `@spw:term`

Show **what's possible vs what's loaded** using feature lifecycle states.

### Lifecycle States

| State | Visual | Meaning |
|-------|--------|---------|
| `pending` | Dotted border, 40% opacity | Feature not yet loaded |
| `loading` | Pulsing glow, 60% opacity | Loading in progress |
| `ready` | Solid border, 100% opacity | Feature loaded and active |
| `error` | Red tint, warning icon | Feature failed to load |

### Application

**Flow Tab Indicator**:
```html
<spw-tab tab-id="flow" label="Flow" shortcut="4"
         data-lifecycle-state="ready">
  FLOW
  <span class="lifecycle-indicator" aria-label="Ready"></span>
</spw-tab>
```

**Visual Encoding**:
```css
/* Pending (not parsed yet) */
[data-lifecycle-state="pending"] {
  opacity: 0.4;
  border-style: dotted;
}

/* Ready (graph available) */
[data-lifecycle-state="ready"] {
  opacity: 1.0;
  border-style: solid;
  box-shadow: 0 0 8px hsla(var(--modal-context-hue), 70%, 50%, 0.3);
}

/* Error (parse failed) */
[data-lifecycle-state="error"] {
  opacity: 0.7;
  border-color: var(--color-status-danger);
  background: rgba(255, 71, 87, 0.1);
}
```

**Result**: Users visually distinguish loaded vs possible features without reading labels.

---

## Cross-Highlighting `@spw:boundary`

### Geology → Flow

**Trigger**: User clicks operator binding in Geology Panel (e.g., "d delete")

**Action**:
1. Highlight binding in geology (glow + border emphasis)
2. Find all flow nodes with matching operator type ("reduce" for delete)
3. Add `.highlighted` class to matching flow nodes
4. Smooth 300ms fade-in

```css
.flow-node.highlighted {
  box-shadow: 0 0 16px hsla(var(--modal-context-hue), 80%, 60%, 0.6);
  border-width: 3px;
  transform: scale(1.1);
  z-index: 10;
  animation: pulse-highlight 1.5s ease-in-out infinite;
}

@keyframes pulse-highlight {
  0%, 100% { opacity: 1.0; }
  50% { opacity: 0.8; }
}
```

### Flow → Geology

**Trigger**: User hovers over flow node (e.g., "! inject")

**Action**:
1. Show tooltip with operator details
2. Find corresponding geology layer (Layer 1 for operators)
3. Boost salience via glow pulse animation on layer header
4. Return to normal salience on mouse leave (300ms fade)

```css
.geology-layer.cross-highlighted .layer-name {
  animation: glow-pulse 0.8s ease-out;
}

@keyframes glow-pulse {
  0% {
    text-shadow: none;
    transform: scale(1);
  }
  50% {
    text-shadow: 0 0 12px hsla(var(--modal-context-hue), 80%, 60%, 0.8);
    transform: scale(1.02);
  }
  100% {
    text-shadow: none;
    transform: scale(1);
  }
}
```

---

## Implementation Steps

### 1. Add Breadcrumb Component

**File**: `src/app/components/breadcrumbs.ts`

```typescript
export class BreadcrumbNav {
  private container: HTMLElement | null = null
  private levels: string[] = ['Workbench']

  mount(selector: string): void {
    // Create breadcrumb nav
    // Subscribe to state changes (active region, tab, selection)
    // Update breadcrumb path
  }

  updatePath(levels: string[]): void {
    // Re-render breadcrumb with new path
    // Apply salience (active level = full opacity)
  }

  private render(): string {
    // Return HTML for breadcrumb nav
  }
}
```

**Mount location**: Inspector panel header, below tab bar

### 2. Add Projection Indicators

**File**: Update `src/app/components/detail-drawer.ts` and tab components

Add `data-lifecycle-state` attributes based on:
- `pending`: No AST parsed yet
- `ready`: AST available, graph built
- `error`: Parse errors present

### 3. Implement Cross-Highlighting

**File**: `src/features/keyboard/components/keybinding-geology.ts`

```typescript
// When binding clicked
private handleBindingClick(binding: KeybindingCluster): void {
  // ... existing selection logic ...

  // Cross-highlight flow nodes
  this.highlightFlowNodes(binding.operatorType)
}

private highlightFlowNodes(operatorType?: string): void {
  if (!operatorType) return

  // Find flow nodes with matching operator
  const flowNodes = document.querySelectorAll(`.flow-node[data-operator="${operatorType}"]`)

  // Add highlighted class
  flowNodes.forEach(node => {
    node.classList.add('highlighted')
    setTimeout(() => node.classList.remove('highlighted'), 2000)
  })
}
```

**File**: `src/viz/flow/renderer.ts`

```typescript
// Add data-operator attribute to flow nodes
function renderFlowNode(node: FlowNode): string {
  return `
    <div class="flow-node"
         data-node-id="${node.id}"
         data-operator="${node.type}"
         data-lifecycle-state="ready">
      <!-- node content -->
    </div>
  `
}

// Add hover listener for cross-highlighting geology
container.querySelectorAll('.flow-node').forEach(el => {
  el.addEventListener('mouseenter', () => {
    const operatorType = el.dataset.operator
    highlightGeologyLayer(operatorType)
  })

  el.addEventListener('mouseleave', () => {
    clearGeologyHighlight()
  })
})
```

### 4. Apply Unified Visual Language

**File**: `src/viz/flow/flow.css` (new file)

```css
/* Modal context temperature integration */
.flow-node {
  --operator-hue: 0;  /* Set per operator type */
  background: hsl(
    calc(var(--operator-hue) + var(--modal-context-hue-shift, 0)),
    60%,
    50%
  );
  transition: all 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Operator-specific base hues */
.flow-node[data-operator="inject"] { --operator-hue: 0; }
.flow-node[data-operator="tap"] { --operator-hue: 30; }
.flow-node[data-operator="wave"] { --operator-hue: 180; }
.flow-node[data-operator="couple"] { --operator-hue: 280; }
.flow-node[data-operator="probe"] { --operator-hue: 240; }
.flow-node[data-operator="branch"] { --operator-hue: 120; }
.flow-node[data-operator="bias"] { --operator-hue: 60; }
.flow-node[data-operator="emit"] { --operator-hue: 330; }

/* Modal context shifts */
[data-activation-context="visual-semantic"] .flow-node {
  --modal-context-hue-shift: 20;  /* Cooler */
}

[data-activation-context="editing-semantic"] .flow-node {
  --modal-context-hue-shift: -20;  /* Warmer */
}
```

### 5. Documentation Updates

**File**: `docs/design/flow-graph-semantics.md` (new)

```markdown
# Flow Graph Semantics `@spw:term`

## Nodes `@spw:term`
Flow nodes represent operations in the Spw program...

## Edges `@spw:term`
Edges represent data flow between operations...

## Topology `@spw:term`
The flow graph topology mirrors operator composition...

## State Boundaries `@spw:boundary`
Flow state resets when:
1. New code is parsed (triggers buildFlowGraph)
2. AST is cleared (manual or error state)
3. Reset action invoked (demo/walkthrough restart)

## Future Enhancements `@spw:todo`
- [ ] Graph layout algorithms (force-directed, hierarchical)
- [ ] Zoom/pan controls for large graphs
- [ ] Export flow diagram as SVG/PNG
- [ ] Animated flow execution (show data moving through graph)
```

---

## Demo Script `@spw:episode`

### Setup
1. Open workbench at default state (no code parsed)
2. Ensure geology panel is visible (right sidebar)
3. Ensure inspector is open with FLOW tab ready (projection: pending)

### Steps

**Step 1: Parse Code**
```
Input: !boon["hello"] .. @out
Action: Click Parse button (or Ctrl+Enter)
Expected:
  - FLOW tab changes to "ready" state (solid border, glow)
  - Flow diagram shows: [inject] → [emit]
  - Breadcrumb: "Workbench › Inspector › FLOW"
```

**Step 2: Cross-Highlight from Geology**
```
Action: Click "!" binding in Geology Panel (Layer 1 - Operator)
Expected:
  - Geology binding glows
  - Flow diagram: [inject] node pulses with highlight
  - Breadcrumb: "Workbench › Inspector › FLOW › !inject"
```

**Step 3: Cross-Highlight from Flow**
```
Action: Hover over [inject] node in flow diagram
Expected:
  - Tooltip shows: "! inject - Output data, invoke action"
  - Geology Panel: Layer 1 header pulses briefly
  - Node color shifts based on modal context (cool blue in Visual mode)
```

**Step 4: Toggle Modal Context**
```
Action: Click "Editing" button in Geology Panel
Expected:
  - Flow nodes shift warm (amber tint)
  - Transition smooth (400ms)
  - Breadcrumb updates context indicator
```

### Reset Path `@spw:boundary`
1. Clear editor input (delete all code)
2. Click Parse → FLOW tab returns to "pending" state
3. Breadcrumb collapses to: "Workbench › Inspector"
4. Ready for retake

---

## Success Metrics

### Quantitative
- Cross-highlighting latency < 100ms
- Color transition smooth at 400ms
- Breadcrumb updates within 50ms of state change
- No visual jank when switching tabs

### Qualitative
- Users can track navigation path without confusion
- Operator affinity (warm/cool) is perceptually obvious
- Flow diagram feels "alive" (responsive, interactive)
- Recording-friendly (stable layout, clear visual cues)

---

## Future: Lindy Structure Mapping `@spw:todo`

Map flow graph patterns onto durable reference structures:

| Spw Pattern | Lindy Structure | Topology |
|-------------|-----------------|----------|
| `!x .. @y` | Input → Output | Linear sequence |
| `?[test] { a \| b }` | If/Else | Branching tree |
| `~[items] { op }` | Map/ForEach | Star topology |
| `<>[req, res]` | Request/Response | Bidirectional edge |

This supports cognitive manifolds: users learn durable patterns that transfer across tools and contexts.

---

## Related Documents

- `docs/design/research-episodes-plan.md` — Episode contract and season plan
- `docs/audits/ontological-geometry-audit.md` — CSS as differential topology
- `src/viz/flow/README.md` — Flow graph implementation details
- `src/features/keyboard/VIM-KEYBINDINGS.md` — Geology layer semantics

---

**Status**: Ready for implementation
**Next Episode**: 10 - Cognitive Manifolds + Lindy Mapping
