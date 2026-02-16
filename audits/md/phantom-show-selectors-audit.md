# Phantom `data-show-*` Selector Audit

**Date**: 2026-02-15  
**Status**: Audit only — no changes made  
**Related**: [CSS Token Parity Audit](./css-token-semantic-parity-audit.md)

## Summary

13 `data-show-*` CSS selectors exist across `panels.css`, `layout.css`, `state.css`,
`prompting-rail.css`, and `tour.css`. Initial triage flagged them as "phantom selectors"
because the TypeScript state manager (`applyToDOM`) doesn't set them. However, deeper
investigation reveals they are **live** — the command bar's `setPanelVisibility()` writes
them via `document.documentElement.dataset[attr]`. They are also persisted via
`spw-setting-change` custom events.

These selectors represent a **parallel visibility system** that operates alongside the
disclosure/LoD matrix. This audit maps each selector against the activation context,
perspective, disclosure, and display granularity axes to determine whether they should
be consolidated into the derivative state model or kept as independent controls.

## Selector Inventory

| Selector | CSS File(s) | TS Source | Effect |
|----------|------------|-----------|--------|
| `data-show-sidebar` | layout.css:1272 | command-bar.ts | Hides `.hud-sidebar`, `.spw-app-sidebar` |
| `data-show-geology` | layout.css:1277 | command-bar.ts | Hides `.geology-panel`, `.spw-app-geology-panel` |
| `data-show-status-bar` | layout.css:1282 | command-bar.ts | Hides `.hud-footer`, `.spw-app-footer` + adjusts grid |
| `data-show-intent-bar` | layout.css:1291 | command-bar.ts | Hides `.intent-bar` |
| `data-show-editor-header` | panels.css:105, layout.css:1295 | command-bar.ts | Hides editor `.panel-header` + `.authoring-editor__header` |
| `data-show-inspector-header` | panels.css:110 | command-bar.ts | Hides inspector `.panel-header` |
| `data-show-context-header` | panels.css:115 | command-bar.ts | Hides context `.panel-header` |
| `data-show-inspector` | panels.css:489+ | command-bar.ts, panel-layout.ts | Hides split-pane, resize handles |
| `data-show-key-hints` | layout.css:1299 | command-bar.ts | Hides `.key-hint-bar-container` |
| `data-show-breadcrumb` | layout.css:1303 | command-bar.ts | Hides `.intent-breadcrumb` |
| `data-show-whisper` | layout.css:1307 | command-bar.ts | Hides `.intent-whisper` |
| `data-show-layer-indicator` | state.css:1588 | not set in TS | Hides layer indicator pseudo-element |
| `data-show-tour-controls` | tour.css:21 | command-bar.ts | Hides `.spw-app-tour-controls` |

## Relationship to Activation Context & Perspective

### Currently Independent Controls

All `data-show-*` selectors currently operate as **user-toggled binary switches** — they
don't vary by activation context or perspective. The command bar treats them as simple
on/off layout preferences.

### Potential Context-Sensitive Consolidation

Several of these could be derived from activation context × disclosure × LoD rather than
being independent toggles:

| Selector | Could derive from | Rationale |
|----------|------------------|-----------|
| `data-show-inspector` | `disclosure=beginner` already auto-hides | `panels.css:494` already has `disclosure=beginner` `:not` guards |
| `data-show-key-hints` | `disclosure` level | Beginners should see hints; experts should not |
| `data-show-breadcrumb` | `detail-visibility` (derivative) | High detail → show; low detail → hide |
| `data-show-whisper` | `detail-visibility` (derivative) | Same as breadcrumb |
| `data-show-layer-indicator` | `chrome-weight` (derivative) | Heavy chrome → show; minimal → hide |
| `data-show-tour-controls` | `disclosure=beginner` only | Tour controls are beginner-oriented |

### Should Remain Independent

| Selector | Rationale |
|----------|-----------|
| `data-show-sidebar` | Major layout reconfiguration — user's spatial preference |
| `data-show-geology` | Same — fundamentally a layout pane toggle |
| `data-show-status-bar` | Grid template change — structural, not cosmetic |
| `data-show-editor-header` | Fine-grained panel chrome preference |
| `data-show-inspector-header` | Same |
| `data-show-context-header` | Same |
| `data-show-intent-bar` | User workflow preference |

## Display Granularity Analysis

### Current Model (Binary Toggle)

```
data-show-X="false" → display: none
data-show-X="true"  → display: (default)
```

### Recommended Model (Graduated Disclosure)

Instead of binary `display: none`, some selectors could use the derivative state's
`detail-visibility` or `chrome-weight` to *modulate* rather than *eliminate*:

```css
/* Instead of: */
html[data-show-breadcrumb="false"] .intent-breadcrumb { display: none; }

/* Could be: */
html[data-chrome-weight="minimal"] .intent-breadcrumb {
  opacity: var(--spw-attention-ambient-opacity, 0.6);
  font-size: calc(var(--spw-space-font-size) * 0.85);
  pointer-events: none;
}
```

This preserves spatial stability (no layout shift) while reducing visual weight.

## Perspective-Sensitive Disclosure Mapping

### How Perspectives Interact with Visibility

| Perspective | Suggested visibility defaults |
|-------------|------------------------------|
| `visual` | Show breadcrumb, whisper, intent-bar; hide tour |
| `editing` | Show intent-bar, editor-header; hide whisper |
| `debug` | Show all (max information); show layer-indicator |
| `reporting` | Show breadcrumb; hide editor-header |
| `structural` | Show layer-indicator, breadcrumb; hide whisper |
| `pedagogical` | Show tour-controls, key-hints, breadcrumb |
| `performance` | Hide status-bar, whisper, breadcrumb (minimize chrome) |

These could be implemented as *defaults* that the user's explicit `data-show-*` overrides.
The derivative state system provides the right place for this:

```typescript
// In derivative-state.ts (future extension):
export function computeVisibilityDefaults(inputs: DerivativeInputs): {
  showBreadcrumb: boolean
  showWhisper: boolean
  showLayerIndicator: boolean
  // ...
}
```

## `data-show-layer-indicator` — Special Case

This is the only truly phantom selector — it's referenced in CSS (`state.css:1588`) but
never set in TypeScript. It gates a `::before` pseudo-element on `<html>` when a spw-layer
or LoD is active.

**Options:**
1. Wire it via `applyToDOM` driven by `chrome-weight` derivative
2. Wire it via command-bar as a toggle
3. Remove the CSS selector

**Recommendation:** Wire into derivative state — show when `chrome-weight="heavy"` and
`editing-depth="deep"`, hide otherwise.

## Dependent Display Semantics

### State Dependencies

```
data-show-inspector depends on:
  ├── disclosure (beginner auto-hides)
  ├── performance-mode (auto-hides)
  └── user toggle (via command bar)

data-show-key-hints should depend on:
  ├── disclosure (show for beginner/intermediate)
  ├── instrumentationMode (show when passive/active)
  └── user toggle (override)
```

### CSS Selector Priority

The current CSS uses `:not([data-show-inspector="true"])` guards to combine the user
toggle with disclosure/performance auto-hiding. This pattern is correct and should be
preserved. The derivative state model adds *additional* selectors, it doesn't replace
the existing toggle semantics.

## Recommendations (No Action Taken)

1. **Keep all 13 `data-show-*` selectors as settings-driven controls** — they are live,
   functional, and should remain explicit user preferences, not derived from state
   combinations. Deriving visibility from expertise level is confusing because the
   developer's expertise differs from a first-time user's expectations.
2. **Connect all selectors to settings persistence** — ensure every `data-show-*` attr
   has a corresponding `layout.*` settings key and appears in the settings panel.
3. **Wire `data-show-layer-indicator`** into the command-bar toggle system (not derivative
   state) so it matches the pattern of other show selectors.
4. **Future: visibility profiles** — rather than deriving show/hide from state, consider
   a "layout profile" preset system where users can save/restore named visibility
   configurations (e.g., "minimal", "full", "debug"). This provides the benefits of
   derivative propagation without the confusion of implicit state coupling.
5. **Do not merge** the user toggle system into derivative state — they serve different
   purposes (explicit user preferences vs. computed semantic signals). Derivative state
   should never override a user's explicit show/hide choice.
