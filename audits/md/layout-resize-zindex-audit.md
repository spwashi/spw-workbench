# Layout / Resizing / Z-Index Audit

**Date:** 2026-02-15  
**Scope:** `src/styles/layout.css`, `src/styles/panels.css`, `src/styles/responsive.css`, `src/platform/bootstrap/panel-layout.ts`, top-level overlays in `index.html`, and related shell/ephemera CSS.

## Findings (High Signal)

### 1) Medium breakpoint resizing semantics are inconsistent

In `html[data-breakpoint="medium"]`, `src/styles/responsive.css` stacks the workspace split vertically (`grid-template-rows`), and the handle cursor was set to `row-resize`. However, `src/platform/bootstrap/panel-layout.ts` only resizes along X (`clientX`), so dragging does nothing visually (but still triggers pointer-capture and the global `data-resizing` posture).

**Fix applied:** disable interactive resizing for medium breakpoint handles (keep the handle as a visual separator) until Y-axis resizing is implemented.

### 2) Detail drawer layering drifted and duplicated across files

The detail drawer was defined in `src/styles/components/shell/drawer.css`, but also hard-overridden via `#detail-drawer` in `src/styles/layout.css` (including `z-index: 10000 !important`). That override:
- bypassed the shell component’s own lifecycle styling, and
- placed the drawer above overlay panels (settings/prompt), which is semantically wrong and breaks interaction affordances.

**Fix applied:** remove the override from `src/styles/layout.css` and set the drawer’s z-index via a dedicated attention-layer token.

### 3) Top-level overlays used mismatched z-index conventions

`index.html` hosts multiple overlays outside `#app`:
- dock overlay (`spw-dock-overlay`)
- theme stage badge (`.spw-stage-badge`)
- settings panel (`spw-settings-panel`)
- screenshot prompt panel (`spw-screenshot-prompt-panel`)
- toast container (`#toast-container`)

Before this pass, several surfaces used raw `9999`/`10000` values that could float above settings/prompt and intercept clicks.

**Fix applied:** introduce explicit attention-layer tokens for these overlay classes and migrate the key surfaces.

## Layer Contract (Current)

Defined in `src/styles/tokens.css`:
- `--spw-attention-layer-standard` (100): normal UI chrome
- `--spw-attention-layer-floating` (350): small floating controls (stage badge, context tuner)
- `--spw-attention-layer-drawer` (450): bottom drawers
- `--spw-attention-layer-overlay` (520): overlay panels (settings/prompt) and full-screen “app overlay” surfaces
- `--spw-attention-layer-dock` (920): docking overlay
- `--spw-attention-layer-elevated` (1000): modal dialogs
- `--spw-attention-layer-system` (9000): cinematic overlays (scanlines)
- `--spw-attention-layer-critical` (10000): toasts / critical notifications

This keeps “paper” overlays (settings) above “hardware” ambiance (stage badge/tuner), while still allowing the system texture layer to sit above most UI when desired.

## Follow-Ups (Not Implemented Yet)

1. Implement Y-axis resizing for stacked split panes (medium breakpoint):
   - add a `--spw-grid-template-rows` contract to `.split-pane` and an axis-aware resizer in `src/platform/bootstrap/panel-layout.ts`.
   - store width vs height separately (avoid mixing persisted sizes).

2. Reduce z-index duplication in TS style-strings:
   - consider a shared `ui/stacking` → CSS token bridge so TS and CSS express the same layer names.

3. Audit focus/selection overlays for accidental stacking contexts:
   - especially places that set `isolation: isolate` + per-child `z-index`, since they can trap overlay descendants.

