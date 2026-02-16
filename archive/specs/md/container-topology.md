# Container Topology: Boundaries, Polarity & Subject-Object Duality

**Version**: 0.1.0-alpha
**Status**: Research / Formalization Phase 3
**Authors**: Claude Code, spwashi

---

## 1. Overview

This document formalizes Spw containers as **topological boundaries** with directional flow. Each container type defines a distinct boundary operator on the semantic manifold. The formalism provides:

- **Containers as boundary operators** — formal `∂` algebra
- **Polarity** — inward vs. outward flow directions
- **Polarity inversion rule** — when flow reverses based on referential binding
- **Subject-Object duality** — bodies create subjects; binding resolves to objects
- **Homological structure** — nesting creates algebraic topology
- **Scope isolation** — spatial boundaries prevent binding leakage

---

## 2. Topological Foundations

### 2.1 Manifold with Boundaries

The semantic manifold `S = [0,1]³` is partitioned by containers:

```
S = interior(S) ∪ boundary(∂S) ∪ exterior(ext S)

Each container defines a boundary (∂C) that separates:
  - Interior: content controlled by the container
  - Boundary: interface/frame of the container
  - Exterior: the surrounding scope
```

### 2.2 Four Container Types as Boundary Operators

```
{} - Body boundary:      Enclosure boundary (creates subject space)
[] - Frame boundary:     Referential boundary (addresses content)
() - Scope boundary:     Spatial boundary (isolates local context)
<> - Couple boundary:    Relational boundary (links elements)
```

Each container is a **boundary operator** `∂`:

```
∂: C → ∂C

where C is the container content, ∂C is the boundary induced by C
```

### 2.3 Fundamental Property: Nilpotence

The boundary operator is **nilpotent**:

```
∂ ∘ ∂ = 0

Applying the boundary operator twice gives nothing.

Intuition: A boundary has no boundary (the edge of the edge is empty).
```

---

## 3. Individual Containers as Boundary Operators

### 3.1 Body `{}` — Enclosure Boundary

**Definition**: Creates a **subject formation boundary**.

```
{ body }  where body is a sequence of operators

Boundary effect: Encloses content, creating a self-contained agent.
```

**Semantic Role**:

```
Before body evaluates: State is subject-like (intensional).
                      The body itself is the semantic object.

After body evaluates:  If binding is resolved, state flips to object-like.
                      The body's result is now extensional.
```

**Register Update**:

```
Entering body: ρ ← ρ + 1  (resonance increases, creating subject space)
              μ ← "in"    (polarity set inward)
```

**Boundary Structure**:

```
∂body = {
  left_boundary: "{"   (open, look inward)
  right_boundary: "}"  (close, look outward if resolved)
  interior: body content
}
```

### 3.2 Frame `[]` — Referential Boundary

**Definition**: Creates a **reference boundary** pointing inward or outward.

```
[ frame_content ]  where content specifies addressing

Boundary effect: Establishes a referential relationship.
```

**Semantic Role**:

```
Default polarity: outward (pointing to content to be addressed)

Frame always specifies "what is being referred to."
Inward polarity: [ content ← ] (looking into content)
Outward polarity: [ → content ] (pointing to external target)
```

**Register Update**:

```
Entering frame: Polarity determined by content type
              If content is literal: → (outward)
              If content is reference: ← (inward lookup)
```

**Boundary Structure**:

```
∂frame = {
  left_boundary: "["    (addressing boundary)
  right_boundary: "]"   (closing addressing)
  interior: frame content (specifier)
}
```

### 3.3 Scope `()` — Spatial Boundary

**Definition**: Creates a **local evaluation region** with binding isolation.

```
( scope_body )  or  ( name: scope_body )

Boundary effect: Isolates bindings (scope exit = cleanup).
```

**Semantic Role**:

```
Bindings created inside () do not escape.
References to bindings outside () are not allowed.

This is a spatial boundary: prevents information leakage.
```

**Register Update**:

```
Entering scope:  Establish new binding frame (empty)
Exiting scope:   Discard all bindings created in this scope
```

**Boundary Structure**:

```
∂scope = {
  left_boundary: "("    (enter local region)
  right_boundary: ")"   (exit local region, cleanup)
  interior: local body
  bindings_frame: fresh map
}
```

### 3.4 Couple `<>` — Relational Boundary

**Definition**: Creates a **symmetric relationship boundary**.

```
<> [ element1, element2, ... ]

Boundary effect: Binds elements as mutual dependents.
```

**Semantic Role**:

```
Couples are symmetric: both elements are treated equally.
If one element's state changes, the other follows.

This creates a coupling boundary between elements.
```

**Register Update**:

```
#<> ← #<> + 1
Maintain synchronization between all coupled elements.
```

**Boundary Structure**:

```
∂couple = {
  left_boundary: "<"     (open coupling)
  right_boundary: ">"    (close coupling)
  interior: coupled elements
  coupling_field: shared semantic state
}
```

---

## 4. Polarity: Directional Flow

### 4.1 Polarity Definition

**Polarity** `μ` indicates the direction of semantic flow through a boundary:

```
μ ∈ {inward, outward}

Inward (μ = "in"):   Flow moves into the container (subject formation)
Outward (μ = "out"): Flow moves out of the container (object exposure)
```

### 4.2 Default Polarity by Container

```
{}  (Body):     Default inward (forming subject until binding resolves)
[]  (Frame):    Default outward (pointing to external content)
()  (Scope):    Inward for duration, outward on exit
<>  (Couple):   Neutral (symmetric)
```

### 4.3 Polarity as Flow Direction

In a body `{ expr }`:

```
Inward phase:  Content flows into the body
               Body accumulates structure (intensity, clarity)
               ρ increases (resonance—multiple paths)
               σ slowly increases (gradual saturation)

Outward phase: Content flows out of the body
               Body exposes its result
               ρ decreases (paths collapse)
               σ increases rapidly (saturation jump)
```

---

## 5. Polarity Inversion Rule

### 5.1 The Trigger: Referential Binding Resolution

**Rule**: When a body `{ expr }` contains a reference `@name` that gets resolved:

```
Polarity inverts: inward → outward

Trigger condition: hasExternalReferent(body_content)

where hasExternalReferent checks if:
  - The body contains @ref to external binding
  - That binding is in scope and resolved
```

### 5.2 Formal Statement

```
Given body B = { expr }:

If unresolved_references(B) > 0:
  μ(B) = "in"     (inward polarity, subject-like)
  Property: B is intensional (meaning depends on internal structure)

If unresolved_references(B) = 0:
  μ(B) = "out"    (outward polarity, object-like)
  Property: B is extensional (meaning depends on external values)
```

### 5.3 Semantic Consequence

**Inward** (`μ = "in"`):

```
The body is a *subject* — an agent with incomplete information.
Different observers (lenses) might see different meanings.
Saturation is low (σ < 0.5), field is latent.

Example:
  ^["box"]{ ?[x > 0] {!["yes"] | !["no"]} }

  The box contains a probe with unresolved condition.
  Box is subject-like (intensional).
```

**Outward** (`μ = "out"`):

```
The body is an *object* — a determined value.
All observers (lenses) agree on its meaning.
Saturation is high (σ > 0.5), field is crystallized.

Example:
  ^["result"]{ ![@value] }

  The box contains a reference to @value (resolved).
  Box is object-like (extensional).
```

### 5.4 Polarity Inversion Algorithm

```algorithm
function check_polarity_inversion(body):
  unresolved_refs = find_unresolved_references(body)

  if unresolved_refs.is_empty():
    return polarity_flip(body.current_polarity)
  else:
    return body.current_polarity

function polarity_flip(current_μ):
  if current_μ == "in":
    return "out"
  else:
    return "in"
```

---

## 6. Subject-Object Duality

### 6.1 Subject vs. Object in Spw

A **subject** is an agent with:
- Internal structure and agency
- Incomplete information (unresolved references)
- Multiple possible interpretations (high resonance)
- Intensional semantics (meaning depends on how it's described)

An **object** is a value with:
- Determined state (all references resolved)
- Single canonical interpretation (low resonance)
- Extensional semantics (meaning is what it is)

### 6.2 Bodies Create Subjects by Default

```spw
^["greeting"]{
  !["hello"] .. @out
}
```

This body initially acts as a **subject**:
- It's self-contained (subject space)
- It has internal behavior (@out is external reference)
- Its meaning depends on how @out is interpreted

### 6.3 Bodies Become Objects When Binding Resolves

```spw
^["greeting"]{
  !["hello"]    // No external reference
}

@[greeting]    // Probe the body
```

After the body is probed and fully evaluated:
- The body is now an **object** (resolved value)
- It has determined meaning ("hello")
- It behaves as a value, not an agent

### 6.4 Formal Duality

**Theorem (Subject-Object Duality)**:

```
For any body B:

In subject mode (μ = "in"):
  B represents an intensional function:
  B: (context, lens, saturation_level) → meaning

In object mode (μ = "out"):
  B represents an extensional value:
  B: ⟨value⟩  (pure data)

The transition B: function → value occurs via polarity inversion.
```

---

## 7. Homological Structure

### 7.1 Nesting Creates Chain Complexes

Container nesting creates a **chain complex** (ladder of topological structures):

```
{{{body}}}    (three nested bodies)

Chain:  ... → C_2(inner) → C_1(middle) → C_0(outer) → ...

where C_n is the n-th nesting level
```

### 7.2 Boundary Homomorphisms

Each boundary operator `∂` acts as a homomorphism:

```
∂: C_n → C_{n-1}

Example:
  ∂({expr}) = expr  (boundary of body is its content)
```

### 7.3 Exact Sequences

Container nesting creates **exact sequences**:

```
0 → C_2 →^∂ C_1 →^∂ C_0 → 0

Exactness means: Im(∂_{n+1}) = Ker(∂_n)

Semantic meaning: Nesting is consistent—no "broken" containers.
```

### 7.4 Homology Groups

For each nesting level, compute homology:

```
H_n = Ker(∂_n) / Im(∂_{n+1})

Semantic meaning: H_n captures "holes" at nesting level n.

Example:
  { { ... } }  (double nesting)

  H_1 ≠ 0  (one hole: the inner body itself)
  H_0 ≠ 0  (another hole: the middle region)
```

### 7.5 Different Homology by Container Type

Each container type has signature homology:

```
{}  (Body):         H_1 ≠ 0  (creates one hole—the subject space)
[]  (Frame):        H_0 ≠ 0  (creates reference point)
()  (Scope):        H_0 = 0  (no holes—isolates, doesn't create structure)
<>  (Couple):       H_1 ≠ 0  (creates linking structure)
```

---

## 8. Scope Isolation & Binding Containment

### 8.1 Scope as Barrier

Scopes create a **barrier** that prevents binding leakage:

```spw
(
  ^["local"]: 42
  ![@local]         // Valid: in scope
)
![@local]           // Error: out of scope
```

**Semantics**:

```
Bindings created inside () are local.
Exit from () scope → all local bindings deleted.
References to deleted bindings cause runtime error.
```

### 8.2 Lexical vs. Dynamic Scope

Spw uses **lexical scope**:

```
Binding resolution happens based on syntactic structure
(which scope the binding was declared in),
not runtime call stack.

Example:
  (^["x"]: 1) .. (^["x"]: 2) .. ![@x]

  Resolves to 2 (most recent lexical scope)
  Not 1 (earlier lexical scope)
```

### 8.3 Scope Hierarchy

Scopes nest, creating a **scope tree**:

```
Global scope
  └─ Function A scope
       └─ Inner scope 1
       └─ Inner scope 2
  └─ Function B scope
       └─ Inner scope 3
```

Reference resolution walks up the tree:

```
When resolving @x in Inner scope 1:
  Check Inner scope 1 → not found
  Check Function A scope → found!
  Return value from Function A scope
```

---

## 9. Frame Polarity & Addressing

### 9.1 Frame as Addressing Mechanism

Frames `[...]` specify **what is being addressed**:

```
![literal]        // Address literal content
![@reference]     // Address external reference
?[condition]      // Address condition expression
```

### 9.2 Inward vs. Outward Addressing

```
Inward frame (default for references):
  ![address ← lookup_value]

  The frame looks inward to resolve the reference.

Outward frame (default for emissions):
  @[address → external_destination]

  The frame points outward to the destination.
```

### 9.3 Frame Parameters

Frames can contain parameter specifications:

```
^["name": value]     // Frame with named parameters

Multiple parameters:
?[x > 0, y < 100]    // Frame with multiple conditions
```

---

## 10. Boundary Operators in Register Form

### 10.1 Container Entry/Exit Register Updates

```
Enter body { ... }:
  μ ← "in"
  ρ ← ρ + 1

Exit body:
  if polarity_should_invert():
    μ ← "out"
    σ ← σ + 0.3  (saturation jump on polarity flip)
    ρ ← ρ - 1

Enter scope ( ... ):
  binding_frame ← new_map()  (fresh bindings)

Exit scope:
  binding_frame ← prev_frame  (restore previous bindings)

Enter couple <> [ ... ]:
  #<> ← #<> + 1
  establish_coupling(elements)
```

---

## 11. Composition of Containers

### 11.1 Nesting is Associative

```
{{{expr}}} = {({expr})}  = ({({expr})})

Triple nesting can be grouped any way.
The final result is the same.
```

**Proof**: Boundary operators are associative:

```
∂ ∘ ∂ ∘ ∂ = (∂ ∘ ∂) ∘ ∂ = ∂ ∘ (∂ ∘ ∂)

Because ∂ ∘ ∂ = 0 (nilpotence).
```

### 11.2 Mixed Container Nesting

```
{ [ (expr) ] }  (body containing frame containing scope)

Boundary sequence:
  Entry body: μ ← "in"
  Entry frame: polarity handled for frame
  Entry scope: binding_frame ← new
  Execute expr
  Exit scope: binding_frame restored
  Exit frame: boundary collapses
  Exit body: check polarity inversion
```

### 11.3 Container Commutativity (Limited)

Not all containers commute:

```
{[expr]} ≠ [{ expr}]  (different semantics)

Body-then-frame: Body creates subject, frame addresses it
Frame-then-body: Frame specifies addressing, body wraps it
```

---

## 12. Homological Applications

### 12.1 Obstruction Detection

Use homology to detect **semantic obstructions**:

```
If H_1(nesting) ≠ 0:
  There is an unresolved hole in the structure.
  Interpretation is incomplete.

Example:
  { ?[condition] { !["yes"] | !["no"] } }

  If condition is never resolved (probe never fires):
  H_1 ≠ 0 → interpretation has a hole.
```

### 12.2 Minimal Sufficient Structure

Compute **minimal generators** of homology:

```
A minimal set of containers that create all semantic structure.

Algorithm:
  1. Compute homology H_n for all nesting levels
  2. Find minimal generators of H_n
  3. These are the "essential" containers for the structure
```

### 12.3 Cohomology & Duality

Using **Poincaré duality** (if applicable):

```
H_n(nesting) ≅ H^{dim - n}(nesting)

Semantic meaning: Nesting structure has dual interpretations.
```

---

## 13. Practical: Container Patterns

### 13.1 Subject Formation Pattern

```spw
^["agent"]{ ?[condition] { body_true | body_false } }
```

**Effect**: Creates a subject (agent) that conditionally behaves.

### 13.2 Object Exposure Pattern

```spw
^["result"]{ ![@value] }
@[result]
```

**Effect**: Creates a body wrapping a reference, then probes it (exposes object).

### 13.3 Scoped Computation

```spw
(
  ^["x"]: 10
  ^["y"]: 20
  ![x + y]
)
```

**Effect**: Local computation with bindings that don't leak out.

### 13.4 Coupled Mutual Dependency

```spw
<>[a, b] .. ?[@a > 0] { ![a] & ![b] }
```

**Effect**: Both a and b share the result of the probe.

---

## 14. References

- **SPEC.md § 6**: Containers (foundational)
- **SPEC.md § 6.6**: Containers as semantic frames
- **OPERATOR-ALGEBRA.md**: How operators interact with container boundaries
- **PROBE-CALCULUS.md**: How probes trigger polarity inversion
- **RUNTIME-TRAJECTORY-MODEL.md**: Implementing container state tracking

---

**Status**: Phase 3 complete (Container topology formalized).

**Next**: Update SPEC.md integrating all formalizations, then create runtime design document.
