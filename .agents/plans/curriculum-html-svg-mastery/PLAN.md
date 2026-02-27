# Plan: curriculum-html-svg-mastery

## Goal

Create a rigorous 50-commit sequence of incremental deep-dive "Labs" dedicated to mastering the HTML and SVG language specifications. The curriculum exercises deep web-platform muscles—moving away from treating SVG as a black-box exported asset, and toward raw, hand-authored mastery of coordinate math, declarative drawing, and filter compositions. These web precedents will be immediately extrapolated into **Spw-inspired design relationships**, connecting native vector operations strictly to Spw's visual, spatial, and generative architecture.

**Taste Note:** Improves **expressiveness** (unlocking native, scalable browser drawing algorithms without canvas/WebGL overhead) and **depth** (tying Spw's spatial concepts directly to SVG coordinate spaces). Actively develops the **taste for mathematics in design**.

## Scope

- **In scope**: Designing a 50-commit curriculum grouped into 5 distinct phases of 10 commits each (`.agent/skills/spw-css-dom-lab/labs-svg/`). Each phase requires reading specific W3C/MDN specs (SVG2, Paths, Filter Effects, SMIL), writing raw SVG directly in the DOM tree, and establishing Spw reflections.
- **Out of scope**: Building production Spw application features or writing Canvas/WebGL wrappers. These exercises remain purely declarative DOM/SVG.

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

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/curriculum-html-svg-mastery-agentic-hygiene` before implementation commits

## Files

Predicted file scaffolding:
```
[NEW] .agent/skills/spw-css-dom-lab/labs-svg/01-coordinates-strata.md
[NEW] .agent/skills/spw-css-dom-lab/labs-svg/02-paths-geometry.md
[NEW] .agent/skills/spw-css-dom-lab/labs-svg/03-filters-valence.md
[NEW] .agent/skills/spw-css-dom-lab/labs-svg/04-smil-temporal.md
[NEW] .agent/skills/spw-css-dom-lab/labs-svg/05-foreignobject-containment.md
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

## Spw Artifact

A formal `.spw` artifact mapping raw W3C SVG specifications to corresponding architectural concepts within the Spw compilation pipeline.
