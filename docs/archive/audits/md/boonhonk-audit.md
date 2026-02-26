# Boonhonk Audit (CSS/JS Semantics and Responsiveness)

## Scope and baseline
- Baseline commit: 586645b
- Scope: CSS semantics, naming, responsiveness; data attributes and ARIA coupling; JS semantics and state surface.

## Pass A: CSS classes, IDs, elements (semantics and consistency)
- Documented canonical prefixes (spw-app-, spw-ui-, spw-viz-, spw-lang-, spw-panel-) are not reflected in active CSS. The active styles are mostly .hud-*, .panel-*, .token-*, .ast-*, .flow-*.
- .c-hud-* classes appear in markup but are unused in CSS; they act as inert metadata today.
- Many component classes are un-namespaced (.icon-btn, .action-btn, .modal, .toast, .drawer-*, .key-hint-*), which increases collision risk when embedded.
- Global element selectors (html, body, kbd, textarea) are not scoped to a root container, so a host app would inherit global styles (e.g., scanlines).
- src/style.css is a parallel, legacy ruleset and not imported by the active stylesheet spine.

## Pass B: CSS data attributes and ARIA coupling
- CSS references to ARIA are present and effective (modal and drawer aria-hidden, tablist aria-selected).
- JS-managed state attributes (data-mode, data-layer, data-region, data-dialog, data-tab, data-editor-focused, data-has-selection) are not used in active CSS. Equivalent selectors only exist in src/style.css.
- data-focusable and data-lifecycle-state selectors exist in CSS but are not used in markup or JS.
- data-emphasis and data-elevation are defined in TS helpers but not emitted into active CSS.
- data-layer is overloaded between app-state and UILayers usage, which can cause selector collisions.

## Pass C: JS semantics, ARIA, and data attributes
- Two distinct AppMode vocabularies exist: app hooks use parse/run/eval/graph, while app state uses normal/insert/inspect/transform/command/stepping.
- app hooks define data-spw-app-* attributes but nothing sets them; appState sets data-* directly on html.
- Breakpoint system exists in ui/tokens/breakpoints.ts, but nothing initializes it; CSS expects [data-breakpoint] and never sees it.
- ARIA mismatch: spw-tab uses aria-controls="tab-panel-${tabId}" while index.html panels are id="tab-${tabId}".
- sr-only class is used in markup/JS but exists only in src/style.css, not in active CSS.

## Pass D: JS class conventions, CSS sibling rules, container queries
- Active UI still relies on class toggles (.active) instead of ARIA as the primary truth for visibility.
- Responsiveness is viewport-only; panel widths are fixed, so layout does not respond to available space.
- Container queries are not used, leaving local responsiveness and compositional behavior underdeveloped.

## Canonical namespace strategy
- Treat spw- as the vendor prefix for portability across organizations.
- Add a root scope on #app (e.g., data-spw-root) and scope all CSS under :where([data-spw-root]) to reduce collisions.
- Align the CSS classes in markup and styles with the documented prefixes (spw-app-, spw-ui-, spw-viz-, spw-lang-, spw-panel-).
- Provide temporary alias selectors to bridge .hud-* to the canonical spw-* classes during migration.

## Data attribute taxonomy (minimal and auditable)
- State: data-spw-state-* on html for mode, layer, region, dialog, tab, breakpoint, editor-focused, has-selection.
- Structure: data-spw-struct-* on layout nodes for region, slot, position, component.
- Intent: data-spw-action for commands; data-spw-ref for JS query hooks.
- Semantics: data-spw-quality for boon/bane/bone/honk; data-spw-plane or data-spw-modality for tangibility/imaginary/complex planes.
- Prefer ARIA attributes for visibility and selection states when possible; avoid .active as the primary truth.

## src/style.css scratchpad guidance
- Keep src/style.css as a sanctioned hotfix and scratchpad layer, but document it explicitly.
- Add visible "hotfix handles" (comment markers) so ad-hoc edits are auditable and can be reconciled into the canonical CSS.

## Refactor phases (CSS-only then JS)
1) CSS-only pass: root scoping, class namespace alignment, responsive sizing with clamp/minmax, ARIA-driven visibility rules.
2) CSS data/ARIA pass: implement the data attribute taxonomy; add state selector stubs and a semantic map.
3) JS semantics pass: unify AppMode vocabularies; initialize breakpoints; fix ARIA controls; reduce data-layer collision.
4) JS convention pass: align data attributes, container query hooks, and debug overlays with the semantic state surface.

## Research alignment (Boonhonk lens)
- Make the system advertise its ontology: a small, canonical vocabulary for classes, data attributes, and state.
- Ensure deterministic state -> render -> effect transitions; expose a single state surface for CSS and JS.
- Treat accessibility as a semantic coupler: ARIA should be both JS truth and CSS selector.
- Prepare a Spw projection layer (schema -> TS types -> CSS selector scaffolds -> human-readable semantic map).
