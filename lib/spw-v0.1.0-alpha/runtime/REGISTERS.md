# Register Architecture

Version: 0.1.0-alpha
Status: Specified (Level 3)

---

## Overview

Spw evaluation uses a register-based architecture. Registers hold state during expression evaluation, enabling operators to communicate and accumulate results.

---

## Register Set

### Core Registers

| Register | Name | Purpose |
|----------|------|---------|
| R0 | Accumulator | Current evaluation result |
| R^ | Binding | Name-value associations |
| R@ | Emission | Output buffer |

### Extended Registers

| Register | Name | Purpose |
|----------|------|---------|
| R! | Injection | Injection history |
| R~ | Oscillation | Iteration state |
| R<> | Coupling | Entanglement graph |
| R? | Probe | Query results |
| R* | Branch | Decision trace |
| R= | Bias | Active constraints |
| R# | Reflection | Reified essences (v0.2.0) |
| R. | Access | Current traversal path |

---

## Register Operations

### Read

```spw
@value                  # Read from R^["value"]
```

### Write

```spw
^["name"]: value        # Write to R^["name"]
```

### Accumulator Flow

```spw
!["content"]            # R0 ← "content"
.. ^["saved"]           # R^["saved"] ← R0
.. @out                 # R@ ← R0
```

---

## Operator-Register Mapping

Each operator has primary register affinity:

| Operator | Primary | Secondary |
|----------|---------|-----------|
| `!` | R0, R! | R@ (in emit context) |
| `^` | R^ | R. (path update) |
| `~` | R~ | R! (per cycle) |
| `<>` | R<> | R^ (named couples) |
| `?` | R? | R* (branch inform) |
| `*` | R* | R? (consume condition) |
| `=` | R= | R^ (lock entries) |
| `@` | R@ | R0 (consume) |

---

## Evaluation Model

### Single Expression

```spw
!["hello"]
```

1. Parse to operation: `inject["hello"]`
2. Evaluate content: `"hello"`
3. Write R0 ← `"hello"`
4. Write R! ← push(`"hello"`)

### Sequence

```spw
!["a"] .. !["b"] .. @out
```

1. Evaluate `!["a"]` → R0 = "a"
2. Sequence connector: continue
3. Evaluate `!["b"]` → R0 = "b"
4. Sequence connector: continue
5. Evaluate `@out` → R@ = R0 = "b"

### Alternative

```spw
?[condition]{ !["yes"] | !["no"] }
```

1. Evaluate `?[condition]` → R? = result
2. If R? truthy: evaluate `!["yes"]`
3. Else: evaluate `!["no"]`

### Parallel

```spw
!["a"] & !["b"]
```

1. Evaluate `!["a"]` → result_a
2. Evaluate `!["b"]` → result_b
3. R0 ← [result_a, result_b]

---

## Scoping and Registers

Each scope has its own R^ binding table. Scopes inherit parent bindings but cannot modify them.

```spw
^["outer"]: 1           # R^["outer"] = 1 (global)

(inner:
  ^["inner"]: 2         # R^["inner"] = 2 (local)
  ![@outer]             # Read parent R^
  ![@inner]             # Read local R^
)

![@outer]               # Valid: global R^
![@inner]               # Error: not in scope
```

---

## Register Persistence

| Register | Persistence | Reset |
|----------|-------------|-------|
| R0 | Transient | Each operation |
| R^ | Scope | Scope exit |
| R@ | Buffered | Explicit flush |
| R! | Document | Document end |
| R~ | Cycle | Iteration reset |
| R<> | Document | Document end |
| R? | Expression | Expression end |
| R* | Trace | Debug only |
| R= | Document | Document end |

---

## Conformance

| Level | Required Registers |
|-------|-------------------|
| 1 | None (no evaluation) |
| 2 | R0, R^, R@ |
| 3 | All core + extended |

Level 2 implementations may treat extended registers as no-ops or errors.

---

## Future: Argument Registers

Reserved for v0.2.0 currying support:

| Register | Purpose |
|----------|---------|
| R1 | First argument |
| R2 | Second argument |
| R3 | Third argument |
| R4 | Fourth argument |

Placeholder `_` binds to next available Rn.
