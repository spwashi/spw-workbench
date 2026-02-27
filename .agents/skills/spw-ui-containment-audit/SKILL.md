---
name: spw-ui-containment-audit
description: Audit and fix UI containment/sizing/scroll issues (grid/flex sizing, overflow, positioning, container queries). Use for layout bugs like "not containing", "overflowing", "scroll broken", and panel sizing problems.
---

# Spw UI Containment Audit

## Default Workflow

1. Identify the failing containment contract: who should own width, height, and scroll?
2. Locate the nearest layout container (grid/flex) and its sizing rules.
3. Enumerate out-of-flow children (absolute/fixed/sticky) and intentional overlays.
4. Check "shrinkability" in flex/grid (`min-width: 0`, `min-height: 0`) and overflow settings.
5. Verify that container queries or size containment are not blocking intrinsic sizing.
6. Apply the smallest fix that restores the contract; prefer container-owned spacing and scroll.

## Output Contract

- Provide a short "containment map": container → items → overflow/scroll owner.
- Make a focused patch that fixes the root cause without introducing new layout primitives.
- Update the component's `.spw` doc `surface:` section if the containment contract changes.

## Codebase Layout Architecture

### Application Shell
```
body > #app > .spw-app-layout (CSS Grid: header / main / footer)
  ├── .hud-header (fixed height)
  ├── .spw-app-main (CSS Grid: sidebar / editor / inspector)
  │   ├── .spw-app-sidebar (collapsible, resizable)
  │   ├── .spw-app-editor-area (flex-grow, contains editor + context panel)
  │   └── .spw-app-inspector (tabbed: AST / Tokens / Flow / Registers / Trace)
  └── .hud-footer (compact)
```

### Panel System
- Panels use `.spw-panel-*` classes
- Panel headers have density modes (compact / normal / expanded)
- Stacking managed by `src/ui/stacking/` — z-index tiers for overlays, modals, tooltips
- Scroll ownership: each panel body owns its own scroll

### Component Identification
- `[data-spw-component="header"]` for stable identification
- `[data-region="editor"]` for region-based CSS
- `[data-activation-context]` on `html` for context-specific styling

### Key Containment Patterns
- `overflow: hidden` on grid cells to prevent content from stretching grid
- `min-width: 0; min-height: 0` on flex/grid children for shrinkability
- `contain: layout style` on heavy subtrees for rendering isolation
- `position: sticky` panels anchor to their scroll container

### Valence Impact on Layout
Components describe their containment behavior through valence in `.spw` docs:
- **bone**: structural baseline — the default containment contract (grid, size, overflow)
- **bonk**: catalytic layout shifts — animations that might break containment (shake, snap)
- **boon/bane**: expansion/contraction — how the component grows or shrinks

## Codebase Tooling

```bash
npm run audit:ui-selectors          # Audit UI selector baseline
npm run audit:ui-selectors:update   # Update selector baseline after intentional changes
npm run audit:context-panel         # Audit context panel contract
npm run fuzz:runtime                # Unnecessary conditions, coercion (catches layout logic bugs)
```

## Skill Care

Update this skill when:
- The application shell layout changes (new panel, new grid area) → update the Layout Architecture section
- A new stacking tier is added to `src/ui/stacking/` → update Key Containment Patterns
- The panel density system changes → update Panel System section
- The `audit:ui-selectors` baseline is updated → note the change in the skill

## Scripts

- `bash .agents/skills/spw-ui-containment-audit/scripts/containment-scan.sh [path]` — find overflow/positioning/z-index/margin issues

## Shared Spw Integration

`containment-scan.sh` uses `scripts/spw-lib.sh` so containment audits share the same Spw section/facet instrumentation format as other skills.

## Resources

- Use `.agents/skills/spw-ui-containment-audit/references/containment-checklist.md` for search patterns and common fixes.
