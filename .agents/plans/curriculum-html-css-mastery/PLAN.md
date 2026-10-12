# Plan: curriculum-html-css-mastery

## Goal

Create a sequence of incremental deep-dive "Labs" dedicated to mastering HTML and CSS language specifications. The curriculum is designed to exercise deep web-platform muscles (learning exactly how the browser parses and renders standards) and immediately extrapolate those precedents into **Spw-inspired design relationships**. This bridges the gap between traditional frontend craft and Spw's linguistic/semantic architecture. It should also become a contributor-formation track for people who will steward public Spw web surfaces, not just an isolated self-study exercise. This lane is intentionally curricular rather than release-blocking: its commits should distill reusable heuristics, experiments, and discussion subjects that can feed live surfaces later.

This is the page-design rung in the current ecology. The labs should not just accumulate facts about standards; they should produce page archetypes, reusable snippets, stewardship heuristics, and better subjects for discussion about how Spw pages, exhibits, and services should feel. The highest-value outcome is a body of applied learning that can move from standards study into component, page, and eventually service design without losing the thread of web-native reasoning.

**Taste Note:** Improves **expressiveness** (unlocking native browser power instead of javascript emulations) and **rigor** (tying Spw paradigms directly to W3C specifications).

## Scope

- **In scope**: Designing a 5-part curriculum of markdown/spw artifacts and companion HTML/CSS sandbox files (`docs/learn/labs/html-css/`). Each lab will require reading specific W3C/MDN specs, writing raw HTML/CSS, writing a Spw reflection, extracting at least one reusable QA or stewardship heuristic for future public surfaces, naming at least one research question or experiment that could feed a live site or exhibit, reviewing at least one current repo pattern or surface alongside the external spec, and preserving at least one reusable snippet or selector idiom for future component/page/service work.
- **Out of scope**: Building production features or acting as a hidden release gate. These are rigorous exercises for physiological skill building, conceptual mapping, and better future discussion.

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

- **Rebase target**: `main@551bb419` (updated 2026-10-12)
- **Rebase cadence**: rebase before commit 1 and again before merge
- **Hygiene split**: isolate unrelated out-of-scope drift into `feature/curriculum-html-css-mastery-agentic-hygiene` before implementation commits

## Files

Predicted file scaffolding:
```
[NEW] docs/learn/labs/html-css/01-semantics-ontology.md
[NEW] docs/learn/labs/html-css/02-topology-containment.md
[NEW] docs/learn/labs/html-css/03-calculus-valence.md
[NEW] docs/learn/labs/html-css/04-query-introspection.md
[NEW] docs/learn/labs/html-css/05-temporal-navigation.md
[MOD] docs/design/md/dom-css-testing-harness.md
[MOD] docs/design/spw/theme-progression.spw
[MOD] .spw/workspace.spw
```

## Commits

Preflight: `&[hygiene] — rebase onto origin/main and isolate unrelated drift before implementation commits`

```spw
^["commits"]{
 # Collapsed from 50 lesson-stubs (one per lab lesson) to the real work units. No lab file exists yet; the lesson list now lives in ~#covers. Commit 1 is the hygiene preflight; labs are independent after it.
 ~[1]: "&[hygiene] — rebase onto main and isolate unrelated drift before lab commits"
 ~[2]: "^seed[curriculum] — scaffold labs/01-semantics-ontology.md (HTML/ARIA lab plus Spw reflection)" ~#covers: "html/body roots; head, meta, link; sectioning; text content; inline text; forms; details and dialog; tables; embedded media; ontology reflection"
 ~[3]: "^seed[curriculum] — scaffold labs/02-topology-containment.md (layout lab plus containment reflection)" ~#covers: "normal flow and BFC; flexbox; grid; display:contents; subgrid; positioned strata; sticky; stacking contexts; container queries; strata reflection"
 ~[4]: "^seed[curriculum] — scaffold labs/03-calculus-valence.md (values lab plus valence reflection)" ~#covers: "custom properties; calc; min, max, clamp; trig; exp and log; oklch and color-mix; relative colors; attr(); env(); valence-interpolation reflection"
 ~[5]: "^seed[curriculum] — scaffold labs/04-query-introspection.md (selector lab plus introspection reflection)" ~#covers: "cascade and @layer; attribute substring; structural and UI-state pseudo-classes; :has(); :is, :where, :not; @media; @supports; @scope; introspection reflection"
 ~[6]: "^seed[curriculum] — scaffold labs/05-temporal-navigation.md (time lab plus navigation reflection)" ~#covers: "transitions; cubic-bezier; keyframes; additive animation; scroll and view timelines; scroll snap; View Transitions; :target and :checked state machines; navigation reflection"
 ~[7]: ".[design] — fold lab heuristics into dom-css-testing-harness.md and theme-progression.spw"
}
```

## Dependencies

- `ecosystem-surface-governance` is an adjacent consumer; the labs should produce reusable stewardship heuristics for active and public-beta web surfaces.
- `plan-ecology-clustering` classifies this as a `page` rung that should feed execution and public-interest lanes with reusable knowledge rather than compete with them for the same urgency.
- `audit-css-tokens` and `audit-data-attributes` are downstream consumers of the heuristics, page archetypes, and review snippets generated here.

## Principal Engineering Orientation

- Ladder position: `page`
- Judgment target: grow page-design taste from direct standards contact so later component and service work inherits real web reasoning instead of folklore
- Commit bar: each lab should leave behind one standards lesson, one Spw translation, and one reusable page/component/service question worth discussing

## Review Surfaces

- External precedents: HTML, ARIA, CSS Grid/Subgrid, Containment, Selectors, Color, Scroll-Driven Animations, and View Transitions specs
- Repo precedents: `.spw/workspace.spw`, `.spw/patterns/literate-ui.spw`, `docs/design/md/dom-css-testing-harness.md`, `docs/design/spw/theme-progression.spw`
- Governance consumers: active web-surface plans that need stewardship heuristics, accessibility discipline, and layout/query examples

## Capability Transfer

- Document capability: semantics, accessibility tree literacy, hierarchy, and readable document flow
- Layout capability: containment, grid rhythm, intrinsic sizing, query boundaries, and page atmosphere
- Interaction capability: selector logic, temporal transitions, navigation feel, and zero-JS or low-JS interface reasoning

## Syntax and Snippet Discipline

- Stable syntax: every lab should preserve a small HTML/CSS snippet that can be reread without the surrounding writeup
- Experimental syntax: new selector or animation idioms should be marked as experimental when browser support or repo relevance is still unsettled
- Snippet routes: each lab should identify whether its result wants to stay a study note, become a component pattern, anchor a page exhibit, or inform a service walkthrough

## Reheated 2026-10-12

The live commit list, shared lab format, verification tiers and open questions are in wip.spw (the commits and lab_format frames); the shared format is owned by curriculum-html-css-mastery. Lab home: docs/learn/labs/html-css/. The commit list above predates the reheat where the two differ.
