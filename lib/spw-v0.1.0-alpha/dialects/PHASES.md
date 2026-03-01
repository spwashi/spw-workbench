# Dialect Phase Model

Version: 0.1.0-prealpha
Status: Theoretical Foundation

---

## Overview

Dialects operate at different phases of the expression lifecycle. Conflating phases creates false tensions. Each phase can vary independently.

**Principle:** "Dialects are not monolithic; they are composable along phase axes."

---

## Phase Model

| Phase | Question | Concern |
|-------|----------|---------|
| **Surface** | How are characters grouped into tokens? | Lexing |
| **Structure** | How do tokens compose into trees? | Parsing |
| **Projection** | What does this structure mean? | Semantics |
| **Orientation** | What is the execution goal? | Runtime |
| **Presentation** | How is the result displayed? | Output |

---

## Surface Phase

**Question:** How are characters grouped into tokens?

**Concerns:**
- Whitespace significance
- Delimiter rules
- Quote semantics
- Sigil recognition

### Surface Dialects

| Dialect | Whitespace | Sequence | Boundaries |
|---------|------------|----------|------------|
| **linear** | insignificant | explicit (`..`) | sigils and containers |
| **block** | indentation significant | implicit (newline) | dedent closes scope |
| **natural** | prose-like | inferred from punctuation | sigils mark semantic force |
| **streaming** | chunked | arrival order | `<<` and `>>` |

---

## Structure Phase

**Question:** How do tokens compose into trees?

**Concerns:**
- Precedence
- Associativity
- Container nesting
- Reference resolution

### Structure Dialects

| Dialect | Containers | Connectors | Ambiguity |
|---------|------------|------------|-----------|
| **explicit** | all required | all required | none |
| **inferred** | from indentation | from newline | resolved by precedence |

---

## Projection Phase

**Question:** What does this structure mean?

**Concerns:**
- Domain binding
- Type inference
- Effect mapping

### Projection Dialects

These are the Domain@ interpretations:

| Domain | Interpretation |
|--------|---------------|
| Cognitive@ | mental operations |
| Hardware@ | circuit semantics |
| Theatre@ | dramatic interpretation |
| Broadcast@ | signal flow |

See [../domains/PROFILES.md](../domains/PROFILES.md) for full domain definitions.

---

## Orientation Phase

**Question:** What is the execution goal?

**Concerns:**
- Goal selection
- Posture configuration
- Reduction preference
- Caching strategy

### Orientation Dialects

| Dialect | Goal | Flow | Reduction |
|---------|------|------|-----------|
| **query** | retrieve | filter → shape → emit | high |
| **template** | instantiate | bind slots → render | low |
| **topology** | connect | identify nodes → establish edges | structural |
| **reduction** | condense | analyze → compress → emit | maximum |
| **linkage** | relate | enumerate → couple → graph | referential |

---

## Presentation Phase

**Question:** How is the result displayed?

**Concerns:**
- Taste profile
- Rhythm
- Emphasis (n-range)

### Presentation Dialects

These are TasteProfiles:

| Profile | Rhythm | Emphasis |
|---------|--------|----------|
| **poetic** | preserve | n-range depth |
| **terse** | collapse | minimal |
| **literate** | balanced | moderate |
| **annotated** | preserve | margin notes |

**Critical:** Presentation NEVER affects canonical_text or hashing.

---

## Phase Independence

Each phase can vary independently. A seed can combine any valid phase settings.

### Composition Syntax

```
Spw.surface.structure.domain.orientation.presentation
```

### Examples

```spw
Spw.block.inferred.Hardware.query.terse
Spw.linear.explicit.Cognitive.template.literate
Spw.natural.inferred.Theatre.topology.poetic
```

### Defaults

| Phase | Default |
|-------|---------|
| surface | block |
| structure | inferred |
| domain | (none / polymorphic) |
| orientation | (none / direct evaluation) |
| presentation | literate |

### Shorthand

| Shorthand | Expansion |
|-----------|-----------|
| `Spw.b` | `Spw.block.inferred` |
| `Spw.l` | `Spw.linear.explicit` |
| `Spw.n` | `Spw.natural.inferred` |
| `Spw.q` | `Spw.*.*.*.query.*` |
| `Spw.t` | `Spw.*.*.*.template.*` |
| `Spw.r` | `Spw.*.*.*.reduction.*` |
| `Spw.x` | `Spw.*.*.*.linkage.*` |

---

## Implications

### For Parsing

- Tokenizer determines surface dialect
- Parser applies structure dialect
- AST is dialect-independent
- canonical_text derived from AST, not surface

### For Evaluation

- Evaluator receives AST + context
- Resolution consults context for each node
- Domain/goal/posture are context parameters
- Result is values + effects + capabilities

### For Tooling

- Tools can operate at any layer
- Tools can project through any domain
- Tools share resolution algorithm
- Tool output is always reconstructible from canonical + context

---

## See Also

- [GEOMETRY.md](./GEOMETRY.md) - Geometry dialects (legacy naming)
- [FUNCTIONS.md](./FUNCTIONS.md) - Functional dialects (legacy naming)
- [../core/OPERATORS.md](../core/OPERATORS.md) - Operator theory
- [../core/LAYERS.md](../core/LAYERS.md) - Abstraction layers
