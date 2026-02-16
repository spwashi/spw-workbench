# Component Identification Pattern Decision

## Current State (Triple Redundancy)

In `index.html`, each component has **three** identifiers:

```html
<header class="hud-header c-hud-header" data-component="hud.header">
```

1. **Styled class**: `.hud-header` - Used for CSS styling
2. **Component class**: `.c-hud-header` - Unused in CSS, metadata only
3. **Data attribute**: `data-component="hud.header"` - Also unused, metadata only

**Analysis**: Items #2 and #3 are redundant. Both serve the same purpose (component identification for testing/automation) but `.c-hud-*` is never used.

## Options for Refactor

### Option A: Keep data-component, remove .c-hud-* ✓ RECOMMENDED

**Pattern:**
```html
<header class="spw-app-header" data-spw-component="header">
```

**Pros:**
- Already established pattern in markup (23 existing `data-component` attributes)
- Cleaner HTML (one less class per element)
- Aligns with data-spw-* taxonomy from BOONHONK-AUDIT.md
- Standard practice (data attributes for metadata, classes for styling)

**Cons:**
- CSS attribute selectors slightly slower than class selectors (negligible in practice)
- Requires `querySelector('[data-spw-component="header"]')` vs `.spw-c-header`

**Migration:**
```diff
-<header class="hud-header c-hud-header" data-component="hud.header">
+<header class="spw-app-header" data-spw-component="header">
```

### Option B: Consolidate to .spw-c-* classes, remove data-component

**Pattern:**
```html
<header class="spw-app-header spw-c-header">
```

**Pros:**
- Slightly faster CSS selector performance
- Shorter querySelector syntax: `.spw-c-header`
- Class-based grep/search easier: `grep "spw-c-header"`

**Cons:**
- Two classes per element (styling + metadata)
- Abandons existing `data-component` pattern
- Mixing concerns (styling vs identification)

**Migration:**
```diff
-<header class="hud-header c-hud-header" data-component="hud.header">
+<header class="spw-app-header spw-c-header">
```

### Option C: Hybrid - Keep both for different purposes

**Pattern:**
```html
<header class="spw-app-header spw-c-header" data-spw-component="header">
```

**Pros:**
- Maximum flexibility
- `.spw-c-*` for coarse-grained identification (header, panel, modal)
- `data-spw-component` for fine-grained paths (header.logo.icon)

**Cons:**
- Still redundant
- More verbose
- Easy to get out of sync

## Recommendation: Option A

**Rationale:**
1. Eliminate redundancy - one metadata pattern, not two
2. Leverage existing `data-component` usage (23 instances)
3. Aligns with semantic taxonomy (data-spw-component, data-spw-state-*, data-spw-struct-*)
4. Standard web practice (data-* for non-styling metadata)
5. Future-proof for Spw projection layer (schema → data attributes)

**Namespace convention:**
```
data-spw-component="<component-name>"
```

Where `<component-name>` uses dot notation for nesting:
- `header` - Top-level component
- `header.logo` - Nested component
- `header.logo.icon` - Deep nested component

**Testing/automation examples:**
```javascript
// Find component
document.querySelector('[data-spw-component="header"]')

// Find nested component
document.querySelector('[data-spw-component^="header.logo"]')

// Find all modal components
document.querySelectorAll('[data-spw-component*="modal"]')
```

## Migration Checklist

- [ ] Update `index.html` - remove `.c-hud-*` classes
- [ ] Update `index.html` - rename `data-component` → `data-spw-component`
- [ ] Simplify component names (remove "hud." prefix)
- [ ] Update any test/automation scripts that reference `.c-hud-*`
- [ ] Document pattern in CLAUDE.md under "Component Identification"
- [ ] Add to track-migration.sh script

## Documentation Template (for CLAUDE.md)

```markdown
### Component Identification Pattern

Components use the `data-spw-component` attribute for stable identification in tests and automation:

- **Single component**: `data-spw-component="header"`
- **Nested component**: `data-spw-component="panel.header"`
- **Deep nesting**: `data-spw-component="modal.content.body"`

This attribute is:
- ✓ Independent of styling (class changes don't break tests)
- ✓ Semantic (describes component structure)
- ✓ Queryable (standard CSS attribute selectors)
- ✗ Not used for CSS styling (use .spw-* classes instead)

Example:
```html
<header class="spw-app-header" data-spw-component="header">
  <div class="spw-app-logo" data-spw-component="header.logo">
    <span class="spw-ui-icon" data-spw-component="header.logo.icon"></span>
  </div>
</header>
```
```

## Related Documents

- `BOONHONK-AUDIT.md` - Original audit identifying .c-hud-* as unused
- `REFACTOR-PLAN.md` - Phase 2 migration tasks
- `CLAUDE.md` - Will document final pattern
