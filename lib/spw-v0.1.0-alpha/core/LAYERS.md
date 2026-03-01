# Abstraction Layers (Liminality Model)

Version: 0.1.0-prealpha
Status: Theoretical Foundation

---

## Overview

Operations occur at different layers of abstraction. Each layer has its own operators or operator interpretations. Crossing layers requires explicit transition.

---

## Layer Model

| Layer | Name | Operates On | Access Via |
|-------|------|-------------|------------|
| 0 | ground | values | (default) |
| 1 | structure | expressions | `X#` |
| 2 | schema | types/patterns | `::` |
| 3 | grammar | syntax rules | macro/extension |
| ω | foundation | language itself | bootstrap |

---

## Layer Details

### Ground (Layer 0)

**Operates on:** values

Standard operator interpretation. Most code lives here.

```spw
!['hello']    // injects the string 'hello'
^['name']     // anchors 'name' to a value
```

### Structure (Meta.1)

**Operates on:** expressions

Expressions become first-class values. Operators manipulate structure rather than values.

```spw
!#['hello']   // the inject-expression itself, not its result
?#            // the probe operator as value
```

**Access:** `X#` lifts to meta.1

### Schema (Meta.2)

**Operates on:** types and patterns

Type-level operations. Define constraints and shapes.

```spw
^['T']::      // defines a type
Inject:: Operator   // type annotation
```

**Access:** `::` lifts to meta.2

### Grammar (Meta.3)

**Operates on:** syntax rules

Define new operators, modify parsing. Macro systems live here.

```spw
// Hypothetical syntax
grammar{
  define['<|>'] as infix binary
}
```

**Access:** macro/extension systems (deferred to v0.3.0+)

### Foundation (Meta.ω)

**Operates on:** the language itself

Bootstrap and self-definition. The Spw.Language seed operates here.

```spw
^seed["Spw.Language v:0.1.0-prealpha"]{
  // self-describing language definition
}
```

---

## Layer Transitions

### Lift (ground → meta)

Move from values to structure/types.

| Operator | Transition |
|----------|------------|
| `#` | annotate (attach metadata) |
| `X#` | reflect (ground → meta.1) |
| `::` | type (ground → meta.2) |

```spw
// Ground
!['hello']

// Lifted to meta.1
!#

// Interpretation: the inject operator itself
```

### Drop (meta → ground)

Bring meta-level values back to ground.

| Operator | Transition |
|----------|------------|
| `@` | emit (materialize) |
| `!` | inject (instantiate) |

```spw
// Meta.1
!#

// Dropped to ground
@(!#)['hello'] = !['hello']
```

### Span (cross-layer)

Operations that work across layers.

```spw
~#{ layer transformation }
```

---

## Liminal Zones

Boundaries between layers have special semantics.

### Threshold (ground ↔ meta.1)

Expression ↔ value boundary.

| Operation | Meaning |
|-----------|---------|
| quote | hold expression unevaluated |
| unquote | evaluate held expression |
| quasiquote | partial evaluation |

```spw
'expr       // quoted (held)
,expr       // unquoted (evaluated)
`expr       // quasiquote with holes
```

### Capsule Boundary (scope ↔ scope)

Configuration ↔ content boundary.

```spw
<c[config]>{
  // content operates with config
}
```

### Stream Boundary (discrete ↔ continuous)

Item ↔ flow boundary.

```spw
<<{source}    // open stream
  items...
>> @sink      // close stream
```

### Domain Boundary (interpretation ↔ interpretation)

Cross-domain projection.

```spw
Hardware@seed         // project seed through Hardware
Theatre@seed          // project seed through Theatre
Hardware & Theatre @  // fused projection
```

---

## Guarantees

### Stratification

- Ground operations never accidentally lift
- Meta operations explicitly drop results
- Layers are well-ordered: 0 < 1 < 2 < 3 < ω

### Reversibility

Lift and drop are inverses where applicable:

```spw
@(!#)['x'] = !['x']
```

### Locality

Resolution depends only on lexically visible context. Dynamic context must be explicitly requested via `@[]`.

---

## See Also

- [OPERATORS.md](./OPERATORS.md) - Operator theory and essences
- [../dialects/PHASES.md](../dialects/PHASES.md) - Dialect phase model
- [CAPSULES.md](./CAPSULES.md) - Capsule boundaries
