# Plan: curriculum-html-svg-mastery

## Goal

Create a rigorous 50-commit sequence of incremental deep-dive "Labs" dedicated to mastering the HTML and SVG language specifications. The curriculum exercises deep web-platform muscles—moving away from treating SVG as a black-box exported asset, and toward raw, hand-authored mastery of coordinate math, declarative drawing, and filter compositions. These web precedents will be immediately extrapolated into **Spw-inspired design relationships**, connecting native vector operations strictly to Spw's visual, spatial, and generative architecture. This lane is contributor formation and research fuel: its value is in producing discussable visual precedents and experiments that can inform future exhibits and interfaces without masquerading as a release blocker.

This is a page-design rung in the current ecology. The labs should leave behind vector/page archetypes, animation heuristics, and reusable visual snippets that later exhibit, editor, and public-surface plans can borrow without losing the standards-first reasoning that produced them.

**Taste Note:** Improves **expressiveness** (unlocking native, scalable browser drawing algorithms without canvas/WebGL overhead) and **depth** (tying Spw's spatial concepts directly to SVG coordinate spaces). Actively develops the **taste for mathematics in design**.

## Scope

- **In scope**: Designing a 50-commit curriculum grouped into 5 distinct phases of 10 commits each (`.agents/skills/spw-css-dom-lab/labs-svg/`). Each phase requires reading specific W3C/MDN specs (SVG2, Paths, Filter Effects, SMIL), writing raw SVG directly in the DOM tree, establishing Spw reflections, reviewing at least one current repo pattern or visual surface alongside the external spec, and naming at least one experiment or heuristic worth carrying into a future exhibit or editor surface.
- **Out of scope**: Building production Spw application features, writing Canvas/WebGL wrappers, or acting as a hidden launch dependency. These exercises remain declarative DOM/SVG research and formation work.

## The Curriculum Sequence

### Phase 1: SVG Coordinate Systems (`viewBox`) vs. Spw Strata (Commits 1-10)
Deep dive into transformations (`matrix()`, `translate`, `scale`) and the `<svg viewBox>` attribute. Understanding the mathematical difference between world space, user space, and viewport space. The Spw reflection explores how the infinite SVG user-space maps to Spw "Strata" and nested contexts.

### Phase 2: Path Calculus (`<path d="...">`) vs. Spw Geometric Expressions (Commits 11-20)
Master the SVG Path Data specification. Authoring `M/m`, `C/c/S/s` (Béziers), `A/a` (Arcs), and `Z/z` entirely by hand without visual drawing tools. The Spw reflection explores how logical AST operators can be rendered as continuous topological curves.

### Phase 3: Filter Primitives (`<fe.../>`) vs. Spw Shaders and Valence (Commits 21-30)
Deep dive into the SVG Filter Effects Module (`<feColorMatrix>`, `<feDisplacementMap>`, `<feComponentTransfer>`, `<feBlend>`). The Spw reflection maps raw physical DOM filters to high-level Spw "Atmosphere" and cognitive aesthetic definitions (the Valence Pentad).

### Phase 4: Declarative Animations (SMIL) vs. Spw Temporal Flow (Commits 31-40)
Master SMIL (`<animate>`, `<animateMotion>`, `<animateTransform>`) and animating SVG states completely devoid of JavaScript. The Spw reflection translates the compiler's discrete lifecycle ticks into continuous, temporal visual shifts in the DOM.

### Phase 5: `<foreignObject>` and HTML Interop vs. Spw Containment (Commits 41-50)
Deep dive into the `<foreignObject>` spec, nesting the HTML renderer back inside the SVG pipeline. Exploring constraints, scroll contexts, and pointer events. The Spw reflection explores how hyper-structured text (the Spw markup editor) can exist within boundless graphical nodes.

## Agentic Hygiene

- **Rebase target**: `main@3b1747c4` (updated 2026-03-27)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/curriculum-html-svg-mastery-agentic-hygiene` before implementation commits

## Files

Predicted file scaffolding:
```
[NEW] .agents/skills/spw-css-dom-lab/labs-svg/01-coordinates-strata.md
[NEW] .agents/skills/spw-css-dom-lab/labs-svg/02-paths-geometry.md
[NEW] .agents/skills/spw-css-dom-lab/labs-svg/03-filters-valence.md
[NEW] .agents/skills/spw-css-dom-lab/labs-svg/04-smil-temporal.md
[NEW] .agents/skills/spw-css-dom-lab/labs-svg/05-foreignobject-containment.md
[MOD] docs/design/spw/theme-stage-0-snapshots.spw
[MOD] .spw/patterns/literate-ui.spw
```

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

1. `^seed[curriculum] — scaffold Lab 1.01` (DOM Structure properties)
2. `^seed[curriculum] — scaffold Lab 1.02` (Viewport and User Space)
3. `^seed[curriculum] — scaffold Lab 1.03` (viewBox aspect ratios)
... (Extrapolated sequentially through Lab 5.10)

*(See `wip.spw` for the fully unrolled 50-commit syllabus)*

## Dependencies

- Culturally succeeds `curriculum-html-css-mastery` and compliments `audit-css-tokens`.
- `plan-ecology-clustering` classifies this as a `page` rung that should feed public-interest and governed-surface work with real vector/animation taste.

## Principal Engineering Orientation

- Ladder position: `page`
- Judgment target: build page and exhibit taste from direct contact with SVG geometry, filters, motion, and interop instead of imported black-box assets
- Commit bar: each lab should leave one standards lesson, one Spw translation, and one reusable vector/page question worth carrying forward

## Review Surfaces

- External precedents: SVG2, Path Data, Filter Effects, SMIL, and `foreignObject` specs
- Repo precedents: `.spw/patterns/literate-ui.spw`, `docs/design/spw/theme-stage-0-snapshots.spw`, symmetry/exhibit plans, and other visual surface notes
- Future consumers: exhibit, instrument, and editor plans that need explicit vector and motion language

## Capability Transfer

- Vector capability: coordinate systems, path grammar, filter composition, and declarative motion
- Page capability: layered visual atmosphere, embedded text/graphic hybrids, and structured visual navigation
- Research capability: screenshot-worthy exemplars and snippet seeds for future exhibits

## Syntax and Snippet Discipline

- Stable snippets: every lab should preserve at least one hand-authored SVG fragment that remains useful outside the lesson writeup
- Experimental snippets: new filter or motion idioms should be marked experimental when support or semantic fit is still uncertain
- Route discipline: each visual result should name whether it belongs in a lab notebook, a component pattern, a page exhibit, or a future service/public surface

## Spw Artifact

A formal `.spw` artifact mapping raw W3C SVG specifications to corresponding architectural concepts within the Spw compilation pipeline.
