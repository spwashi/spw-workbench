---
name: spw-math-algorithm-radar
description: Maintain a living map of relevant math/algorithms for this repo; use when asked what fields/techniques apply, to pick algorithms, or to build a learning roadmap.
---

# Spw Math + Algorithm Radar

## Default Workflow

1. Identify the concrete problem (inputs, outputs, constraints, scale).
2. Classify the problem using `references/radar-template.md` (domain, likely tools, failure modes).
3. Propose 2–3 candidate techniques with tradeoffs and complexity.
4. Recommend one path and list "next learning steps" (papers/chapters/implementations).
5. If asked, implement a small spike or benchmark in the repo with tight scope and tests.

## Output Contract

- Produce either:
  - A short "radar entry" (fields + techniques + next steps), or
  - A code spike/benchmark plus a short write-up of findings.

## Math Already in This Codebase

### Fiber Bundle Model (Register Geometry)
The register space is modeled as a fiber bundle: `(base=sigil, fiber=register-state, projection=type-check)`. Non-commutative operator pairs (`!(~x) ≠ ~(!x)`) define distinct homotopy classes. See `docs/theory/spw/register-geometry.spw`.

### Tiered Normalization (ONF)
A three-tier normal form pipeline: SNF (surface lexical normalization) → SiNF (per-sigil reduction automata) → SeNF (cross-sigil semantic normalization, may not terminate). Each tier is a fixed-point iteration. See `docs/theory/spw/onf.spw`.

### Cascade Resolution
Layered override with priority ordering — functionally a priority-ordered merge of semantic frames. `[cascade=layer priority=N]` with `[resolve=cascade]` for resolution.

### Salience Mechanics
`%` operator as normalization to comparable scale. Duty cycle metaphor from EM domain. Used for proportion measurement and priority sorting across cascade layers.

### Relevant Fields Not Yet Formalized
- **Category theory**: operator composition as morphisms, register frames as functors
- **Lattice theory**: facet resonance as lattice meets/joins across component docs
- **Information theory**: compression of `.spw` → bytecode, entropy of Spw programs
- **Graph rewriting**: AST transformations as rewrite rules (for the parser)
- **Homotopy type theory**: non-commutative pairs as paths in type space
- **Rhythmic computing**: swing ratios (non-linear time mapping), polyrhythmic LCM (clock sync intervals), groove quantization (snapping to beat grids). Applies to timing deformation axis.

## Notes

- Prefer "time-to-insight" over encyclopedic coverage.
- Treat each technique as a hypothesis: state what it would improve and how you'd measure it.

## Resources

- Read `.agents/skills/spw-math-algorithm-radar/references/radar-template.md` when you need a consistent classification template and field list.
