# UI State Contract

## Purpose
Define and audit the contract between DOM state (`data-*`, `aria-*`), UI interaction semantics, and CSS selectors.

## Sources Of Truth
- `src/core/conventions/data-attributes.ts`
- Runtime/projectors that stamp `dataset` and `aria-*` attributes
- CSS selectors in `src/**/*.css`

## Contract Rules
- Use canonical namespaced selectors for new component classes (`.spw-*`) and `data-spw-*` keys for stable semantic identity.
- Prefer ARIA and native attributes (`[hidden]`, `[aria-selected]`, `[aria-expanded]`, etc.) over class-state toggles for widget state.
- Keep legacy aliases in compatibility zones explicit and time-bounded.
- Track legacy classnames and migration status in `docs/classname-contract.md`.

## Generation
- Refresh this document snapshot: `npm run generate:ui-contract`
- CI-style drift check: `npm run audit:ui-selectors`
- Update baseline intentionally: `npm run audit:ui-selectors:update`

<!-- AUTO-GENERATED:START -->
## Generated Snapshot

Generated: 2026-02-15T01:09:24.094Z

### Registry Coverage

- Registry entries: 24
- CSS data attributes referenced: 179
- TS-emitted data attributes detected: 375
- CSS aria attributes referenced: 6
- TS-emitted aria attributes detected: 22

### Registry Groups

- Stable semantic: 8
- Session state: 7
- Transient: 9

### CSS Data Attributes Outside Core Registry

- `data-action`
- `data-activation-indicator`
- `data-animations`
- `data-ast-node`
- `data-attention-level`
- `data-authoring-mono-font`
- `data-availability-key`
- `data-available`
- `data-binding-state`
- `data-block`
- `data-breadcrumb-active`
- `data-breadcrumb-level`
- `data-breakpoint`
- `data-capture`
- `data-clickable`
- `data-collapsible-mode`
- `data-context`
- `data-context-default`
- `data-context-panel-layout`
- `data-context-tuner-open`
- `data-copy-mode`
- `data-delta`
- `data-depth`
- `data-dialog-id`
- `data-disclosure-control`
- `data-disclosure-display`
- `data-dock-dragging`
- `data-document-dropdown-open`
- `data-ecology-contrast`
- `data-editor-focused`
- `data-editor-tab`
- `data-escape-hatch`
- `data-expanded`
- `data-expression`
- `data-focus-path`
- `data-focusable`
- `data-genre`
- `data-genre-category`
- `data-genre-intent`
- `data-guidance-intensity`
- `data-guidance-mark`
- `data-guidance-pill`
- `data-has-node-selection`
- `data-has-selection`
- `data-health`
- `data-hide`
- `data-intensity`
- `data-interacting`
- `data-key-capture`
- `data-kind`
- `data-layer`
- `data-layer-sensitive`
- `data-layer-view`
- `data-lifecycle-state`
- `data-liminal`
- `data-lod-display`
- `data-lod-impact`
- `data-lod-item`
- `data-lod-kind`
- `data-lod-only`
- _... 97 more_

### CSS ARIA Attributes Without TS Emission Match

- _(none)_

### Duplicate Non-`spw-*` Class Selectors (Top 30)

| Class | File Count |
|---|---:|
| `panel-header` | 10 |
| `hud-footer` | 8 |
| `hud-header` | 8 |
| `panel` | 8 |
| `hud-sidebar` | 6 |
| `inspector-tab` | 6 |
| `intent-bar` | 6 |
| `toast` | 6 |
| `hud-main` | 5 |
| `inspector-tabs` | 5 |
| `panel-title` | 5 |
| `context-toggle-btn` | 4 |
| `drawer-tab` | 4 |
| `editor-wrapper` | 4 |
| `flow-node` | 4 |
| `icon-btn` | 4 |
| `line-numbers` | 4 |
| `modal-close` | 4 |
| `modal-content` | 4 |
| `nav-link` | 4 |
| `panel-actions` | 4 |
| `panel-body` | 4 |
| `primary-panel` | 4 |
| `section-title` | 4 |
| `action-btn` | 3 |
| `active` | 3 |
| `ast-node` | 3 |
| `ast-tree` | 3 |
| `availability-row` | 3 |
| `breadcrumb-separator` | 3 |
<!-- AUTO-GENERATED:END -->
