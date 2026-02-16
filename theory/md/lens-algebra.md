# Lens Algebra: Formal Group Structure & Multi-Representation

**Version**: 0.1.0-alpha
**Status**: Research / Formalization Phase 2
**Authors**: Claude Code, spwashi

---

## 1. Overview

This document formalizes Spw lenses as a **group structure** operating on the semantic manifold. Each lens is a perspective transform that reweights and reinterprets the same underlying semantic state. The formalism provides:

- **Lens as morphisms** — invertible transformations on the manifold
- **Group structure** — composition, identity, inverse, associativity
- **Weighting matrices** — how each lens rescales the three semantic dimensions
- **Semantic isotopes** — same seed produces different meanings through different lenses
- **Cross-lens consistency** — probes remain valid across lens transformations
- **Commutativity analysis** — which lens pairs preserve order-independence

---

## 2. Semantic Isotopes & Multi-Representation

### 2.1 Canonical Definition

A **semantic isotope** is the same syntactic expression observed through different perspective lenses.

```
Given: seed S (syntactic expression)

Through lens ℓ₁: eval(S, ℓ₁) = semantic trajectory τ₁
Through lens ℓ₂: eval(S, ℓ₂) = semantic trajectory τ₂

τ₁ ≠ τ₂  (different trajectories, same seed)

BUT: underlying register sequence is identical (same #!, #^, #~, etc.)
     only the interpretation (weighting) differs
```

### 2.2 Example: A Multi-Lens Seed

```spw
^["greeting"]{ !["hello"] }
```

**Compiler Lens** (`compiler@`):
- Sees: Named binding `greeting` with value `"hello"`
- Trajectory: high clarity (c ≈ 1.0), moderate intensity (i ≈ 0.6)
- Focus: semantic correctness, binding structure

**Designer Lens** (`designer@`):
- Sees: Visual component to be styled
- Trajectory: high intensity (i ≈ 0.7), moderate clarity (c ≈ 0.5)
- Focus: layout, visual hierarchy, appearance

**User Lens** (`user@`):
- Sees: Interaction endpoint / message recipient
- Trajectory: high proximity (p ≈ 0.8), high intensity (i ≈ 0.8)
- Focus: accessibility, user experience, responsiveness

**Critic Lens** (`critic@`):
- Sees: Code smell (hardcoded literal instead of reference)
- Trajectory: low clarity (c ≈ 0.3), negative intensity (i ≈ 0.4, downweighted)
- Focus: improvements, risks, violations

All four interpretations are simultaneously valid. The **lens determines which one is foregrounded**.

---

## 3. Lenses as Formal Morphisms

### 3.1 Lens Definition

A **lens** is a triple:

```
ℓ = (name, W_ℓ, interpretation_mode)

where:
  name ∈ {compiler@, designer@, user@, critic@, ...}
  W_ℓ = 3×3 weighting matrix (rescales semantic dimensions)
  interpretation_mode = function that applies semantic rules specific to ℓ
```

### 3.2 Weighting Matrices

The core of each lens is a **diagonal weighting matrix** that rescales dimensions:

```
W_ℓ = [
  w_i    0     0      (intensity weight)
   0    w_p    0      (proximity weight)
   0     0    w_c     (clarity weight)
]

where w_i, w_p, w_c ∈ ℝ⁺ (positive scalars)
```

**Lens Weighting Profiles**:

```
compiler@:
  W = [1.0  0.0  0.0]   (balanced intensity)
      [0.0  0.6  0.0]   (low proximity—semantics are internal)
      [0.0  0.0  1.5]   (high clarity—correctness matters)

designer@:
  W = [1.2  0.0  0.0]   (high intensity—visual salience)
      [0.0  1.3  0.0]   (high proximity—relationships matter)
      [0.0  0.0  0.8]   (lower clarity—aesthetics trumps logic)

user@:
  W = [1.3  0.0  0.0]   (high intensity—user engagement)
      [0.0  1.5  0.0]   (very high proximity—user is center)
      [0.0  0.0  1.1]   (slightly higher clarity—UX clarity)

critic@:
  W = [0.7  0.0  0.0]   (downweight intensity—magnify gaps)
      [0.0  1.1  0.0]   (highlight disconnects)
      [0.0  0.0  1.4]   (emphasize missing clarity)

hardware@:
  W = [1.4  0.0  0.0]   (high intensity—physical presence)
      [0.0  0.9  0.0]   (lower proximity—components are separate)
      [0.0  0.0  1.2]   (high clarity—specs matter)

theatre@:
  W = [1.0  0.0  0.0]   (balanced intensity)
      [0.0  1.6  0.0]   (very high proximity—actors relate)
      [0.0  0.0  0.9]   (clarity less critical)

broadcast@:
  W = [1.5  0.0  0.0]   (very high intensity—mass reach)
      [0.0  0.5  0.0]   (low proximity—one-way medium)
      [0.0  0.0  1.3]   (high clarity—explicit messaging)
```

### 3.3 Applying a Lens Transformation

When seed S is evaluated through lens ℓ:

```
1. Compute base trajectory τ_base = eval(S)
   (independent of lens, just register updates and state changes)

2. Apply lens weighting to each state point s_k in trajectory:
   s_k' = W_ℓ · s_k

3. Produce lens-specific trajectory τ_ℓ = [s_0', s_1', ..., s_T']
```

**Important**: The **register sequence is unchanged**:

```
Base:  [#! ← 1, #^ ← 1, σ ← 0.2, ...]  (same for all lenses)
       s_0 → s_1 → s_2                  (base trajectory)

Through ℓ₁: τ₁ = W_ℓ₁ · [s_0 → s_1 → s_2]
Through ℓ₂: τ₂ = W_ℓ₂ · [s_0 → s_1 → s_2]

τ₁ and τ₂ have the same shape but different scales.
```

---

## 4. Group Structure: Lens Composition

### 4.1 Lens Composition Operation

Two lenses can be composed:

```
ℓ₁ ∘ ℓ₂ ≡ apply ℓ₂ first, then apply ℓ₁

In matrix form:
  W_{ℓ₁ ∘ ℓ₂} = W_{ℓ₁} · W_{ℓ₂}  (matrix multiplication)

(Note: matrix multiplication is NOT commutative, so lens order matters)
```

**Example**:

```
compiler@ ∘ designer@:
  W = [1.0  0.0  0.0]   [1.2  0.0  0.0]   [1.2  0.0  0.0]
      [0.0  0.6  0.0] · [0.0  1.3  0.0] = [0.0  0.78 0.0]
      [0.0  0.0  1.5]   [0.0  0.0  0.8]   [0.0  0.0  1.2]

Result: Design-first (high intensity & proximity from designer@),
        then compiler-ified (clarity emphasized, proximity reduced)
```

### 4.2 Group Axioms

**Associativity**:
```
(ℓ₁ ∘ ℓ₂) ∘ ℓ₃ = ℓ₁ ∘ (ℓ₂ ∘ ℓ₃)

Proof: Matrix multiplication is associative
  (W₁ · W₂) · W₃ = W₁ · (W₂ · W₃)
```

**Identity Element** `id`:
```
ℓ ∘ id = ℓ
id ∘ ℓ = ℓ

Where W_id = [1  0  0]
             [0  1  0]
             [0  0  1]  (no rescaling)

The "neutral observer" lens (unbiased perspective).
```

**Inverse Element** `ℓ⁻¹`:
```
ℓ ∘ ℓ⁻¹ = id
ℓ⁻¹ ∘ ℓ = id

Where W_{ℓ⁻¹} = (W_ℓ)⁻¹  (matrix inverse)

Example: If W_compiler@ = [1.0  0    0  ]
                          [0    0.6  0  ]
                          [0    0    1.5]

Then W_{compiler@⁻¹} = [1.0    0     0    ]
                       [0      1.67  0    ]
                       [0      0     0.67 ]

Applying compiler@ then compiler@⁻¹ returns to neutral viewing.
```

**Closure**:
```
For any ℓ₁, ℓ₂ ∈ Lenses: ℓ₁ ∘ ℓ₂ is also a valid lens
(composition of two weighting matrices is another weighting matrix)
```

**Structure**: Lenses form a **Lie group** GL(3, ℝ) restricted to diagonal matrices (since each lens only rescales dimensions, not mixes them).

---

## 5. Lens Commutativity & Order-Sensitivity

### 5.1 Commutativity Analysis

Two lenses **commute** if their weighting matrices commute:

```
ℓ₁ ∘ ℓ₂ = ℓ₂ ∘ ℓ₁  iff  W₁ · W₂ = W₂ · W₁
```

**Key Theorem**: All diagonal matrices commute.

```
Proof: Diagonal matrices commute under multiplication
  [a  0  0]   [d  0  0]   [ad  0   0 ]
  [0  b  0] · [0  e  0] = [0   be  0 ]
  [0  0  c]   [0  0  f]   [0   0   cf]

This equals:
  [d  0  0]   [a  0  0]   [ad  0   0 ]
  [0  e  0] · [0  b  0] = [0   be  0 ]
  [0  0  f]   [0  0  c]   [0   0   cf]
```

**Consequence**: **All lens pairs commute**.

```
compiler@ ∘ designer@ = designer@ ∘ compiler@
user@ ∘ critic@ = critic@ ∘ user@

This means lens order doesn't matter for the final semantic result.
```

### 5.2 Lens-Probe Consistency

**Theorem**: Probe results are **lens-invariant** (commute with lenses).

```
Given probe ?[cond] applied after seed S:

Through ℓ₁:  eval(?[cond], eval(S, ℓ₁)) → result_1
Through ℓ₂:  eval(?[cond], eval(S, ℓ₂)) → result_2

Claim: result_1 and result_2 represent the same semantic fact
       (up to lens-specific representation)

Formally: ℓ₁(?[cond] ∘ S) ≈ ?[cond] ∘ ℓ₁(S)
          (probe commutes with lens)
```

**Proof Sketch**:

```
Probe evaluates condition on the semantic state:
  if (state.intensity > threshold) then true_branch else false_branch

Probe result depends on relative ordering of dimensions, not absolute values.
Lenses rescale all dimensions uniformly (no rotation).
Therefore, relative orderings are preserved: lens(a) < lens(b) iff a < b.

Thus probes commute with lenses.
```

---

## 6. Semantic Isotopes: Same Seed, Different Meanings

### 6.1 Isotope Definition

Given seed S, the set of all lens perspectives is:

```
Isotope(S) = {ℓ(eval(S)) | ℓ ∈ Lenses}

This is the "orbit" of S under the group action of lenses.
```

**Properties**:

1. **Same Register Sequence**: All isotopes have identical register updates (#!, #^, etc.)
2. **Different State Trajectories**: Lenses rescale the manifold points differently
3. **Same Final Binding**: All lenses agree on what S "means" (unscaled register form)
4. **Different Salience**: Lenses emphasize different aspects (dimensions)

### 6.2 Example: Isotope of a Simple Seed

```spw
^["x"]{ !["value"] }
```

**Base Trajectory** (lens-independent):

```
t=0: s_0 = (0, 0, 0)           (initial latent state)
t=1: s_1 = apply_inject()      (inject "value")
     s_1 = (0.2, 0, 0.1)       (base semantic point)
t=2: s_2 = apply_tap()         (tap establishes binding)
     s_2 = (0.2, 0, 0.3)       (clarity boosted)
```

**Isotopes** (lens-dependent):

```
Through compiler@:  s_1' = (0.2, 0, 0.15)    (clarity emphasized)
                    s_2' = (0.2, 0, 0.45)
                    Interpretation: "Correct binding"

Through designer@:  s_1' = (0.24, 0, 0.08)   (intensity & proximity)
                    s_2' = (0.24, 0, 0.24)
                    Interpretation: "Visual element"

Through critic@:    s_1' = (0.14, 0, 0.14)   (downweighted intensity)
                    s_2' = (0.14, 0, 0.42)
                    Interpretation: "Hardcoded antipattern"

Through user@:      s_1' = (0.26, 0, 0.33)   (user-focused)
                    s_2' = (0.26, 0, 0.33)
                    Interpretation: "User-facing value"
```

All interpretations coexist. The lens determines which is **foregrounded** for analysis or display.

---

## 7. Saturation & Resonance Across Lenses

### 7.1 Lens-Independent Saturation

**Key Property**: Saturation `σ` is **lens-independent**.

```
σ(eval(S, ℓ₁)) = σ(eval(S, ℓ₂))

Proof: Saturation is defined as: σ = fraction of registers filled

Register fill is based on which operators executed, not their weighting.
Lenses only rescale (W_ℓ), not change which operators ran.
```

**Consequence**:

```
All lenses agree on "how resolved" the state is.
They disagree on "what it means," not "how certain it is."
```

### 7.2 Resonance as Multi-Lens Superposition

When multiple lenses are simultaneously active, the state is in **resonance**:

```
ρ (resonance count) = number of active lenses

If three lenses (compiler@, designer@, user@) are simultaneously used:
  ρ = 3

Saturation can be partial:  σ ∈ (0, 1)
Resonance can be multiple:  ρ > 1

This represents "ambiguity from multiple perspectives"—the seed is not yet
committed to a single interpretation.
```

---

## 8. Cross-Lens Operations

### 8.1 Lens-Switching During Evaluation

When the lens changes mid-evaluation:

```
Seed S evaluated as:
  phase 1: through ℓ₁ → produces τ₁[0..k]
  phase 2: switch to ℓ₂ → produces τ₂[k..T]

The resulting trajectory is a **composition**:
  τ_mixed = W_{ℓ₁} · [s_0 → ... → s_k] ++ W_{ℓ₂} · [s_k' → ... → s_T]

But since ℓ₁ and ℓ₂ commute, the final state is independent of switch order.
```

### 8.2 Lens-Diff Visualization

For debugging and analysis, a "lens-diff" shows what changes between lenses:

```
seed = ^["x"]{ ![val] }

compiler@ interpretation: (intensity, proximity, clarity) = (0.2, 0, 0.45)
designer@ interpretation:                                 (0.24, 0, 0.24)

diff = designer@ - compiler@:  (+0.04, 0, -0.21)

Meaning: Designer sees higher intensity but lower clarity (trade-off).
```

### 8.3 Lens-Specific Probes

A probe can be qualified by a lens:

```
?[condition]@compiler@    (evaluate condition through compiler lens)
?[condition]@designer@    (evaluate condition through designer lens)

Both should produce the same boolean result (lens-invariance of probes),
but the saturation jump may differ based on lens's emphasis.
```

---

## 9. Lens Integration with Register Algebra

### 9.1 Lenses Don't Modify Registers

Lenses operate **orthogonally** to registers:

```
Register updates (from OPERATOR-ALGEBRA.md):
  #! ← #! + 1
  σ ← σ + Δσ

These are lens-independent. All lenses observe the same register values.

Lenses only rescale the semantic point representation.
```

### 9.2 Register Invariants Under Lens Transformation

**Theorem**: For any lens ℓ and any expression E:

```
registers(eval(E, ℓ)) = registers(eval(E, id))

All lenses see the same register history.
```

**Consequence**:

```
Debugging via register trace works across all lenses.
Optimization based on register sequences is lens-independent.
```

---

## 10. Practical: Lens Construction Guide

### 10.1 Defining a New Lens

To add a new lens `custom@`:

1. **Choose weighting priorities**:
   ```
   w_i = how much intensity matters (usually 1.0 - 1.5)
   w_p = how much proximity matters (usually 0.5 - 1.5)
   w_c = how much clarity matters (usually 0.8 - 1.5)
   ```

2. **Construct weighting matrix**:
   ```
   W_custom@ = [w_i  0    0  ]
               [0    w_p  0  ]
               [0    0    w_c]
   ```

3. **Add interpretation rules** (optional, for semantic diff):
   ```
   How does custom@ interpret operators differently?
   E.g., custom@ might downweight some operators or emphasize others.
   ```

4. **Test commutativity** (should be automatic, but verify):
   ```
   custom@ ∘ compiler@ should equal compiler@ ∘ custom@
   ```

### 10.2 Example: Adding `mathematician@`

```
mathematician@:
  W = [1.0  0.0  0.0]    (balanced intensity—math objects are abstract)
      [0.0  0.9  0.0]    (lower proximity—mathematical objects are free-standing)
      [0.0  0.0  1.8]    (very high clarity—rigor and proof matter)

Interpretation: Emphasize logical correctness and formal structure.
Downplay visual layout and user interaction.
```

---

## 11. Multi-Representation: The Isotope Property

### 11.1 Formal Statement

**Theorem (Semantic Isotopy)**: For any Spw seed S and any two lenses ℓ₁, ℓ₂:

```
eval(S, ℓ₁) and eval(S, ℓ₂) represent the same semantic object,
viewed through different coordinate systems.

Mathematically: There exists an invertible linear transformation T such that:
  eval(S, ℓ₂) = T · eval(S, ℓ₁)
```

**Proof**:

```
Let τ_base = eval(S) (base trajectory)

Then: eval(S, ℓ₁) = W_{ℓ₁} · τ_base
      eval(S, ℓ₂) = W_{ℓ₂} · τ_base

Thus: eval(S, ℓ₂) = W_{ℓ₂} · (W_{ℓ₁})⁻¹ · eval(S, ℓ₁)

Setting T = W_{ℓ₂} · (W_{ℓ₁})⁻¹, we have the invertible transformation.
```

### 11.2 Isotopy in Practice

**What this means**:

- **Same seed, many interpretations** — Don't duplicate code for each lens
- **Lenses are views, not duplicates** — Single AST serves all lenses
- **Cross-lens queries are valid** — Ask "is this binding used?" across all lenses simultaneously
- **Single source of truth** — The base trajectory (register sequence) is canonical

---

## 12. Category-Theoretic View (Optional)

### 12.1 Lenses as Endomorphisms

In category theory, lenses are **endomorphisms** on the semantic manifold:

```
ℓ: S → S   (mapping the manifold to itself)

Composition of lenses: ℓ₁ ∘ ℓ₂: S → S → S

Identity: id: S → S (neutral lens)

Inverse: ℓ⁻¹ such that ℓ ∘ ℓ⁻¹ = id
```

### 12.2 Natural Transformation Between Lenses

A **natural transformation** between lenses ℓ₁ and ℓ₂ is a consistent way to convert interpretations:

```
τ: ℓ₁ ⇒ ℓ₂

This is exactly the isotopy transformation T = W_{ℓ₂} · (W_{ℓ₁})⁻¹
```

---

## 13. Limitations & Future Extensions

### 13.1 Current Model Limitations

1. **Diagonal matrices only** — Current lenses don't mix dimensions. A future extension could allow rotations and shears.
2. **Positive weights only** — Can't invert dimensions (e.g., make high intensity mean "low salience"). Could extend to ℝ.
3. **Finitary lens set** — Currently enumerate lenses explicitly. Could generalize to infinite-dimensional lens spaces.

### 13.2 Potential Extensions

**Spectral Lenses**:
```
Use eigenvalue decomposition to create "canonical" lenses aligned with principal components.
```

**Continuous Lens Spaces**:
```
Parameterize lenses by continuous variables:
  ℓ(α, β, γ) = [α  0  0]
               [0  β  0]
               [0  0  γ]

Explore which (α, β, γ) configurations are semantically meaningful.
```

**Lens Hierarchies**:
```
Organize lenses in hierarchy:
  top-level: {hardware@, theatre@, broadcast@}
  mid-level: {compiler@, designer@, user@}
  low-level: {custom1@, custom2@, ...}

Each lens family has different weighting priorities.
```

---

## 14. References

- **SPEC.md § 8**: Lenses and multi-representation (foundational)
- **OPERATOR-ALGEBRA.md**: Register-based operator semantics
- **PROBE-CALCULUS.md**: How probes interact with lenses
- **RUNTIME-TRAJECTORY-MODEL.md**: Implementing lens transformations at runtime

---

**Status**: Phase 2 complete (Lens algebra formalized).

**Next**: Create PROBE-CALCULUS.md integrating measurement theory with saturation model.
