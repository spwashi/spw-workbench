# Keyboard Navigation Refactor Plan

## Goals
- Make Tab/Escape/leader navigation deterministic across regions, tabs, and overlays.
- Prevent hotkey hijack while typing in inputs/contenteditable fields.
- Consolidate roving/tab patterns into shared primitives.
- Centralize context ownership so focus and hotkeys clean up reliably.

## Phase 0 - Audit (completed)
- Map Tab/Escape handling across keyboard manager, layer transitions, tab bar, and dropdowns.
- Identify duplicated roving/tab implementations and missing ownership boundaries.

## Phase 1 - New Primitives (implement now)
1) Keyboard scope router (features)
- Location: src/features/keyboard/keyboard-scope.ts
- API:
  - registerScope({ id, container, priority, activeWhen?, onKeydown })
  - unregisterScope(id)
  - start()/stop() to manage a single global keydown listener
  - handleEvent(event) (respects event.defaultPrevented)
- Purpose: centralize key routing by priority and active container.

2) Focus context stack (infra)
- Location: src/infra/accessibility/focus-stack.ts
- API:
  - pushContext({ id, element, returnFocus, close })
  - popContext(id?)
  - closeTopContext()
  - peekContext()
- Purpose: make Escape exit deterministic across nested contexts.

3) Typing guard (infra)
- Location: src/infra/accessibility/typing.ts
- API: isTypingTarget(element)
- Purpose: disable global hotkeys for inputs/textarea/contenteditable.

4) Roving group helper (infra)
- Location: src/infra/accessibility/roving-group.ts
- Wraps RovingTabindex with:
  - syncToActiveElement()
  - bindContainerFocus()/unbindContainerFocus()
- Purpose: keep roving index aligned with real focus.

## Phase 2 - Centralize Tab/Escape
- Route Escape through focus context stack first, then fallback to region focus/mode.
- Remove per-component Tab handling where possible; route Tab through keyboard scope router.
- Keep scoped navigation as a router fallback when no higher-priority scope owns focus.

## Phase 3 - Migrate Components
- Document navigator dropdown registers a scope and uses focus context stack.
- Drawer, modal, settings push/pop context stack entries instead of local Escape handling.
- Tab bar uses roving group helper for arrow navigation; Tab handled by router.

## Phase 4 - Scoped Navigation Sync
- Update scoped navigation to call syncToActiveElement() before moving focus.
- Bind focusin to keep internal roving index aligned.

## Phase 5 - Tests + Validation
- Add unit tests for focus context stack and scope router.
- Manual smoke: inspector tabbing, dropdown closing, Escape out of overlays, and typing in contenteditable fields.
