# Container Semantics

Version: 0.1.0-alpha
Status: Locked

---

## Overview

Spw uses four paired delimiters with orthogonal semantic functions. Each answers a distinct structural question and operates on a different dimension of meaning.

| Delimiter | Name | Question | Dimension |
|-----------|------|----------|-----------|
| `<>` | Couple | Who relates? | Relational |
| `()` | Scope | Where exists? | Spatial |
| `[]` | Frame | What addressed? | Referential |
| `{}` | Body | How behaves? | Procedural |

---

## 1. Angle Brackets — Couple

Angle brackets create relational bindings. Elements within are entangled; they share fate or state.

### 1.1 Basic Coupling

```spw
<>["Alice", "Bob"]              # Two-party relationship
<>[@source, @destination]       # Reference coupling
<>["A", "B", "C"]               # Multi-party entanglement
```

### 1.2 Coupling Semantics

Coupled elements are bound such that operations on one may affect others. The coupling creates a relationship that persists within the enclosing scope.

```spw
<>[@request, @response]         # Paired exchange
^["result"]: @response          # Response is bound to request
```

### 1.3 Nested Coupling

```spw
<>[
  <>["parent", "child"],
  <>["sibling_1", "sibling_2"]
]
# Two pairs, themselves related
```

### 1.4 Domain Interpretations

| Domain | Interpretation |
|--------|----------------|
| Cognitive@ | Memory association, conceptual binding |
| Hardware@ | Wire bond, electrical connection |
| Theatre@ | Character relationship, dramatic coupling |
| Broadcast@ | Simulcast link, synchronized channels |

---

## 2. Parentheses — Scope

Parentheses create isolated evaluation contexts. Bindings made inside do not leak outward.

### 2.1 Anonymous Scope

```spw
(
  ^["local"]: 42
  ![@local]                     # Valid: in scope
)
![@local]                       # Error: out of scope
```

### 2.2 Named Scope

```spw
(setup:
  ^["config"]: @load["settings"]
  =["ready": true]
)

(main:
  ?[@ready]{
    @run[@config]
  }
)
```

### 2.3 Lexical Scoping

Inner scopes see outer bindings. Outer scopes cannot see inner bindings.

```spw
^["outer"]: 1

(level_1:
  ^["inner"]: 2
  ![@outer]                     # Valid: sees parent
  ![@inner]                     # Valid: local
  
  (level_2:
    ![@outer]                   # Valid: sees grandparent
    ![@inner]                   # Valid: sees parent
  )
)

![@outer]                       # Valid: still visible
![@inner]                       # Error: not visible
```

### 2.4 Grouping

Parentheses establish evaluation order without creating scope when used inline:

```spw
A .. B | C                      # Parses as (A .. B) | C
A .. (B | C)                    # Explicit grouping changes meaning
```

### 2.5 Domain Interpretations

| Domain | Interpretation |
|--------|----------------|
| Cognitive@ | Attention boundary, working memory slot |
| Hardware@ | Module encapsulation, chip boundary |
| Theatre@ | Scene boundary, staging unit |
| Broadcast@ | Segment boundary, program unit |

---

## 3. Brackets — Frame

Brackets specify content, parameters, and addressing. They establish what is being operated on.

### 3.1 Content Specification

```spw
!["literal string"]             # Literal content
^["identifier"]                 # Literal identifier
~["pattern": 5]                 # Parameterized content
?["condition"]                  # Condition specification
```

### 3.2 Reference vs Literal

Quotes distinguish literals from references:

```spw
!["message"]                    # Literal: the string "message"
![message]                      # Reference: value bound to 'message'

^["name"]                       # Literal: identifier is "name"
^[name]                         # Reference: identifier is value of 'name'
```

### 3.3 Parameters

Complex operations take structured parameters:

```spw
~["count": 5, "delay": 100]     # Multiple named parameters
^["point": [x, y, z]]           # Structured value
?[@value > @threshold]          # Expression as parameter
```

### 3.4 Mode Declaration

Brackets can establish processing mode:

```spw
[strict:]                       # Strict mode context
  !["must succeed"]

[json:]                         # JSON interpretation
  @data
```

### 3.5 Domain Interpretations

| Domain | Interpretation |
|--------|----------------|
| Cognitive@ | Retrieval cue, schema address |
| Hardware@ | Pin address, component parameter |
| Theatre@ | Character reference, prop specification |
| Broadcast@ | Channel address, signal parameter |

---

## 4. Braces — Body

Braces contain behavior—sequences of operations that execute together.

### 4.1 Block Bodies

```spw
^["process"]{
  !["initialize"]
  .. !["execute"]
  .. !["finalize"]
  .. @out
}
```

### 4.2 Conditional Bodies

Each branch has its own body:

```spw
?[@condition]{
  !boon["success"]
  @continue
| !bane["failure"]
  @retry
}
```

### 4.3 Iteration Bodies

```spw
~["repeat": 3]{
  ![@iteration]
  .. @checkpoint
}
```

### 4.4 Definition Bodies

Bodies define behavior for named elements:

```spw
^["counter"]{
  #state{ value: 0 }
  
  ^["increment"]{
    @state.value += 1
  }
  
  ^["reset"]{
    @state.value = 0
  }
}
```

### 4.5 Empty Bodies

Empty braces are valid, representing no-op:

```spw
^["placeholder"]{}

?[rare_condition]{
  @special_handling
| {}                            # Explicit no-op
}
```

### 4.6 Domain Interpretations

| Domain | Interpretation |
|--------|----------------|
| Cognitive@ | Processing sequence, mental operation |
| Hardware@ | Circuit behavior, signal flow |
| Theatre@ | Stage direction, action sequence |
| Broadcast@ | Processing chain, routing logic |

---

## 5. Quote Semantics

Quotes within containers establish literal boundaries.

### 5.1 Quote Types

Single and double quotes are semantically equivalent:

```spw
!["double quoted"]
!['single quoted']
```

### 5.2 Escaping

Quotes within strings are escaped or alternated:

```spw
!["She said \"hello\""]         # Escape with backslash
!['She said "hello"']           # Alternate quote types
!["It's fine"]                  # Opposite quote unescaped
```

### 5.3 Empty Strings vs Empty Frames

```spw
![""]                           # Empty string literal
![]                             # Empty frame (no content)
```

These are distinct: empty string is a value; empty frame is absence of content.

### 5.4 Multiline Strings

In block geometry, strings can span lines when properly quoted:

```spw.b
!["This is a
    multiline string"]
```

---

## 6. Container Interaction

### 6.1 Composition Patterns

Containers compose to create rich structures:

```spw
(scope:                         # Where
  <>[@a, @b]                    # Who relates
  ^["process"]{                 # How
    ?[@a > @b]{                 # What condition
      !boon[@a]
    | !boon[@b]
    }
  }
)
```

### 6.2 Nesting Rules

All container types can nest within each other:

- Scopes can contain any containers
- Frames typically contain values and references
- Bodies contain operation sequences
- Couples contain elements (values or references)

### 6.3 Matching

Containers match by balanced pairs, innermost to outermost. Mismatched containers are parse errors:

```spw
(valid: [content]{body})        # Properly nested
(invalid: [content)}            # Error: mismatched
```

---

## 7. Summary

The four containers create a complete structural vocabulary:

| Container | Creates | Contains | Establishes |
|-----------|---------|----------|-------------|
| `<>` | Entanglement | Related elements | Relationships |
| `()` | Isolation | Scoped expressions | Boundaries |
| `[]` | Specification | Content, parameters | Addressing |
| `{}` | Behavior | Operation sequences | Process |

The canonical pattern:

```spw
(where:
  <>["who", "whom"]
  operator["what"]{
    # how
  }
)
```
