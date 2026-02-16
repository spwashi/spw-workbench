# Git History Audit: Vim Keybindings Inconsistencies & Missing Documentation

**Date**: 2026-01-18
**Audit Range**: Commits e58253b through 40a8b11
**Status**: In Progress (P0 fixed; P1 fixed; P2 partially fixed)

---

## Executive Summary

Audit of recent commits reveals **7 critical inconsistencies** between the vim keybindings implementation and the user-facing UI. The codebase has layered semantics and AST navigation, but the UI previously leaked implementation details and hid/wired features inconsistently.

**Impact**: The critical rendering bug is fixed, operator/valence motions are now wired (and auditable), but user-facing clarity issues remain (layer naming, tooltips, and immediate visual feedback).

## Update: 2026-01-18 (Post-Audit Fixes)

- **Key capture clarity**: Geology now indicates `Typing` vs `Command` vs `Dialog`, and marks bindings as active/dormant with reasons.
- **Leader safety**: `<space>` leader (activation toggles) is disabled while typing and in STEPPING mode to avoid hijacking text entry or debug stepping.
- **Geology accessibility**: Binding chips are keyboard-focusable; `j/k` and `h/l` work locally inside the panel without triggering global shortcuts.
- **Styles actually load**: `src/features/keyboard/components/keybinding-geology.css` is imported from `src/styles/index.css` (previously depended on “unstyled default” rendering).

---

## Critical Findings

### 🔴 P0: Critical Rendering Bug

**Location**: `src/features/keyboard/components/keybinding-geology.ts` (`renderBinding()` + binding click handler)

**Issue**: Geology panel displays raw HTML/data attributes as text:
```
["we"]'] data-spw-component="geology.binding-item" > Sp e focus
```

**Root Cause**:
```typescript
// BROKEN: JSON includes quotes, which breaks HTML attribute parsing
data-binding-key="${JSON.stringify(binding.keys)}"
```
This embeds a JSON string (with `"` quotes) inside a `"`-delimited HTML attribute, producing invalid markup like:
`data-binding-key="["<space>","e"]"`.

**Impact**: Users see technical internals instead of clean keybinding labels. Breaks trust and readability.

**Fix**: Store a safe, encoded attribute value and decode on read:
```typescript
data-binding-key="${encodeURIComponent(JSON.stringify(binding.keys))}"

const keys = JSON.parse(decodeURIComponent(item.getAttribute('data-binding-key') ?? ''))
```

---

### 🟠 P1: Operator Keys Not Wired to Keyboard Handler

**Status**: Fixed

**Files**:
- `src/features/keyboard/keyboard-manager.ts` (inspect-mode routing)
- `src/features/keyboard/vim-pragmatic-motions.ts` (operator/valence motions + selection sync)
- `src/app/spw-workbench.ts` (AST DOM carries operator/modifier data)

**Issue**: Phase 2 operator-focused motions were fully defined but never called:
- **O** → jump to any operation
- **T** → jump to transform (~)
- **I** → jump to inject (!)
- **E** → jump to emit (@)
- **P** → jump to probe (?)
- **A** → jump to branch (*)
- **V** → jump to tap (^)
- **C** → jump to couple (<>)

**Code Status**:
- ✅ `findNextOperator()` function exists (720 lines in vim-pragmatic-motions.ts)
- ✅ Operator detection works (analyzes AST nodes)
- ✅ Geology schema defines bindings (Layer 4, z: 4)
- ✅ Keyboard handler routes O/T/I/E/P/A/V/C in inspect mode (editing semantic)

**Additional Fix Required for Real Functionality**:
- AST nodes now include `data-operator` and `data-modifiers`, and AST parent/child traversal matches the `.ast-node + .ast-children` DOM structure.

**User Impact**: Geology panel bindings now respond (selection moves to matching operators/modifiers), and key usage is auditable via the keybinding audit log.

---

### 🟠 P1: Incomplete Operator Implementations

**File**: `src/features/keyboard/vim-operators.ts:53-62, 118-125`

**Status**: Partially fixed (user-facing behavior wired; underlying module still stubbed)

**Issue**: `vim-operators.ts` still contains TODO stubs for d (delete/desugar) and c (change):

```typescript
// Line 61 - TODO
export function handleDeleteOperator(selectedNode: ASTNode | null): void {
  console.log('Delete operator on node:', selectedNode)
  // TODO: Implement actual desugar logic based on AST node type
}

// Line 124 - TODO
export function handleChangeOperator(selectedNode: ASTNode | null, targetForm: 'sugared' | 'desugared'): void {
  console.log(`Change operator: ${targetForm} on node:`, selectedNode)
  // TODO: Implement actual change logic
}
```

**User Impact**:
- Geology panel bindings for d/y/c now do something in inspect mode:
  - **d** deletes selected node (undoable)
  - **y** yanks selected node text
  - **c** opens operator picker and applies change (undoable)
- `vim-operators.ts` remains incomplete and should either be completed or removed from the user-facing path.

**Additional Confusion**: There are TWO implementations of d/y/c:
1. **Transform mode** (keyboard-manager.ts:154-177) - working, modifies editor
2. **Operator+motion pattern** (vim-operators.ts) - incomplete stubs

These need to be unified or clearly separated.

**Fix**: Either finish `vim-operators.ts` (real AST-aware transforms + reverse operations) or explicitly route all operator behavior through the existing editor transforms + history stack.

---

### 🟡 P2: Layer Label Implementation Detail Leak

**File**: `src/features/keyboard/components/keybinding-geology.ts` (`renderLayer()`)

**Status**: Partially fixed (z-index removed from UI; phase markers still present in layer names)

**Previous Issue**: Layer names showed internal z-index values:
```
Operator Layer (z: 1)
Activation Context Layer (z: 2)
Text Object Layer (z: 3)
Operator-Focused Motions (Phase 2) (z: 4)
```

**Why This Is Bad**:
- z-index is an internal implementation detail (CSS stacking)
- Users don't understand or care about z-values
- "Phase 2" refers to development iteration, not user concept
- No semantic meaning to users

**Fix**: Remove z-indices and phase markers from display:
```typescript
// Instead of: `${layer.name} (z: ${layer.z})`
// Use: `${layer.name}`
```

Add user-friendly layer descriptions in parentheses:
```
Basic Motions (hjkl navigation)
Operators (modify code)
Context Toggle (visual vs editing)
Text Objects (select regions)
Find Operators (jump to symbols)
```

---

### 🟡 P2: Technical Jargon (No Plain-English Explanations)

**Files**:
- `src/features/keyboard/geology-schema.ts` (defines names)
- `src/features/keyboard/components/keybinding-geology.ts` (displays names)

**Issue**: Layer names use technical terminology:
- "Activation Context Layer" - what's an activation context?
- "Text Object Layer" - vim terminology, not Spw terminology
- "Operator-Focused Motions" - what does "focused" mean?
- "Visual Semantic" vs "Editing Semantic" - abstract concepts

**User Impact**: New users can't learn the system. No onboarding. No help text.

**Fix**:
1. Add tooltips with plain-English explanations
2. Add a "?" help icon next to each layer name
3. Use descriptive subtitles:
   ```
   Basic Motions
   Navigate up/down/left/right in the syntax tree

   Operators
   Transform, delete, or copy selected code

   Context Toggle
   Switch between navigating visually or editing semantically
   ```

---

### 🟡 P2: No Visual Feedback When Keys Pressed

**File**: `src/features/keyboard/components/keybinding-geology.ts`

**Status**: Partially addressed (audit log export exists; inline “last binding” UI still missing)

**Issue**: When user presses hjkl (or any keybinding), the geology panel doesn't show:
- Which binding was just activated
- What operation was performed
- Current position in keybinding landscape

**User Impact**:
- No feedback loop for learning
- Can't tell if key press worked
- No indication of "you are here" in binding space

**Fix**: Add visual feedback system:
1. **Flash/highlight binding when used** - 500ms yellow glow on activated binding
2. **Show last action** - "Last: h (moved to parent)"
3. **Current position indicator** - highlight active layer
4. **Keyboard event listener** - subscribe to keyboard events and update UI

Implementation:
```typescript
// In keybinding-geology.ts
private subscribeToKeyboardEvents(): void {
  document.addEventListener('keydown', (e) => {
    const matchedBinding = this.findMatchingBinding(e.key)
    if (matchedBinding) {
      this.flashBinding(matchedBinding)
      this.updateLastAction(matchedBinding)
    }
  })
}
```

---

### 🟡 P2: Information Overload (All Layers Shown Simultaneously)

**File**: `src/features/keyboard/components/keybinding-geology.ts` (`renderLayer()`)

**Status**: Partially fixed (layers are now collapsible; still needs better “active layer” defaults + search)

**Issue**: Geology panel displays all 5-6 layers at once with no progressive disclosure:
- 50+ keybindings visible
- Dense typography (0.75rem or smaller)
- Limited context filtering (activationContext only)

**User Impact**:
- Overwhelming for new users
- Hard to find relevant bindings
- Visual clutter reduces scannability

**Fix**: Implement collapsible layer accordion:
1. **Default state**: Only show active layer + basic motions
2. **Click to expand**: Click layer header to expand/collapse
3. **Context filtering**: Only show bindings relevant to current mode/focus
4. **Search/filter**: Add search box to filter bindings by key or meaning

Visual hierarchy improvements:
- Larger font for layer headers (1.125rem)
- More whitespace between layers
- Color-code by layer type
- Icons for each layer

---

## Implementation Plan

### Phase 1: Critical Rendering Bug (P0)

**Estimated Time**: 1 hour

**File**: `src/features/keyboard/components/keybinding-geology.ts`

**Changes**:
```typescript
// BEFORE (broken: invalid HTML attribute)
data-binding-key="${JSON.stringify(binding.keys)}"

// AFTER (safe: encode/decode key arrays)
data-binding-key="${encodeURIComponent(JSON.stringify(binding.keys))}"
const keys = JSON.parse(decodeURIComponent(item.getAttribute('data-binding-key') ?? ''))
```

**Additional cleanup**:
- Remove any HTML escaping that double-encodes
- Test with complex binding keys (Space+v, Shift+L)
- Verify dark mode rendering

**Verification**: Geology panel renders clean key labels and clicking bindings works even for `<space>`-prefixed sequences.

---

### Phase 2: Wire Operator-Focused Motions (P1)

**Estimated Time**: 4 hours

**File**: `src/features/keyboard/keyboard-manager.ts`

**Step 1**: Add operator motion handler
```typescript
// After line 341 (existing hjkl handler in inspect mode)
if (['O', 'T', 'I', 'E', 'P', 'A', 'V', 'C'].includes(e.key.toUpperCase()) && !e.ctrlKey && !e.metaKey && !e.altKey) {
  const operatorType = mapKeyToOperator(e.key.toUpperCase())
  handleOperatorFocusedMotion(operatorType)
  e.preventDefault()
  return
}
```

**Step 2**: Create key-to-operator mapping
```typescript
function mapKeyToOperator(key: string): Operator | 'any' {
  const map: Record<string, Operator | 'any'> = {
    'O': 'any',
    'T': '~',
    'I': '!',
    'E': '@',
    'P': '?',
    'A': '*',
    'V': '^',
    'C': '<>', // or should be two-key sequence
  }
  return map[key] || 'any'
}
```

**File**: `src/features/keyboard/vim-pragmatic-motions.ts`

**Step 3**: Export and wire up `handleOperatorFocusedMotion`
```typescript
// Already exists: findNextOperator() at line 295-398
// Need to create wrapper:

export function handleOperatorFocusedMotion(operatorType: Operator | 'any'): void {
  const currentNode = getCurrentSelectedNode()
  const nextNode = findNextOperator(currentNode, operatorType)

  if (nextNode?.element) {
    selectNode(nextNode.element)
    nextNode.element.scrollIntoView({ block: 'center' })

    // Show toast feedback
    const operatorName = operatorType === 'any' ? 'operation' : operatorType
    // (need access to showToast from KeyboardContext)
  }
}
```

**Verification**:
1. Open AST inspector with parsed code containing operators
2. Press **O** → jumps to next operator (any type)
3. Press **T** → jumps to next transform (~)
4. Press **I** → jumps to next inject (!)
5. Geology panel shows these bindings as active

---

### Phase 3: Complete Operator Implementations (P1)

**Estimated Time**: 8 hours

**File**: `src/features/keyboard/vim-operators.ts`

**Decision Point**: Clarify the two operator systems:

**System 1: Transform Mode** (working)
- Activated by pressing `t` in normal mode
- Then press w/f/b/o/m/d/y
- Modifies editor content directly
- Location: keyboard-manager.ts:80-184

**System 2: Operator+Motion Pattern** (incomplete)
- Vim-style: press `d` then motion (like `dj` for delete-down)
- Should work in inspect mode on AST nodes
- Location: vim-operators.ts (TODOs)

**Recommendation**: Complete System 2 OR hide it from geology panel.

**If completing System 2**:

```typescript
// vim-operators.ts:61
export function handleDeleteOperator(selectedNode: ASTNode | null): void {
  if (!selectedNode) return

  // Get node's source span
  const span = selectedNode.span
  if (!span) return

  // Get editor reference
  const editor = document.querySelector('#spw-input') as HTMLTextAreaElement
  if (!editor) return

  // Delete text range
  const before = editor.value.slice(0, span.start.offset)
  const after = editor.value.slice(span.end.offset)
  editor.value = before + after

  // Trigger reparse
  // (need access to runParse from context)
}
```

**Alternative**: If too complex, remove from geology panel:
```typescript
// geology-schema.ts - remove Layer 1 operators from display
// OR add `hidden: true` flag to d/y/c bindings
```

---

### Phase 4: Remove Z-Indices & Jargon (P2)

**Estimated Time**: 2 hours

**File**: `src/features/keyboard/components/keybinding-geology.ts`

**Step 1**: Update layer display template (line 203-207)
```typescript
// BEFORE
<h3 class="layer-name">${layer.name} (z: ${layer.z})</h3>

// AFTER
<h3 class="layer-name">
  ${this.getUserFriendlyLayerName(layer)}
  <button class="layer-help" title="What is this?">?</button>
</h3>
<p class="layer-description">${this.getLayerDescription(layer)}</p>
```

**Step 2**: Add user-friendly mappings
```typescript
private getUserFriendlyLayerName(layer: SemanticLayer): string {
  const names: Record<number, string> = {
    0: 'Basic Motions',
    1: 'Operators',
    2: 'Context Toggle',
    3: 'Text Objects',
    4: 'Find Operators',
    5: 'Find Modifiers',
  }
  return names[layer.z] || layer.name
}

private getLayerDescription(layer: SemanticLayer): string {
  const descriptions: Record<number, string> = {
    0: 'Navigate up/down/left/right through code structure',
    1: 'Transform, delete, or copy selected code',
    2: 'Switch between visual and editing modes',
    3: 'Select regions like words, scopes, or frames',
    4: 'Jump to specific operator types (!, ~, @, etc.)',
    5: 'Jump by valence modifiers (positive, negative, emphatic)',
  }
  return descriptions[layer.z] || ''
}
```

**Step 3**: Add tooltips
```typescript
// On layer help button click
handleLayerHelp(layer: SemanticLayer): void {
  const helpText = this.getDetailedLayerHelp(layer)
  // Show modal or tooltip with detailed explanation
}
```

---

### Phase 5: Add Visual Feedback (P2)

**Estimated Time**: 4 hours

**File**: `src/features/keyboard/components/keybinding-geology.ts`

**Step 1**: Subscribe to keyboard events
```typescript
private subscribeToKeyboardEvents(): void {
  this.keyboardListener = (e: KeyboardEvent) => {
    const matchedBinding = this.findMatchingBinding(e)
    if (matchedBinding) {
      this.flashBinding(matchedBinding)
      this.updateLastAction(matchedBinding)
    }
  }
  document.addEventListener('keydown', this.keyboardListener)
}

private findMatchingBinding(e: KeyboardEvent): KeybindingCluster | null {
  // Check all layers for matching keys
  for (const layer of KEYBINDING_GEOLOGY.layers) {
    for (const binding of layer.bindings) {
      if (this.matchesKeyEvent(binding, e)) {
        return binding
      }
    }
  }
  return null
}
```

**Step 2**: Flash binding on use
```typescript
private flashBinding(binding: KeybindingCluster): void {
  const elements = this.container?.querySelectorAll('.binding-item')
  elements?.forEach(el => {
    const keys = el.querySelector('.binding-keys')?.textContent
    if (keys === binding.keys.join(', ')) {
      el.classList.add('just-used')
      setTimeout(() => el.classList.remove('just-used'), 500)
    }
  })
}
```

**Step 3**: Add CSS animation
```css
/* keybinding-geology.css */
.binding-item.just-used {
  background: var(--spw-color-global-accent-primary);
  color: white;
  animation: flash-binding 500ms ease-out;
  transform: scale(1.05);
}

@keyframes flash-binding {
  0% {
    box-shadow: 0 0 0 0 var(--spw-color-global-accent-primary);
  }
  50% {
    box-shadow: 0 0 12px 4px var(--spw-color-global-accent-primary);
  }
  100% {
    box-shadow: 0 0 0 0 var(--spw-color-global-accent-primary);
  }
}
```

**Step 4**: Show last action
```typescript
private updateLastAction(binding: KeybindingCluster): void {
  this.state.lastAction = {
    keys: binding.keys,
    meaning: binding.semanticMeaning,
    timestamp: Date.now(),
  }
  this.render() // Re-render to show last action
}

// In render():
${this.state.lastAction ? `
  <div class="last-action">
    Last: <strong>${this.state.lastAction.keys.join(', ')}</strong>
    (${this.state.lastAction.meaning})
  </div>
` : ''}
```

---

### Phase 6: Collapsible Layers (P2)

**Estimated Time**: 3 hours

**File**: `src/features/keyboard/components/keybinding-geology.ts`

**Step 1**: Add collapse state
```typescript
interface GeologyState {
  activationContext: ActivationContext
  selectedBinding: KeybindingCluster | null
  currentNodeSemantics: NodeSemantics | null
  collapsedLayers: Set<number>  // NEW: track which layers are collapsed
  lastAction: LastAction | null   // NEW: track last binding used
}
```

**Step 2**: Update render with collapse controls
```typescript
private renderLayer(layer: SemanticLayer): string {
  const isCollapsed = this.state.collapsedLayers.has(layer.z)
  const isActive = this.isLayerActive(layer)

  return `
    <div class="geology-layer" data-layer-z="${layer.z}">
      <h3 class="layer-name ${isActive ? 'active' : ''}"
          onclick="geologyPanel.toggleLayer(${layer.z})">
        <span class="collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
        ${this.getUserFriendlyLayerName(layer)}
        <span class="binding-count">(${layer.bindings.length})</span>
      </h3>
      ${!isCollapsed ? `
        <p class="layer-description">${this.getLayerDescription(layer)}</p>
        <div class="layer-bindings">
          ${layer.bindings.map(binding => this.renderBinding(binding)).join('')}
        </div>
      ` : ''}
    </div>
  `
}

toggleLayer(z: number): void {
  if (this.state.collapsedLayers.has(z)) {
    this.state.collapsedLayers.delete(z)
  } else {
    this.state.collapsedLayers.add(z)
  }
  this.render()
}
```

**Step 3**: Default collapsed state (show only active layer)
```typescript
constructor() {
  this.state = {
    activationContext: appState.get().activationContext,
    selectedBinding: null,
    currentNodeSemantics: null,
    collapsedLayers: new Set([1, 3, 4, 5]), // Collapse all except base (0) and context (2)
    lastAction: null,
  }
}
```

---

### Phase 7: Valence-Focused Motions (P3)

**Estimated Time**: 4 hours

**File**: `src/features/keyboard/keyboard-manager.ts`

**Note**: Layer 5 valence motions (Space+:/−/*/!) are defined in schema but not implemented.

**Decision**: Defer to future work OR implement if time permits.

**If implementing**:
1. Handle Space key leader state (similar to Space+v/e)
2. Detect second key (colon, minus, asterisk, exclamation)
3. Call `findNextModifier()` in vim-pragmatic-motions
4. Wire to keyboard handler

**Complexity**: Requires two-key sequence detection, which is already working for Space+v/e, so can reuse that pattern.

---

## Critical Files

| File | Lines | Changes |
|------|-------|---------|
| `src/features/keyboard/components/keybinding-geology.ts` | 453 | Rendering fix, visual feedback, collapse, tooltips |
| `src/features/keyboard/keyboard-manager.ts` | ~500 | Wire operator motion keys (O/T/I/E/P/A/V/C) |
| `src/features/keyboard/vim-pragmatic-motions.ts` | 720 | Export handleOperatorFocusedMotion |
| `src/features/keyboard/vim-operators.ts` | 165 | Complete d/c implementations OR hide from UI |
| `src/features/keyboard/geology-schema.ts` | 335 | Add user-friendly layer names/descriptions |
| `src/features/keyboard/components/keybinding-geology.css` | ~400 | Flash animations, collapse styles |

---

## Verification Steps

### Phase 1 (Rendering Bug)
1. Load app, open geology panel
2. ✓ See clean key labels like "h, j, k, l"
3. ✓ No raw HTML or data attributes visible
4. ✓ Works in dark mode

### Phase 2 (Operator Motions)
1. Parse code with operators: `!boon["hello"] .. @out`
2. Open AST inspector, focus AST tree
3. Press **O** → ✓ jumps to next operator (either ! or @)
4. Press **I** → ✓ jumps to inject operator (!)
5. Press **E** → ✓ jumps to emit operator (@)
6. ✓ Geology panel highlights active binding

### Phase 3 (Complete Operators)
1. Select AST node
2. Press **d** → ✓ deletes node from source, triggers reparse
3. Press **y** → ✓ yanks node to clipboard
4. Press **c** → ✓ shows suggester for sugared/desugared forms
5. ✓ No console errors or TODOs

### Phase 4 (Plain Language)
1. Open geology panel
2. ✓ No z-indices visible (z: 1, z: 2, etc.)
3. ✓ Layer names use plain English ("Basic Motions" not "Operator Layer")
4. ✓ Each layer has description text
5. ✓ Help icons/tooltips available

### Phase 5 (Visual Feedback)
1. Press **h** in AST inspector
2. ✓ Geology panel flashes "h" binding
3. ✓ "Last: h (move to parent)" shown
4. ✓ Binding highlights for 500ms
5. Press **j** → ✓ flashes "j" binding

### Phase 6 (Collapsible)
1. Open geology panel
2. ✓ Only active layers expanded by default
3. Click layer header → ✓ expands/collapses
4. ✓ Collapse icon animates (▶ ↔ ▼)
5. ✓ Binding count shown in header

### Phase 7 (Valence Motions)
1. Parse code with modifiers: `!boon["hello"]`
2. Press **Space** then **:** → ✓ jumps to next positive (boon)
3. Press **Space** then **-** → ✓ jumps to next negative (bane)
4. ✓ Geology panel shows these as available

---

## Time Estimates

| Phase | Priority | Hours | Cumulative |
|-------|----------|-------|------------|
| 1. Fix rendering bug | P0 | 1 | 1h |
| 2. Wire operator motions | P1 | 4 | 5h |
| 3. Complete operators | P1 | 8 | 13h |
| 4. Remove jargon | P2 | 2 | 15h |
| 5. Visual feedback | P2 | 4 | 19h |
| 6. Collapsible layers | P2 | 3 | 22h |
| 7. Valence motions | P3 | 4 | 26h |

**Total**: ~26 hours (3-4 days focused work)

**Recommended Sprint**: Start with P0+P1 (13 hours) to fix critical bugs and wire operator motions. P2 improvements can follow in next iteration.

---

## Architecture Notes

### Domain Boundaries
All changes stay within allowed boundaries:
- `features/keyboard/` ✓ (main work)
- `app/transforms/` ✓ (operator logic)
- `app/components/` ✓ (keyboard hints)
- No violations of `no-restricted-imports`

### Event Flow
```
User presses key
  ↓
keyboard-manager.ts (routes to handler)
  ↓
vim-pragmatic-motions.ts (finds next node)
  ↓
selectionBus.emit('node-selected', node)
  ↓
keybinding-geology.ts (updates UI via subscription)
```

### State Management
- Uses existing `appState` for activation context
- Uses existing `selectionBus` for node selection events
- Geology panel maintains local state for UI (collapsed, lastAction)
- MutationObserver watches AST tree for dynamic updates

### Testing Strategy
- Manual verification via interactive testing (steps above)
- No automated tests initially (complex integration)
- Future: Add E2E tests for critical paths (hjkl navigation, operator jumping)

---

## Open Questions

1. **Operator implementations**: Should we complete the d/c operator logic (8 hours) or hide them from the geology panel until ready?

2. **Valence motions** (Phase 7): These are defined but never used. Implement now or defer to future?

3. **Progressive disclosure**: Should geology panel start fully collapsed (show only on demand) or show active layer by default?

4. **Keyboard shortcuts**: Should there be a keyboard shortcut to toggle geology panel visibility (e.g., `<space>?`)?

---

## Next Steps

1. Review and approve this audit document
2. Prioritize phases (recommend starting with P0+P1)
3. Resolve open questions above
4. Begin implementation starting with Phase 1 (critical rendering bug)
5. Track progress against verification steps for each phase
