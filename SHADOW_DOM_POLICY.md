# Shadow DOM Policy (Spw Workbench)

This guide defines when to use Shadow DOM vs. Light DOM so styling, layout, and interaction remain predictable while enabling strong theming.

## Goals

- Keep layout + spatial interaction clear and debuggable.
- Allow deep theming without leaking internal markup.
- Make component contracts explicit and stable.

## Decision Rule (Short)

- **Needs layout/overlays/drag/selection?** Use **Light DOM**.
- **Needs skin-level consistency + isolation?** Use **Shadow DOM**.

## Use Shadow DOM For

- Self-contained widgets (chips, tabs, toggles, tooltips, badges).
- Components whose internal structure should remain private.
- Reusable primitives that must look consistent across contexts.

## Keep Light DOM For

- Panels, layout containers, and region wrappers.
- Anything participating in global overlays, docking, or selection.
- Elements that require global style hooks or accessibility orchestration.

## Styling & Theming Contracts

Shadow components must expose:

- **CSS variables** for theming (tokens flow into shadow).
- **`part` attributes** for controlled styling.
- **`exportparts`** on the host if nested parts should be styleable.

Recommended base parts:

- `part="header"`
- `part="title"`
- `part="actions"`
- `part="body"`

## Events & State

All cross-component events must be:

- `bubbles: true`
- `composed: true`

This keeps Shadow DOM components observable by app-level systems.

## Accessibility

- Host element owns `role` / `aria-*` when needed.
- Internal focusable elements must be keyboard reachable.
- Light DOM wrappers should provide region labels and focus order.

## Docking & Overlays

If a component can be docked, dragged, or linked to overlays:

- Keep the **outer container in Light DOM**.
- Use Shadow DOM only for the **inner card** (visual skin).

## Debuggability

Provide a clear `data-spw-component` and contract entry for:

- Host element (Light DOM)
- Any top-level Shadow DOM widget

This enables Design Mode and component introspection.

## Checklist (Before Using Shadow DOM)

- [ ] Does it need global layout or selection behavior? → **Light DOM**
- [ ] Does it need strict visual isolation? → **Shadow DOM**
- [ ] Are `part` + CSS variables exposed?
- [ ] Are events composed and bubbling?
- [ ] Are ARIA roles correct on the host?

## Examples

**Shadow DOM**

- `spw-chip`, `spw-tab`, `spw-settings-panel` (internal UI consistency)

**Light DOM**

- Editor, Inspector, Context panels
- Prompt rail, overlay containers, docking targets

