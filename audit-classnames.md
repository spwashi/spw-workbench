# Context Panel: Classname Audit

> Generated 2026-02-14. Source: `keybinding-geology.ts`, `layout.css`, `state.css`, `tokens.css`

## Summary

- **89** unique classnames emitted by `keybinding-geology.ts`
- **47** of those have **zero CSS rules** anywhere in `src/styles/`
- **12** distinct naming prefixes (+ 11 "orphan" classnames with no prefix)
- **3** naming conventions in play (BEM-ish, flat, hybrid)
- JS selectors use a mix of `.class` and `[data-*]` with no clear rule

---

## 1. Missing CSS (47 classes rendered with no styles)

These classnames exist in TS `innerHTML` but have **no matching CSS selector** anywhere:

### Register subsystem
`register-bank`, `register-entry`, `register-badge`, `register-badges`,
`register-name`, `register-preview`, `register-label`, `register-meta`,
`register-meta-text`, `register-age`

### Target subsystem
`targets-grid`, `target-row`, `target-label`, `target-path`, `target-scope`,
`target-badge`, `target-badges`, `target-delta`, `target-actions`

### Guidance subsystem
`guidance-slider`, `guidance-readout`, `guidance-scale`, `guidance-value`,
`guidance-label`, `guidance-mark`, `guidance-pill`

### Fluency subsystem
`fluency-grid`, `fluency-item`, `fluency-label`, `fluency-value`,
`geology-fluency-metrics`

### Geology-prefixed (no CSS)
`geology-choice-summary`, `geology-choice-summary-label`, `geology-choice-summary-value`,
`geology-guidance`, `geology-interaction-semantic`, `geology-option-group-title`

### Region subsystem
`region-contents`, `region-state-badge`

### Ownership subsystem
`owned-hotkeys`, `owned-tabs`, `owned-item`, `owner-indicator`

### Misc orphans
`avail-meter`, `context-btn-label`, `item-key`, `item-label`, `section-hint`

---

## 2. Naming Convention Inconsistencies

### A. Multiple prefix families without scoping

| Prefix        | Count | Scoped to geology? | Example                        |
|---------------|-------|---------------------|--------------------------------|
| `geology-`    | 18    | ✅ Yes              | `geology-section-title`        |
| `state-`      | 4     | ❌ Generic          | `state-item`                   |
| `register-`   | 10    | ❌ Generic          | `register-entry`               |
| `target-`     | 8     | ❌ Generic          | `target-row`                   |
| `command-`    | 5     | ❌ Generic          | `command-entry`                |
| `context-`    | 2     | ❌ Generic          | `context-toggle-btn`           |
| `region-`     | 6     | ❌ Generic          | `region-box`                   |
| `guidance-`   | 7     | ❌ Generic          | `guidance-slider`              |
| `layer-`      | 4     | ❌ Generic          | `layer-key-grid`               |
| `fluency-`    | 4     | ❌ Generic          | `fluency-item`                 |
| `availability-`| 4   | ❌ Generic          | `availability-item`            |
| `owned-`      | 3     | ❌ Generic          | `owned-hotkeys`                |
| (no prefix)   | 11    | ❌ Orphan           | `section-hint`, `empty-state`  |

**Problem**: Only the `geology-` classes are scoped. Everything else could collide with
identically-named classes in other components. Since the panel lives inside
`.context-awareness-panel`, CSS descendant selectors _could_ scope them, but currently
don't — the existing CSS rules target `.state-item` globally, not `.context-awareness-panel .state-item`.

### B. Hybrid flat vs. prefixed names

The same semantic domain uses both conventions:
- `geology-echo-path` (prefixed) vs `section-hint` (flat)
- `geology-section-title` (prefixed) vs `state-grid` (flat)
- `geology-context-toggle` (prefixed) vs `context-toggle-btn` (un-prefixed)

### C. `data-section` vs class divergence

| `data-section`    | Matching class             | Notes                              |
|-------------------|----------------------------|------------------------------------|
| `"state"`         | `.geology-state-section`   | Class uses `geology-` prefix       |
| `"echo"`          | `.geology-echo`            | OK                                 |
| `"perspective"`   | `.geology-context-toggle`  | Name mismatch: "perspective" ≠ "context" |
| `"detail-level"`  | `.geology-context-toggle.geology-layer-toggle` | Different class structure |
| `"guidance"`      | `.geology-guidance`        | OK (but no CSS)                    |
| `"targets"`       | `.geology-targets`         | OK                                 |
| `"registers"`     | `.geology-registers`       | OK                                 |
| `"commands"`      | `.geology-commands-section`| OK                                 |
| `"hotkeys"`       | `.geology-availability`    | Name mismatch                      |
| `"regions"`       | `.geology-regions-hierarchy`| OK                                 |
| `"fluency"`       | `.geology-fluency-metrics` | OK (but no CSS)                    |

---

## 3. JS ↔ CSS Connection Points

### JS selectors (querySelector/querySelectorAll in keybinding-geology.ts)

| Selector                                          | Purpose                 | Has CSS? |
|---------------------------------------------------|-------------------------|----------|
| `.command-history`                                 | Update command list     | ✅       |
| `.geology-echo-path`                               | Update focus trail      | ✅       |
| `.geology-fluency-metrics`                         | Update fluency          | ❌       |
| `.geology-targets .section-hint`                   | Update target hint      | ❌/❌    |
| `.register-bank`                                   | Update registers        | ❌       |
| `.state-grid`                                      | Update state items      | ✅       |
| `.targets-grid`                                    | Update targets          | ❌       |
| `.geology-layer-toggle .context-toggle-btn`         | Layer button toggling   | partial  |
| `[data-action="open-settings"]`                    | Settings button         | ✅       |

### classList manipulation
- `.active` — toggled on `context-toggle-btn` and `register-entry`

### data-attribute selectors
- `[data-action^="register:"]` — register click routing
- `[data-action="clear-history"]` — command history clear

---

## 4. Proposed Normalization

### Option A: Scope via ancestor (minimal change)

Keep existing classnames but scope all CSS under `.context-awareness-panel`:

```css
.context-awareness-panel .state-grid { ... }
.context-awareness-panel .register-bank { ... }
```

**Pro**: Cheap. No TS changes.
**Con**: Doesn't fix naming inconsistencies or orphan classes.

### Option B: Prefix everything with `geo-` (normalize)

Rename all classnames to use a short, consistent prefix:

| Current                   | Proposed                    |
|---------------------------|-----------------------------|
| `state-grid`              | `geo-state-grid`            |
| `state-item`              | `geo-state-item`            |
| `register-bank`           | `geo-register-bank`         |
| `register-entry`          | `geo-register-entry`        |
| `target-row`              | `geo-target-row`            |
| `context-toggle-btn`      | `geo-toggle-btn`            |
| `section-hint`            | `geo-section-hint`          |
| `empty-state`             | `geo-empty`                 |
| `clear-history-btn`       | `geo-clear-history`         |

**Pro**: Clean, collision-proof, grep-friendly.
**Con**: Moderate TS + CSS churn. JS selectors must all update.

### Option C: CSS-module / data-attribute based (future)

Use `data-geo-*` attributes as the primary selectors, classnames become structural only:

```html
<div data-geo="state-grid">
<div data-geo="state-item" data-geo-state="active">
```

**Pro**: Cleanest separation, i18n-safe, aligns with existing `data-section` pattern.
**Con**: Larger refactor. Performance negligible but different mental model.

### Recommended: Option B with an immediate Option A bridge

1. **Now**: Add `.context-awareness-panel` scoping in CSS for the 47 unstlyled classes
2. **Next**: Progressively rename to `geo-` prefix, subsystem by subsystem
3. **Later**: Consider data-attribute migration if the component grows further

---

## 5. Settings Key ↔ Classname Alignment

The settings system uses keys like `contextPanel.showEcho` which maps to
`root.dataset.contextPanelEcho`. These are consumed by `applySettingsVisibility()`
which sets `container.dataset.showEcho`, `showPerspective`, etc.

**Issue**: The internal property names still use old terminology:
- `settings.perspective` → controls what's now called "Active Context"
- `settings.echo` → controls what's now called "Focus Path"

These should be audited for alignment with the new labels if the rename is meant to be
user-facing through the Settings panel as well.

### Settings panel labels (in `settings-data.ts` → `panel_details` section):

| Setting Key                     | Label in Settings        | Panel Section Label |
|---------------------------------|--------------------------|---------------------|
| `contextPanel.showEcho`         | "Focus Echo"             | "Focus Path" ✅     |
| `contextPanel.showPerspective`  | "Perspective Buttons"    | "Active Context" ❌ |
| `contextPanel.showState`        | "State Grid"             | "System State" ❌   |
| `contextPanel.layoutMode`       | "Layout Mode"            | —                   |
| `contextPanel.collapsibleBehavior` | "Control Panels"      | —                   |
