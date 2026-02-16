# Depth Reflection: Nine Dimensions of Interface Coherence

The workbench is a lens through which we examine symbolic language. These nine dimensions help us understand how the interface can become an extension of thought.

---

## 1. Depth

**Layers of meaning, nested structures, z-order.**

```
Semantic Depth:        Syntactic → Semantic → Pragmatic
Visual Depth:          base → dialog → modal → notification
DOM Depth:             app → region → panel → component → element
Cognitive Depth:       glance → scan → read → understand → apply
```

The Spw language itself has depth: operators (`!^~<>?*=@`) wrap identities which contain expressions. The UI should mirror this—each zoom level reveals more detail without losing context.

**Current state:** Z-layers managed via `data-layer`. Container queries respond to component depth (how nested is this panel?). Focus trapping creates cognitive depth boundaries.

**Opportunity:** Depth indicators—breadcrumbs, nesting level badges, visual indentation that scales with semantic depth.

---

## 2. Rendering Logic

**When does what appear? How do components decide?**

```
Parse → Tokens → AST → Flow
  │        │       │      └─ Rendered on demand (lazy)
  │        │       └─ Rendered on parse (eager)
  │        └─ Rendered on parse (eager)
  └─ User action
```

**Current state:** Rendering is event-driven. Parse triggers token/AST/flow rendering. Tab visibility is state-driven (data-tab attribute).

**Opportunity:**
- Stale indicators—when AST doesn't match editor content
- Progressive rendering—show partial AST as parsing proceeds
- Render budgets—defer expensive visualizations to idle time

---

## 3. Ergonomics

**Reducing friction between intention and action.**

```
Thought → Keypress → Response → Understanding
           └─ Minimize latency here
                      └─ Maximize clarity here
```

**Current state:**
- Vim-like modes reduce context switching
- Keyboard hints adapt to current mode
- Skip links for quick navigation
- Container queries adapt to available space

**Opportunity:**
- Command palette for discoverability
- Gesture recognition for common patterns
- Predictive assistance (autocomplete operators)
- Reduced motion paths for common actions

---

## 4. Alignment

**Visual, semantic, and behavioral consistency.**

```
Visual:     Grid → Columns → Baselines → Spacing tokens
Semantic:   data-spw-* attributes follow taxonomy
Behavioral: Similar components respond similarly
Temporal:   Animations have consistent timing
```

**Current state:**
- Design tokens for spacing (--spw-space-scale-*)
- CSS namespace conventions (spw-app-*, spw-ui-*, spw-viz-*)
- Component identification pattern (data-spw-component)

**Opportunity:**
- Alignment guides in flow diagrams
- Visual rhythm in token lists (consistent row height)
- Semantic alignment between code and visualization (highlight synchronization)

---

## 5. Flow

**Data flow, user flow, attention flow.**

```
Data Flow:
  Source → Lexer → Parser → Analyzer → Renderer
              ↓        ↓         ↓
           Tokens    AST      Flow Graph

User Flow:
  [Edit] → [Parse] → [Explore] → [Transform] → [Export]
    ↑                                 │
    └─────────────────────────────────┘

Attention Flow:
  Editor (active region) → Inspector (results) → Drawer (details)
```

**Current state:**
- Region-based focus management
- Mode transitions guide user through flows
- Lens walk (shown in footer) guides onboarding

**Opportunity:**
- Flow visualization should show data movement direction
- Breadcrumb trail of exploration path
- Flow state persistence across sessions

---

## 6. Descriptiveness

**Self-documenting interfaces, clear communication.**

```
Element Descriptiveness:
  <button aria-label="Parse code" data-spw-component="editor.parse-btn">
           └─ What it does      └─ Where it lives

State Descriptiveness:
  html[data-mode="insert"][data-region="editor"]
       └─ Current mode    └─ Active focus
```

**Current state:**
- ARIA labels on interactive elements
- data-spw-component describes structure
- Mode indicator shows current state

**Opportunity:**
- Tooltip system for complex UI elements
- Status bar with contextual information
- Error messages that suggest solutions

---

## 7. Serialization

**State capture, persistence, portability.**

```
What to serialize:
  - Editor content (source)
  - Parse result (AST)
  - UI state (tabs, drawer, mode)
  - User preferences (theme, disclosure level)
  - Session history (navigation, edits)

Formats:
  - JSON (structured data)
  - URL hash (shareable state)
  - localStorage (persistence)
  - File export (portability)
```

**Current state:**
- Onboarding state persisted
- Theme preferences saved
- Sample inputs available

**Opportunity:**
- Shareable URLs with encoded state
- Export AST as JSON/Spw
- Session restore on reload
- Workspace snapshots

---

## 8. History

**Temporal navigation, undo/redo, session memory.**

```
History Types:
  - Edit history (text changes)
  - Parse history (previous ASTs)
  - Navigation history (focus path)
  - Mode history (state transitions)
  - Session history (across visits)
```

**Current state:**
- Browser undo in editor (native)
- Focus history in RegionFocusManager
- Step-through history in debug controller

**Opportunity:**
- Visual diff between parse states
- "Time travel" through edit history
- Replay navigation paths
- Persistent session timeline

---

## 9. Arcs

**Narrative journeys, user stories, interaction trajectories.**

```
Onboarding Arc:
  Welcome → First Parse → Explore Tokens → Understand AST →
  See Flow → Try Transform → Achieve Fluency

Parse Story Arc:
  [sidebar:parse] → [editor:input] → [inspector:results] → [drawer:details]

Exploration Arc:
  Token List → Select Token → View in AST → See in Flow →
  Edit Source → Reparse → Compare

Mastery Arc:
  Normal Mode → Keyboard Navigation → Transform Mode →
  Custom Patterns → Extension Development
```

**Current state:**
- Lens walk starter (4/6 in screenshot) guides semantic exploration
- Mode transitions create micro-arcs
- Disclosure levels reveal progressive complexity

**Opportunity:**
- Guided tours for specific features
- Achievement system for learning milestones
- "Story" mode that narrates transformations
- Arc visualization showing user journey

---

## Synthesis: The Interface as Extension of Psyche

These nine dimensions converge on a single insight: **the interface should feel like thinking, not like operating a tool.**

| Dimension | Inner Experience | Interface Manifestation |
|-----------|------------------|-------------------------|
| Depth | Holding context while diving | Breadcrumbs, zoom levels |
| Rendering | Seeing what matters when | Lazy rendering, stale indicators |
| Ergonomics | Effortless action | Keyboard-first, adaptive layout |
| Alignment | Visual harmony | Design tokens, consistent spacing |
| Flow | Smooth transitions | Region focus, mode transitions |
| Descriptiveness | Understanding at a glance | Labels, tooltips, status |
| Serialization | Picking up where I left off | State persistence, sharing |
| History | Remembering my path | Undo, navigation history |
| Arcs | Sense of progress | Onboarding, achievements |

When these dimensions are aligned, using the workbench becomes *fluency*—the interface disappears and only the work remains.

---

## Next Steps

1. **Depth indicators** - Show nesting level in AST tree
2. **Stale detection** - Mark visualizations when source changes
3. **URL serialization** - Encode state in shareable links
4. **Edit history** - Visual timeline of changes
5. **Arc visualization** - Show user's exploration path
