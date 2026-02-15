# Classname Contract Registry

Date: 2026-02-15
Scope: CSS class taxonomy, compatibility aliases, and migration map.

## Purpose
Define which class families are canonical, which are compatibility aliases, and which are deprecated.
This registry is the source of truth for classname migration decisions and audit triage.

## Status Tiers
- `canonical`: required for new work and preferred in selectors.
- `compat`: legacy classes still supported for existing DOM and CSS.
- `deprecated`: allowed temporarily, scheduled for removal.

## Canonical Contract
- Canonical component classes must use `.spw-{domain}-{component}` (with optional `-{element}` and `--{modifier}`).
- New work must avoid introducing non-`spw-*` selectors except in explicit compatibility zones.

## Registry: Prefix Families

| Prefix | Status | Notes |
|---|---|---|
| `spw-` | canonical | Required for new component classes. |
| `geology-` | compat | Context/geology panel legacy; migrate to `spw-panel-context-*`. |
| `context-` | compat | Legacy context panel toggles; replace with `spw-panel-context-*`. |
| `register-` | compat | Legacy register subsystem; migrate to `spw-panel-context-register-*`. |
| `target-` | compat | Legacy target subsystem; migrate to `spw-panel-context-target-*`. |
| `state-` | compat | Legacy state grid; migrate to `spw-panel-context-state-*`. |
| `guidance-` | compat | Legacy guidance widgets; migrate to `spw-panel-context-guidance-*`. |
| `layer-` | compat | Legacy layer grid; migrate to `spw-panel-context-layer-*`. |
| `fluency-` | compat | Legacy fluency widgets; migrate to `spw-panel-context-fluency-*`. |
| `availability-` | compat | Legacy availability widgets; migrate to `spw-panel-context-availability-*`. |
| `owned-` | compat | Legacy ownership widgets; migrate to `spw-panel-context-owned-*`. |
| `command-` | compat | Legacy command panel widgets; migrate to `spw-panel-context-command-*`. |
| `panel-` | compat | Global panel utilities; migrate to `spw-panel-*` for new work. |
| `hud-` | compat | Global layout utilities; avoid in new work. |
| `inspector-` | compat | Legacy inspector widgets; migrate to `spw-panel-inspector-*`. |
| `toast-` | compat | Legacy toast utilities; migrate to `spw-ui-toast-*`. |
| `modal-` | compat | Legacy modal utilities; migrate to `spw-ui-modal-*`. |
| `drawer-` | compat | Legacy drawer utilities; migrate to `spw-ui-drawer-*`. |
| `nav-` | compat | Legacy navigation utilities; migrate to `spw-ui-nav-*`. |
| `ast-` | compat | Legacy AST visualization; migrate to `spw-viz-ast-*`. |
| `flow-` | compat | Legacy flow visualization; migrate to `spw-viz-flow-*`. |
| `steps-` | compat | Legacy steps visualization; migrate to `spw-viz-steps-*`. |
| `active` | deprecated | Use ARIA state selectors (`[aria-checked="true"]`, `[aria-selected="true"]`, etc.). |

## Context Panel Migration Map (Priority)

These pairs are required for the context-panel convergence effort. Keep the legacy class alongside the canonical class during migration.

| Legacy Class | Canonical Class |
|---|---|
| `context-toggle-btn` | `spw-panel-context-toggle-btn` |
| `register-entry` | `spw-panel-context-register-entry` |
| `register-bank` | `spw-panel-context-register-bank` |
| `register-badge` | `spw-panel-context-register-badge` |
| `target-row` | `spw-panel-context-target-row` |
| `targets-grid` | `spw-panel-context-targets-grid` |
| `state-grid` | `spw-panel-context-state-grid` |
| `state-item` | `spw-panel-context-state-item` |
| `guidance-slider` | `spw-panel-context-guidance-slider` |
| `guidance-readout` | `spw-panel-context-guidance-readout` |
| `fluency-grid` | `spw-panel-context-fluency-grid` |
| `availability-item` | `spw-panel-context-availability-item` |
| `owned-item` | `spw-panel-context-owned-item` |
| `empty-state` | `spw-panel-context-empty-state` |

## Audit Hooks
- UI selector drift: `npm run audit:ui-selectors`
- Context panel scoping: `npm run audit:context-panel`

## Migration Rules
- Introduce canonical `spw-*` classes alongside legacy classes.
- Update CSS to prefer canonical classes first, with legacy selectors retained temporarily.
- Remove legacy classes only after a baseline update and a compatibility window.
