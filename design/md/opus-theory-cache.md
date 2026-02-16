# Opus Theory Cache: HTML + ARIA + CSS as Living Design Documentation

## Purpose
Create a lightweight, removable documentation layer that encodes design theory directly in HTML semantics, data attributes, ARIA descriptions, and CSS. This document is for Opus review and precomputed principles. It is intentionally non-binding and safe to delete later.

## Goals (Precomputed)
- Keep design theory visible in the DOM without adding heavy tooling.
- Make refactors safer by encoding intent as searchable attributes and tags.
- Provide low-cost, git-visible surfaces for future review (snippets + CSS).
- Preserve the workbench's fractal theme: global -> region -> component -> token.

## Core Principles
1. Semantics first, ARIA second.
   - Use native tags to carry meaning; add ARIA only when semantics are missing.
2. Theory is data.
   - Encode design intent as data attributes so it can be grepped, tested, and compared.
3. Fractal consistency.
   - Every UI layer should communicate mode, region, and theory at its own scale.
4. Surfaces are disposable.
   - Snippets and specimen CSS can be removed once patterns are stable.
5. Tokens are the language of value.
   - New CSS should point to `--spw-*` tokens; legacy is a compatibility layer.

## Suggested Data Attribute Taxonomy
These are optional and additive to existing attributes (data-mode, data-region, etc.).

- data-spw-component: canonical component id
  - Example: data-spw-component="inspector.tab"
- data-spw-domain: architectural ownership
  - Example: data-spw-domain="ui" | "viz" | "runtime"
- data-spw-theory: concept tags used in UI
  - Example: data-spw-theory="trajectory" | "lens" | "polarity"
- data-spw-axis: semantic axes
  - Example: data-spw-axis="intensity" | "proximity" | "clarity"
- data-spw-doc: reference to doc location
  - Example: data-spw-doc="docs/design/semantic-features-model.md"
- data-spw-token: design token identifier
  - Example: data-spw-token="--spw-color-global-accent-primary"
- data-spw-commitment: maturity marker
  - Example: data-spw-commitment="canonical" | "experimental" | "hotfix"

## HTML Semantics as Design Theory
Use structure to encode intent in the DOM and a11y tree.

Recommended tag patterns:
- <section> + <header> for panels and regions
- <nav> for tabs and breadcrumbs
- <figure> + <figcaption> for visualizations (AST, Flow, Steps)
- <details> + <summary> for theory notes and optional explanations
- <data> or <time> for numeric or temporal state (sigma, timing)
- <kbd>, <samp>, <code> for interactions and meaning boundaries

## ARIA Guidance (Minimal and Purposeful)
- Prefer `aria-describedby` for theory explanations that are hidden visually.
- Use roles only for custom widgets (e.g., custom tab bars).
- Avoid ARIA for purely decorative content.

## CSS as Theory Surface
Add small, tagged CSS blocks to document intent.

Example comment pattern:
```
/* @spw:theory - saturation as computation depth */
```

Example selector pattern:
```
[data-spw-theory="trajectory"] { ... }
```

## Proposed Git Surface Area (Optional, Removable)
These are thin documents to make theory visible in git diffs.

1) docs/design/snippets/
- trajectory-panel.html
- inspector-tabs.html
- geology-panel.html

2) src/styles/specimens/
- theory.css (tiny, tagged CSS for theory markers)
- snippets.css (optional if snippets need minimal styling)

These files are not required for production and can be removed once patterns are stable.

## Example Snippet (HTML)
```
<section class="spw-ui-panel spw-ui-panel--secondary"
  data-spw-component="inspector"
  data-spw-domain="ui"
  data-spw-theory="trajectory"
  data-spw-doc="docs/design/semantic-features-model.md"
  aria-labelledby="inspector-title"
  aria-describedby="inspector-theory">
  <header class="spw-ui-panel-header">
    <h2 id="inspector-title" class="spw-ui-panel-title">Inspector</h2>
  </header>

  <figure class="spw-ui-figure" data-spw-axis="saturation">
    <figcaption class="sr-only" id="inspector-theory">
      Shows saturation sigma over time; polarity flips appear as transitions.
    </figcaption>
    <div class="spw-ui-trajectory-bar" aria-hidden="true"></div>
  </figure>
</section>
```

## Example Snippet (CSS)
```
/* @spw:theory - saturation as computation depth */
[data-spw-theory="trajectory"] .spw-ui-trajectory-bar {
  height: 6px;
  background: linear-gradient(
    90deg,
    var(--spw-color-global-accent-secondary),
    var(--spw-color-global-accent-primary)
  );
  border-radius: 4px;
  opacity: 0.8;
}

/* Optional doc surface - show doc path in non-prod builds */
[data-spw-doc]::after {
  content: attr(data-spw-doc);
  display: none; /* toggle in docs/demo builds */
  font-size: 0.6rem;
  color: var(--spw-color-global-foreground-muted);
}
```

## Cleanup Strategy
- Any file in `docs/design/snippets/` or `src/styles/specimens/` is disposable.
- Once a pattern stabilizes, migrate into canonical CSS or component templates.
- Remove doc surfaces after the last migration step is verified.

## Refactor Support (Cheap Grep Commands)
- `rg -n "data-spw-theory|data-spw-doc" src` (find theory surfaces)
- `rg -n "@spw:theory" src/styles` (find theory comments)
- `rg -n "<figure|<details|<nav|<section" src` (semantic tags)

## Alignment With Opus Strategy
- Path A: embed visualization intent via <figure> and data-spw-theory tags.
- Path B: map data-spw-domain to 12-domain ownership (UI/Viz/Runtime).
- Path D: encode caching models (determinism, polarity, lens) as theory tags.

## Open Questions for Opus
- Which theory tags should be canonical vs experimental?
- Should the doc-surface snippets live in docs/design or docs/ui?
- Do we want lint rules to enforce theory tags in key components?
