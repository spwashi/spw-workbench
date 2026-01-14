# Researcher's Guide

Welcome! This guide is for researchers in **linguistics, cognitive science, learning science, or applied psychology** who want to contribute to the Spw language workbench.

## Why Contribute as a Researcher?

This project is designed as a laboratory for language design. Your contributions directly shape:

- **Language Semantics** — Validate that operators map consistently across domains (Hardware, Theatre, Broadcast)
- **Cognitive Load** — Measure whether grammar constraints (2-modifier limit, minimal syntax) are cognitively optimal
- **Learning Science** — Study how progressive disclosure levels match skill acquisition stages
- **Accessibility** — Test WCAG compliance and neurodiversity support
- **Formal Theory** — Formalize semantic projections and wavefunction resolution

Your findings become design decisions. Your papers become architectural documentation. Your research questions shape the next phase of the language.

---

## Quick Start (5 Minutes)

### 1. Clone and Setup
```bash
git clone <repo>
cd hud-dashboard
npm install
npm run dev
```

### 2. Explore the Language
Open http://localhost:5173 and try:
```spw
^["hello"]                    # Basic anchor
^["hi"]{!["world"]}           # Anchor + inject
?[@name]{!["Hello, " .. @name] | !["Hi, stranger"]} # Conditional
```

### 3. Switch Perspectives
Press **Ctrl+1/2/3** to see the same seed through three interpretive layers:
- **Layer 1 (Syntactic):** Structure — How it parses
- **Layer 2 (Semantic):** Meaning — What it evaluates to
- **Layer 3 (Pragmatic):** Effect — What it does

### 4. Read the Spec
Open `lib/spw-v0.1.0-alpha/SPEC.md`. Skim the operators section (5 min).

**You now understand the basics.** Continue reading this guide for what you can research.

---

## Research Areas You Can Contribute To

### 1. Operator Semantics and Domain Polymorphism

**Question:** Do operators maintain consistent semantics across different domains?

**Example Domains:**
- `^` (anchor) means: start point in Hardware, protagonist in Theatre, source signal in Broadcast
- Do these meanings compose logically? Is there an underlying semantic principle?

**How to Contribute:**
- Implement a multi-domain corpus analyzer in `src/lib/spw/instrumentation/`
- Collect seed examples across 3+ domains
- Measure semantic preservation using a distance metric
- Document findings in `docs/research/operator-semantics.md`

**Resources:**
- `lib/spw-v0.1.0-alpha/OPERATORS.md` — Operator theory
- `lib/spw-v0.1.0-alpha/applications/` — Domain specifications
- `src/runtime/interpreter/` — Implementation reference

### 2. Cognitive Load and Chunking Analysis

**Question:** Is the 2-modifier limit cognitively optimal? How do different skill levels perceive complexity?

**Example Research:**
- Measure comprehension time for seeds with 1, 2, 3 modifiers
- Study working memory impact using eye-tracking or think-aloud protocols
- Correlate modifier count with error rates in user studies

**How to Contribute:**
- Design an experiment using the web interface
- Create a test harness that measures interaction metrics
- Instrument keyboard logging to capture learning patterns
- Publish methodology and results as research documentation

**Resources:**
- `src/features/onboarding/disclosure.ts` — Skill level system (L1-L5)
- `src/infra/lifecycle/` — State transition tracking
- `VISION.md` — Cognitive science handles

### 3. Accessibility and Neurodiversity

**Question:** How well does the interface support different cognitive and learning profiles?

**Example Research:**
- WCAG accessibility compliance testing
- Screen reader compatibility analysis
- Color blindness support (design tokens)
- Auditory navigation patterns (documented in `src/README.md`)

**How to Contribute:**
- Run accessibility audit tools (axe, WAVE, NVDA)
- Document findings in `docs/research/accessibility.md`
- Propose design changes in PRs
- Partner with neurodiversity advocates on usability testing

**Resources:**
- `src/design/themes/` — Color and contrast settings
- `src/ui/` — Web component accessibility attributes
- `src/README.md` — Auditory navigation patterns

### 4. Comparative Linguistics and Formal Theory

**Question:** How does Spw relate to existing formal languages (λ-calculus, combinators, automata)?

**Example Research:**
- Map operators to lambda-calculus primitives
- Compare to Applicative Programming or Combinatory Logic
- Position Spw in the landscape of minimal languages
- Analyze expressiveness vs. simplicity trade-offs

**How to Contribute:**
- Write formal grammar in BNF/EBNF notation
- Create a mapping document (`docs/research/formal-theory.md`)
- Propose type theory formalization
- Contribute to `lib/spw-v0.1.0-alpha/` specification updates

**Resources:**
- `lib/spw-v0.1.0-alpha/SPEC.md` — Current specification
- `lib/spw-v0.1.0-alpha/LAYERS.md` — Abstraction theory
- Academic references in `VISION.md`

### 5. Taste Profiles and Aesthetic Judgment

**Question:** Can we measure "elegance" in code? How do taste profiles predict comprehension?

**Example Research:**
- Collect taste profile data (users rate seeds along aesthetic dimensions)
- Correlate taste dimensions with maintainability metrics
- Study whether aesthetic preferences vary by cognitive profile
- Validate the 8 taste axes (minimalism, clarity, rigidity, etc.)

**How to Contribute:**
- Design a taste profiler UI component
- Implement metrics collection in `src/runtime/`
- Run user studies correlating taste with comprehension
- Document methodology and findings

**Resources:**
- `lib/spw-v0.1.0-alpha/domains/TASTE.md` — Taste profile theory
- `src/runtime/interpreter/` — Evaluation context
- `src/design/tokens/` — Visual design parameters

### 6. Learning Progressions and Disclosure Levels

**Question:** Do our 5 disclosure levels (L1-L5) match actual skill acquisition?

**Example Research:**
- Design learning experiments at each level
- Measure transfer of knowledge between levels
- Study error patterns and misconceptions at each stage
- Validate alignment with Bloom's taxonomy or other models

**How to Contribute:**
- Create tutorial sequences for each level
- Instrument hint system to track hint effectiveness
- Collect user study data on learning curves
- Write research methodology and analysis

**Resources:**
- `src/features/onboarding/disclosure.ts` — Level definitions
- `docs/lang/few-shot.spw.md` — Learning examples
- `ARCHITECTURE-STRATEGY.md` — Section on three-dimensional optimization

### 7. Semantic Projections and Meaning Preservation

**Question:** When we interpret the same seed in different domains, what stays invariant?

**Example Research:**
- Implement a semantic distance metric across domains
- Test whether "meaningful" seeds stay meaningful under transformation
- Study which operator combinations preserve intent across domains
- Formalize the projection rules between domains

**How to Contribute:**
- Build analysis tools in `src/lib/spw/instrumentation/`
- Create a corpus of multi-domain seeds
- Measure semantic preservation using information theory
- Publish findings and propose refinements to domain specs

**Resources:**
- `lib/spw-v0.1.0-alpha/dialects/` — Domain structure
- `src/runtime/interpreter/` — Domain resolution logic
- `ARCHITECTURE-STRATEGY.md` — Three-dimensional optimization

### 8. Language Design Trade-offs and Phase Methodology

**Question:** How do we balance simplicity, expressiveness, and learnability?

**Example Research:**
- Document design decisions and alternatives (create `docs/research/design-decisions.md`)
- Study Phase 2 refactoring approach (how we evolved the event system)
- Analyze impact of phase changes on usability
- Propose next-phase improvements with justification

**How to Contribute:**
- Audit existing domains for design consistency
- Propose phase improvements with research backing
- Write methodology for evaluating trade-offs
- Help plan Phase 3 (config consolidation)

**Resources:**
- `TOKEN-EFFICIENCY.md` — Phase 2 methodology
- `ARCHITECTURE-STRATEGY.md` — Twelve architectural tensions
- Recent commits mentioning refactors

### 9. Corpus Linguistics and Idiom Patterns

**Question:** What linguistic patterns emerge in real Spw code?

**Example Research:**
- Collect corpus of seeds from examples and docs
- Analyze frequency of operator combinations
- Identify natural idioms vs. awkward patterns
- Study effectiveness of documentation examples

**How to Contribute:**
- Build a corpus annotation tool
- Analyze `docs/` .spw files and collect patterns
- Document idioms in `docs/patterns.spw`
- Propose language refinements based on usage data

**Resources:**
- `docs/` — Extensive examples in .spw format
- `lib/spw-v0.1.0-alpha/` — Specification and examples
- `src/lang/` — Parser and semantic analysis

---

## How to Get Started

### Step 1: Choose a Research Question
Pick one of the nine areas above, or propose your own. Open an issue with:
- Research question
- Motivation (why it matters)
- Proposed methodology
- Timeline (rough estimate)

### Step 2: Set Up Your Development Environment
```bash
npm install
npm run dev                    # Start dev server
npm run test:run             # Verify tests pass
npm run lint:layers          # Verify architecture
```

### Step 3: Explore the Codebase
- Read the spec: `lib/spw-v0.1.0-alpha/SPEC.md` (1 hour)
- Read the architecture: `ARCHITECTURE-STRATEGY.md` (30 min)
- Explore relevant domain: `src/<domain>/docs/README.md` (30 min)

### Step 4: Implement Your Research

**For Corpus/Analysis Work:**
- Create a new file in `src/lib/spw/instrumentation/` or `docs/research/`
- Aim for reusable tools that others can build on
- Include clear documentation of methodology

**For Formal Theory:**
- Write documentation in `docs/research/` or `lib/spw-v0.1.0-alpha/` (if spec changes)
- Include references to academic work
- Propose updates to specification if relevant

**For User Studies:**
- Create experiment harness in `src/features/onboarding/` or `src/debug/`
- Document methodology clearly
- Include informed consent and ethics review
- Share data and findings openly

### Step 5: Document and Share
- Write findings in a PR with clear methodology
- Link to any papers or external resources
- Propose architectural changes if research suggests them
- Engage with review feedback

---

## Tools and Infrastructure

### For Measurement
```bash
npm run measure-tokens        # Token efficiency metrics
npm run lint:layers          # Verify architecture
npm run fuzz:*               # Code quality analysis
```

### For Analysis
- **Lexer instrumentation:** `src/lib/spw/instrumentation/lexer-trace.ts`
- **Parser instrumentation:** `src/lib/spw/instrumentation/parser-trace.ts`
- **Domain resolver:** `src/runtime/interpreter/domain-resolver.ts`
- **Taste evaluator:** `src/runtime/interpreter/taste-evaluator.ts`

### For Implementation
- **Language core:** `src/lib/spw/` (portable, no @/ imports)
- **Runtime:** `src/runtime/` (execution, REPL, state management)
- **Analysis tools:** `src/debug/` (step controller, profiling)

---

## Code Review Expectations

For research contributions, reviewers will check:

1. **Methodology is sound** — Experimental design is valid; assumptions are stated
2. **Findings are significant** — Results inform design decisions or validate theory
3. **Code is clear** — Analysis tools are understandable by other researchers
4. **Documentation is complete** — Methodology is reproducible
5. **Architecture is respected** — Layer boundaries are not violated

Research PRs may take longer to review than feature PRs, but we prioritize them highly.

---

## Resources

### Language Specification
- `lib/spw-v0.1.0-alpha/SPEC.md` — Core language spec
- `lib/spw-v0.1.0-alpha/OPERATORS.md` — Operator semantics and theory
- `lib/spw-v0.1.0-alpha/LAYERS.md` — Abstraction layers
- `lib/spw-v0.1.0-alpha/dialects/` — Domain extensions
- `lib/spw-v0.1.0-alpha/applications/` — Creative uses (Hardware, Theatre, Broadcast)

### Architecture & Design
- `ARCHITECTURE-STRATEGY.md` — Strategic philosophy
- `VISION.md` — Project vision and research philosophy
- `TOKEN-EFFICIENCY.md` — Quality metrics and phase methodology
- `src/README.md` — Directory map with learning paths

### Documentation
- `docs/README.md` — Documentation hub
- `docs/research.spw` — Research notes
- `docs/design-research.spw` — Design research and language lessons
- Domain docs: `src/<domain>/docs/README.md`

### Existing Analysis
- `docs/spec-alignment.spw` — Gap analysis between implementation and spec
- `docs/semantics-physics.spw` — Semantic foundations
- `TOKEN-EFFICIENCY.md` Phase 2 — Example of systematic refactoring

---

## Common Tasks

For step-by-step instructions, see [Common Tasks Guide](common-tasks.md):
- Running tests
- Building the project
- Committing code
- Creating PRs
- Checking architecture boundaries

---

## Getting Help

- **Questions about the spec?** Read `lib/spw-v0.1.0-alpha/` first
- **Questions about architecture?** See `ARCHITECTURE-STRATEGY.md`
- **Questions about research approach?** Open an issue with your question
- **Stuck on code?** See domain's `docs/README.md` or `src/<domain>/types.ts`

---

## Next Steps

1. Pick one of the 9 research areas (or propose your own)
2. Open an issue describing your research question
3. Read the relevant specification/architecture docs
4. Set up your dev environment: `npm install && npm run dev`
5. Reach out if you get stuck

We're excited to have researchers contribute. Your work makes this project better for everyone. 🎉

---

**Back to:** [Contributing Guide Hub](README.md)
