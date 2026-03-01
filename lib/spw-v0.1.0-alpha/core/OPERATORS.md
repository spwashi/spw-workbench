# Operator Theory

Version: 0.1.0-prealpha
Status: Theoretical Foundation

---

## Overview

Operators are not atoms but **wavefunctions**—patterns of potential resolution that collapse to specific behavior when context is provided.

```
resolution(operator, context) → behavior
```

**Key Insight:** The symbol `!` simultaneously encodes inject/actuate/assert/introduce. The specific behavior emerges only when context collapses the wavefunction.

---

## Resolution Context

Resolution depends on:

| Factor | Description | Examples |
|--------|-------------|----------|
| phase | lifecycle stage | surface, structure, projection |
| layer | abstraction level | ground, meta.1, meta.2 |
| position | syntactic position | prefix, infix, suffix |
| scope | visible bindings | lexical environment |
| domain | interpretive lens | Hardware@, Theatre@ |
| valence | modifier applied | boon, bane, bonk |
| frame | parameters provided | `[key:val]` |
| goal | runtime intent | explain, execute, audit |
| posture | behavioral profile | rigorous, gentle |

---

## Six Essences

Operators project from six deeper patterns. These essences are the true atoms; operators are molecules.

### Flow

**Essence:** directed movement

| Operator | Projection |
|----------|------------|
| `!` | source (where flow begins) |
| `@` | sink (where flow ends) |
| `..` | channel (how flow connects) |
| `<<>>` | stream (sustained flow) |

### Binding

**Essence:** name-value association

| Operator | Projection |
|----------|------------|
| `^` | anchor (establish name) |
| `=` | lock (fix value) |
| `:` | pair (associate) |

### Branch

**Essence:** path selection

| Operator | Projection |
|----------|------------|
| `?` | probe (evaluate condition) |
| `*` | gate (control passage) |
| `\|` | alternative (exclusive paths) |
| `&` | parallel (concurrent paths) |

### Transform

**Essence:** value modification

| Operator | Projection |
|----------|------------|
| `~` | wave (iterative change) |
| `->` | map (structural change) |

### Relation

**Essence:** entity connection

| Operator | Projection |
|----------|------------|
| `<>` | couple (symmetric binding) |
| `/` | path (directed navigation) |

### Meta

**Essence:** self-reference

| Operator | Projection |
|----------|------------|
| `#` | annotate (attach metadata) |
| `X#` | reflect (reify operator) |
| `(( ))` | hedge (epistemic texture) |

---

## Operator Families

Grouped by behavioral category:

### Flow Operators

```spw
! .. @    // inject, sequence, emit
```

Move content through the system.

### Structure Operators

```spw
^ = :     // anchor, lock, pair
```

Establish binding and constraint.

### Control Operators

```spw
? * | &   // probe, gate, alternative, parallel
```

Branch and merge flow.

### Transform Operators

```spw
~ ->      // wave, map
```

Modify content in transit.

### Relation Operators

```spw
<> /      // couple, path
```

Connect entities.

### Meta Operators

```spw
# X# ()   // annotate, reflect, group
```

Operate on operations.

---

## Operator Composition

Operators compose by combining resolution potentials.

### Sequence

```spw
A .. B    // A then B; output of A flows to B
```

### Nesting

```spw
A{ B }    // A contains B; B operates within A's scope
```

### Modification

```spw
A.mod     // A with valence modified
!boon     // inject with positive valence
```

### Reflection

```spw
A#        // A's essence as first-class value
!#        // the inject operator itself
```

### Fusion (v0.2.0)

```spw
A#B       // new operator combining A and B
!#^       // inject-then-tap
```

---

## Composition Algebra

### Identity

```spw
A#bone = A           // neutral modifier
A .. () = A          // empty sequence
(){A} = A            // grouping only
```

### Associativity

```spw
(A .. B) .. C = A .. (B .. C)
(A#B)#C = A#(B#C)
```

### Distributivity

```spw
A{ B | C } = A{B} | A{C}
(A | B)#C = A#C | B#C
```

---

## Extensibility

New operators are valid if they:

1. Project from one or more essences
2. Specify resolution for all contexts
3. Preserve consistency guarantees
4. Compose with existing operators

---

## See Also

- [LAYERS.md](./LAYERS.md) - Abstraction layers
- [SPEC.md](./SPEC.md) - Core syntax specification
- [../dialects/PHASES.md](../dialects/PHASES.md) - Dialect phase model
