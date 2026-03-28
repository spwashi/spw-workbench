# Plan: audit-css-tokens

## Goal

Audit the distribution and usage of CSS custom properties (tokens) across the UI elements and core styles. The goal is to evolve the application's aesthetic foundation into a rigorously curricularized design system. By expanding the audit into a methodical sequence of masterclasses (Color/Valence, Typography/Rhythm, Space/Containment), we aim to actively **develop taste** and ensure every token choice is deliberate, mathematically sound, and semantically pure. 

This is a component-design rung in the current ecology. Its strongest value is to turn web-platform token knowledge into reusable component/page taste, not to rush a token registry into whichever product surface happens to exist next. Until a concrete packages-era component surface is nominated, the first slice should stay literature, harness, and snippet first.

**Taste Note:** Improves **correctness** (ensuring UI elements use the single source of truth for colors, spacing, typography) and cultivates **expressiveness** by moving from ad-hoc hex values to a rigorous, scalable vocabulary that articulates the Spw ethos visually.

## Scope

- **In scope**: A deep, 5-phase curricular audit of the design system. Reviewing existing style/spec surfaces, design docs, and any current representative harness snippets; establishing mathematical scales for typography, fluid spacing, and semantic color palettes (Valence); and preparing token heuristics and snippet sets that future component/page plans can reuse. Legacy `src/ui/...` paths in this plan are historical placeholders until a concrete packages-era target is nominated.
- **Out of scope**: Changing fundamental component behaviors (this is purely about the aesthetic vocabulary and token distribution).

## Agentic Hygiene

- **Rebase target**: `main@3b1747c4` (updated 2026-03-27; lore-era assumptions retained only as historical placeholders)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/audit-css-tokens-agentic-hygiene` before implementation commits

## Files

Predicted file changes:
```
[MOD] docs/design/spw/theme-progression.spw
[MOD] docs/design/spw/theme-stage-0-snapshots.spw
[MOD] docs/design/md/dom-css-testing-harness.md
[MOD] .spw/biome/ocean/style.spw
[MOD] .spw/patterns/literate-ui.spw
[NEW] src/ui/tokens/color-valence.ts
[NEW] src/ui/tokens/typography-rhythm.ts
[NEW] src/ui/tokens/spatial-metrics.ts
[NEW] src/ui/tokens/theme-registry.ts
[MOD] src/styles/*.css
[MOD] src/ui/elements/**/*.ts
```

### Craft guard

- We will be vigilant against creating overly broad or deep token hierarchies that are hard to remember.
- Token files should represent independent mathematical models (e.g., color vs. typography) to avoid >600 line monoliths.

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `&[styles] — baseline: map and categorize all existing hardcoded hex and rgba values`
2. `&[styles] — baseline: map existing spatial and typographic hardcoded values`
3. `vocab[tokens] — define the Spw Color Valence vocabulary and nomenclature`
4. `^seed[tokens] — establish the mathematical color scale (lightness/chroma progression)`
5. `&[tokens] — generate canonical CSS custom properties for the Valence primitives`
6. `&[tokens] — generate semantic (usage-based) color aliases mapped to primitives`
7. `![tokens] — write visual regression tests/swatches for the Valence palette`
8. `vocab[tokens] — define the typographic scale and rhythmic density vocabulary`
9. `^seed[tokens] — establish fluid typography equations and line-height ratios`
10. `&[tokens] — generate canonical CSS properties for the typography system`
11. `vocab[tokens] — define the spatial containment and geometric metrics vocabulary`
12. `^seed[tokens] — establish the 4px/8px spatial grid and border-radius scales`
13. `&[tokens] — generate canonical CSS properties for grid, padding, and radii`
14. `&[registry] — centralize token injection into the global application stylesheet`
15. `&[elements] — refactor base layouts (header, sidebar) to consume fluid spatial tokens`
16. `&[elements] — refactor interactive surfaces (cards, panels) to consume spatial/radii tokens`
17. `&[elements] — refactor text components to consume standard typographic rhythm tokens`
18. `&[elements] — refactor navigation links and buttons to use Valence semantic colors`
19. `&[elements] — refactor form inputs and states (focus, disabled) to use Valence colors`
20. `&[elements] — refactor alerts, badges, and status indicators to use specific Valences`
21. `&[elements] — audit and remove legacy z-index hardcodes, applying elevation tokens`
22. `&[elements] — audit and remove legacy box-shadow hardcodes, applying depth tokens`
23. `&[styles] — delete the legacy unstructured CSS variable definitions`
24. `![elements] — verify component rendering consistency across light/dark themes`
25. `.[docs] — construct the interactive CSS token gallery UI for the workbench`
26. `.[docs] — write the curriculum: "Developing Taste in Spw CSS Architecture"`

## Dependencies

- `plan-ecology-clustering` — this plan currently serves the `component` rung and should convert curricular token study into reusable component/page/service judgment.
- `curriculum-html-css-mastery` — provides standards-first precedents for layout, rhythm, and selector-native styling.
- `ecosystem-surface-governance` — token vocabulary should eventually sharpen governed surfaces rather than drift into isolated design-system folklore.

## Principal Engineering Orientation

- Ladder position: `component`
- Judgment target: develop token taste that is mathematically legible, visually discussable, and portable across future components/pages rather than trapped in one theme pass
- Commit bar: every slice should clarify one token family, leave one reusable snippet or swatch, and sharpen one later design conversation

## Review Surfaces

- Repo precedents: `docs/design/spw/theme-progression.spw`, `docs/design/spw/theme-stage-0-snapshots.spw`, `docs/design/md/dom-css-testing-harness.md`, `.spw/biome/ocean/style.spw`, `.spw/patterns/literate-ui.spw`
- External precedents: CSS Color, Custom Properties, Values and Units, Containment, and Typography-related specs
- Future consumers: curriculum and governed-surface plans that need stable tone, rhythm, spacing, and valence language

## Capability Transfer

- Component capability: readable token ladders for color, rhythm, spacing, elevation, and emphasis
- Page capability: layout atmosphere, narrative pacing, and legible contrast decisions
- Research capability: swatches, galleries, and token snippets that make taste discussable rather than mystical

## Syntax and Snippet Discipline

- Stable snippets: preserve compact token examples and swatches that can be lifted into docs, labs, and future components without translation
- Experimental snippets: mark palette or rhythm moves experimental when they are still probing tone rather than naming stable canon
- Token route: each token decision should name whether it belongs in enduring canon, a lab-only experiment, or a surface-specific local override

## Spw Artifact

```
.agents/plans/audit-css-tokens/audit-css-tokens.spw
```
A formal Spw record defining the exact mathematical relationship between primitive tokens, scalar progressions, and semantic/valence aliases, documenting the "taste" and reasoning behind the scales.
