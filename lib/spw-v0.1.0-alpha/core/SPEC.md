# Spw Core Specification

Version: 0.1.0-alpha
Status: Locked (primitives closed)

---

## 1. Notation Conventions

This specification uses the following conventions:

- `monospace` denotes literal syntax
- *italics* denotes semantic concepts
- **bold** denotes normative requirements
- "MUST", "SHOULD", "MAY" follow RFC 2119 semantics

---

## 1.5 Semantic Space

**Formal Notation**: Spw operates over a 3D semantic manifold:

```
S = [0, 1]³  where s = (i, p, c)

i = intensity    — magnitude of semantic presence
p = proximity    — closeness to reference point
c = clarity      — degree of semantic resolution
```

All operators transform points on this manifold via deterministic rules, independent of syntax. The syntax (frames, bodies, modifiers) specifies *parameters* to these transformations, but the transformations themselves are purely semantic.

**Dual Calculus Interpretation**: This manifold represents the **complete semantic field** available to a seed at any moment. Operators define *trajectories* through this field; containers create *local frames* within it; lenses project the field onto different observer perspectives; and probes *collapse* the field to specific points.

---

## 2. Lexical Structure

### 2.1 Characters

Spw source text is UTF-8 encoded. The following ASCII characters have syntactic significance:

```
Operators:    ! ^ ~ < > ? * = @ #
Containers:   ( ) [ ] { }
Connectors:   . |  &
Modifiers:    (keywords: bone, boon, bane, bonk, honk)
Quotes:       " '
Whitespace:   space, tab, newline, carriage return
```

All other characters are permitted in quoted content and identifiers.

### 2.2 Tokens

```ebnf
token      ::= operator | modifier | connector | container | literal | identifier | annotation
operator   ::= "!" | "^" | "~" | "<>" | "?" | "*" | "=" | "@"
modifier   ::= "bone" | "boon" | "bane" | "bonk" | "honk"
connector  ::= ".." | "|" | "&"
container  ::= "(" | ")" | "[" | "]" | "{" | "}"
literal    ::= string | number
string     ::= '"' char* '"' | "'" char* "'"
number     ::= digit+ ("." digit+)?
identifier ::= (letter | "_") (letter | digit | "_" | ".")*
annotation ::= "#" identifier
```

### 2.3 Whitespace

In block geometry (Spw.b), whitespace is significant: indentation indicates nesting depth, and line breaks create implicit sequence. In linear geometry (Spw.l), whitespace is insignificant beyond token separation.

### 2.4 Comments

Line comments begin with `//` and extend to end of line. Block comments are enclosed in `/* */`. Comments are stripped during parsing.

```spw
// Line comment
/* Block comment */
```

---

## 3. Operators

Spw has exactly nine operators, each denoted by a sigil. This set is closed; no new operators will be added in future versions.

### 3.1 Operator Table

| Sigil | Name | Arity | Function |
|-------|------|-------|----------|
| `!` | inject | unary | Introduce content into flow |
| `^` | tap | unary | Establish named anchor |
| `~` | wave | unary | Create iterative rhythm |
| `<>` | couple | binary+ | Form relationship between elements |
| `?` | probe | unary | Evaluate condition |
| `*` | branch | n-ary | Select among alternatives |
| `=` | bias | unary | Fix constraint or parameter |
| `@` | emit | unary | Output or transmit result |
| `#` | reflect | unary | Annotate, reify operator essence, create metadata |

### 3.2 Operator Grammar

```ebnf
operation  ::= head frame? body?
head       ::= modifier_chain? operator
modifier_chain ::= modifier ("." modifier)?
frame      ::= "[" content "]"
body       ::= "{" sequence "}"
content    ::= literal | reference | parameters
parameters ::= param ("," param)*
param      ::= (identifier ":")? value
reference  ::= "@" path
path       ::= identifier ("." identifier)*
```

### 3.3 Operators as Register Transformations

**Formal Notation**: Each operator manipulates a set of semantic and lexical registers, composing deterministically through a normal form. See **OPERATOR-ALGEBRA.md** for complete formalization.

Core model:

```
Semantic registers:   σ (saturation), ρ (resonance), ψ (phase), μ (polarity), β (bindings)
Lexical registers:    #! (inject count), #^ (tap count), #~ (wave phase), etc.

Each operator updates these registers deterministically:
  op: (registers, context) → registers'
```

**Register-Based Composition**: Operators compose via sequential register updates. The normal form is canonical—all equivalent expressions reduce to the same register sequence.

**Dimension Coupling**: The semantic manifold `s = (i, p, c)` has non-linear interactions:
```
Δi_actual = Δi + c_ic * Δc + c_ip * Δp   (intensity couples with clarity and proximity)
Δp_actual = Δp + c_pi * Δi + c_pc * Δc   (proximity couples with intensity and clarity)
Δc_actual = Δc + c_ci * Δi + c_cp * Δp   (clarity couples with intensity and proximity)
```

The transformation is **register-independent of syntax**. Syntax provides parameters; the registers capture what actually happens.

**Examples**:

| Operator | Transformation | Intuition |
|----------|---|---|
| `!(f)` | Increases intensity: `i_{t+1} = clamp(i_t + Δi)` | Content enters the field |
| `^["anchor"]` | Creates binding reference (clarity↑): `c_{t+1} = 1.0` | Anchors suspend meaning at current point |
| `~[n]{body}` | Oscillating trajectory (n iterations): `s_t → s_t → ... → s_t` repeated | Creates resonant pattern |
| `?[cond]` | Bifurcating field: `s → s_true \| s_false` | Condition splits the manifold |
| `*[@sel]{...}` | Deterministic selection among alternatives | Collapses to chosen branch |

---

### 3.3.5 Operator Families & Algebras

Not all operators follow the same mathematical structure. See **OPERATOR-ALGEBRA.md § 5** for details:

- **Affine Family** (`!`, `^`, `@`): Linear transformations with offsets
- **Conditional Family** (`?`, `*`): Lattice algebra with bifurcation
- **Relational Family** (`<>`): Group theory with symmetric relations
- **Iterative Family** (`~`): Recurrence relations with damping
- **Constraint Family** (`=`): Order theory with monotonic strengthening
- **Reflection Family** (`#`): Meta-level annotation

### 3.3.6 Composition Laws

**Theorem** (Associativity): `(A ∘ B) ∘ C = A ∘ (B ∘ C)`

**Theorem** (Identity): The no-op `{}` is the identity element.

**Theorem** (Closure): Composition of Spw operators produces effects reachable by finite operator sequences.

**Theorem** (Selective Commutativity): Some operator pairs commute (e.g., independent bindings), others don't (e.g., probes with inject).

See **OPERATOR-ALGEBRA.md § 5-6** for proofs and commutativity analysis.

---

### 3.4 Operator Semantics

**`!` (inject):** Introduces content into the evaluation flow. The content becomes the current value. With modifiers, inject also establishes valence.

```spw
!["message"]              # Inject literal
!boon["welcome"]          # Inject with positive valence
![@variable]              # Inject referenced value
```

**`^` (tap):** Creates a named binding in the current scope. The name persists for subsequent reference.

```spw
^["counter"]              # Establish anchor named "counter"
^["x"]: 42                # Bind value to name
^["config"]{...}          # Named block
```

**`~` (wave):** Creates iterative or oscillating behavior. The body executes repeatedly according to parameters.

```spw
~["repeat": 5]{...}       # Execute body 5 times
~[@items]{...}            # Iterate over items
~["forever"]{...}         # Unbounded iteration
```

**`<>` (couple):** Establishes relationship between two or more elements. Coupled elements share fate.

```spw
<>["A", "B"]              # Couple A and B
<>[@source, @sink]        # Couple references
```

**`?` (probe):** Evaluates a condition and branches based on result. Used with `|` to create conditional paths.

```spw
?[x > 0]{...}             # Conditional body
?[@condition]{            # Branching
  !["true branch"]
| !["false branch"]
}
```

**`*` (branch):** Explicitly selects among alternatives. Unlike `?`, selection may be non-boolean.

```spw
*[@selector]{             # Switch on selector
  case_a: !["A"]
| case_b: !["B"]
| default: !["other"]
}
```

**`=` (bias):** Fixes a constraint or parameter. Creates invariant that persists through subsequent operations.

```spw
=["mode": "strict"]       # Lock parameter
=[@threshold]             # Fix at current value
```

**`@` (emit):** Outputs or transmits the current value. Terminal operation in many flows.

```spw
@out                      # Emit to default output
@["destination"]          # Emit to named destination
@out["formatted"]         # Emit with format
```

---

## 4. Modifiers

Modifiers establish valence—the emotional or priority coloring of an operation. Every operation has a modifier, defaulting to `bone` (neutral) when unspecified.

### 4.1 Modifier Table

| Modifier | Valence | Semantics |
|----------|---------|-----------|
| `bone` | Neutral | Structural, matter-of-fact |
| `boon` | Positive | Approach, welcome, reward |
| `bane` | Negative | Warning, threat, avoidance |
| `bonk` | Spike | Sudden, interrupt, attention |
| `honk` | Salient | Emphatic, important, priority |

### 4.2 Modifier Position

Modifiers appear between the operator sigil and the frame:

```spw
!boon["welcome"]          # Operator + modifier + frame
^bone["anchor"]           # Explicit neutral
~honk["critical"]{...}    # Emphasized iteration
```

### 4.3 Modifier Chaining

In v0.1.0, up to two modifiers may be chained. The first modifier establishes primary valence; the second qualifies it.

```ebnf
modifier_chain ::= modifier ("." modifier)?
```

**Permitted chains:**

| Chain | Semantics |
|-------|-----------|
| `boon.honk` | Celebrated (positive + salient) |
| `bane.honk` | Grave (negative + salient) |
| `boon.bane` | Ambivalent (mixed affect) |
| `bone.honk` | Marked (neutral + salient) |
| `bane.bonk` | Alarming (negative + spike) |
| `boon.bonk` | Euphoric (positive + spike) |

**Forbidden chains (parser error):**

| Chain | Reason |
|-------|--------|
| `bone.bonk` | Arousal without valence |
| `honk.bonk` | Redundant salience |

### 4.4 Default Modifier

Operations without explicit modifier default to `bone`:

```spw
!["message"]              # Equivalent to !bone["message"]
^["name"]                 # Equivalent to ^bone["name"]
```

---

## 5. Connectors

Connectors join operations into flows. Spw has exactly three connectors.

### 5.1 Connector Table

| Connector | Name | Semantics |
|-----------|------|-----------|
| `..` | sequence | Then: execute in order |
| `\|` | alternative | Or: choose one path |
| `&` | parallel | And: execute simultaneously |

### 5.2 Connector Precedence

From highest to lowest binding:

1. `..` (sequence) — tightest
2. `&` (parallel)
3. `|` (alternative) — loosest

Parentheses override precedence:

```spw
A .. B | C                # (A .. B) | C
A .. (B | C)              # A .. (B | C)
A & B | C                 # (A & B) | C
```

### 5.3 Connector Semantics

**`..` (sequence):** The left operand completes before the right operand begins. The result of the left operand is available to the right.

```spw
!["first"] .. !["second"] .. @out
```

**`|` (alternative):** Exactly one branch executes. Selection is determined by preceding `?` or `*` operations.

```spw
?[condition]{
  !["true"]
| !["false"]
}
```

**`&` (parallel):** All operands execute, conceptually simultaneously. Results are collected.

```spw
!["A"] & !["B"] & !["C"]  # All three execute
```

---

## 6. Containers

Spw has exactly four container types, each serving a distinct semantic function.

### 6.1 Container Table

| Delimiter | Name | Question | Dimension |
|-----------|------|----------|-----------|
| `<>` | couple | Who relates? | Relational |
| `()` | scope | Where exists? | Spatial |
| `[]` | frame | What addressed? | Referential |
| `{}` | body | How behaves? | Procedural |

### 6.2 Angle Brackets — Couple `<>`

Creates relational binding between elements.

```spw
<>["Alice", "Bob"]        # Couple two elements
<>[@x, @y, @z]            # Couple multiple references
```

### 6.3 Parentheses — Scope `()`

Creates isolated evaluation context. Bindings inside do not leak outward.

```spw
(                         # Anonymous scope
  ^["local"]: 42
  ![@local]               # Valid: in scope
)
![@local]                 # Error: out of scope

(named:                   # Named scope
  !["isolated work"]
)
```

### 6.4 Brackets — Frame `[]`

Specifies content, parameters, or addressing.

```spw
!["literal content"]      # Literal string
![@reference]             # Reference to binding
^["name": value]          # Named parameter
?[x > 0]                  # Condition expression
```

### 6.5 Braces — Body `{}`

Contains behavior—a sequence of operations.

```spw
^["seed"]{                # Block body
  !["first"]
  !["second"]
  @out
}

?[condition]{}            # Empty body (no-op)
```

### 6.6 Containers as Topological Boundaries

**Formal Notation**: Each container is a **boundary operator** on the semantic manifold. See **CONTAINER-TOPOLOGY.md** for complete formalization.

Core model:

```
Each container ∂C creates a boundary between interior and exterior:

{}  - Body boundary:      Enclosure boundary (creates subject space)
[]  - Frame boundary:     Referential boundary (addresses content)
()  - Scope boundary:     Spatial boundary (isolates local context)
<>  - Couple boundary:    Relational boundary (links elements)
```

**Semantic Frames**:

| Container | Name | Question | Polarity | Semantics |
|-----------|------|----------|----------|-----------|
| `[ ]` | frame | *What is addressed?* | Referential | Inward `[` / Outward `]` — directionality of reference |
| `{ }` | body | *How does it behave?* | Inward → Outward | Creates subject; inverts to object when binding resolves |
| `<>` | couple | *Who relates?* | Symmetric | Mutual binding with shared state |
| `( )` | scope | *Where does it exist?* | Spatial | Isolates bindings; prevents leakage |

**Subject-Object Duality** (See CONTAINER-TOPOLOGY.md § 6):

- **Subject Formation** `{ body }`: Initially inward (intensional), polarity inverts when external bindings resolve
- **Object Exposure** `[ ]`: Addresses external content, enabling object semantics
- **Relational Frame** `<>`: Binds elements symmetrically—both are co-determinants
- **Spatial Frame** `( )`: Creates barrier—bindings inside don't escape

**Polarity Inversion Rule** (See CONTAINER-TOPOLOGY.md § 5):

```
Given body B = { expr }:

IF unresolved_references(B) > 0:
  μ(B) = "in"  (subject: intensional, σ < 0.5)

IF unresolved_references(B) = 0:
  μ(B) = "out" (object: extensional, σ > 0.5)
```

---

### 6.8 Quote Semantics

Quotes within frames distinguish literals from references:

```spw
!["message"]              # Literal string "message"
![message]                # Reference to binding 'message'

^["name"]                 # Literal identifier
^[name]                   # Value of 'name' as identifier
```

Single and double quotes are equivalent for string literals. Nested quotes use alternating types or escaping:

```spw
!["She said \"hello\""]   # Escaped
!['She said "hello"']     # Alternating
```

---

## 7. Expressions

### 7.1 Expression Grammar

```ebnf
expression ::= term (connector term)*
term       ::= operation | scope | reference
operation  ::= head frame? body?
scope      ::= "(" identifier? ":" sequence ")"
reference  ::= "@" path
sequence   ::= expression*
```

### 7.2 Seed Structure

A complete Spw document is a *seed*. Every seed has a root expression.

```spw
^["seed_name"]{
  #meta{ version: "0.1.0" }
  
  # Body expressions
  !["content"]
  .. @out
}
```

### 7.3 Annotations

Annotations provide metadata. They begin with `#` and do not affect evaluation.

```spw
#version: "0.1.0"
#author: "spwashi"
#domain: Hardware@

^["annotated"]{
  #note: "This is metadata"
  !["content"]
}
```

---

## 8. Lenses and Multi-Representation

**Formal Notation**: Spw seeds can be observed through different *lenses*—morphisms that rescale the semantic manifold. See **LENS-ALGEBRA.md** for complete formalization.

Core model:

```
Each lens ℓ is a diagonal weighting matrix W_ℓ:

W_ℓ = [w_i   0    0 ]    (rescale intensity)
      [0    w_p   0 ]    (rescale proximity)
      [0     0   w_c]    (rescale clarity)

Lens application: s' = W_ℓ · s  (rescale semantic point)
```

**Semantic Isotopes**: The same seed evaluated through different lenses produces different *perceived meanings*—different orbits under lens group action.

```spw
^["greeting"]{ !["hello"] }
```

This seed has isotopes:
- **Compiler@**: High clarity (c≈1.5), low proximity (p≈0.6), balanced intensity
- **Designer@**: High intensity (i≈1.2), high proximity (p≈1.3), lower clarity
- **User@**: High intensity (i≈1.3), very high proximity (p≈1.5), high clarity
- **Critic@**: Downweighted intensity (i≈0.7), emphasized clarity (c≈1.4)

All interpretations are simultaneously valid. The lens determines *which trajectory is foregrounded*.

**Lens Group Structure** (See LENS-ALGEBRA.md § 4):

- **Composition**: `ℓ₁ ∘ ℓ₂ = W_{ℓ₁} · W_{ℓ₂}` (matrix multiplication)
- **Identity**: `id` with `W_id = I` (no rescaling)
- **Inverse**: `ℓ⁻¹` with `W_{ℓ⁻¹} = (W_ℓ)⁻¹`
- **Associativity**: `(ℓ₁ ∘ ℓ₂) ∘ ℓ₃ = ℓ₁ ∘ (ℓ₂ ∘ ℓ₃)`
- **Commutativity**: All lens pairs commute (diagonal matrices commute)

---

## 9. Probe Calculus and Semantic Collapse

**Formal Notation**: A probe `?` is a **measurement operator** that collapses the semantic field. See **PROBE-CALCULUS.md** for complete formalization.

Core model:

```
Probe as projection: π: S → S'  (collapse to subspace satisfying condition)

Measurement uncertainty: variance ∝ (1 - intensity)²
                        (low intensity = noisy measurement)

Saturation jump: Δσ = (1 - σ) * 0.3  (partial but significant collapse)
```

**Semantic Collapse Mechanism**:

1. **Latent Phase** (σ < 0.5): Full semantic field unresolved, multiple paths coexist (resonance)
2. **Probe Phase** (σ ≈ 0.5): Query forces bifurcation into true/false branches
3. **Resolution Phase** (σ > 0.5): One branch selected, field partially collapsed

**Saturation Continuum**:

```
σ = 0.0  Fully latent (infinite superposition, all meanings possible)
σ = 0.5  Resonant (standing wave pattern, multiple paths coexist stably)
σ = 1.0  Fully saturated (single path, no ambiguity)
```

**Example**:

```spw
^["config"]{
  ?[mode = "strict"] {
    =["level": "maximum"]
  | =["level": "default"]
  }
}

@[config]  # Probe at @config collapses based on mode
           # σ jumps from 0.2 → 0.5 (resonant) → 1.0 (saturated on emit)
```

### 9.1 Saturation and Semantic Isotopes

**Connection to Operational Physics**: The *saturation model* describes how much of the semantic field has collapsed into a specific lens trajectory.

```
Saturation Level:
  0.0 = Free probe (all lenses possible; field completely latent)
  0.5 = Resonant (polymorphic; multiple lenses coexist)
  1.0 = Saturated (single lens trajectory locked; no ambiguity)
```

**Semantic Isotopes**: The same syntax observed at different saturation levels reveals different meanings:

```spw
!boon["reward"]

Saturation 0.0:  Field uncollapsed; all lens interpretations available
                 (positive, resource, achievement, all simultaneously)

Saturation 0.5:  Resonant state; visual and semantic interpretations coexist
                 (visual: appears warm; semantic: positive valence)

Saturation 1.0:  Locked trajectory; single lens dominates
                 (locked to semantic meaning; visual context ignored)
```

**Dual Calculus Foundation**: Saturation IS the degree to which the observer has *collapsed* the semantic field through repeated probing and lens selection. Low saturation = high ambiguity; high saturation = high specificity.

---

## 10. Reserved Syntax

The following syntax is reserved for future versions:

| Syntax | Reserved For |
|--------|--------------|
| `X#` | Reflection (operator essence) |
| `X#Y` | Operator composition |
| `_` | Placeholder (currying) |
| `_name` | Named placeholder |
| `:=` | Assignment operator |
| `::` | Type annotation |

Parsers **MUST** accept this syntax as valid. Evaluators **SHOULD** treat reserved syntax as identity (pass-through) or error with "reserved for future version" message.

---

## 9. Normative Summary

This section summarizes normative requirements.

**Locked primitives (no additions):**
- 8 operators: `!`, `^`, `~`, `<>`, `?`, `*`, `=`, `@`
- 5 modifiers: `bone`, `boon`, `bane`, `bonk`, `honk`
- 3 connectors: `..`, `|`, `&`
- 4 containers: `<>`, `()`, `[]`, `{}`

**Parser requirements:**
- **MUST** accept all v0.1.0 syntax including reserved syntax
- **MUST** reject malformed expressions with meaningful errors
- **MUST** produce unambiguous parse trees

**Evaluator requirements:**
- **MUST** implement all eight operators
- **MUST** implement all five modifiers including chains
- **MUST** implement all three connectors
- **MUST** implement all four containers
- **SHOULD** treat reserved syntax as identity or error

---

## Appendix A: Formal Specification References

The following documents provide rigorous mathematical formalizations of Spw semantics:

### Phase 1: Operator Algebra
- **OPERATOR-ALGEBRA.md**: Register-based operator semantics, dimension coupling, normal form reduction, operator families (affine, lattice, group, recurrence, order)

### Phase 2: Lens & Probe Algebra
- **LENS-ALGEBRA.md**: Lenses as group morphisms, weighting matrices, semantic isotopes, multi-representation, commutativity
- **PROBE-CALCULUS.md**: Measurement theory, saturation continuum, resonance, cascading probes, measurement uncertainty

### Phase 3: Container Topology
- **CONTAINER-TOPOLOGY.md**: Containers as boundary operators, polarity inversion rule, subject-object duality, scope isolation, homological structure

### Phase 4: Runtime & Theory
- **RUNTIME-TRAJECTORY-MODEL.md** (forthcoming): Trajectory tracking, semantic state persistence, implementation design
- **SHEAF-SEMANTICS.md** (forthcoming): Sheaf formalism, generators as sections, cohomology, obstruction theory
- **PHYSICS-METAPHORS.md** (forthcoming): Photonic and materials science analogies

---

## Appendix B: Grammar Summary

```ebnf
(* Spw v0.1.0 Grammar *)

seed       ::= annotation* expression

expression ::= term (connector term)*
term       ::= operation | scope | reference
operation  ::= head frame? body?
head       ::= modifier_chain? operator
modifier_chain ::= modifier ("." modifier)?

operator   ::= "!" | "^" | "~" | "<>" | "?" | "*" | "=" | "@"
modifier   ::= "bone" | "boon" | "bane" | "bonk" | "honk"
connector  ::= ".." | "|" | "&"

scope      ::= "(" (identifier ":")? sequence ")"
frame      ::= "[" content "]"
body       ::= "{" sequence "}"
sequence   ::= expression*

content    ::= literal | reference | parameters | condition
parameters ::= param ("," param)*
param      ::= (identifier ":")? value
condition  ::= expression comparison expression
comparison ::= "==" | "!=" | "<" | ">" | "<=" | ">="

reference  ::= "@" path
path       ::= identifier ("." identifier)*

literal    ::= string | number | boolean
string     ::= '"' char* '"' | "'" char* "'"
number     ::= digit+ ("." digit+)?
boolean    ::= "true" | "false"

identifier ::= (letter | "_") (letter | digit | "_")*
annotation ::= "#" identifier (":" value)?

letter     ::= [a-zA-Z]
digit      ::= [0-9]
char       ::= (* any character except unescaped quote *)
```
