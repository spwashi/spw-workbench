# Capsules: Local Configuration Layers

Version: 0.1.0-prealpha
Status: Specified

---

## Overview

Capsules provide local configuration without mutating content. They wrap content with contextual settings that affect evaluation but not canonical representation.

Syntax: `<c[key:val ...]>{ content }`

---

## Syntax

```ebnf
capsule     ::= "<c[" config "]>" body
config      ::= entry ("," entry)* | entry+
entry       ::= key ":" value
key         ::= identifier
value       ::= literal | reference | list
body        ::= "{" content "}"
```

### Examples

```spw
// Single configuration
<c[goal:explain]>{
  Content evaluated with explain goal
}

// Multiple configurations
<c[goal:audit dialects:{x t} use:Spw.Posture.ResearchRigorous]>{
  Content with multiple settings
}

// Nested capsules (inner overrides outer)
<c[goal:index]>{
  <c[goal:explain]>{
    // This content uses explain, not index
  }
}
```

---

## Standard Keys

### goal

Selects runtime execution mode.

```spw
<c[goal:explain]>{ ... }   // Optimize for understanding
<c[goal:index]>{ ... }     // Build searchable structure
<c[goal:execute]>{ ... }   // Run or simulate
<c[goal:onboard]>{ ... }   // Teach/introduce
<c[goal:audit]>{ ... }     // Verify provenance
```

### dialects

Selects lens set for evaluation.

```spw
<c[dialects:{x t}]>{ ... }     // Linkage + topology
<c[dialects:{q}]>{ ... }       // Query lens only
<c[dialects:{x t r}]>{ ... }   // Linkage + topology + reduction
```

### use

References library profiles (Taste, Posture).

```spw
<c[use:Spw.Taste.Poetic]>{ ... }
<c[use:Spw.Posture.ResearchRigorous]>{ ... }
<c[use:Spw.Taste.Minimalist use:Spw.Posture.StreamVelocity]>{ ... }
```

### strata

Specifies extraction target level.

```spw
<c[strata:node]>{ ... }        // Extract at node level
<c[strata:block]>{ ... }       // Extract at block level
<c[strata:{node block}]>{ ... } // Multiple strata
```

### caps

Declares required capabilities.

```spw
<c[caps:{io network}]>{ ... }  // Requires IO and network
<c[caps:{fs:read}]>{ ... }     // Read-only filesystem
```

---

## Scoping Rules

1. **Lexical scope**: Capsule config applies to its body only
2. **Inheritance**: Nested capsules inherit outer config
3. **Override**: Inner values replace outer for same key
4. **Merge**: List values can merge with `+` prefix

```spw
<c[dialects:{x}]>{
  // Has dialect x

  <c[dialects:{t}]>{
    // Has only dialect t (replaced)
  }

  <c[dialects:+{t}]>{
    // Has dialects x AND t (merged)
  }
}
```

---

## Canonical Representation

Capsule syntax is part of canonical form. For hashing purposes:

1. Keys are sorted alphabetically
2. List values are sorted
3. Whitespace within brackets is normalized

```spw
// Input
<c[ goal:explain  use:Spw.Posture.X  dialects:{t x} ]>{ ... }

// Canonical
<c[dialects:{t x} goal:explain use:Spw.Posture.X]>{ ... }
```

---

## Relationship to Containers

Capsules are distinct from the four core containers:

| Form | Purpose | Dimension |
|------|---------|-----------|
| `<>` (Couple) | Relationships | Relational |
| `()` (Scope) | Spatial context | Spatial |
| `[]` (Frame) | Addressing | Referential |
| `{}` (Body) | Behavior | Procedural |
| `<c[]>{}` (Capsule) | Configuration | Meta |

Capsules wrap content with configuration; they don't change content semantics.

---

## Conformance

- **Level 1**: MAY parse capsule syntax; MUST NOT reject it
- **Level 2**: SHOULD recognize standard keys; MAY ignore unknown keys
- **Level 3**: MUST support all standard keys; MUST honor configuration

---

## See Also

- [CONTAINERS.md](./CONTAINERS.md) - Core container semantics
- [../runtime/GOALS.md](../runtime/GOALS.md) - Goal tokens
- [../domains/POSTURE.md](../domains/POSTURE.md) - Behavior profiles
- [../domains/TASTE.md](../domains/TASTE.md) - Aesthetic profiles
