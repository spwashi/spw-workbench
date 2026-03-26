# OPERATORS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha operator semantics — expanded with worked examples.

## Operator Table

12 sigils, each with a single semantic role:

| Sigil | Name | Role | Physics | Spirit Phase | Layer |
|:---:|:--|:--|:--|:---:|:--|
| `?` | probe | inspect, select, evaluate | measurement onset | 1 | grammar |
| `~` | potential | defer, name, superpose | wavefunction | 2 | grammar |
| `@` | perspective | root scope, observer point | observation | 3 | grammar |
| `&` | confluence | merge, combine frames | entanglement | 4 | grammar |
| `*` | value | collapse to concrete | collapse | 5 | grammar |
| `^` | integration | bind upward, emit | emission | 6 | grammar |
| `!` | action | fire effect, inject | kinetic | 0 | grammar |
| `=` | config | constrain, bias state | forcing | binding | grammar |
| `%` | measure | quantify, observe depth | scalar | observe | grammar |
| `#` | annotation | self-reference, resonance | vibration | meta | grammar |
| `.` | ground | access, intrinsic state | ground state | access | grammar |
| `$` | substrate | introspection, meta-access | substrate | meta | grammar |

## v0.2.0 Contract Stub

Operators encode transformation intent and must preserve parseability and traceability:
- Operator sigil identity and token stability
- Composition order rules (left-to-right unless explicitly grouped)
- Clear error signaling when operator arity/context is invalid

## Accessor Polarity (Emerging v0.2 Model)

- `#` is the **extrinsic** property accessor (environmental/contextual surface).
- `.` is the **intrinsic** property accessor (internal/structural surface).

Directional suffix proposals:
- `expr#` biases toward **projection** (emit/select outward-facing view).
- `expr.` biases toward **reduction** (collapse/select inward-facing structure).

## Worked Examples

### 1. Probe + Scope — questioning a concept

```spw
?(observer, "what is the current selection?")
```

**Token stream:** `OPERATOR(?)` → `CONTAINER_OPEN(()` → `IDENTIFIER(observer)` → `COMMA` → `STRING("what is the current selection?")` → `CONTAINER_CLOSE())`

**AST:** `OperatorNode { sigil: '?', operand: ScopeNode { sequence: [IdentifierNode, LiteralNode] } }`

**Meaning:** The `?` operator *probes* the scope — it selects, inspects, or evaluates the content without collapsing it.

### 2. Potential + Annotation — deferring intent

```spw
~#goal: "Cache expensive selector resolution."
```

**Token stream:** `OPERATOR(~)` → `OPERATOR(#)` → `IDENTIFIER(goal)` → `COLON` → `STRING("Cache expensive selector resolution.")`

**AST:** `OperatorNode { sigil: '~', operand: AnnotationNode { kind: 'plain', name: 'goal', value: LiteralNode } }`

**Meaning:** `~` holds potential — the annotation is *named and addressable* but not yet materialized. `#` marks it as an annotation (extrinsic metadata).

### 3. Perspective + Reference — entering a scope

```spw
@biome/ocean/algos/cache.spw
```

**Token stream:** `OPERATOR(@)` → `IDENTIFIER(biome/ocean/algos/cache.spw)`

**AST:** `ReferenceNode { sigil: '@', path: 'biome/ocean/algos/cache.spw' }`

**Meaning:** `@` declares a *perspective root* — a named anchor from which paths resolve. Cross-tree references use `@roots` to avoid fragile relative paths.

### 4. Integration + Frame — emitting a named structure

```spw
^seed[Workbench.Mount.V01 v:0.1 @profile:Spw.m]{
  ~#intent: "mount .spw as canon root"
}
```

**Token stream:** `OPERATOR(^)` → `IDENTIFIER(seed)` → `CONTAINER_OPEN([)` → `IDENTIFIER(Workbench.Mount.V01)` → `...` → `CONTAINER_CLOSE(])` → `CONTAINER_OPEN({)` → `...` → `CONTAINER_CLOSE(})`

**AST:** `OperatorNode { sigil: '^', operand: IntegrationNode { label: 'seed', frame: FrameNode {...}, body: BodyNode {...} } }`

**Meaning:** `^` *integrates* — it binds upward, emitting a named structure into the enclosing scope.

## Counter-Examples

### ❌ Operator overloading

```spw
# BAD: using ? for both probe and conditional
?condition { true_branch } | { false_branch }
```

Spw operators have **one role**. `?` is always probe/wonder — never ternary conditional. Profile-specific reinterpretation is possible only through explicit domain binding.

### ❌ Implicit operator inference

```spw
# BAD: omitting operator assumes default
goal: "do something"
```

Without an explicit operator prefix, this is raw content — not a semantic action. Operators must be explicit. The parser will treat bare `identifier: value` as a key-value pair, not an operator application.

## Invariants

- Operator tokens map to stable sigils across profiles.
- Operator evaluation order is explicit or derivable from grouping.
- Unknown operators fail with actionable diagnostics.
- Each operator has exactly one semantic role — no overloading.

## Implementation Hooks

- Token types and operator values: `src/seed/types/token.ts`
- Lexer operator matching: `src/seed/lexer/matchers/operators.ts`
- Parse-expression composition: `src/seed/parser/parse-expression.ts`
- Operator semantics table: `extensions/vscode-spw/src/semantics.ts`

## Open Questions

- Should v0.2.0 lock operator precedence classes or keep profile-driven precedence?
- Which legacy forms remain accepted under compatibility mode?
- Should suffix `#` and suffix `.` be first-class syntax or desugar to explicit projection/reduction forms?
- What is the cleanest L/R symmetric selector grammar so projections/reductions feel equivalent across brace directions?
