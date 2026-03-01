# Version Boundaries

Version: 0.1.0-alpha
Purpose: Define what is locked, optional, and deferred

---

## Overview

This document explicitly partitions Spw features into three categories:

- **Locked:** Specified and stable; will not change
- **Optional:** Specified but not required for conformance
- **Deferred:** Syntax permitted but semantics reserved for future versions

---

## Locked Features

These features are fully specified and **MUST NOT** change in future 0.x releases.

### Primitives

| Category | Elements | Count |
|----------|----------|-------|
| Operators | `!`, `^`, `~`, `<>`, `?`, `*`, `=`, `@` | 8 |
| Modifiers | `bone`, `boon`, `bane`, `bonk`, `honk` | 5 |
| Connectors | `..`, `\|`, `&` | 3 |
| Containers | `<>`, `()`, `[]`, `{}` | 4 |

The primitive set is **closed**. No new operators, modifiers, connectors, or containers will be added.

### Syntax Rules

| Rule | Status |
|------|--------|
| Operator-frame-body structure | Locked |
| Modifier position (after operator) | Locked |
| Modifier chaining (max 2) | Locked |
| Connector precedence | Locked |
| Container nesting | Locked |
| Quote semantics | Locked |
| Comment syntax | Locked |
| Annotation syntax | Locked |

### Semantic Rules

| Rule | Status |
|------|--------|
| Lexical scoping | Locked |
| Reference resolution | Locked |
| Sequence evaluation | Locked |
| Alternative selection | Locked |
| Parallel composition | Locked |
| Modifier chain composition (merge model) | Locked |

---

## Optional Features

These features are specified but not required for base conformance.

### Geometry Dialects

| Dialect | Description | Required Level |
|---------|-------------|----------------|
| Spw.l | Linear (one-line) | L3 |
| Spw.b | Block (indented) | L3 |
| Spw.x | Index (reference) | L3 |

Implementations **MAY** support any subset. Level 3 requires all three.

### Functional Dialects

| Dialect | Description | Required Level |
|---------|-------------|----------------|
| Spw.p | Prompting | L3 optional |
| Spw.q | Querying | L3 optional |
| Spw.t | Templating | L3 optional |

Functional dialects are optional even at Level 3.

### Domains

| Domain | Type | Required Level |
|--------|------|----------------|
| Cognitive@ | Reference | L3 optional |
| Hardware@ | Reference | L3 optional |
| Theatre@ | Reference | L3 optional |
| Broadcast@ | Reference | L3 optional |
| Fractal@ | Extended | L3 optional |
| Narrative@ | Extended | L3 optional |
| Taste@ | Meta | L3 optional |

**No domains are required for any conformance level.** Domain projection is an optional capability.

### Modifier Inference

Mapping domain vocabulary to canonical modifiers:

```spw
!positive["good"]       # → !boon["good"]
!warning["caution"]     # → !bane["caution"]
```

Required at Level 3; optional at Level 2.

---

## Deferred Features

These features have permitted **syntax** but deferred **semantics**. The syntax is valid in v0.1.0 to enable forward compatibility; evaluation follows level-specific rules.

### Reflection

| Syntax | Description | v0.1.0 Behavior |
|--------|-------------|-----------------|
| `X#` | Operator essence | L2: identity; L3: identity |
| `X#Y` | Operator composition | L2: error; L3: error |

Semantics deferred to v0.2.0.

```spw
!#                      # Parses; evaluates to ! itself
!#^                     # Parses; evaluates to error
```

### Currying

| Syntax | Description | v0.1.0 Behavior |
|--------|-------------|-----------------|
| `_` | Placeholder | L2: error; L3: error |
| `_name` | Named placeholder | L2: error; L3: error |

Semantics deferred to v0.2.0.

```spw
!["a", _, "c"]          # Parses; evaluates to error
^["f"]: !["x", _]       # Parses; evaluates to error
```

### Type Annotations

| Syntax | Description | v0.1.0 Behavior |
|--------|-------------|-----------------|
| `::` | Type annotation | L1: parse; L2: ignore |

Semantics deferred to v0.2.0 or later.

```spw
^["x"]:: number         # Parses; type ignored in evaluation
```

### Transition Operator

| Syntax | Description | v0.1.0 Behavior |
|--------|-------------|-----------------|
| `X.then.Y` | Transition hint | Treated as dotpath |

The `then` segment in dotpaths is reserved for future transition semantics.

```spw
=bane.then.boon["change"]   # Parses as dotpath; "then" reserved
```

---

## Forbidden Combinations

The following are parse errors in v0.1.0:

| Pattern | Reason |
|---------|--------|
| `bone.bonk` | Arousal without valence |
| `honk.bonk` | Redundant salience |
| `!bone.boon.bane` | Chain length > 2 |
| `<` without `>` | Unbalanced container |
| Mismatched containers | `([)]` |

---

## Version Progression

| Version | Adds |
|---------|------|
| 0.1.0 | Core primitives, base evaluation |
| 0.2.0 | Reflection semantics, currying |
| 0.3.0 | Type annotations, advanced domains |
| 1.0.0 | Stable API, full specification |

Migration between versions will be documented with explicit upgrade paths.

---

## Decision Log

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Operator set | Closed at 8 | Stability; composition provides expressiveness |
| Modifier set | Closed at 5 | Covers valence space adequately |
| Reflection syntax | Allowed | Forward compatibility |
| Reflection semantics | Deferred | Complex; needs more design |
| Currying syntax | Allowed | Forward compatibility |
| Currying semantics | Deferred | Scope/closure interaction unclear |
| Domains | Optional | Core language independent of interpretation |
| Modifier chaining | Max 2 | Simplicity; covers common cases |

---

## Summary Table

| Feature | Locked | Optional | Deferred |
|---------|:------:|:--------:|:--------:|
| 8 operators | ✓ | | |
| 5 modifiers | ✓ | | |
| 3 connectors | ✓ | | |
| 4 containers | ✓ | | |
| Modifier chains (2) | ✓ | | |
| Quote semantics | ✓ | | |
| Lexical scoping | ✓ | | |
| Geometry dialects | | ✓ | |
| Functional dialects | | ✓ | |
| Domain projection | | ✓ | |
| Modifier inference | | ✓ | |
| Reflection | | | ✓ |
| Currying | | | ✓ |
| Type annotations | | | ✓ |
