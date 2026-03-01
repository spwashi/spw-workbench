# Conformance Levels

Version: 0.1.0-alpha
Status: Normative

---

## Overview

Spw defines three conformance levels enabling incremental implementation. Each level builds on the previous, adding capabilities while maintaining compatibility.

| Level | Name | Capability |
|-------|------|------------|
| 1 | Parser | Syntactic validation |
| 2 | Evaluator | Semantic execution |
| 3 | Full | Complete feature set |

---

## Level 1: Parser

A Level 1 implementation validates syntax without evaluating semantics.

### Requirements

**MUST:**
- Accept all valid v0.1.0 syntax
- Accept reserved syntax (reflection, placeholders)
- Produce unambiguous parse trees
- Reject malformed expressions with error messages
- Report error location (line, column)

**SHOULD:**
- Provide AST output for tooling
- Support all three geometry formats (linear, block, index)

**MAY:**
- Implement syntax highlighting
- Provide formatting utilities

### Validation Tests

```spw
# Must parse successfully
!["hello"]
^["name"]{![@value]..@out}
?[x>0]{!boon["positive"]|!bane["negative"]}
~["iterate":5]{![@i]}
<>["A","B"]
(scope:!["isolated"])
!boon.honk["emphasized"]

# Must reject with error
![unclosed
{mismatched)
!["unterminated
!!!["triple operator"]
```

---

## Level 2: Evaluator

A Level 2 implementation executes Spw semantics on the core language.

### Requirements

**MUST (all Level 1 requirements plus):**
- Evaluate all eight operators
- Evaluate all five modifiers
- Evaluate modifier chains (2 max)
- Evaluate all three connectors
- Evaluate all four containers
- Implement lexical scoping
- Implement reference resolution

**MUST (for reserved syntax):**
- Treat `X#` reflection as identity (return X unchanged)
- Error on `_` placeholders: "currying deferred to v0.2.0"

**SHOULD:**
- Implement standard output emission (@out)
- Provide debugging/tracing capability
- Support block geometry evaluation

**MAY:**
- Implement dialects (Spw.p, Spw.q, Spw.t)
- Implement domain projection

### Evaluation Tests

```spw
# Binding and reference
^["x"]: 42
![@x]                           # Must emit 42

# Conditional
?[true]{!["yes"]|!["no"]}       # Must emit "yes"

# Iteration
~["count":3]{!["tick"]}         # Must emit "tick" three times

# Scoping
(inner: ^["local"]: 1)
![@local]                       # Must error: not in scope

# Modifier chain
!boon.honk["important"]         # Must evaluate with combined valence

# Reserved syntax
!#                              # Must return ! unchanged (identity)
```

---

## Level 3: Full

A Level 3 implementation supports the complete v0.1.0 feature set including optional extensions.

### Requirements

**MUST (all Level 2 requirements plus):**
- Support all geometry dialects
- Support all functional dialects
- Implement modifier inference
- Implement register architecture
- Provide conformance self-report

**SHOULD:**
- Support domain projection for reference domains
- Implement Taste@ evaluation
- Support content-addressed references

**MAY:**
- Implement reflection semantics (preview)
- Implement currying semantics (preview)
- Support custom domains

### Extension Tests

```spw
# Geometry conversion
^["seed"]{!["content"]}         # Block form
# Must convert to:
^["seed"]{!["content"]}         # Linear form (canonical)

# Domain projection
Hardware@{^["circuit"]{...}}    # Must accept domain prefix

# Modifier inference
!positive["good"]               # Must infer boon modifier
!warning["caution"]             # Must infer bane modifier

# Register access
^["value"]: 42                  # Must store in R^
![@value]                       # Must load from R^
```

---

## Conformance Matrix

| Feature | L1 | L2 | L3 |
|---------|:--:|:--:|:--:|
| Parse 8 operators | ✓ | ✓ | ✓ |
| Parse 5 modifiers | ✓ | ✓ | ✓ |
| Parse 3 connectors | ✓ | ✓ | ✓ |
| Parse 4 containers | ✓ | ✓ | ✓ |
| Parse reserved syntax | ✓ | ✓ | ✓ |
| Evaluate operators | — | ✓ | ✓ |
| Evaluate modifiers | — | ✓ | ✓ |
| Evaluate modifier chains | — | ✓ | ✓ |
| Evaluate connectors | — | ✓ | ✓ |
| Evaluate containers | — | ✓ | ✓ |
| Reflection (identity) | — | ✓ | ✓ |
| Reflection (semantics) | — | — | preview |
| Currying | — | error | preview |
| Geometry dialects | opt | opt | ✓ |
| Functional dialects | — | opt | ✓ |
| Domain projection | — | — | opt |
| Modifier inference | — | — | ✓ |
| Register architecture | — | — | ✓ |
| Taste@ evaluation | — | — | opt |

Legend: ✓ required, opt optional, — not applicable, preview experimental

---

## Conformance Declaration

Implementations **SHOULD** declare their conformance level:

```
Spw-Conformance: Level 2
Spw-Version: 0.1.0-alpha
Spw-Extensions: geometry, domains
```

---

## Test Suites

Reference test suites will be provided for each level:

| Suite | Tests | Purpose |
|-------|-------|---------|
| `parse-valid.spw` | Valid syntax examples | Must parse without error |
| `parse-invalid.spw` | Invalid syntax examples | Must reject with error |
| `eval-core.spw` | Core evaluation | Must produce expected results |
| `eval-scope.spw` | Scoping tests | Must respect lexical scope |
| `eval-reserved.spw` | Reserved syntax | Must handle gracefully |
| `full-dialects.spw` | Dialect tests | For Level 3 |
| `full-domains.spw` | Domain tests | For Level 3 |

---

## Upgrading

Implementations can upgrade conformance levels incrementally:

**L1 → L2:** Add evaluation engine. Key work: operator semantics, scope management, reference resolution.

**L2 → L3:** Add dialect support and register architecture. Key work: geometry conversion, modifier inference, domain projection.

Upgrading does not require breaking changes to existing functionality.
