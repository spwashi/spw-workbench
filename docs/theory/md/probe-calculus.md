# Probe Calculus: Measurement Theory & Saturation Semantics

**Version**: 0.1.0-alpha
**Status**: Research / Formalization Phase 2
**Authors**: Claude Code, spwashi

---

## 1. Overview

This document formalizes Spw probes as **measurement operators** that induce semantic collapse. The formalism provides:

- **Probes as projections** — measurement collapses latent fields to specific values
- **Saturation model** — degrees of resolution from latent (σ=0) to saturated (σ=1)
- **Resonance** — partial resolution where multiple paths coexist (σ≈0.5)
- **Measurement uncertainty** — probe variance depends on intensity
- **Cascading probes** — sequential measurements with state dependencies
- **Entanglement** — coupled elements share probe results
- **Reversibility** — probes observe without mutating original state

---

## 2. Measurement Framework

### 2.1 Latent vs. Collapsed States

**Latent State** (before probing):

```
State space S consists of all possible semantic interpretations.
A seed S in latent form occupies the entire space (unresolved).

Mathematically: The state is described by a probability distribution
over all possible values, not a single point.
```

**Collapsed State** (after probing):

```
A probe ?[condition] forces the state to collapse to one specific point
(or narrow range).

After probe: State is deterministic (or mostly deterministic if uncertain).
```

### 2.2 Saturation Continuum

Saturation `σ ∈ [0, 1]` measures how much the field has collapsed:

```
σ = 0.0  Fully latent (no collapse, infinite superposition)
σ = 0.25 Weakly resolved (one region of possibility space narrowed)
σ = 0.5  Resonant (multiple paths still coexist, but structure apparent)
σ = 0.75 Mostly saturated (few paths remain)
σ = 1.0  Fully saturated (single trajectory, no ambiguity)
```

**Key Semantics**:

```
σ < 0.5:  The seed is amenable to multiple interpretations.
          Lenses reveal different meanings.
          Probes have high variance.

σ = 0.5:  Resonant state. The field oscillates between interpretations.
          Like standing wave patterns in optics—stable but complex.
          Multiple lenses coexist as a superposition.

σ > 0.5:  The seed has been sufficiently constrained.
          Interpretations converge.
          Most lenses agree on the basic meaning.

σ = 1.0:  Fully resolved. Single meaning, no ambiguity.
          Lenses might emphasize different aspects, but agree on core.
```

### 2.3 Saturation as Filtration

Saturation defines a **filtration** (hierarchical structure) on the state space:

```
S_0 ⊂ S_{0.25} ⊂ S_{0.5} ⊂ S_{0.75} ⊂ S_1

where S_σ is the subset of interpretations consistent with saturation level σ

Example:
  S_0 = all possible meanings of the seed
  S_{0.5} = meanings that survive basic probing
  S_1 = single canonical meaning
```

This is a **spectral sequence** in algebraic topology—each level reveals more structure.

---

## 3. Probe as Measurement Operator

### 3.1 Mathematical Model

A probe `?[condition]` is a **projection operator** onto a subspace:

```
π: S → S'

where S' is the subspace satisfying condition.

Formally: π(s) = {
  s           if condition(s) = true
  reflected_s if condition(s) = false
}
```

**Idempotence** (defining property of projections):

```
π ∘ π = π

Applying the same probe twice gives the same result as applying once.
(Measurement is stable.)
```

### 3.2 Bifurcation Structure

The probe creates a **bifurcation**:

```
Initial state s_before splits into two branches:

Branch True:  s_true = apply_jacobian_true(s_before)
Branch False: s_false = apply_jacobian_false(s_before)

Selection: One branch is taken (determined by register_probe_count mod 2
           or explicit branch selection via `|`).
```

**Register Update**:

```
#? ← #? + 1           (probe count increments)
ρ ← 1                 (resonance collapses from multi-path to single)
σ ← σ + Δσ_probe      (saturation jumps)

where Δσ_probe = (1 - σ) * 0.3  (increase by 30% of remaining uncertainty)
```

### 3.3 Measurement Uncertainty Principle

Probes have inherent **uncertainty**:

```
The result of a probe depends on the current intensity.
High intensity → deterministic result.
Low intensity → noisy, unpredictable result.

Formally: Variance of probe outcome ∝ (1 - i)²

where i is intensity before probe.
```

**Quantum Analogy**:

```
In quantum mechanics: Δx · Δp ≥ ℏ/2 (uncertainty principle)

In Spw: Δprobe_result ∝ (1 - intensity)

"You can't measure something with high precision unless it has high presence."
```

**Implication**:

```
If intensity i < 0.3 (low presence):
  Probe result has ±0.2 variance
  Multiple measurements might give different results

If intensity i > 0.7 (high presence):
  Probe result is ~deterministic (variance < 0.05)
  Multiple measurements agree
```

---

## 4. Saturation Dynamics

### 4.1 Monotonicity

**Theorem**: Saturation is **monotonically increasing**.

```
σ_t ≤ σ_{t+1} for all operator steps t

Proof: Every operator either maintains σ or increases it.
No operator decreases σ (immutability of history).

σ is cumulative—once a region is resolved, it stays resolved.
```

### 4.2 Saturation Increase by Operator

Different operators increase saturation differently:

```
Inject (!):       Δσ = +0.05 to +0.15  (mild increase)
Tap (^):          Δσ = +0.05 to +0.10  (light increase)
Wave (~):         Δσ = +0.05 * n       (per n iterations, gradual)
Couple (<>):      Δσ = +0.08 to +0.15  (mild to moderate)
Probe (?):        Δσ = +0.20 to +0.40  (significant jump)
Branch (*):       Δσ = +0.10 to +0.25  (moderate jump)
Bias (=):         Δσ = +0.02 to +0.08  (small increase)
Emit (@):         Δσ = +1.0            (lock to full saturation)
```

**Intuition**:

```
Probes and branches RESOLVE (force collapse), so big saturation jumps.
Inject and tap ADD STRUCTURE, so modest increases.
Emit LOCKS the result, so jump to maximum.
```

### 4.3 Saturation as a Thermodynamic Analog

**Energy Analogy**:

```
Think of saturation as "phonons" (quanta of semantic structure).
- Low saturation: high entropy, many possible interpretations
- High saturation: low entropy, single canonical interpretation
- Probes "cool" the system (reduce entropy)
- Emit is "absolute zero" (zero entropy, fully crystallized)

Mathematical: "Semantic entropy" S_ent = -∫ σ(x) log σ(x) dx

As σ increases, entropy decreases.
```

---

## 5. Resonance: Partial Resolution

### 5.1 Resonant State

When `σ ≈ 0.5`, the system is in a **resonant state**:

```
Definition: Resonance occurs when multiple latent paths coexist
without full collapse.

Resonance count ρ = number of concurrent interpretations

ρ = 1:  Single path (resolved)
ρ > 1:  Multiple paths (latent superposition)
```

### 5.2 Standing Wave Analogy

In optics, standing waves are stable superpositions of forward and backward waves.

In Spw, resonance is a stable superposition of multiple semantic paths:

```
The seed oscillates between interpretations without converging.

Example: A word with multiple meanings in the same sentence.

^["bank"]{
  !boon["financial_institution"]
| !bane["river_edge"]
}

If neither probe nor context resolves the ambiguity, the meaning
"resonates" between both—simultaneously valid.
```

### 5.3 Resonance & Multi-Lens Interpretation

Resonance is closely related to multi-representation:

```
When σ = 0.5 (resonant):
  - Multiple lenses see different "peak" interpretations
  - Each lens emphasizes a different frequency in the resonance
  - No single interpretation dominates

When σ → 1.0 (saturated):
  - Lenses converge on the same meaning
  - One interpretation "locks in," others fade
```

---

## 6. Cascading & Composite Probes

### 6.1 Sequential Probes

Multiple probes can be chained:

```
?[condition_1] .. ?[condition_2] .. ?[condition_3]

First probe narrows the state to satisfy condition_1.
Second probe further narrows to satisfy condition_2.
Third probe further narrows to satisfy condition_3.

Final result: state satisfying all three conditions (if consistent).
```

**Register Update**:

```
#? ← #? + 3         (probe count increments by 3)
σ ← σ + Δσ₁ + Δσ₂ + Δσ₃   (saturation increases with each probe)

Final saturation:   σ_final = σ_initial + sum of Δσ values
```

**Consistency Requirement**:

```
If conditions are mutually contradictory:
  condition_1 AND condition_2 = false (impossible)

Then the probe chain fails (exception).
The state cannot satisfy both constraints.
```

### 6.2 Probe Composition Algebra

Probe composition follows **lattice algebra**:

```
If π₁ and π₂ are projections:
  π₁ ∘ π₂ is also a projection  (closed under composition)

Semantically: Probing for condition_1 then condition_2
            = probing for (condition_1 AND condition_2)
```

### 6.3 Bifurcating Probes

A probe with explicit branching:

```
?[condition]{
  !["true branch"]
| !["false branch"]
}
```

Both branches are present (not yet resolved), creating two concurrent paths:

```
ρ ← 2   (resonance: two paths)
σ ← σ + 0.3 * (1 - σ)   (partial saturation)
```

**Resolution via Path Selection**:

```
An external selector (like a subsequent probe) can pick which branch.

Example:
  ?[x > 0]{!["positive"] | !["negative"]}
  then @[selected_branch]

The emit picks one branch based on runtime value.
```

---

## 7. Entanglement: Coupled Elements & Shared Probes

### 7.1 Entanglement through Coupling

When two elements are coupled `<>[a, b]`:

```
Their semantic states remain synchronized: s_a ≈ s_b

If probe ?[condition] is applied to a:
  The probe result automatically applies to b as well.

This is quantum-like entanglement (but deterministic).
```

### 7.2 Measurement of Entangled Pair

```
Initial: <>[x, y]  (coupled)

Probe: ?[x > 0]    (measure x)

Consequence:
  - x's state collapses to "x > 0" region
  - y's state automatically collapses to same region
  - Both are measured "at once"
  - No communication needed (deterministic)
```

**Register Update**:

```
#? ← #? + 1         (single probe)
#<> remains unchanged (coupling persists)

Both x and y's saturation increases:
  σ_x ← σ_x + Δσ
  σ_y ← σ_y + Δσ    (same update)
```

### 7.3 No-Signaling Property

Entanglement respects **no-signaling**:

```
Information cannot be sent via entanglement.

Reason: Coupled elements always agree (deterministically).
The coupling mechanism is local (no action-at-a-distance).
```

---

## 8. Reversibility & Immutability

### 8.1 Measurement Reversibility

**Theorem**: Probes do not mutate the original state. They observe without changing.

```
s_original remains unchanged.
Probe creates a new view of s_original.

Mathematically: π is a projection (not mutation).
              π(s) ≠ s (new point)
              but s persists (unmutated)
```

**Implementation Implication**:

```
Probes should NOT modify the underlying state in place.
Instead, create a new state view:

s_probed = clone(s_original).apply_probe_jacobian()
s_original remains intact.
```

### 8.2 Immutability of Trajectory

The **trajectory through semantic space** is immutable:

```
Once a state transition s_t → s_{t+1} has occurred,
it becomes part of the trajectory history.

Later probes cannot retroactively change s_t.

Proof: Saturation is monotonic (never decreases).
       If s_t was probed and σ increased, it stays increased.
```

### 8.3 Copying vs. Aliasing

**Copying** a state (making independent clone):

```
s_copy = copy(s_original)
probe(s_copy)

s_original is unaffected. s_copy is modified by probe.
```

**Aliasing** (sharing reference):

```
s_alias = s_original  (same object)
probe(s_alias)

Both s_original and s_alias see the probe effect
(because they're the same object).
```

**Semantic Choice**: Spw treats all operations as **copying**  (functional paradigm). Probes don't mutate in-place.

---

## 9. Measurement Axioms

### 9.1 Linearity

Probes distribute over linear combinations:

```
?[cond] applied to (s₁ + s₂) = ?[cond] s₁ + ?[cond] s₂

(If condition is linear, probing the sum equals probing components)
```

### 9.2 Orthogonality

Independent probes are orthogonal:

```
?[x > 0] and ?[y > 0] are independent if x and y are independent.

Applying both probes in sequence collapses to the intersection:
  ?[y > 0] ∘ ?[x > 0] → state where both x > 0 AND y > 0
```

### 9.3 Consistency

The same probe applied twice gives the same result:

```
π ∘ π = π  (idempotence)

proof_result = ?[cond]
proof_result_again = ?[cond]

Both equal the same value.
```

### 9.4 Reversibility (Stated Formally)

```
Original state s is recoverable from probed state π(s)
via the inverse projection π⁻¹:

π⁻¹(π(s)) = s

This models: Measurement does not destroy information
            (only makes it latent).
```

---

## 10. Cross-Lens Probe Consistency

### 10.1 Lenses Preserve Probe Results

**Theorem**: Probe results are **lens-invariant**.

```
Given seed S evaluated through lenses ℓ₁ and ℓ₂:

?[cond] applied in ℓ₁ view:  result_1 = true or false
?[cond] applied in ℓ₂ view:  result_2 = true or false

Claim: result_1 = result_2 (same boolean result)
```

**Proof**:

```
Probes evaluate conditions on state components.
Conditions compare relative magnitudes (e.g., i > 0.3).

Lenses rescale all dimensions uniformly (diagonal matrices).
Uniform rescaling preserves relative orderings:

If i > p through lens ℓ₁:
  ℓ₁(i) > ℓ₁(p)

Then: ℓ₂(i) > ℓ₂(p) as well (through lens ℓ₂)
  (because ℓ₂ = diagonal matrix · ℓ₁)

Therefore, probes commute with lens transformations.
```

### 10.2 Saturation is Lens-Independent

**Theorem**: Saturation `σ` is the same across all lenses.

```
σ(eval(S, ℓ₁)) = σ(eval(S, ℓ₂))
```

**Proof**:

```
Saturation counts how many operators (registers) have been evaluated.
This is independent of lens weighting.

All lenses execute the same sequence of operators (same #!, #^, etc.).
Only the manifold point representation differs.
```

---

## 11. Advanced: Quantum-Like Behaviors

### 11.1 Superposition

In Spw, **superposition** corresponds to latent resonance:

```
Before probe: Seed is in superposition of multiple meanings.
             σ < 0.5, ρ > 1

After probe: One meaning is selected (collapsed).
            σ > 0.5, ρ = 1
```

### 11.2 Decoherence

**Decoherence** occurs when resonance is interrupted by external constraints:

```
Example: A seed with two interpretations (superposition)
         is constrained by bias=[meaning: primary_only]

Result: The superposition is disrupted.
        Only one interpretation survives.
        Saturation increases (decoherence = collapse).
```

### 11.3 Quantum Tunneling Analogy

Some probes might allow "tunneling" to lower-probability states:

```
If a probe has low confidence (high variance), it might
select a state that seems unlikely based on intensity.

This is similar to quantum tunneling:
  Particle jumps through energy barrier to low-probability region.

In Spw: Low-intensity probe might select unexpected branch
        due to measurement noise.
```

---

## 12. Practical: Probe Patterns

### 12.1 Simple Probe-Branch

```spw
?[x > 0]{
  !["positive"]
| !["negative"]
}
```

**Semantics**:
- Evaluate condition: x > 0?
- If true: execute branch 1 (emit "positive"), branch 2 unreached
- If false: execute branch 2 (emit "negative"), branch 1 unreached
- Saturation increases by ~0.3

### 12.2 Cascading Probes (Filtering)

```spw
?[x > 0]{
  ?[x < 100]{
    !["in range"]
  | !["too large"]
  }
| !["negative"]
}
```

**Semantics**:
- First probe: is x positive?
- If yes, second probe: is x less than 100?
- If yes, emit "in range"
- Saturation increases with each probe step

### 12.3 Coupled Probe

```spw
<>[s1, s2] .. ?[s1 > 10]{
  ![s1] & ![s2]   (both affected by probe)
}
```

**Semantics**:
- Couple s1 and s2 (entangle them)
- Probe s1
- Both s1 and s2 collapse to the same region
- Emit both (they're still synchronized)

---

## 13. References

- **SPEC.md § 9**: Probe calculus (foundational)
- **SPEC.md § 9.1**: Saturation model (connected)
- **OPERATOR-ALGEBRA.md § 7.5**: Probe operator details
- **LENS-ALGEBRA.md § 10.2**: Lens-probe consistency
- **CONTAINER-TOPOLOGY.md**: How probes interact with container boundaries

---

**Status**: Phase 2 complete (Probe calculus formalized).

**Next**: Create CONTAINER-TOPOLOGY.md with boundary operators and polarity inversion.
