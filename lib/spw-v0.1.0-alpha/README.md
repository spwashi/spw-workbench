# Spw v0.1.0 Pre-Alpha Specification

**Symbolic Grammar for Code, Story, Cognition**

Version: 0.1.0-alpha
Date: 2026-01-07
Status: Pre-Alpha (specification review)

---

## Overview

Spw is a minimal formal language designed for deterministic parsing with semantic projection across multiple domains. A single Spw expression can simultaneously describe cognitive operations, electronic circuits, dramatic performances, and broadcast signal flows—all from the same symbolic foundation.

### Design Principles

**Minimal primitives.** Eight operators, five modifiers, three connectors, four containers. The core is closed; expressiveness comes from composition.

**Deterministic parsing.** Every valid Spw expression has exactly one parse tree. Ambiguity is a specification bug.

**Domain polymorphism.** Operators rebind their semantics based on interpretive context. The structure is preserved; only meaning transforms.

**Incremental adoption.** Three conformance levels enable implementations to support subsets of functionality while maintaining compatibility.

---

## Document Structure

### Core Specification

| Document | Description |
|----------|-------------|
| [SPEC.md](core/SPEC.md) | Language primitives: operators, modifiers, connectors, containers |
| [OPERATORS.md](core/OPERATORS.md) | Operator theory: wavefunctions, essences, composition |
| [LAYERS.md](core/LAYERS.md) | Abstraction layers: ground, meta.1, meta.2, meta.ω |
| [CONTAINERS.md](core/CONTAINERS.md) | Four circumfix delimiters: `<>`, `()`, `[]`, `{}` |
| [CAPSULES.md](core/CAPSULES.md) | Configuration layers: `<c[config]>{content}` |
| [CONFORMANCE.md](core/CONFORMANCE.md) | Three implementation levels with requirements |
| [BOUNDARIES.md](core/BOUNDARIES.md) | What's locked, optional, and deferred in v0.1.0 |

### Dialects

| Document | Description |
|----------|-------------|
| [PHASES.md](dialects/PHASES.md) | Five-phase model: surface, structure, projection, orientation, presentation |
| [GEOMETRY.md](dialects/GEOMETRY.md) | Representation axis: linear, block, index |
| [FUNCTIONS.md](dialects/FUNCTIONS.md) | Purpose axis: prompting, querying, templating |

### Domains

| Document | Description |
|----------|-------------|
| [PROFILES.md](domains/PROFILES.md) | Domain definition, application, and registration |
| [TASTE.md](domains/TASTE.md) | Aesthetic evaluation (TasteProfile) |
| [POSTURE.md](domains/POSTURE.md) | Behavioral profiles (BehaviorProfile) |

### Runtime

| Document | Description |
|----------|-------------|
| [GOALS.md](runtime/GOALS.md) | Runtime modes: explain, index, execute, onboard, audit |
| [REGISTERS.md](runtime/REGISTERS.md) | Evaluation model and register architecture |
| [TRAJECTORY.md](runtime/TRAJECTORY.md) | Development roadmap and deferred features |

### Applications

| Document | Description |
|----------|-------------|
| [HARDWARE.md](applications/HARDWARE.md) | Electronic circuit interpretation |
| [THEATRE.md](applications/THEATRE.md) | Dramatic performance interpretation |
| [BROADCAST.md](applications/BROADCAST.md) | Signal flow interpretation |

---

## Quick Reference

### Operators (8 sigils)

| Sigil | Name | Function |
|-------|------|----------|
| `!` | inject | Introduce energy/content |
| `^` | tap | Establish anchor/binding |
| `~` | wave | Create rhythm/iteration |
| `<>` | couple | Form relationship |
| `?` | probe | Evaluate condition |
| `*` | branch | Select path |
| `=` | bias | Fix constraint |
| `@` | emit | Output/transmit |

### Modifiers (5 valence markers)

| Modifier | Semantics |
|----------|-----------|
| `bone` | Neutral, structural |
| `boon` | Positive, approach |
| `bane` | Negative, warning |
| `bonk` | Sudden, spike |
| `honk` | Emphatic, salient |

### Connectors (3 flow operators)

| Connector | Semantics |
|-----------|-----------|
| `..` | Sequence (then) |
| `\|` | Alternative (or) |
| `&` | Parallel (and) |

### Containers (4 circumfix delimiters)

| Delimiter | Name | Question |
|-----------|------|----------|
| `<>` | Couple | Who relates? |
| `()` | Scope | Where exists? |
| `[]` | Frame | What addressed? |
| `{}` | Body | How behaves? |

---

## Conformance Levels

| Level | Name | Capability |
|-------|------|------------|
| 1 | Parser | Syntactic validation |
| 2 | Evaluator | Semantic execution |
| 3 | Full | Complete feature set |

See [CONFORMANCE.md](core/CONFORMANCE.md) for detailed requirements.

---

## Example

```spw.b
^["greeting"]{
  !boon["Hello, world"]
  .. ?[@recipient]{
       !["Welcome, " .. @recipient]
     | !bone["Welcome, stranger"]
     }
  .. @out
}
```

This seed:
- Establishes an anchor named "greeting"
- Injects a warm hello
- Probes for a recipient binding
- Branches based on presence
- Emits the result

---

## License

Spw specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Contact

Project maintainer: spwashi
