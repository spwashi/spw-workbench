# Phase 3: Responsive Fluency Architecture

**Philosophy:** Applications as extensions of our psyche into fluency.

The interface should respond not just to viewport dimensions, but to *context*—the user's attention, the task at hand, the information density required. True responsiveness is about cognitive ergonomics: minimizing friction between intention and action.

## Core Principles

### 1. Contextual Density
Components should adapt to their container's capacity for meaning, not just its pixel width. A narrow panel can still be *dense* with information; it just organizes differently.

### 2. Focus as Narrative
Focus flow tells a story. Each tab press is a sentence; each region transition is a chapter. The application should guide attention through a coherent narrative arc.

### 3. Semantic Grounding
ARIA roles aren't just accessibility compliance—they're declarations of *intent*. A `region` says "this matters separately"; a `dialog` says "attend to me now."

### 4. Keyboard as First Language
The keyboard is direct neural interface. Mouse movement is translation; keystrokes are thought-to-action. Design for fingers that know where they're going.

---

## Implementation Domains

### A. Container Query Architecture

**Current State:** Only footer uses container queries.

**Target State:** All panels respond to their own dimensions.

| Container | Name | Adaptation Strategy |
|-----------|------|---------------------|
| `.primary-panel` | `spw-editor` | Line numbers collapse; metrics minimize |
| `.secondary-panel` | `spw-inspector` | Tab labels → icons; drawer slides under |
| `.hud-sidebar` | `spw-sidebar` | Icons only; tooltip hints |
| `.hud-header` | `spw-header` | Logo shrinks; mode badge compacts |
| `.detail-drawer` | `spw-drawer` | Tab layout → stacked; content scrolls |
| `.modal-content` | `spw-modal` | Multi-column → single; padding reduces |

**Breakpoint Tokens:**
```css
/* Container scale (from breakpoints.ts) */
--spw-container-xs: 200px;
--spw-container-sm: 320px;
--spw-container-md: 480px;
--spw-container-lg: 640px;
--spw-container-xl: 800px;
```

### B. Focus Flow Narratives

**Current Narrative:**
```
[sidebar] ←→ [editor] ←→ [inspector]
               ↓
          [drawer/modal]
```

**Enhanced Narrative (with stories):**

1. **Parse Story**: sidebar(parse) → editor(input) → inspector(results) → drawer(details)
2. **Explore Story**: inspector(tokens) → drawer(properties) → editor(highlight) → inspector(next)
3. **Transform Story**: editor(select) → transform-mode(pick) → editor(result)

**Focus Landmarks:**
- Each region should have a `role="region"` with `aria-label`
- Focus should restore to meaningful position, not just "last element"
- Story progress tracked in state for intelligent restoration

### C. Tabindex Taxonomy

**Current Patterns:**
- `tabindex="0"`: Interactive elements in tab order
- `tabindex="-1"`: Programmatically focusable (regions, drawer)
- Roving: Only in tab bar

**Enhanced Patterns:**

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Roving tabindex** | Tab bars, tree nodes, token list | Arrow keys navigate; Tab exits group |
| **Focus sentinel** | Modal boundaries | Invisible elements that trap Tab |
| **Region anchors** | Panel headers | `tabindex="-1"` with aria-label |
| **Skip links** | Large content areas | Hidden until focus |

**New Skip Links:**
```html
<a href="#spw-input" class="skip-link">Skip to editor</a>
<a href="#inspector-tabs" class="skip-link">Skip to inspector</a>
<a href="#detail-drawer" class="skip-link">Skip to details</a>
```

### D. Application Semantics

**Current Roles:**
- `banner`, `main`, `complementary`, `contentinfo` (landmarks)
- `tablist`, `tab`, `tabpanel` (widgets)
- `tree`, `listbox`, `dialog` (complex widgets)

**Enhanced Semantic Model:**

```html
<div id="app" data-spw-root role="application" aria-label="Spw Language Workbench">
  <!-- Declares: "This is an interactive application, not a document" -->

  <header role="banner" aria-label="Workbench header">
    <div role="status" aria-live="polite" aria-label="Current mode">
      <!-- Mode badge announces mode changes -->
    </div>
  </header>

  <main role="main">
    <aside role="complementary" aria-label="Quick actions">
      <nav role="navigation" aria-label="Primary actions">
        <!-- Action buttons -->
      </nav>
    </aside>

    <section role="region" aria-label="Editor panel">
      <!-- Primary workspace -->
    </section>

    <section role="region" aria-label="Inspector panel">
      <div role="tablist" aria-label="Inspector views">
        <!-- Tabs -->
      </div>
      <div role="tabpanel" aria-label="Current view">
        <!-- Content adapts: tree, listbox, etc. -->
      </div>
    </section>
  </main>

  <footer role="contentinfo">
    <div role="status" aria-live="polite" aria-label="System status">
      <!-- Status updates -->
    </div>
  </footer>
</div>
```

**Mode Announcements:**
```typescript
// When mode changes, announce to screen readers
appState.on('mode:change', (mode) => {
  announce(`${mode} mode activated`, 'polite')
})
```

---

## Granular Expertise Areas

### 1. Container Query CSS Patterns

```css
/* Panel self-awareness */
.spw-ui-panel {
  container-type: inline-size;
  container-name: spw-panel;
}

@container spw-panel (max-width: 480px) {
  .spw-ui-panel-header {
    padding: var(--spw-space-scale-xs);
  }

  .spw-ui-panel-title {
    font-size: 0.75rem;
  }

  .spw-ui-panel-actions {
    gap: var(--spw-space-scale-xs);
  }
}

@container spw-panel (max-width: 320px) {
  .spw-ui-panel-title {
    /* Show icon only via CSS */
  }

  .spw-ui-panel-metrics {
    display: none;
  }
}
```

### 2. Roving Tabindex for Trees

```typescript
class TreeNavigation {
  private items: HTMLElement[] = []
  private current: number = 0

  handleKey(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        this.moveTo(this.current + 1)
        break
      case 'ArrowUp':
        this.moveTo(this.current - 1)
        break
      case 'ArrowRight':
        this.expand(this.current)
        break
      case 'ArrowLeft':
        this.collapse(this.current)
        break
      case 'Home':
        this.moveTo(0)
        break
      case 'End':
        this.moveTo(this.items.length - 1)
        break
    }
  }

  private moveTo(index: number) {
    const prev = this.items[this.current]
    const next = this.items[Math.max(0, Math.min(index, this.items.length - 1))]

    prev?.setAttribute('tabindex', '-1')
    next?.setAttribute('tabindex', '0')
    next?.focus()

    this.current = index
  }
}
```

### 3. Focus Restoration Context

```typescript
interface FocusContext {
  region: Region
  elementId?: string
  position?: { line: number; column: number }  // For editor
  nodeId?: string  // For tree/list
  scrollTop?: number
}

class FocusMemory {
  private contexts = new Map<string, FocusContext>()

  save(story: string, context: FocusContext) {
    this.contexts.set(story, context)
  }

  restore(story: string): boolean {
    const context = this.contexts.get(story)
    if (!context) return false

    // Restore region, then element, then position
    regionFocusManager.focusRegion(context.region)

    if (context.elementId) {
      document.getElementById(context.elementId)?.focus()
    }

    if (context.position) {
      // Restore cursor position in editor
    }

    return true
  }
}
```

### 4. Semantic State Attributes

```css
/* Mode-aware focus indicators */
[data-spw-root][data-mode="insert"] :focus-visible {
  outline-color: var(--spw-color-mode-insert);
}

[data-spw-root][data-mode="inspect"] :focus-visible {
  outline-color: var(--spw-color-mode-inspect);
}

[data-spw-root][data-mode="transform"] :focus-visible {
  outline-color: var(--spw-color-mode-transform);
}

/* Region-aware styling */
[data-region][data-active="true"] {
  --spw-region-emphasis: 1;
}

[data-region][data-active="false"] {
  --spw-region-emphasis: 0.7;
  opacity: var(--spw-region-emphasis);
}
```

---

## Implementation Order

1. **Container Definitions** (CSS)
   - Add `container-type` and `container-name` to all panels
   - Create container breakpoint variables

2. **Container Queries** (CSS)
   - Editor panel adaptations
   - Inspector panel adaptations
   - Sidebar collapse behavior

3. **Focus Landmarks** (HTML + JS)
   - Add `role="region"` with labels
   - Implement focus memory
   - Add skip links

4. **Roving Tabindex** (JS)
   - Extend to AST tree
   - Extend to token list
   - Create shared utility

5. **Semantic Announcements** (JS)
   - Mode change announcements
   - Region transition announcements
   - Action confirmation announcements

---

## Success Criteria

| Aspect | Metric | Target |
|--------|--------|--------|
| Container queries | Components with container-type | 6+ |
| Focus landmarks | Regions with aria-label | 5+ |
| Roving patterns | Components with roving tabindex | 3+ |
| Skip links | Navigation shortcuts | 3+ |
| Announcements | Screen reader notifications | All mode changes |
| Keyboard coverage | Actions reachable by keyboard | 100% |

---

## Related Documents

- `BOONHONK-AUDIT.md` - Original semantic audit
- `REFACTOR-PLAN.md` - Migration phases
- `src/infra/accessibility/focus.ts` - Focus management
- `src/ui/tokens/breakpoints.ts` - Container size tokens
