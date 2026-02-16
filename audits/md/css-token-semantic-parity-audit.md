# CSS Token ↔ HTML Semantic Expressive Composition Parity Audit

**Date:** 2026-02-15  
**Scope:** All `src/styles/` CSS tokens (`--spw-*`, `--geo-*`), all `data-*` attributes (TS + CSS), ARIA roles, and HTML5 semantic elements.  
**Methodology:** Cross-reference CSS custom property definitions against their consumption sites, and HTML semantic attributes against CSS selectors that target them, to identify dead tokens, orphaned attributes, and composition gaps.

---

## Summary of Findings

| Category | Count | Severity |
|----------|-------|----------|
| Dead CSS tokens (defined, never `var()`-referenced) | **697** | 🟡 Medium |
| `data-*` attrs set in TS with no CSS selector | **~120** | 🟡 Medium |
| `data-*` attrs in CSS with no TS emitter | **~70** | 🟠 High |
| ARIA roles emitted but unstyled | **18** | 🟢 Low (by design) |
| Custom non-standard ARIA roles | **6** | 🟠 High |
| HTML5 semantic elements without CSS | **2** (`<aside>`, `<figure>`) | 🟢 Low |
| Total CSS tokens | **604** `--spw-*` + **65** `--geo-*` | — |
| Total `data-*` attributes | **~290** unique | — |

---

## 1. Dead CSS Tokens (697)

CSS custom properties that are **defined** (have a `:` declaration) but **never consumed** via `var()`. These inflate stylesheet size and create false expectations about what is parameterizable.

### Top dead-token namespaces

| Namespace | Dead tokens | Total tokens | Dead % |
|-----------|------------|--------------|--------|
| `--spw-color-*` | 87 | 1275 | 7% |
| `--spw-attention-*` | 39 | 102 | 38% |
| `--spw-panel-*` | 55 | 268 | 21% |
| `--spw-theme-*` | 55 | 194 | 28% |
| `--spw-context-*` | 42 | 319 | 13% |
| `--spw-region-*` | 38 | 211 | 18% |
| `--spw-disclosure-*` | 25 | 73 | 34% |
| `--spw-action-*` | 23 | 40 | 58% |
| `--spw-geology-*` | 17 | 53 | 32% |
| `--spw-viz-*` | 14 | 33 | 42% |
| `--spw-lod-*` | 14 | 101 | 14% |
| `--spw-bp-*` | 14 | 57 | 25% |

### Recommendation

- **Attention, action, viz, geology** namespaces have >30% dead rate — audit whether these were speculative definitions or orphaned by refactors.
- Tokens defined inside theme files (liminal, atelier, etc.) that set values never consumed by component CSS are the largest contributor.
- Consider a build-time linting step: `stylelint-value-no-unknown-custom-properties` or a custom PostCSS plugin that flags definitions without references.

---

## 2. `data-*` Attributes: TS → CSS Parity

### Attributes set in TypeScript but **never targeted by any CSS selector** (top 20 by ref count)

| Attribute | TS references | Likely purpose |
|-----------|--------------|----------------|
| `data-tuner` | 30 | Tuner panel identity |
| `data-lc` | 28 | Lifecycle phase tracking |
| `data-node-id` | 25 | AST node identity |
| `data-field` | 25 | Form/config field identity |
| `data-feature` | 22 | Feature-flag gating |
| `data-readout` | 14 | Metric display |
| `data-nav-scope` | 14 | Keyboard navigation scope |
| `data-dock` | 14 | Dock panel identity |
| `data-metric` | 12 | Performance metric |
| `data-filter-op` | 11 | Filter operation type |
| `data-key` | 10 | Generic keying |
| `data-view` | 9 | View mode |
| `data-selected` | 9 | Selection state |
| `data-zone` | 8 | Attention zone |
| `data-token-index` | 8 | Token position |
| `data-runtime-posture` | 7 | Runtime state posture |
| `data-node-type` | 7 | AST node type |
| `data-emphasis` | 5 | Content emphasis |
| `data-present` | 4 | Presence/visibility |
| `data-copy` | 4 | Clipboard target data |

#### Semantic gaps — these need CSS counterparts

**High priority** (compositional expression blocked):

1. **`data-emphasis`** (5 refs) — Content emphasis is a core expressive axis. Needs `font-weight`, `color`, and `opacity` mappings for values like `strong`, `subtle`, `muted`.
2. **`data-nav-scope`** (14 refs) — Keyboard nav scope should drive focus-ring variants and visual containment cues.
3. **`data-runtime-posture`** (7 refs) — Runtime state (idle, executing, error) needs visual differentiation matching the geology `data-state` vocabulary.
4. **`data-selected`** (9 refs) — Selection state without CSS means no visual feedback for selected items outside specific components.
5. **`data-view`** (9 refs) — View mode should control layout density and information display.
6. **`data-zone`** (8 refs) — Attention zones need visual weight mapping.

**Medium priority** (functional but missing expression):

7. `data-node-type` — AST node types could benefit from type-specific accent colors (matching operator topology colors).
8. `data-feature` — Feature-flag gating could dim/hide unreleased UI.
9. `data-dock` / `data-dockable` — Dock state transitions need animation tokens.
10. `data-lc-phase` / `data-lc-subphase` — Lifecycle phases could drive loading/transition animations.

### Attributes in CSS selectors with **no TypeScript emitter** (phantom selectors)

| CSS attribute | Concern |
|---------------|---------|
| `data-activation-indicator` | Speculative — never set |
| `data-attention-level` | Designed but never wired |
| `data-binding-state` | Runtime binding never emits this |
| `data-capture` | Unused interaction mode |
| `data-collapsible-mode` | Panel collapsing uses `data-state` instead |
| `data-ecology-contrast` | Theme ecology concept not implemented |
| `data-escape-hatch` | Keyboard nav uses different mechanism |
| `data-genre-intent` | Genre intent stored differently (`data-genre`) |
| `data-has-node-selection` | Replaced by `data-has-selection` |
| `data-liminal` | Theme transitions use `data-theme-transitioning` |
| `data-parsing` | Editor state uses different indicator |
| `data-perspective-weight` | Perspective uses `data-spw-perspective` |
| `data-plan-running` | Runtime uses `data-runtime-phase` |
| `data-prism-active` | Prism mode never implemented |
| `data-region-state` | Regions use `data-state` |
| `data-section-state` | Sections use `data-state` |
| `data-stage-recently-changed` | Stage uses `data-stage` |
| `data-valence` | Valence navigation via different mechanism |
| `data-vision-markers` | Planned but unimplemented |
| `data-walkthrough-step` | Tour system not yet active |

**~30 show-* phantom selectors** (`data-show-breadcrumb`, `data-show-commands`, `data-show-geology`, etc.) have CSS rules but are never set from TS. These likely represent a planned visibility-gating system that was superseded by the disclosure/lod system.

---

## 3. ARIA Role Parity

### Standard roles emitted but not styled (18 roles)

This is **largely correct** — ARIA roles exist for accessibility, not styling. However, some warrant CSS:

| Role | Should style? | Rationale |
|------|--------------|-----------|
| `role="treeitem"` | ✅ Yes | Tree items need visual indent, expand/collapse cues |
| `role="tab"` / `role="tablist"` / `role="tabpanel"` | ✅ Yes | Tab styling should key off semantic role, not class |
| `role="listbox"` / `role="option"` | ✅ Yes | Selection list items need focus/selected states |
| `role="switch"` | ✅ Yes | Toggle switch needs on/off visual |
| `role="status"` | 🟡 Maybe | Status regions benefit from visual weight |
| `role="radiogroup"` / `role="radio"` | 🟡 Maybe | Could key focus ring off role |
| Others | ❌ No | Correctly semantic-only |

### Non-standard custom roles (6) — **should be replaced**

| Custom role | Replace with | Why |
|-------------|-------------|-----|
| `role="action"` | `data-spw-action-role="action"` | Non-standard role breaks AT |
| `role="staging"` | `data-spw-stage` | Already has proper attribute |
| `role="selection"` | `aria-selected` + `data-selection-target` | Standard attribute exists |
| `role="reference"` | `data-role="reference"` | Move to data attr |
| `role="protagonist"` | `data-attention-owner` | Already has proper attribute |
| `role="focus"` | CSS `:focus-visible` | Standard pseudo-class |

---

## 4. HTML5 Semantic Element → CSS Parity

| Element | TS uses | CSS rules | Gap? |
|---------|---------|-----------|------|
| `<header>` | 8 | 329 | ✅ Over-styled |
| `<footer>` | 4 | 180 | ✅ Over-styled |
| `<section>` | 23 | 20 | ✅ Adequate |
| `<nav>` | 2 | 31 | ✅ Adequate |
| `<main>` | 2 | 48 | ✅ Adequate |
| `<article>` | 1 | 1 | 🟡 Minimal |
| `<aside>` | 1 | **0** | 🔴 Missing |
| `<figure>` | 0 | **0** | — Not used |

**`<aside>`** is used but has zero CSS — it's styled entirely through parent classes.

---

## 5. Representation-Level Integration Gaps

The newly-introduced four-level representation model (`syntactic`/`semantic`/`pragmatic`/`meta`) has CSS badges but is not yet integrated into the broader token vocabulary.

### Missing representation-aware tokens

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No `--spw-repr-*` token family | Can't theme representation levels | Define `--spw-repr-syntactic-accent`, `--spw-repr-semantic-accent`, `--spw-repr-pragmatic-accent`, `--spw-repr-meta-accent` |
| No `data-repr-level` on paste targets | Can't style paste-target regions by expected representation | Wire `resolveRepresentationLevel()` to set `data-repr-level` on focused regions |
| Node type has no color mapping | `data-node-type` set but no CSS | Add `--spw-node-type-*` accent tokens per AST node type |
| Copy mode has no representation awareness | `data-copy-mode` doesn't indicate which representation level is copied | Extend copy mode to expose active representation |
| Register preview doesn't switch | Preview always shows one level | Allow clicking SYN/SEM/PRA/MET badges to cycle the preview display |

---

## 6. Composition Parity Matrix

The **expressive composition** question: "Can CSS fully express the semantic state that HTML has?" Here's the parity status for each semantic axis:

| Semantic Axis | HTML mechanism | CSS tokens | CSS selectors | Parity |
|---------------|---------------|------------|---------------|--------|
| **State** (ready/active/error/...) | `data-state` | `--geo-state-*` (18 tokens) | ✅ Full | ✅ |
| **Kind** (text/node/operator/...) | `data-register-kind`, `data-kind` | `--geo-kind-*` (8 tokens) | ✅ Full | ✅ |
| **Scope** (doc/session/system) | `data-register-scope` | Inline accents | ✅ Full | ✅ |
| **Layer** (fine/medium/coarse) | `data-layer`, `data-spw-layer` | `--spw-layer-*` (37 tokens) | ✅ Full | ✅ |
| **LOD** (detail level) | `data-lod`, `data-lod-*` | `--spw-lod-*` (101 tokens) | ✅ Full | ✅ |
| **Disclosure** | `data-disclosure` | `--spw-disclosure-*` (73 tokens) | ✅ Full | ✅ |
| **Depth** (reference depth) | `data-reference-depth` | `--geo-depth-*` (4 tokens) | ✅ Full | ✅ |
| **Representation** | `data-repr-level` | Inline accents only | 🟡 Partial | 🟡 |
| **Emphasis** | `data-emphasis` | — | ❌ None | 🔴 |
| **Selection** | `data-selected` | — | ❌ None | 🔴 |
| **Nav scope** | `data-nav-scope` | — | ❌ None | 🔴 |
| **Runtime posture** | `data-runtime-posture` | — | ❌ None | 🔴 |
| **View mode** | `data-view` | — | ❌ None | 🔴 |
| **Zone** | `data-zone` | — | ❌ None | 🔴 |
| **Node type** | `data-node-type` | — | ❌ None | 🔴 |
| **Lifecycle phase** | `data-lc-phase` | — | ❌ None | 🔴 |
| **Feature flag** | `data-feature` | — | ❌ None | 🔴 |
| **Genre** | `data-genre`, `data-genre-*` | `--spw-genre-*` (12 tokens) | ✅ Full | ✅ |
| **Theme** | `data-theme` | `--spw-theme-*` (194 tokens) | ✅ Full | ✅ |
| **Perspective** | `data-spw-perspective` | — | 🟡 Indirect via context | 🟡 |

### Priority remediation targets

1. **`data-emphasis`** → needs `--spw-emphasis-strong`, `--spw-emphasis-subtle`, `--spw-emphasis-muted`
2. **`data-selected`** → needs `--spw-selection-bg`, `--spw-selection-border`, `--spw-selection-accent`
3. **`data-runtime-posture`** → needs `--spw-runtime-idle`, `--spw-runtime-executing`, `--spw-runtime-error`
4. **`data-zone`** → needs zone-specific visual weight mapping
5. **`data-node-type`** → needs node-type accent colors for AST display
6. **`data-repr-level`** → promote inline accents to proper `--spw-repr-*` token family
7. **Phantom `data-show-*` selectors** → either wire from TS or remove from CSS

---

## 7. Recommended Actions

### Immediate (this commit series)

1. **Add `--spw-repr-*` token family** to `tokens.css` — 4 accent colors, 4 border colors
2. **Wire `data-emphasis` CSS** — 3 levels with opacity/weight mapping
3. **Wire `data-selected` CSS** — background + border accent
4. **Remove 6 custom non-standard roles** — replace with `data-*` equivalents

### Short-term (next sprint)

5. **Prune ~70 phantom CSS selectors** targeting never-set attributes
6. **Audit 697 dead tokens** — flag with `/* @deprecated */` or remove
7. **Add `data-runtime-posture` CSS** — visual state for runtime phases
8. **Add node-type accent colors** for AST inspector display

### Long-term (backlog)

9. **Build-time dead-token linting** via PostCSS plugin
10. **Representation-level paste-target styling** — regions show expected repr level
11. **Lifecycle phase animation tokens** — loading/transition states keyed to `data-lc-phase`
12. **Zone visual weight system** — attention zones drive brightness hierarchy
