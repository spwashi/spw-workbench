# Operator Algebra: Register-Based Semantics

**Version**: 0.1.0-alpha (Rewritten for Phase 1 Hybrid Model)
**Status**: Research / Formalization Phase 1
**Authors**: Claude Code, spwashi

---

## 1. Overview

This document formalizes Spw operators through a **register-based normal form**. Each operator is modeled as a sequence of **register updates** that compose to produce semantic trajectories. The formalism provides:

- **Register definitions** (semantic and lexical levels)
- **Dimension coupling rules** showing non-linear interactions between `i`, `p`, `c`
- **Operator families** with different algebraic structures (affine, lattice, group, recurrence)
- **Normal form reduction** for canonical operator composition
- **Jacobians as derived** from register algebra (showing how register states compose geometrically)

---

## 2. Semantic Manifold & Dimension Coupling

### 2.1 Manifold Topology

Spw operates over a 3D semantic manifold:

```
S = [0, 1]³  where s = (i, p, c)

i ∈ [0, 1]  = intensity    — magnitude of semantic presence
p ∈ [0, 1]  = proximity    — closeness to reference point
c ∈ [0, 1]  = clarity      — degree of semantic resolution
```

### 2.2 Dimension Coupling (Non-Linear Interactions)

The three dimensions are **not independent**. Natural couplings emerge:

**Intensity-Clarity Coupling**:
```
High intensity enables high clarity. Low intensity (i < 0.3) constrains clarity variance.

Mathematical: c_achievable = c_target * (1 + i)  (clarity potential scaled by intensity)

Intuition: You can't achieve perfect clarity about something with zero presence.
```

**Proximity-Intensity Coupling**:
```
High proximity (p > 0.7) allows intensity changes to propagate.
Low proximity constrains intensity changes to small deltas.

Mathematical: Δi_allowed ∝ p  (proximity enables intensity changes)

Intuition: Related things propagate influence; distant things don't.
```

**Clarity-Probe Coupling**:
```
Clarity is primarily affected by probing/measurement actions.
Without probes, clarity remains semi-latent (σ < 0.5).

Mathematical: Δc = Δc_probe_only  (only probes directly modify clarity)

Intuition: Certainty comes from questions answered, not just processing.
```

### 2.3 Anchor Points

The manifold has natural **anchor configurations**:

```
Origin (0, 0, 0):         Completely latent (nothing evaluated)
Mid-field (0.5, 0.5, 0.5): Balanced semi-latent state (default after setup)
Max (1, 1, 1):             Fully saturated (all resolved)
```

Operations generally move the state **toward** or **away from** these anchors based on operator kind and valence.

---

## 3. Registers: Foundation Level

### 3.1 Semantic Registers

At the semantic level, we track **state components**:

```
σ ∈ [0, 1]    saturation   — how much of the field has collapsed
ρ ∈ ℕ         resonance    — how many concurrent paths exist (latent multiplicity)
ψ ∈ Seq       phase        — sequence of operator applications (trajectory)
μ ∈ {in, out} polarity     — inward (forming) or outward (exposing) flow
β ∈ ℝ^n       bindings     — named values in current scope
```

### 3.2 Lexical Registers

At the lexical/compile level, we track **counters and flags**:

```
#! ∈ ℕ        inject_count     — how many injects have executed
#^ ∈ ℕ        tap_count        — how many taps (bindings) created
#~ ∈ ℕ        wave_phase       — current iteration in wave loops
#<> ∈ ℕ       couple_depth     — nesting depth of couplings
#? ∈ ℕ        probe_count      — how many probes have fired
#* ∈ ℕ        branch_count     — how many branches taken
#= ∈ ℕ        constraint_count — how many constraints active
#@ ∈ ℕ        emit_count       — how many outputs generated
```

These lexical registers enable **normal form reduction** (canonical representation of any operator sequence).

---

## 4. Dimension Coupling: Non-Linear Interactions

### 4.1 Coupling Matrix

Operators don't affect dimensions independently. Define a **coupling matrix** that shows which dimensions interact:

```
C = [
  1.0  c_ip  c_ic    (intensity couples with proximity and clarity)
  c_pi 1.0  c_pc     (proximity couples with intensity and clarity)
  c_ci c_cp 1.0      (clarity couples with intensity and proximity)
]
```

**Default Coupling Values**:
```
c_ip = 0.3   (intensity moderately coupled to proximity)
c_ic = 0.6   (intensity highly coupled to clarity—can't resolve without presence)
c_pi = 0.2   (proximity weakly influences intensity)
c_pc = 0.4   (proximity moderately enables clarity)
c_ci = 0.5   (clarity moderately depends on intensity)
c_cp = 0.3   (clarity moderately enabled by proximity)
```

### 4.2 Non-Linear Transformation Rule

When an operator applies offset `v = (Δi, Δp, Δc)`, the actual change accounts for coupling:

```
Δi_actual = Δi + c_ip * Δp + c_ic * Δc        (intensity affected by proximity and clarity changes)
Δp_actual = Δp + c_pi * Δi + c_pc * Δc        (proximity affected by intensity and clarity)
Δc_actual = Δc + c_ci * Δi + c_cp * Δp        (clarity affected by intensity and proximity)
```

This models **feedback**—when one dimension increases, it partially drives others.

### 4.3 Clipping and Saturation

After applying coupled transformations, clamp to manifold:

```
s_next = clamp(s_coupled, [0, 0, 0], [1, 1, 1])

Saturation increase:
  Δσ = sum(max(0, s_next[j] - s_prev[j])) / 3   (average dimension growth)
```

---

## 5. Operator Families & Algebraic Structures

Not all operators follow the same algebra. We group them by their mathematical structure.

### 5.1 Family A: Affine Operators (`!`, `@`, `^`)

**Inject**, **Emit**, **Tap** are **affine transformations**:

```
s_next = M · s_prev + v

where M is a fixed coupling-aware matrix, v is a valence-dependent offset
```

**Register Update**:
```
#! ← #! + 1  (inject count increases)
σ ← σ + Δσ   (saturation increases proportional to state change)
```

**Intuition**: These operators introduce content or establish bindings—they *add* structure.

### 5.2 Family B: Probe/Conditional Operators (`?`, `*`)

**Probe** and **Branch** use **lattice algebra**:

```
s → s_branch0 | s_branch1 | ... | s_branchN

where each branch is a distinct region of the manifold.
Selection collapses to one branch.
```

**Register Update**:
```
#? ← #? + 1  (probe count increases)
ρ ← 1         (resonance collapses to 1 path)
σ ← σ + 0.3   (saturation jumps significantly)
```

**Lattice Structure**:
```
The set of reachable states after a probe forms a sublattice:
- Initial state s_0 is at the top
- Two branches s_true, s_false split downward
- Selection picks one branch (partial order contraction)
```

**Intuition**: Probes force the field to **collapse** from multi-path to single-path.

### 5.3 Family C: Relational Operators (`<>`)

**Couple** uses **group theory** (symmetric relations):

```
<>[a, b] creates mutual binding: (a, b) ↔ (b, a)

s_a and s_b remain synchronized: s_a(t) ≈ s_b(t) for all t
```

**Register Update**:
```
β[a] ← β[b]  (binding 'a' mirrors binding 'b')
β[b] ← β[a]  (binding 'b' mirrors binding 'a')
```

**Group Action**:
```
Couple defines an involution: σ_couple ∘ σ_couple = id

Applying couple twice returns to uncoupled state (reversibility).
```

**Intuition**: Couples create symmetric dependencies—both elements co-determine each other.

### 5.4 Family D: Iterative Operators (`~`)

**Wave** uses **recurrence relations**:

```
s_0 = initial_state
s_{k+1} = f_k(s_k, valence)  for k = 0, 1, ..., n-1

where f_k depends on iteration count k
```

**Register Update**:
```
#~ ← #~ + 1  (wave phase increments)
σ ← σ + (1 - σ) / n  (saturation increases gradually per iteration)
```

**Damping Behavior**:
```
s_k = A^k · s_0 + (I - A^k) · s_∞

where A is a damping matrix (eigenvalues < 1)
      s_∞ is equilibrium state

Example: i_k = i_0 + (i_eq - i_0) * (1 - 0.9^k)
         (intensity gradually approaches equilibrium)
```

**Intuition**: Waves create **resonant patterns**—repeated oscillations that either amplify or damp.

### 5.5 Family E: Constraint Operators (`=`)

**Bias** uses **order theory** (partial orders):

```
Constraints form a partial order: c1 ≤ c2 if c1 is stricter

Applying bias=[x: 10] then bias=[x: 5] results in x = 10 (monotonic strengthening)
```

**Register Update**:
```
#= ← #= + 1  (constraint count increases)
β[x] ← max(β[x], constraint_value)  (constraints only strengthen)
```

**Idempotence**:
```
bias=[x: 10] ∘ bias=[x: 10] = bias=[x: 10]  (applying same constraint twice is no-op)
```

**Intuition**: Constraints create **invariants**—hard boundaries that don't soften.

### 5.6 Family F: Reflection Operators (`#`)

**Reflect** (annotation/metadata) operates at the **meta-level**:

```
#metadata creates structured information about the operator itself.

Does not affect semantic state directly (σ, ρ unchanged).
Instead affects interpretation mode and tracing.
```

---

## 6. Normal Form & Reduction

### 6.1 Canonical Representation

Every Spw expression can be reduced to a **normal form** that shows:
1. Which registers are modified
2. In what order
3. By how much

**Normal Form Syntax**:
```
NF ::= register_update | NF NF | {NF}

register_update ::= register ← value
                  | register ← register ± constant

Examples:
  !(val)    ≡ { #! ← #! + 1; σ ← σ + 0.1; [i,p,c] ← apply_coupling(v_inject) }
  ?[cond]   ≡ { #? ← #? + 1; ρ ← 1; σ ← σ + 0.3 }
  ~[3]{...} ≡ { #~ ← #~ + 3; σ ← σ + (3/6); ...loop body... }
```

### 6.2 Composition in Normal Form

Operator composition becomes **sequential register updates**:

```
A ∘ B ≡ (register updates for B) then (register updates for A)

Example:
  ![x] ∘ ^[y] ≡ { #! ← 1 } then { #^ ← 1 }
              ≡ { #! ← 1; #^ ← 1; other state changes... }
```

**Associativity**:
```
(A ∘ B) ∘ C ≡ A ∘ B ∘ C ≡ sequential register updates

No ambiguity—order is left-to-right, always.
```

### 6.3 Commutativity Analysis

Two operators commute if their register updates don't interact:

```
![x] and ![y] commute:  both only increment #! (no coupling)

![x] and ?[cond] don't commute:  inject affects (i, p, c), then probe
                                 probe outcome depends on post-inject state
```

**Formal**: A and B commute iff their register sets are disjoint (or their updates preserve order-independence).

---

## 7. Individual Operators in Register Form

### 7.1 `!` (Inject) — Affine Family

**Semantics**: Introduce content, increasing intensity and establishing presence.

**Register Updates**:
```
#! ← #! + 1
σ ← σ + Δσ_inject(valence)    where Δσ_inject(bone) = 0.1, (boon) = 0.15, ...
i ← i + Δi(valence)            where Δi(bone) = +0.2, (boon) = +0.4, ...
[p, c] updated via coupling
```

**Valence Effects**:
```
bone:   Δi = +0.2,  Δσ = +0.1    (neutral presence)
boon:   Δi = +0.4,  Δσ = +0.15   (celebrated entry)
bane:   Δi = +0.2,  Δσ = +0.08   (cautious entry)
bonk:   Δi = +0.6,  Δσ = +0.2    (sudden spike)
honk:   Δi = +0.3,  Δσ = +0.12   (emphasized entry)
```

**Coupled Effect**:
```
Δi_actual = Δi + c_ic * Δc + c_ip * Δp

Higher intensity can enable clarity and proximity changes (feedback).
```

---

### 7.2 `^` (Tap) — Affine Family

**Semantics**: Establish named binding, locking meaning at current point.

**Register Updates**:
```
#^ ← #^ + 1
β[name] ← current_state    (store current semantic state as binding)
c ← c + Δc_tap(valence)    where Δc_tap(bone) = +0.2, (honk) = +0.5
```

**Binding Invariant**:
```
Once β[name] is set, subsequent references @name always return the bound state.
Binding is immutable in its scope.
```

**Valence Effects**:
```
bone:   Δc = +0.2      (neutral pinning)
boon:   Δc = +0.3      (positive anchor)
bane:   Δc = +0.1      (cautious anchor)
bonk:   Δc = +0.4      (sudden lock)
honk:   Δc = +0.5      (emphatic fixation)
```

---

### 7.3 `~` (Wave) — Iterative Family

**Semantics**: Repeat body n times, creating resonant trajectory.

**Register Updates** (per iteration k):
```
#~ ← #~ + 1
ρ ← ρ + 1             (resonance: multiple paths during iteration)
σ ← σ + (1 - σ) / n   (gradual saturation increase)

Body executes n times:
  s_k = damped_apply(body_effect, s_{k-1}, damping_factor_k)
```

**Damping Recurrence**:
```
For iteration k, apply damping factor α_k ∈ (0.8, 1.0]:

i_k = i_{k-1} + (1 - α_k) * Δi_effect
p_k = p_{k-1} + (1 - α_k) * Δp_effect
c_k = c_{k-1} + (1 - α_k) * Δc_effect

Valence determines α_k:
  bone:   α_k = 0.95 (gentle damping)
  boon:   α_k = 1.0  (no damping, amplify)
  bane:   α_k = 0.8  (strong damping)
  bonk:   α_k = 1.1  (amplification!)
  honk:   α_k = 0.98 (very gentle)
```

**Resonant Saturation**:
```
After n iterations: σ_wave_result = σ_before + min(0.5, n * 0.05)

Waves don't fully saturate (they remain in resonant state σ ≈ 0.5).
```

---

### 7.4 `<>` (Couple) — Relational Family

**Semantics**: Create mutual binding between elements.

**Register Updates**:
```
#<> ← #<> + 1
β[a] ← "coupled_to_b"    (flag: a is coupled to b)
β[b] ← "coupled_to_a"    (flag: b is coupled to a)

Semantic consequence:
  For all t: s_a(t) ≈ s_b(t)   (states remain synchronized)
```

**Coupling Invariant**:
```
If (a, b) are coupled and a is probed to state s_a:
  Then b is automatically resolved to the same state s_a.

This is entanglement—measurement of one determines the other.
```

**Valence Effects**:
```
bone:   σ ← σ + 0.1   (neutral linking)
boon:   σ ← σ + 0.15  (positive coupling)
bane:   σ ← σ + 0.05  (cautious link)
bonk:   σ ← σ + 0.2   (sudden entanglement)
honk:   σ ← σ + 0.18  (emphasized coupling)
```

---

### 7.5 `?` (Probe) — Conditional Family

**Semantics**: Evaluate condition, collapse to one of multiple branches.

**Register Updates**:
```
#? ← #? + 1
ρ ← 1                (resonance collapses from multi-path to single)
σ ← σ + 0.3           (saturation jumps)

Branch Selection:
  eval_condition → true/false
  → select branch_true or branch_false
  → execute selected branch only
```

**Measurement Uncertainty**:
```
If intensity i < 0.3:
  probe result has ±0.2 variance (low intensity = noisy measurement)

If intensity i > 0.7:
  probe result is deterministic (high intensity = clear measurement)

Mathematical: variance = (1 - i)² * base_variance
```

**Saturation Jump**:
```
Probes produce immediate saturation increase (unlike gradual operators):
  σ_after = σ_before + (1 - σ_before) * 0.3

This models measurement uncertainty: probing partially but not fully resolves.
```

**Valence Effects** (per branch):
```
bone_true:   Δc = +0.3     (neutral resolution, positive branch)
bone_false:  Δc = +0.2     (neutral resolution, negative branch)
boon_true:   Δc = +0.4, Δi = +0.1  (rewarding true branch)
bane_true:   Δc = +0.2, Δi = -0.1  (warning even if true)
bonk_any:    Δσ = +0.4, Δi = +0.2  (sudden collapse)
honk_true:   Δc = +0.5     (emphatic confirmation)
```

---

### 7.6 `*` (Branch) — Conditional Family

**Semantics**: Deterministic selection among alternatives (selector-based, not condition-based).

**Register Updates**:
```
#* ← #* + 1
ρ ← 1              (resonance collapses)
σ ← σ + 0.15       (weaker saturation jump than probe—it's deterministic)

Branch Selection:
  eval_selector → key
  → lookup case_key in alternatives
  → execute selected case only
  → non-selected alternatives are never evaluated
```

**Difference from Probe**:
```
Probe: bifurcation determined by evaluating condition on state
Branch: selection determined by external selector value (reference)

Probe creates conditional semantics; branch creates reference resolution.
```

**Valence Effects**:
```
bone:   Δσ = +0.15    (neutral selection)
boon:   Δσ = +0.2, Δi = +0.1   (positive choice)
bane:   Δσ = +0.1, Δi = -0.05  (cautious selection)
bonk:   Δσ = +0.25, Δi = +0.15 (sudden jump)
honk:   Δσ = +0.2, Δc = +0.1   (emphasized choice)
```

---

### 7.7 `=` (Bias) — Constraint Family

**Semantics**: Fix constraint that persists through subsequent operations.

**Register Updates**:
```
#= ← #= + 1
constraints ← constraints ∪ {constraint_spec}

For each constraint (parameter: min_value):
  parameter ← max(parameter, min_value)   (monotonic strengthening)
```

**Constraint Idempotence**:
```
bias=[x: 10] ∘ bias=[x: 10] = bias=[x: 10]

Applying the same constraint twice is a no-op.
```

**Constraint Ordering**:
```
Constraints form a partial order:
  bias=[x: 5] then bias=[x: 10] results in x = 10 (stronger constraint wins)

This models "tightening" constraints—you can only strengthen, never relax.
```

**Valence Effects**:
```
bone:   σ ← σ + 0.05  (light pinning)
boon:   σ ← σ + 0.08  (positive constraint)
bane:   σ ← σ + 0.02  (negative constraint)
bonk:   σ ← σ + 0.12  (sudden lock)
honk:   σ ← σ + 0.1   (emphatic constraint)
```

---

### 7.8 `@` (Emit) — Affine Family

**Semantics**: Extract current state and observe it (terminal operation).

**Register Updates**:
```
#@ ← #@ + 1
σ ← 1.0          (saturation jumps to maximum—observation complete)

Output Generation:
  output ← {
    i: i_current,
    p: p_current,
    c: c_current,
    registers: {#!,  #^, #~, #<>, #?, #*, #=, #@},
    trajectory_hash: hash(s_0, s_1, ..., s_T),
    valence: current_modifier
  }
```

**Saturation Lock**:
```
After emit, σ = 1.0 (locked). No further operations can reduce saturation.

This ensures observables are immutable—once emitted, the trajectory is frozen.
```

**Valence Effects**:
```
bone:   σ ← 1.0, Δc = +0.2  (neutral emission)
boon:   σ ← 1.0, Δc = +0.2, Δi = +0.1  (positive output)
bane:   σ ← 1.0, Δc = +0.1, Δi = -0.1  (warning output)
bonk:   σ ← 1.0, Δi = +0.1  (sudden emission)
honk:   σ ← 1.0, Δc = +0.3  (emphatic output)
```

---

## 8. Jacobians as Derived from Register Algebra

### 8.1 Lifting Register Updates to Manifold Coordinates

When register updates compose, they can be "lifted" to the manifold level as a sequence of transformations. For **affine operators**, this lifts to a Jacobian:

```
s_next = (I + coupling_matrix(registers)) · s_prev + offset(registers)

where:
  I = identity
  coupling_matrix = constructed from C (dimension coupling) and register state
  offset = constructed from register updates to [i, p, c]
```

### 8.2 Example: Inject Jacobian Derived from Registers

For `![value]` with valence `boon`:

```
Register updates:
  #! ← 1
  Δi = +0.4, Δc ← +0.2  (from valence_offsets[boon])

Coupling calculation:
  Δi_actual = 0.4 + c_ic * 0.2 + c_ip * Δp
            = 0.4 + 0.6 * 0.2 + 0.3 * 0
            = 0.52

  Δc_actual = 0.2 + c_ci * 0.4 + c_cp * Δp
            = 0.2 + 0.5 * 0.4 + 0.3 * 0
            = 0.4

Effective transformation:
  s_next ≈ [1.0  0.0  0.0]     [s_i]       [0.52]
           [0.0  1.0  0.0]  ·  [s_p]  +    [0.0]
           [0.0  0.0  1.0]     [s_c]       [0.4]
```

This is the **derived Jacobian** for `![value]` under valence `boon` with `c_ic = 0.6`.

### 8.3 Why Jacobians Are Secondary

Jacobians are **derived** and not primary because:

1. **Registers capture intent** — What is the operator trying to do?
2. **Coupling rules are explicit** — How do dimensions interact?
3. **Valence effects are parametric** — How does emotional coloring change behavior?
4. **Normal form is canonical** — What is the irreducible form of any expression?

Jacobians emerge as the **geometric consequence** of register updates composed with dimension coupling.

---

## 9. Script as Data: Interpretation Modes

### 9.1 Top Operator Determines Reading Mode

The **top-level operator** in a script determines how the rest is interpreted:

```
Top = "quote" → Extract all literals only (data interpretation)
Top = "."     → Treat cyclic/constant ops as noise (signal filtering)
Top = "#"     → Extract metadata only (introspection)
Top = normal  → Standard evaluation (default)
```

### 9.2 Quote Mode: `"[...]"` as Top

**Semantics**: Collect all string literals and constants, ignore operators.

```
script = '!["hello"] .. ?[x > 0] { !["world"] }'

With top="quote":
  output = ["hello", "world"]   (literals only)
```

**Register View**:
```
In quote mode:
  #! is not incremented (operators ignored)
  #? is not incremented
  Only literals are collected into output

This gives a "data view" of the script independent of control flow.
```

### 9.3 Sequence Mode: `.` as Top

**Semantics**: Cancel out cyclic/repeating transformations (treat them as noise).

```
script = ~[1000]{!["data"]} .. @out

With top=".":
  The wave is considered "constant pattern"
  It can be factored out: ~[1000]{} ≡ id
  Result: just !["data"] .. @out
```

**Register View**:
```
In sequence mode:
  Operators that don't change state (idempotent loops, constant constraints)
  are reduced to identity

This gives a "minimal trajectory" view—only state changes matter.
```

### 9.4 Metadata Mode: `#` as Top

**Semantics**: Extract structural metadata without executing.

```
script = #version{0.1.0} .. #author{spwashi} .. #meta{...}

With top="#":
  output = {version: "0.1.0", author: "spwashi", meta: {...}}
```

**Register View**:
```
In metadata mode:
  Only `#` (reflect) operators execute
  Semantic registers (σ, ρ) are not incremented
  Only metadata registers are filled
```

---

## 10. Composition Laws & Properties

### 10.1 Associativity (Register-Based Proof)

**Theorem**: For any three operators A, B, C:

```
(A ∘ B) ∘ C ≡ A ∘ (B ∘ C)
```

**Proof**: Both reduce to the same sequence of register updates:

```
Left side:  registers_C ← registers_C + ΔC
            registers_B ← registers_B + ΔB
            registers_A ← registers_A + ΔA

Right side: same sequence, same result

Commutativity of addition on registers guarantees associativity.
```

### 10.2 Identity Element

**Theorem**: The **no-op** (empty body `{}` or pass-through) is identity.

```
A ∘ {} = A
{} ∘ A = A
```

**Proof**: No-op produces zero register updates and zero state change:

```
Δregisters = [0, 0, ..., 0]
Δs = [0, 0, 0]
```

### 10.3 Closure Under Composition

**Theorem**: Any composition of Spw operators produces an effect that is reachable by a (possibly longer) sequence of the original eight operators.

**Proof**: Register updates compose by addition:

```
(A ∘ B) produces register updates ΔA + ΔB

This is a vector in the register space, which can be decomposed
back into a sequence of the eight operators.

No new "derived" operators emerge.
```

### 10.4 Commutativity (Selective)

**Theorem**: Two operators commute iff their register updates don't depend on each other's state.

```
![x] and ![y] commute:
  Both produce independent register updates (#!, Δi, Δc)
  Order doesn't matter

![x] and ?[cond] don't commute:
  Probe depends on post-inject state
  inject ![x] then ?[cond] differs from ?[cond] then ![x]
```

---

## 11. Normal Form Reduction Algorithm

### 11.1 Reduction Rules

Every expression reduces to a canonical form via these rules:

```
Sequence:
  A .. B → apply A, then apply B

Alternative (probe/branch):
  A | B → select one branch (A or B), execute it

Parallel:
  A & B → execute both, merge register states (register updates commute if disjoint)

Binding Reference:
  @name → lookup name in bindings, return bound state

Constraint:
  = [param: val] → strengthen constraint (monotonic update)
```

### 11.2 Normal Form Properties

The normal form satisfies:

1. **Idempotence**: Reducing an expression twice gives the same result
2. **Minimality**: No further reductions are possible
3. **Uniqueness**: Each expression has a unique normal form (up to register state)
4. **Determinism**: Same seed, same lens → same normal form

---

## 12. Implications for Implementation

### 12.1 Runtime Register Tracking

The interpreter maintains register state:

```typescript
interface RuntimeRegisters {
  inject_count: number;
  tap_count: number;
  wave_phase: number;
  couple_depth: number;
  probe_count: number;
  branch_count: number;
  constraint_count: number;
  emit_count: number;

  saturation: number;
  resonance: number;
  polarity: 'in' | 'out';
  bindings: Map<string, SemanticPoint>;
}
```

### 12.2 State Transition as Register Update

Each operator execution becomes:

```typescript
function apply_operator(state: SemanticState, op: Operator, valence: Valence): SemanticState {
  // 1. Update lexical register
  registers[op.name + '_count'] += 1;

  // 2. Calculate offset from valence
  offset = VALENCE_OFFSETS[valence][op.name];

  // 3. Apply coupling matrix
  coupled_offset = dimension_coupling(offset, state);

  // 4. Update semantic registers
  state.saturation += calcul ateΔσ(op, valence);

  // 5. Return new state
  return clamp_manifold(state + coupled_offset);
}
```

### 12.3 Normal Form Compilation

The compiler can reduce expressions to normal form for optimization:

```typescript
function compile_to_normal_form(expr: Expr): RegisterUpdate[] {
  return reduce_expression(expr).to_register_updates();
}
```

---

## 13. References

- **SPEC.md § 1.5**: Semantic manifold
- **SPEC.md § 3**: Operators (foundational)
- **LENS-ALGEBRA.md**: How register algebra composes with lens transformations
- **PROBE-CALCULUS.md**: Measurement theory for probe operators
- **RUNTIME-TRAJECTORY-MODEL.md**: Register tracking in runtime

---

**Status**: Phase 1 Hybrid Model complete (registers-based with Jacobians derived).

**Next**: Create LENS-ALGEBRA.md integrating register algebra with lens group structure.

### 4.1 `!` (Inject) — Content Introduction

**Intuition**: Inject introduces new content into the evaluation flow, typically increasing semantic intensity and establishing clarity.

**Semantic Rule**:
```
!(frame) introduces content [value], modifying the field to include this value
```

**Jacobian Matrix**:
```
J_inject = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Valence Offset** `v_inject(ω, Γ)`:
```
bone:   [+0.2, 0.0, +0.1]   # Neutral intensity boost, moderate clarity
boon:   [+0.4, +0.1, +0.2]  # Strong intensity + positive approach proximity
bane:   [+0.2, -0.1, -0.1]  # Intensity without clarity (warning)
bonk:   [+0.6, 0.0, 0.0]    # Sudden intensity spike
honk:   [+0.3, 0.0, +0.3]   # Emphasis: intensity + clarity equally boosted
```

**Saturation Behavior**: After inject completes, saturation increases by `|Δi| / max_Δi` (normalized intensity change).

**Code Reference**: `src/runtime/interpreter/operators/inject.ts`

---

### 4.2 `^` (Tap) — Named Anchor Establishment

**Intuition**: Tap establishes a binding reference at the current semantic point. This creates a **clarity anchor**—the meaning is locked at this location.

**Semantic Rule**:
```
^[name] ≡ Create binding (name, s_t) in current scope.
After binding, clarity becomes maximal (the meaning is pinned).
```

**Jacobian Matrix**:
```
J_tap = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Valence Offset** `v_tap(ω, Γ)`:
```
bone:   [0.0, 0.0, +0.2]   # Neutral: only clarity boost
boon:   [0.0, +0.2, +0.3]  # Rewarding binding
bane:   [0.0, -0.2, +0.1]  # Cautious, lower proximity
bonk:   [+0.1, 0.0, +0.4]  # Sudden pinning
honk:   [0.0, 0.0, +0.5]   # Emphatic: maximum clarity
```

**Binding Persistence**: Once bound, the reference persists in scope until the scope closes. Multiple references to the same binding produce identical semantic states (determinism).

**Cross-Lens Consistency**: The binding is **lens-invariant**—all lenses observe the same binding (semantic identity), though they may interpret it differently.

**Code Reference**: `src/runtime/state/bindings.ts`, `src/lang/semantic/reference-binding.ts`

---

### 4.3 `~` (Wave) — Iterative Resonance

**Intuition**: Wave creates repeating patterns. The body executes multiple times, producing a resonant trajectory through semantic space.

**Semantic Rule**:
```
~[n]{body} executes body n times, each execution starting from the previous state.
The sequence of states forms a periodic or quasiperiodic trajectory.
```

**Jacobian Matrix** (per iteration):
```
J_wave = [
  1.0   0.0   0.0
  0.0   λ_p   0.0
  0.0   0.0   λ_c
]

where λ_p, λ_c ∈ [0.8, 1.2] are damping/amplification factors
(slightly scaled on each iteration)
```

**Valence Offset** `v_wave(ω, Γ)`:
```
bone:   [0.0, -0.05*k, 0.0]    # Damping each iteration (k = iteration count)
boon:   [+0.05, +0.05, 0.0]    # Amplifying with approach
bane:   [0.0, -0.1, -0.05]     # Rapid damping (danger zone)
bonk:   [+0.1, 0.0, 0.0]       # Pulsing intensity boost
honk:   [0.0, 0.0, +0.05]      # Clarity accumulation per cycle
```

**Resonance Saturation**:
- Saturation increases with each iteration: `σ_{k+1} = σ_k + (1 - σ_k) / n`
- After `n` iterations, the field is partially saturated (resonant state)
- Full saturation would require `n → ∞`

**Periodic Trajectory**:
```
The sequence of states exhibits periodicity:
s_0 → s_1 → ... → s_n → s_{n+1} ≈ s_1 (near-periodic, not exact)

This is "resonance"—the field oscillates but doesn't settle.
```

**Code Reference**: `src/runtime/interpreter/operators/wave.ts`

---

### 4.4 `<>` (Couple) — Relational Binding

**Intuition**: Couple establishes symmetric relationship between two or more elements. Both elements share the same semantic fate.

**Semantic Rule**:
```
<>[a, b] creates mutual binding: change to 'a' affects 'b' and vice versa.
Semantically, they occupy the same point on the manifold (coupled).
```

**Jacobian Matrix**:
```
J_couple = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Valence Offset** `v_couple(ω, Γ)`:
```
bone:   [0.0, +0.1, +0.1]  # Neutral: mutual proximity + clarity
boon:   [0.0, +0.2, +0.2]  # Celebrated coupling (positive)
bane:   [-0.1, -0.1, 0.0]  # Cautious: reduced intensity, wary
bonk:   [+0.2, +0.2, 0.0]  # Sudden linking
honk:   [0.0, +0.3, +0.2]  # Emphasized relationship
```

**Coherence Constraint**:
```
For coupled elements a, b:
  s_a(t) ≈ s_b(t)  at any time t (within ε for floating point)
```

When one coupled element is probed, the other is automatically resolved to the same value. This is **entanglement**—measurement of one determines the other.

**Code Reference**: `src/runtime/interpreter/operators/couple.ts`

---

### 4.5 `?` (Probe) — Conditional Measurement & Collapse

**Intuition**: Probe is a **measurement operator**. It evaluates a condition and forces the semantic field to collapse along one of two branches.

**Semantic Rule**:
```
?[condition] evaluates condition, creating bifurcation:
  s → s_true   (if condition evaluates to true)
  s → s_false  (if condition evaluates to false)

The manifold branches; only one branch is taken.
```

**Jacobian Matrix** (branch-dependent):
```
J_probe_true = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  1.0   0.0   1.0     # clarity increases (condition resolved)
]

J_probe_false = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Valence Offset** `v_probe(ω, Γ, branch)`:
```
bone (true):    [0.0, 0.0, +0.3]   # Clarity boost from resolution
bone (false):   [0.0, 0.0, +0.2]   # Less clarity (negative case)
boon (true):    [+0.1, +0.1, +0.4] # Rewarding resolution
bane (true):    [-0.1, -0.1, +0.2] # Warning even when true
bonk (either):  [+0.2, 0.0, +0.3]  # Sudden collapse
honk (true):    [0.0, 0.0, +0.5]   # Emphatic confirmation
```

**Measurement Uncertainty**:
```
If intensity i_t is low (< 0.3), probe result has high variance.
If intensity is high (> 0.7), probe result is deterministic.

Mathematically: variance ∝ (1 - i_t)²
```

**Saturation Jump**:
```
Probing produces immediate saturation increase:
σ_{after_probe} = σ_before + (1 - σ_before) * 0.3  (minimum 0.3 increase)
```

**Code Reference**: `src/runtime/interpreter/operators/probe.ts`, `src/runtime/state/probe-state.ts`

---

### 4.6 `*` (Branch) — Deterministic Selection

**Intuition**: Branch selects exactly one alternative from many, based on an external selector value. Unlike probe, selection is pre-determined (not conditional on state).

**Semantic Rule**:
```
*[@selector]{
  case_a: expr_a
| case_b: expr_b
}

Evaluate @selector to get key k, then execute expr_k.
Non-selected alternatives are not evaluated.
```

**Jacobian Matrix**:
```
J_branch = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Valence Offset** `v_branch(ω, Γ)`:
```
bone:   [0.0, 0.0, +0.15]   # Mild clarity boost (selection made)
boon:   [0.0, +0.1, +0.2]   # Positive selection
bane:   [0.0, -0.1, +0.1]   # Cautious selection
bonk:   [+0.1, 0.0, +0.2]   # Sudden jump to branch
honk:   [0.0, 0.0, +0.3]    # Emphasized choice
```

**Difference from Probe**:
- **Probe**: Bifurcation is **deterministic from state** (condition evaluation)
- **Branch**: Selection is **deterministic from external value** (selector)
- **Probe**: Creates **conditional semantics** (field forks)
- **Branch**: Creates **reference resolution** (selector is external reference)

**Code Reference**: `src/runtime/interpreter/operators/branch.ts`

---

### 4.7 `=` (Bias) — Constraint Pinning

**Intuition**: Bias fixes a constraint or parameter value. Creates an **invariant** that persists through subsequent operations—a hard boundary on the semantic field.

**Semantic Rule**:
```
=[parameter: value] constrains parameter to remain at value through subsequent operations.
Any operation that would violate this constraint is rejected or adjusted.
```

**Jacobian Matrix** (post-constraint):
```
J_bias = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Constraint Effect**:
```
If constraint specifies c_min = 0.5, then:
  c_{t+1} = max(c_t, 0.5)  (clarity never drops below constraint)
```

**Valence Offset** `v_bias(ω, Γ)`:
```
bone:   [0.0, 0.0, +0.05]   # Neutral: light clarity boost (pinned)
boon:   [0.0, +0.1, +0.1]   # Positive constraint
bane:   [0.0, -0.05, -0.1]  # Negative constraint (restriction)
bonk:   [+0.05, 0.0, +0.1]  # Sudden pinning
honk:   [0.0, 0.0, +0.2]    # Emphatic lock
```

**Constraint Persistence**:
```
Constraints are **monotonic**: Once applied, they cannot be weakened.
bias=[a: 10] followed by bias=[a: 5] results in a = 10 (no rollback).
```

**Code Reference**: `src/runtime/state/constraints.ts`

---

### 4.8 `@` (Emit) — Output Extraction

**Intuition**: Emit extracts the current semantic state and **observes** it—converting latent field into observable value. Terminal operation.

**Semantic Rule**:
```
@destination observes the current state and sends it to output.
After emit, the state is **saturated** (fully resolved, no ambiguity).
```

**Jacobian Matrix**:
```
J_emit = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]
```

**Valence Offset** `v_emit(ω, Γ)`:
```
bone:   [0.0, 0.0, +0.2]   # Neutral observation
boon:   [0.0, +0.1, +0.2]  # Positive output
bane:   [0.0, -0.1, -0.1]  # Warning output
bonk:   [+0.1, 0.0, +0.1]  # Sudden emission
honk:   [0.0, 0.0, +0.3]   # Emphasized output
```

**Saturation to Max**:
```
After emit:
  σ = 1.0  (fully saturated, observation complete)
```

**Output Representation**:
```
The emitted value is s_t transformed into observable form:
  output = {
    intensity: i_t,           (as magnitude 0-100%)
    proximity: p_t,           (as distance 0-1)
    clarity: c_t,             (as confidence 0-100%)
    trajectory_hash: hash(...), (deterministic trajectory ID)
    valence: ω,               (modifier that created this state)
  }
```

**Code Reference**: `src/runtime/interpreter/operators/emit.ts`, `src/runtime/output/emitter.ts`

---

## 5. Composition Laws

### 5.1 Associativity of Operator Composition

**Theorem**: For any three operators `A`, `B`, `C`:

```
(A ∘ B) ∘ C = A ∘ (B ∘ C)
```

**Proof Sketch**:

The composition of two operators is computed by matrix multiplication:

```
(A ∘ B) ≡ J_B · J_A

Associativity of matrix multiplication guarantees:
(J_C · J_B) · J_A = J_C · (J_B · J_A)

Thus, operator composition is associative.
```

**Code Implication**: The interpreter can group operations in any order without affecting the result (no parentheses needed for semantic meaning).

---

### 5.2 Identity Element

**Theorem**: The **identity operator** `id` (pass-through) exists such that:

```
id ∘ A = A
A ∘ id = A
```

**Identity Jacobian**:
```
J_id = [
  1.0   0.0   0.0
  0.0   1.0   0.0
  0.0   0.0   1.0
]

v_id = [0.0, 0.0, 0.0]
```

**Usage**: Empty operations like `?{}` or `^[]` act as identity (pass-through the current state).

---

### 5.3 Closure Under Composition

**Theorem**: For any two operators `A`, `B ∈ O` (operator set), their composition `A ∘ B` produces a trajectory that can be expressed as a **sequence of the original eight operators**.

**Proof Strategy**:
- Each operator's Jacobian is in GL(3, ℝ) (invertible 3×3 matrices)
- Matrix multiplication preserves invertibility
- Any composition can be decomposed back into a sequence of fundamental operators

**Implication**: Spw is **closed under composition**—no new "derived" operators emerge.

---

### 5.4 Commutativity (Selective)

**Not all operators commute**, but some do:

**Commutative Pairs**:
```
^[a] .. ^[b] = ^[b] .. ^[a]      (binding order irrelevant for distinct names)
=[a:x] .. =[b:y] = =[b:y] .. =[a:x]  (independent constraints commute)
```

**Non-Commutative Pairs**:
```
![value] .. =[clarity: 0.9] ≠ =[clarity: 0.9] .. ![value]
  (inject after constraint differs from constraint after inject)

?[cond] .. ![value] ≠ ![value] .. ?[cond]
  (probe position changes probe result)
```

**Application**: Compiler optimizations can reorder commutative operators.

---

## 6. Valence as Modifier Field

### 6.1 Valence Scaling Functions

Each modifier applies a **multiplicative scaling** to the offset vector:

```
m: modifier → ℝ^3 → ℝ^3

v_op_final(ω) = m(ω) ⊙ v_op(bone)

where ⊙ is element-wise multiplication (Hadamard product)
```

**Scaling Factors**:
```
m(bone)  = [1.0, 1.0, 1.0]      # No scaling (baseline)
m(boon)  = [1.5, 2.0, 1.5]      # Amplify positive shifts
m(bane)  = [0.8, 0.5, 0.5]      # Reduce, especially proximity/clarity
m(bonk)  = [2.5, 1.0, 1.0]      # Spike intensity, neutral elsewhere
m(honk)  = [1.2, 1.2, 1.5]      # Balanced emphasis, clarity highest
```

### 6.2 Modifier Composition Rules

When two modifiers chain, they compose multiplicatively:

```
m(ω₁.ω₂) = m(ω₁) ⊙ m(ω₂)

Examples:
m(boon.honk) = [1.5, 2.0, 1.5] ⊙ [1.2, 1.2, 1.5] = [1.8, 2.4, 2.25]
m(bane.honk) = [0.8, 0.5, 0.5] ⊙ [1.2, 1.2, 1.5] = [0.96, 0.6, 0.75]
```

**Forbidden Chains** (grammar enforces):
```
bone.bonk  — Arousal without valence (semantically incoherent)
honk.bonk  — Double emphasis (redundant, prevented by grammar)
```

---

## 7. Domain Interpretations

The same operator exhibits different behavior across **execution domains** (contexts in which the operator is evaluated).

### 7.1 Domain-Specific Jacobians

An operator's Jacobian can shift based on domain:

```
J_op(domain) = J_op_base · D(domain)

where D(domain) is a domain transformation matrix
```

**Example: `!` (Inject) Across Domains**

```
Hardware@:  J_inject = [  1.2  0.0  0.0 ]  (Higher intensity in hardware context)
                        [  0.0  1.0  0.0 ]
                        [  0.0  0.0  0.8 ]

Theatre@:   J_inject = [  1.0  0.0  0.0 ]  (Balanced)
                        [  0.0  1.2  0.0 ]  (Higher proximity: actors relate)
                        [  0.0  0.0  1.0 ]

Broadcast@: J_inject = [  1.3  0.0  0.0 ]  (Intense: mass audience)
                        [  0.0  0.8  0.0 ]  (Lower proximity: one-way)
                        [  0.0  0.0  1.1 ]  (High clarity: explicit messaging)
```

### 7.2 Context-Dependent Offsets

Valence offsets also shift based on domain:

```
v_op(ω, domain) = v_op(ω) · context_multiplier(domain)
```

**Example**: In Hardware domain, intensity changes are 1.2× larger; in Theatre domain, proximity changes are 1.5× larger.

---

## 8. Minimal Operator Generator Set

### 8.1 Hypothesis: Three Generators Suffice

**Conjecture**: The eight operators can be expressed as combinations of three primitive generators:

```
Generators: G = {!, <>, ?}

Derived:    ^ ≡ ! with max clarity
            ~ ≡ ? in loop (self-referential probe)
            * ≡ ? without condition (deterministic probe)
            = ≡ ! with constraint layer
            @ ≡ ! directed to output
```

### 8.2 Proof Sketch (Informal)

**`!` (Inject)**: Creates content — fundamental.

**`<>` (Couple)**: Links elements — creates relational structure (not derivable from `!` alone).

**`?` (Probe)**: Collapses field — creates bifurcation (not derivable from `!` and `<>`).

**Derivations**:
```
^[name]: Equivalent to !boon at maximum clarity binding
         ≈ ! with special parameter (clarity forced to 1.0)

~[n]{body}: Equivalent to ?[@counter > n] { body | ... }
            ≈ Probe with self-referential condition (loop)

*[@sel]{...}: Equivalent to ?[@sel ∈ keys]
              ≈ Probe with deterministic condition (no randomness)

=[c: x]: Equivalent to ! with constraint modification layer
         ≈ ! that refuses to reduce parameter below x

@out: Equivalent to ! with special destination ("output")
      ≈ ! that routes to external emitter
```

### 8.3 Why All Eight Are Retained

Even if minimality is achieved, all eight operators are kept because:

1. **Pedagogical clarity**: Each operator has a direct semantic meaning
2. **Domain optimization**: Domain-specific interpreters can specialize for each operator
3. **Compiler targets**: Each operator has distinct compilation strategies
4. **Proof by construction**: Users naturally think in terms of all eight (no derivation needed)

---

## 9. Determinism and Trajectory Hashing

### 9.1 Deterministic Trajectories

**Theorem**: For any seed `S` and fixed evaluation context `Γ`:

```
eval(S, Γ) produces unique trajectory τ

τ = [s_0, s_1, ..., s_T]  (sequence of states)

Same seed, same context → same trajectory (up to floating-point precision)
```

**Implementation**: Trajectory is hashed to produce a unique fingerprint:

```
trajectory_hash = SHA256(s_0 || s_1 || ... || s_T)

where || is byte concatenation
```

### 9.2 Reproducibility Across Lenses

**Key Property**: Trajectories are **lens-invariant** in their underlying state sequence, though lens-specific representations differ.

```
For seed S evaluated through lenses ℓ₁ and ℓ₂:
  τ_base = underlying trajectory (representation-free)
  ℓ₁(τ_base) ≠ ℓ₂(τ_base)  (different lens perspectives)

  BUT: trajectory_hash(τ_base) is identical
```

---

## 10. Operator Stability & Invariants

### 10.1 Saturation Monotonicity

**Invariant**: Saturation level `σ` is **monotonically increasing**:

```
σ_t ≤ σ_{t+1} for all t

Proof: Each operator either maintains saturation or increases it.
Only fully resolved operations (probes, emits) produce saturation increases.
No operator can decrease saturation (immutability of history).
```

### 10.2 Intensity Continuity

**Invariant**: Intensity changes are **continuous and bounded**:

```
|i_{t+1} - i_t| ≤ 0.6  (maximum single-step intensity change)

This prevents "teleportation" in semantic space.
```

### 10.3 Clarity Non-Negativity

**Invariant**: Clarity never becomes **incoherent** (though it can reset):

```
After probe/emit: c_t ≥ 0.2 (minimum residual clarity)

Probes that fail to resolve leave small clarity baseline (partial understanding).
```

---

## 11. Implications for Runtime Implementation

### 11.1 Jacobian Lookup Table

The runtime can precompute all operator Jacobians and valence offsets:

```typescript
// src/core/operators.ts
const OPERATOR_JACOBIANS: Record<OperatorKind, Matrix3x3> = {
  inject:  [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  tap:     [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  // ... rest
};

const VALENCE_OFFSETS: Record<Valence, Record<OperatorKind, Vector3>> = {
  bone: { inject: [0.2, 0.0, 0.1], tap: [0.0, 0.0, 0.2], ... },
  // ... rest
};
```

### 11.2 Efficient State Transitions

Each step in the interpreter becomes matrix-vector multiplication:

```typescript
s_next = matrix3_multiply(OPERATOR_JACOBIANS[op], s_current);
s_next = vector3_add(s_next, VALENCE_OFFSETS[valence][op]);
s_next = clamp(s_next, [0, 0, 0], [1, 1, 1]);
```

### 11.3 Trajectory Tracking

Store transitions for debugging and visualization:

```typescript
interface TransitionStep {
  operator: OperatorKind;
  valence: Valence;
  state_before: SemanticPoint;
  state_after: SemanticPoint;
  jacobian: Matrix3x3;
  offset: Vector3;
  timestamp: number;
}
```

---

## 12. References and Further Reading

- **SPEC.md § 3**: Operator semantics (foundational)
- **SPEC.md § 1.5**: Semantic space formalism
- **LENS-ALGEBRA.md**: How operators interact with lenses
- **PROBE-CALCULUS.md**: Measurement theory for probes
- **RUNTIME-TRAJECTORY-MODEL.md**: Implementation design for Phase 5

---

## Appendix A: Complete Jacobian Matrices Reference

```
J_inject = [1.0  0.0  0.0]
           [0.0  1.0  0.0]
           [0.0  0.0  1.0]

J_tap = [1.0  0.0  0.0]
        [0.0  1.0  0.0]
        [0.0  0.0  1.0]

J_wave = [1.0  0.0  0.0]
         [0.0  λ_p  0.0]
         [0.0  0.0  λ_c]

J_couple = [1.0  0.0  0.0]
           [0.0  1.0  0.0]
           [0.0  0.0  1.0]

J_probe_true = [1.0  0.0  0.0]
               [0.0  1.0  0.0]
               [1.0  0.0  1.0]

J_probe_false = [1.0  0.0  0.0]
                [0.0  1.0  0.0]
                [0.0  0.0  1.0]

J_branch = [1.0  0.0  0.0]
           [0.0  1.0  0.0]
           [0.0  0.0  1.0]

J_bias = [1.0  0.0  0.0]
         [0.0  1.0  0.0]
         [0.0  0.0  1.0]

J_emit = [1.0  0.0  0.0]
         [0.0  1.0  0.0]
         [0.0  0.0  1.0]
```

---

## Appendix B: Valence Offset Vectors Summary

```
v_inject:    bone:  [+0.2, 0.0, +0.1]    boon:  [+0.4, +0.1, +0.2]
             bane:  [+0.2, -0.1, -0.1]   bonk:  [+0.6, 0.0, 0.0]
             honk:  [+0.3, 0.0, +0.3]

v_tap:       bone:  [0.0, 0.0, +0.2]    boon:  [0.0, +0.2, +0.3]
             bane:  [0.0, -0.2, +0.1]   bonk:  [+0.1, 0.0, +0.4]
             honk:  [0.0, 0.0, +0.5]

v_wave:      bone:  [0.0, -0.05*k, 0.0]  boon:  [+0.05, +0.05, 0.0]
             bane:  [0.0, -0.1, -0.05]  bonk:  [+0.1, 0.0, 0.0]
             honk:  [0.0, 0.0, +0.05]

v_couple:    bone:  [0.0, +0.1, +0.1]    boon:  [0.0, +0.2, +0.2]
             bane:  [-0.1, -0.1, 0.0]   bonk:  [+0.2, +0.2, 0.0]
             honk:  [0.0, +0.3, +0.2]

v_probe:     bone (T): [0.0, 0.0, +0.3]  bone (F): [0.0, 0.0, +0.2]
             boon (T): [+0.1, +0.1, +0.4]
             bane (T): [-0.1, -0.1, +0.2]
             bonk:     [+0.2, 0.0, +0.3]
             honk (T): [0.0, 0.0, +0.5]

v_branch:    bone:  [0.0, 0.0, +0.15]    boon:  [0.0, +0.1, +0.2]
             bane:  [0.0, -0.1, +0.1]   bonk:  [+0.1, 0.0, +0.2]
             honk:  [0.0, 0.0, +0.3]

v_bias:      bone:  [0.0, 0.0, +0.05]    boon:  [0.0, +0.1, +0.1]
             bane:  [0.0, -0.05, -0.1]  bonk:  [+0.05, 0.0, +0.1]
             honk:  [0.0, 0.0, +0.2]

v_emit:      bone:  [0.0, 0.0, +0.2]    boon:  [0.0, +0.1, +0.2]
             bane:  [0.0, -0.1, -0.1]   bonk:  [+0.1, 0.0, +0.1]
             honk:  [0.0, 0.0, +0.3]
```

---

**Status**: Phase 1 formalization complete. Ready for Phase 2 (Lens Algebra).

**Next**: Create LENS-ALGEBRA.md with formal group structure for lenses.
