# Changelog

## [0.1.0-alpha] - 2026-01-07

### Status

Pre-alpha specification release for review. Core language is stable; feedback welcome on all aspects.

### Added

#### Core Specification
- Eight operators: `!`, `^`, `~`, `<>`, `?`, `*`, `=`, `@`
- Five modifiers: `bone`, `boon`, `bane`, `bonk`, `honk`
- Three connectors: `..`, `|`, `&`
- Four containers: `<>`, `()`, `[]`, `{}`
- Modifier chaining with merge semantics (max 2)
- Quote semantics distinguishing literals from references

#### Conformance
- Three conformance levels: Parser, Evaluator, Full
- Explicit feature matrix per level
- Version boundaries: locked, optional, deferred

#### Dialects
- Geometry axis: Spw.l (linear), Spw.b (block), Spw.x (index)
- Functional axis: Spw.p (prompting), Spw.q (querying), Spw.t (templating)
- Lossless conversion between geometries (except to/from Spw.x)

#### Domains
- Domain profile specification format
- Four reference domains: Cognitive@, Hardware@, Theatre@, Broadcast@
- Two extended domains: Fractal@, Narrative@
- Taste@ meta-domain with evaluation notation

#### Runtime
- Register architecture: R0, R^, R@ (core) plus extended registers
- Lexical scoping rules
- Operator-register affinity mapping

### Reserved

Syntax permitted, semantics deferred to future versions:

- `X#` reflection
- `X#Y` operator composition
- `_` placeholders (currying)
- `::` type annotations
- `X.then.Y` transition hints

### Notes

This release is for specification review. Implementations should focus on Level 1 (parser) and Level 2 (evaluator) conformance. Level 3 features are optional.

Feedback channels:
- GitHub issues
- Pull requests
- Design discussions

---

## Planned

### [0.1.0] - 2026-Q1
- Conformance test suites
- Edge case clarifications
- Reference parser implementation

### [0.2.0] - 2026-Q2
- Reflection semantics
- Currying semantics
- Operator composition

### [0.3.0] - 2026-Q3
- Type annotations
- Advanced domain features

### [1.0.0] - 2026-Q4
- Stable API
- Complete specification
- No deferred features
