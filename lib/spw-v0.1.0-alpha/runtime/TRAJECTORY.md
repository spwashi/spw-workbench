# Development Trajectory

Version: 0.1.0-alpha
Purpose: Roadmap and deferred features

---

## Version Timeline

| Version | Target | Focus |
|---------|--------|-------|
| 0.1.0-alpha | 2026-01 | Core specification review |
| 0.1.0 | 2026-Q1 | Stable core, conformance tests |
| 0.2.0 | 2026-Q2 | Reflection, currying |
| 0.3.0 | 2026-Q3 | Types, advanced domains |
| 1.0.0 | 2026-Q4 | Stable API, full specification |

---

## v0.1.0 Scope

### Locked

- 8 operators, 5 modifiers, 3 connectors, 4 containers
- Modifier chaining (max 2)
- Lexical scoping
- Core evaluation semantics
- Three conformance levels

### Optional

- Geometry dialects (Spw.l, Spw.b, Spw.x)
- Functional dialects (Spw.p, Spw.q, Spw.t)
- Domain projection
- Modifier inference
- Taste@ evaluation

### Deferred

- Reflection semantics
- Currying semantics
- Type annotations
- Transition operators

---

## v0.2.0 Planned Features

### Reflection

The `X#` operator extracts operator essence as a first-class value.

```spw
!#                      # Essence of inject
^["f"]: !#              # Store operator
@f["content"]           # Apply stored operator
```

**Semantics:**
- `X#` returns callable representing operator X
- Essence can be stored, passed, applied
- Application: `@essence[args]` equivalent to `X[args]`

### Operator Composition

The `X#Y` notation composes operators.

```spw
!#^                     # inject-then-tap
@(!#^)["value"]         # Apply composed operator
```

**Semantics:**
- `X#Y` creates operator that applies X then Y
- Result is new operator, not expression
- Composition is associative

### Currying

Placeholders `_` create partial application.

```spw
^["add"]: !["a", _, "c"]    # Partial with hole
@add["b"]                    # Fill hole → !["a", "b", "c"]
```

**Semantics:**
- `_` marks unfilled argument position
- Partial application returns new callable
- Arguments fill left-to-right
- Named placeholders: `_name`

---

## v0.3.0 Planned Features

### Type Annotations

The `::` operator declares types.

```spw
^["count"]:: number
^["name"]:: string
^["handler"]:: (event) -> response
```

**Semantics:**
- Types are checked at evaluation time
- Type errors are recoverable
- Gradual typing: unannotated values are `any`

### Advanced Domains

- Custom domain registration
- Domain composition
- Cross-domain type mapping
- Domain-specific optimizations

---

## v1.0.0 Goals

- Complete specification with no "deferred" features
- Stable API: no breaking changes in 1.x
- Reference implementations in 3+ languages
- Comprehensive test suites
- Formal semantics document

---

## Design Principles

### Stability

Once locked, features do not change. New features are additive.

### Syntax First

Reserve syntax early for forward compatibility. Semantics can be added later without breaking parsers.

### Graceful Degradation

Implementations can support subsets. Unknown features should produce meaningful errors, not crashes.

### Domain Independence

Core language is independent of interpretation. Domains are projections, not requirements.

---

## Migration Notes

### 0.1.0-alpha → 0.1.0

- No syntax changes
- Conformance test suite added
- Edge cases clarified

### 0.1.0 → 0.2.0

- Reflection syntax becomes semantic
- Currying syntax becomes semantic
- New: composed operators
- Migration: seeds using `X#` as identity will now evaluate

### 0.2.0 → 0.3.0

- Type annotations become semantic
- New: domain composition
- Migration: unannotated code unchanged

### 0.3.0 → 1.0.0

- API stability lock
- Complete specification
- Migration: no changes, just stabilization

---

## Contributing

### Feedback Channels

- GitHub issues for specification questions
- Pull requests for documentation
- Discussions for design proposals

### Proposal Process

1. Open discussion with use case
2. Draft specification change
3. Review period (2 weeks minimum)
4. Consensus or author decision
5. Merge and document

### Test Contributions

- Parse tests: valid and invalid syntax
- Evaluation tests: expected outputs
- Conformance tests: level-specific requirements
