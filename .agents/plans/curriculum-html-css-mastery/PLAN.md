# Plan: curriculum-html-css-mastery

## Goal

Create a sequence of incremental deep-dive "Labs" dedicated to mastering HTML and CSS language specifications. The curriculum is designed to exercise deep web-platform muscles (learning exactly how the browser parses and renders standards) and immediately extrapolate those precedents into **Spw-inspired design relationships**. This bridges the gap between traditional frontend craft and Spw's linguistic/semantic architecture. It should also become a contributor-formation track for people who will steward public Spw web surfaces, not just an isolated self-study exercise.

**Taste Note:** Improves **expressiveness** (unlocking native browser power instead of javascript emulations) and **rigor** (tying Spw paradigms directly to W3C specifications).

## Scope

- **In scope**: Designing a 5-part curriculum of markdown/spw artifacts and companion HTML/CSS sandbox files (`.agent/skills/spw-css-dom-lab/labs/`). Each lab will require reading specific W3C/MDN specs, writing raw HTML/CSS, writing a Spw reflection, and extracting at least one reusable QA or stewardship heuristic for future public surfaces.
- **Out of scope**: Building production features. These are isolated, rigorous exercises for physiological skill building and conceptual mapping.

## The Curriculum Sequence

### Lab 1: DOM Semantics & The Accessibility Tree vs. Spw Ontologies
* **The Web Precedent**: Deep dive into HTML5 semantic flow, ARIA roles, and how the browser constructs the accessibility tree. Understanding implicit vs. explicit semantics.
* **The Exercise**: Build a complex, highly semantic, JS-free document structure (e.g., a sprawling data table with nested navigation and definitions).
* **The Spw Reflection**: How does HTML's rigid, hierarchical accessibility tree map to Spw's fluid, associative ontologies? Can Spw syntax compile down to perfect ARIA?

### Lab 2: CSS Topology (Grid, Subgrid, Container Queries) vs. Spw Containment
* **The Web Precedent**: Deep dive into the CSS Box Alignment Module, CSS Grid Layout Module Level 2 (Subgrid), and CSS Containment Module Level 3.
* **The Exercise**: Build a fluid, infinite-canvas style layout strictly using intrinsic sizing, `subgrid`, and `@container` queries without any `@media` viewport breakpoints.
* **The Spw Reflection**: How do we map Spw's "zoom levels" (strata/lenses) to CSS spatial queries? Can Container Queries act as physical boundaries for Spw's cognitive layers?

### Lab 3: CSS Calculus (Custom Properties, `calc()`, Color Spaces) vs. Spw Valence
* **The Web Precedent**: Deep dive into CSS Custom Properties for Cascading Variables Module, CSS Values and Units (`calc`, `clamp`, `sin`, `exp`), and CSS Color Module Level 4 (OKLCH).
* **The Exercise**: Create a purely CSS-driven state machine relying on mathematical property interpolations to shift a UI through a spectrum of "moods".
* **The Spw Reflection**: Mapping the Web's mathematical functions to the Spw "Valence Pentad" (Boon, Bane, Bone, Bonk, Honk). Using CSS variables not just for hex codes, but as runtime algebraic inputs for "attention" and "tone".

### Lab 4: CSS as a Query Engine (`:has()`, Attribute Selectors) vs. Spw Introspection
* **The Web Precedent**: Deep dive into CSS Selectors Level 4, specifically the relational `:has()` pseudo-class and advanced attribute substring matching.
* **The Exercise**: Build a fully interactive, filterable UI tree or filesystem navigator using *only* HTML datatypes and CSS `:has()` combinators (zero JavaScript).
* **The Spw Reflection**: How does CSS's selector engine correlate with Spw's "Wonder Calculus" (introspection operators)? Treating the DOM as a database where CSS is the query language.

### Lab 5: Temporal APIs (Scroll-Driven, View Transitions) vs. Spw Navigation
* **The Web Precedent**: Deep dive into CSS Scroll-Driven Animations and the View Transitions API.
* **The Exercise**: Create a cinematic document where scrolling physically "unpacks" paragraphs into diagrams, using scroll timelines linked to CSS properties.
* **The Spw Reflection**: Translating Spw's concept of continuous literary architecture and memory across view transitions. How do we visually represent moving between "thoughts" in a continuous spacetime rather than discrete page loads?

## Agentic Hygiene

- **Rebase target**: `origin/maina290a6`
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/curriculum-html-css-mastery-agentic-hygiene` before implementation commits

## Files

Predicted file scaffolding:
```
[NEW] .agent/skills/spw-css-dom-lab/labs/01-semantics-ontology.md
[NEW] .agent/skills/spw-css-dom-lab/labs/02-topology-containment.md
[NEW] .agent/skills/spw-css-dom-lab/labs/03-calculus-valence.md
[NEW] .agent/skills/spw-css-dom-lab/labs/04-query-introspection.md
[NEW] .agent/skills/spw-css-dom-lab/labs/05-temporal-navigation.md
```

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

```spw
^["commits"]{
  # --- Phase 1: DOM Semantics vs. Spw Ontologies ---
  ~[1..10]: {
    ~[1]:  "^seed[curriculum] — scaffold Lab 1.01" ~#focus: "DOM Semantics (html and body roots)"
    ~[2]:  "^seed[curriculum] — scaffold Lab 1.02" ~#focus: "DOM Semantics (Document metadata head, meta, link)"
    ~[3]:  "^seed[curriculum] — scaffold Lab 1.03" ~#focus: "DOM Semantics (Sectioning roots article, nav, etc.)"
    ~[4]:  "^seed[curriculum] — scaffold Lab 1.04" ~#focus: "DOM Semantics (Text content main, div, p, lists)"
    ~[5]:  "^seed[curriculum] — scaffold Lab 1.05" ~#focus: "DOM Semantics (Inline text a, em, strong)"
    ~[6]:  "^seed[curriculum] — scaffold Lab 1.06" ~#focus: "DOM Semantics (Advanced forms fieldset, input)"
    ~[7]:  "^seed[curriculum] — scaffold Lab 1.07" ~#focus: "DOM Semantics (Interactive details, dialog)"
    ~[8]:  "^seed[curriculum] — scaffold Lab 1.08" ~#focus: "DOM Semantics (Tabular data table, tbody)"
    ~[9]:  "^seed[curriculum] — scaffold Lab 1.09" ~#focus: "DOM Semantics (Embedded content picture, video)"
    ~[10]: "^seed[curriculum] — scaffold Lab 1.10" ~#focus: "Formulating Spw Ontologies from HTML5 semantics"
  }

  # --- Phase 2: CSS Topology vs. Spw Containment ---
  ~[11..20]: {
    ~[11]: "^seed[curriculum] — scaffold Lab 2.01" ~#focus: "CSS Topology (Normal flow & block formatting)"
    ~[12]: "^seed[curriculum] — scaffold Lab 2.02" ~#focus: "CSS Topology (Flexbox 1D alignment)"
    ~[13]: "^seed[curriculum] — scaffold Lab 2.03" ~#focus: "CSS Topology (Grid 2D coordinates)"
    ~[14]: "^seed[curriculum] — scaffold Lab 2.04" ~#focus: "CSS Topology (display: contents & flattening)"
    ~[15]: "^seed[curriculum] — scaffold Lab 2.05" ~#focus: "CSS Topology (Subgrid metric inheritance)"
    ~[16]: "^seed[curriculum] — scaffold Lab 2.06" ~#focus: "CSS Topology (Absolute/Fixed strata)"
    ~[17]: "^seed[curriculum] — scaffold Lab 2.07" ~#focus: "CSS Topology (Sticky positioning constraints)"
    ~[18]: "^seed[curriculum] — scaffold Lab 2.08" ~#focus: "CSS Topology (Z-index stacking contexts)"
    ~[19]: "^seed[curriculum] — scaffold Lab 2.09" ~#focus: "CSS Topology (Container Queries & intrinsic sizing)"
    ~[20]: "^seed[curriculum] — scaffold Lab 2.10" ~#focus: "Formulating Spw Containment/Strata from CSS Topology"
  }

  # --- Phase 3: CSS Calculus vs. Spw Valence ---
  ~[21..30]: {
    ~[21]: "^seed[curriculum] — scaffold Lab 3.01" ~#focus: "CSS Calculus (Custom Properties --var)"
    ~[22]: "^seed[curriculum] — scaffold Lab 3.02" ~#focus: "CSS Calculus (calc() responsive algebra)"
    ~[23]: "^seed[curriculum] — scaffold Lab 3.03" ~#focus: "CSS Calculus (min(), max(), clamp())"
    ~[24]: "^seed[curriculum] — scaffold Lab 3.04" ~#focus: "CSS Calculus (Trigonometry sin, cos, tan)"
    ~[25]: "^seed[curriculum] — scaffold Lab 3.05" ~#focus: "CSS Calculus (Exponential & logarithmic)"
    ~[26]: "^seed[curriculum] — scaffold Lab 3.06" ~#focus: "CSS Calculus (Color functions oklch, color-mix)"
    ~[27]: "^seed[curriculum] — scaffold Lab 3.07" ~#focus: "CSS Calculus (Relative colors & palettes)"
    ~[28]: "^seed[curriculum] — scaffold Lab 3.08" ~#focus: "CSS Calculus (attr() mapping DOM to CSS types)"
    ~[29]: "^seed[curriculum] — scaffold Lab 3.09" ~#focus: "CSS Calculus (Environment variables env())"
    ~[30]: "^seed[curriculum] — scaffold Lab 3.10" ~#focus: "Formulating Spw Valence via CSS Math Interpolation"
  }

  # --- Phase 4: CSS Queries vs. Spw Introspection ---
  ~[31..40]: {
    ~[31]: "^seed[curriculum] — scaffold Lab 4.01" ~#focus: "CSS Queries (The Cascade & @layer)"
    ~[32]: "^seed[curriculum] — scaffold Lab 4.02" ~#focus: "CSS Queries (Attribute substring matching)"
    ~[33]: "^seed[curriculum] — scaffold Lab 4.03" ~#focus: "CSS Queries (Structural pseudo-classes)"
    ~[34]: "^seed[curriculum] — scaffold Lab 4.04" ~#focus: "CSS Queries (UI state pseudo-classes)"
    ~[35]: "^seed[curriculum] — scaffold Lab 4.05" ~#focus: "CSS Queries (Relational :has() parent selection)"
    ~[36]: "^seed[curriculum] — scaffold Lab 4.06" ~#focus: "CSS Queries (Logical combinators :is, :where, :not)"
    ~[37]: "^seed[curriculum] — scaffold Lab 4.07" ~#focus: "CSS Queries (Media queries @media context)"
    ~[38]: "^seed[curriculum] — scaffold Lab 4.08" ~#focus: "CSS Queries (Feature queries @supports)"
    ~[39]: "^seed[curriculum] — scaffold Lab 4.09" ~#focus: "CSS Queries (Scope encapsulation @scope)"
    ~[40]: "^seed[curriculum] — scaffold Lab 4.10" ~#focus: "Formulating Spw Introspection via CSS Selectors"
  }

  # --- Phase 5: CSS Time vs. Spw Navigation ---
  ~[41..50]: {
    ~[41]: "^seed[curriculum] — scaffold Lab 5.01" ~#focus: "CSS Time (Transitions, durations, delays)"
    ~[42]: "^seed[curriculum] — scaffold Lab 5.02" ~#focus: "CSS Time (Cubic-bezier physics)"
    ~[43]: "^seed[curriculum] — scaffold Lab 5.03" ~#focus: "CSS Time (Keyframe procedural loops)"
    ~[44]: "^seed[curriculum] — scaffold Lab 5.04" ~#focus: "CSS Time (Animation additive blending)"
    ~[45]: "^seed[curriculum] — scaffold Lab 5.05" ~#focus: "CSS Time (Scroll timelines scroll-timeline-name)"
    ~[46]: "^seed[curriculum] — scaffold Lab 5.06" ~#focus: "CSS Time (View timelines for intersection)"
    ~[47]: "^seed[curriculum] — scaffold Lab 5.07" ~#focus: "CSS Time (Scroll snapping alignments)"
    ~[48]: "^seed[curriculum] — scaffold Lab 5.08" ~#focus: "CSS Time (View Transitions API morphing)"
    ~[49]: "^seed[curriculum] — scaffold Lab 5.09" ~#focus: "CSS Time (State machines via :target & :checked)"
    ~[50]: "^seed[curriculum] — scaffold Lab 5.10" ~#focus: "Formulating Spw Temporal Navigation via CSS Time"
  }
}
```

## Dependencies

- `ecosystem-surface-governance` is an adjacent consumer; the labs should produce reusable stewardship heuristics for active and public-beta web surfaces.
