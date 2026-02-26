# Boonhonk Refactor Plan

**Baseline commit:** 34c22a0
**Target:** Fix CSS/JS semantic inconsistencies identified in BOONHONK-AUDIT.md
**Strategy:** JS semantics → State surface → CSS namespace → Responsiveness

**Progress commits:**
- `1895f94` - Phase 0+1 critical fixes
- `83fae13` - Phase 2 component identification migration
- `6713e00` - Delete orphaned style.css and add dual CSS selectors
- `14a0f3c` - Add spw-ui and spw-viz alias classes
- `51c7ab1` - Namespace inspector, editor, and drawer

## Phase 0: Critical JS Fixes ✓ COMPLETE

**Why first:** These are runtime bugs and confusion points, not cosmetic issues.

### Tasks
- [x] Fix dual AppMode vocabulary
  - Renamed `AppMode` → `OperationMode` in `src/app/hooks.ts`
  - Keeps `AppMode` in `src/infra/state/state.ts` for interaction modes
  - Commit: `1895f94`

- [x] Initialize breakpoints in bootstrap
  - Added `initBreakpoints()` call in `src/platform/bootstrap.ts`
  - Cleanup function stored on window for HMR
  - Commit: `1895f94`

- [x] Fix ARIA controls mismatch
  - Changed `aria-controls="tab-panel-${tabId}"` → `aria-controls="tab-${tabId}"`
  - Now matches actual panel IDs in `index.html`
  - Commit: `1895f94`

- [x] Migrate sr-only to active CSS
  - Added `.sr-only` and `.sr-only-focusable` to `src/styles/accessibility.css`
  - Commit: `1895f94`

- [x] Migrate state selectors to active CSS
  - Created `src/styles/state.css` with mode/layer/region selectors
  - Commit: `1895f94`

- [x] Reconcile src/style.css
  - Transformed into scratchpad/hotfix file (13 lines)
  - Critical rules migrated to `src/styles/state.css` and `src/styles/accessibility.css`
  - Now serves as override layer for experiments and debugging
  - Commit: `6713e00`

## Phase 1: State Surface Unification ✓ COMPLETE

### Tasks
- [x] Add root scoping
  - Added `data-spw-root` to `#app` in `index.html`
  - Documented embedding considerations in `src/styles/base.css`
  - Commit: `1895f94`

- [x] Make ARIA primary truth
  - Updated `panels.css`, `inspector.css`, `drawer.css`
  - Pattern: `element[hidden]` for visibility, `aria-selected` for tabs
  - `.active` class deprecated but still works for backwards compatibility
  - Commit: `1895f94`

- [x] Resolve data-layer overloading
  - Renamed element-level `data-layer` → `data-spw-ui-layer` in `ui-layers.ts`
  - Keeps `html[data-layer]` for app state (no collision)
  - Commit: `1895f94`

- [ ] Implement data-spw-state-* taxonomy
  - Status: Documented in `state.css`, not yet renamed in JS
  - Current: `data-mode`, `data-layer`, etc.
  - Target: `data-spw-state-mode`, `data-spw-state-layer`, etc.
  - Deferred: Lower priority, current naming works

## Phase 2: CSS Namespace Alignment ✓ COMPLETE

### Tasks
- [x] Create compatibility layer
  - Created `src/styles/compat.css` (expanded to 280+ lines)
  - Documents namespace mapping for App, UI, and Viz domains
  - Commit: `83fae13`, `51c7ab1`

- [x] Migrate component identification pattern
  - Converted all `data-component="hud.*"` → `data-spw-component="*"`
  - Removed all `.c-hud-*` classes from `index.html`
  - Total: 30 `data-spw-component` attributes
  - Documented in `CLAUDE.md`
  - Commit: `83fae13`

- [x] Migrate CSS classes (dual selector strategy)
  - Added canonical classes alongside legacy in `index.html`
  - App domain: `.hud-*` + `.spw-app-*` (header, main, sidebar, footer, logo, status)
  - UI domain: `.panel-*` + `.spw-ui-*` (panel, modal, toast, drawer, inspector, editor)
  - Viz domain: `.token-*`, `.ast-*`, `.flow-*` + `.spw-viz-*`
  - CSS files updated with dual selectors for backwards compatibility
  - Commits: `6713e00`, `14a0f3c`, `51c7ab1`

## Phase 3: Responsive Fluency Architecture ✓ COMPLETE

See `PHASE-3-FLUENCY.md` for detailed philosophy and implementation.

### Tasks
- [x] Add container query support
  - Added container-type/container-name to 6 components:
    - Editor panel (spw-editor)
    - Inspector panel (spw-inspector)
    - Sidebar (spw-sidebar)
    - Drawer (spw-drawer)
    - Header (spw-header)
    - Footer (spw-footer) - was already done
  - Container query adaptations at multiple breakpoints
  - Components now respond to their own width, not viewport
  - Commits: `922c55a`

- [x] Focus landmarks and skip links
  - Added skip-links nav with 3 shortcuts (editor, inspector, details)
  - Enhanced mode indicator with aria-live for announcements
  - Added role="application" to root for interactive app semantics
  - Mode-aware focus styling (insert/inspect/transform)
  - Region emphasis based on active state
  - Commits: `922c55a`

- [x] Roving tabindex pattern
  - Added RovingTabindex class to src/infra/accessibility/focus.ts
  - Supports vertical, horizontal, or both orientations
  - Home/End navigation, wrap option
  - Expand/collapse callbacks for trees
  - Exported for use in token list, AST tree, flow diagram
  - Commits: `32a1806`

- [x] Semantic announcements
  - Added initSemanticAnnouncements for centralized state announcements
  - announceAction, announceError, announceNavigation helpers
  - Mode and region change announcements
  - Commits: `f4e181d`

### Future Enhancements
- [ ] Convert fixed panel widths to fluid with clamp()
- [ ] Apply RovingTabindex to actual AST tree component
- [ ] Focus memory/restoration between stories

## Success Metrics

Current progress:

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Dual AppMode | 2 | 1 | ✓ Fixed |
| initBreakpoints() calls | 0 | 1 | ✓ Fixed |
| ARIA controls mismatch | 1 | 0 | ✓ Fixed |
| sr-only in active CSS | 0 | 3 | ✓ Migrated |
| data-spw-root | 0 | 1 | ✓ Added |
| .c-hud-* classes | 22 | 0 | ✓ Removed |
| data-component | 28 | 0 | ✓ Migrated |
| data-spw-component | 2 | 30 | ✓ Migrated |
| compat.css | - | 280+ lines | ✓ Created |
| spw-app-* classes | 0 | 8+ | ✓ Added |
| spw-ui-* classes | 0 | 40+ | ✓ Added |
| spw-viz-* classes | 0 | 20+ | ✓ Added |
| src/style.css | 4735 lines | 13 lines | ✓ Scratchpad |
| Container queries | 1 | 6 | ✓ Phase 3 |
| Skip links | 1 | 3 | ✓ Phase 3 |
| RovingTabindex class | 0 | 1 | ✓ Phase 3 |
| Semantic announcements | basic | full | ✓ Phase 3 |

Remaining work:
- [x] ~~Delete/archive `src/style.css`~~ → Transformed to scratchpad
- [x] ~~CSS class namespace migration~~ → Complete with dual selectors
- [x] ~~Container query support~~ → Phase 3 complete
- [ ] Apply RovingTabindex to tree components (future)

## Related Documents

- `BOONHONK-AUDIT.md` - Original audit findings
- `COMPONENT-HOOKS-DECISION.md` - Component identification analysis
- `CLAUDE.md` - Updated with new patterns
- `src/styles/compat.css` - Migration compatibility layer
- `scripts/track-migration.sh` - Progress tracking
