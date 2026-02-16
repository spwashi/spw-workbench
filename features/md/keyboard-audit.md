## Keyboard Capture Audit

This document captures the keyboard model as an interface contract: intent layers, regions, goals/mindset, and how shortcuts propagate through the reactivity model.

### Layers of Consideration

1. **Mode Layer (global intent):**
   - `normal`: navigation + orchestration.
   - `insert`: direct editing.
   - `inspect`: detail drawer navigation.
   - `transform`: structural edits.
   - `stepping`: step-through control.

2. **Region Layer (spatial intent):**
   - `header`: global status + mode.
   - `sidebar`: actions (parse/refresh/export/settings).
   - `editor`: source input + parse trigger.
   - `inspector`: tabs (steps/tokens/ast/flow).
   - `footer`: hints + status.

3. **Goal Layer (task intent):**
   - author → edit code
   - analyze → inspect AST/tokens/flow
   - transform → structural edits
   - step → procedural trace
   - configure → settings + theme

### Regions → Goals (Mindset Mapping)

- **Editor**: authoring + iteration; mindset = "write and run".
- **Inspector**: comprehension + validation; mindset = "explain and verify".
- **Drawer**: deep context; mindset = "zoom and confirm".
- **Sidebar**: orchestration; mindset = "trigger system behaviors".
- **Header/Footer**: situational awareness; mindset = "status and orientation".

### Shortcut Tree (Intent → Action)

```
Global
  ?                → open shortcuts
  Esc              → close modal/settings/drawer, else normal mode
  `                → toggle editor ↔ inspector focus
  Ctrl+1/2/3        → switch layer (syntactic/semantic/pragmatic)
  Shift+T           → cycle theme
  Shift+R           → toggle theme reactions
  Shift+L           → cycle disclosure level

Normal Mode
  i                → enter insert
  t                → enter transform
  p                → parse
  r                → refresh
  e                → export
  g                → settings
  1/2/3/4           → inspector tabs (ast/tokens/flow/steps)
  Enter            → open drawer (inspect)

Insert Mode
  Ctrl+Enter        → parse
  Esc              → normal mode

Inspect Mode (drawer open)
  Tab / Shift+Tab  → cycle drawer tabs
  Esc              → close drawer

Transform Mode
  w/f/b            → wrap scope/frame/body
  o                → change operator
  m                → change modifier
  d                → delete
  y                → yank
  Esc              → exit transform/pickers

Steps Tab
  Shift+L           → start lex
  Shift+P           → start parse
  Space / →         → step forward
  ←                 → step back
  r                 → reset
```

### Reactivity Model (Keyboard → UI)

1. **Capture**: `features/keyboard/keyboard-manager.ts` processes `keydown`.
2. **Intent**: mode/region/goal resolved, then action invoked.
3. **State Surface**: global state updates emit data attributes (`data-mode`, `data-region`, `data-tab`, `data-layer`).
4. **UI Coupling**:
   - CSS responds to state surface for visibility/focus/region styling.
   - JS updates component content (token/AST selection, drawer content).
5. **Feedback Loop**:
   - Toasts + a11y announcements.
   - Highlight layers (editor highlight, token/AST selection).

### Gaps / TODO

- Ensure keyboard hints and modal stay in sync with `keyboard-manager.ts`.
- Consider exporting a machine-readable shortcut map for tests/docs.
- Add explicit region focus indicators for keyboard traversal where missing.
