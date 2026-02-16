# Runtime Trajectory Model: Implementation Design for Phase 5

**Version**: 0.1.0-alpha
**Status**: Planning / Design
**Authors**: Claude Code, spwashi

---

## 1. Overview & Vision

The **Semantic Trajectory Model** replaces flat value semantics with rich trajectory tracking. Every seed evaluation produces a complete history of state transitions through the semantic manifold, enabling:

- **Deterministic reproducibility** — same seed + context = same trajectory hash
- **Lens-aware interpretation** — trajectory recorded through each lens perspective
- **Saturation tracking** — how much of the field has been resolved
- **Debug visibility** — step-by-step manifold traversal
- **Verification** — proof that evaluation follows formal semantics

This document designs the runtime implementation (Phase 5) based on the formalizations in OPERATOR-ALGEBRA.md, LENS-ALGEBRA.md, PROBE-CALCULUS.md, and CONTAINER-TOPOLOGY.md.

---

## 2. Core Data Structures

### 2.1 Semantic Point & Trajectory

```typescript
// src/runtime/state/semantic-state.ts

/** A point on the 3D semantic manifold */
type SemanticPoint = {
  intensity: number;    // i ∈ [0, 1]
  proximity: number;    // p ∈ [0, 1]
  clarity: number;      // c ∈ [0, 1]
};

/** A single state transition step */
interface TransitionStep {
  // Operator that caused this transition
  operator: OperatorKind;
  valence: Valence;

  // State before and after
  state_before: SemanticPoint;
  state_after: SemanticPoint;

  // How the transition happened (mathematical model)
  coupling_matrix: Matrix3x3;  // C (dimension coupling effects)
  jacobian: Matrix3x3;         // J_op (operator-specific)
  offset: Vector3;             // v_op (valence-dependent offset)

  // Register state at this step
  registers: RegisterState;

  // Metadata
  timestamp: number;
  lens_perspective: LensMorphism;  // Which lens observed this step
  saturation_before: number;
  saturation_after: number;
}

/** Complete evaluation trajectory */
interface SemanticTrajectory {
  seed: SeedNode;                    // What was evaluated
  initial_state: SemanticPoint;      // (0, 0, 0)
  steps: TransitionStep[];           // Sequence of transitions
  final_state: SemanticPoint;        // Result at end
  final_registers: RegisterState;    // Final register values

  // Derived properties
  saturation_level: number;          // Final σ
  resonance_count: number;           // Final ρ
  trajectory_hash: string;           // SHA256 of trajectory

  // Curves through the manifold
  intensity_curve: number[];         // [i_0, i_1, ..., i_T]
  proximity_curve: number[];         // [p_0, p_1, ..., p_T]
  clarity_curve: number[];           // [c_0, c_1, ..., c_T]
}
```

### 2.2 Register State

```typescript
// src/runtime/state/registers.ts

interface RegisterState {
  // Semantic registers
  saturation: number;         // σ ∈ [0, 1]
  resonance: number;          // ρ ∈ ℕ (concurrent paths)
  phase: OperatorKind[];      // ψ (sequence of operators)
  polarity: 'inward' | 'outward' | 'neutral';  // μ
  bindings: Map<string, SemanticPoint>;        // β

  // Lexical registers (counters)
  inject_count: number;       // #!
  tap_count: number;          // #^
  wave_phase: number;         // #~
  couple_depth: number;       // #<>
  probe_count: number;        // #?
  branch_count: number;       // #*
  constraint_count: number;   // #=
  emit_count: number;         // #@
  reflect_count: number;      // ##
}
```

### 2.3 Dimension Coupling Matrix

```typescript
// src/core/operators.ts (add to existing file)

/** Coupling matrix C showing how dimensions interact */
const DIMENSION_COUPLING: Matrix3x3 = [
  [1.0,  0.3,  0.6],    // intensity couples with proximity (0.3) and clarity (0.6)
  [0.2,  1.0,  0.4],    // proximity couples with intensity (0.2) and clarity (0.4)
  [0.5,  0.3,  1.0],    // clarity couples with intensity (0.5) and proximity (0.3)
];

/**
 * Apply dimension coupling to an offset vector.
 *
 * The effective change in each dimension depends on changes in others
 * (non-linear feedback).
 */
function apply_dimension_coupling(
  offset: Vector3,
  current_state: SemanticPoint
): Vector3 {
  // s_next = (I + C) · offset  (coupled offset)
  const coupled = matrix3_multiply(
    matrix3_add(IDENTITY_3x3, DIMENSION_COUPLING),
    offset
  );

  return coupled;
}
```

---

## 3. Operator Jacobians as Constants

### 3.1 Operator Jacobian Lookup Table

```typescript
// src/core/operators.ts (add to existing file)

const OPERATOR_JACOBIANS: Record<OperatorKind, Matrix3x3> = {
  inject: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  tap:    [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  wave:   [[1.0, 0.0, 0.0], [0.0, 0.95, 0.0], [0.0, 0.0, 0.95]],  // Damping
  couple: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  probe_true: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [1.0, 0.0, 1.0]],  // Clarity boost
  probe_false: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  branch: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  bias:   [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  emit:   [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
  reflect: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],  // Identity
};
```

### 3.2 Valence Offset Lookup Table

```typescript
// src/core/operators.ts (add to existing file)

const VALENCE_OFFSETS: Record<Valence, Record<OperatorKind, Vector3>> = {
  bone: {
    inject:  [0.2, 0.0, 0.1],
    tap:     [0.0, 0.0, 0.2],
    wave:    [0.0, -0.05, 0.0],    // Damping per iteration
    couple:  [0.0, 0.1, 0.1],
    probe:   [0.0, 0.0, 0.3],
    branch:  [0.0, 0.0, 0.15],
    bias:    [0.0, 0.0, 0.05],
    emit:    [0.0, 0.0, 0.2],
    reflect: [0.0, 0.0, 0.0],
  },
  boon: {
    inject:  [0.4, 0.1, 0.2],
    tap:     [0.0, 0.2, 0.3],
    wave:    [0.05, 0.05, 0.0],    // Amplifying
    couple:  [0.0, 0.2, 0.2],
    probe:   [0.1, 0.1, 0.4],
    branch:  [0.0, 0.1, 0.2],
    bias:    [0.0, 0.1, 0.1],
    emit:    [0.0, 0.1, 0.2],
    reflect: [0.0, 0.0, 0.0],
  },
  // ... bane, bonk, honk omitted for brevity
};

const SATURATION_DELTAS: Record<OperatorKind, (valence: Valence) => number> = {
  inject: (v) => ({ bone: 0.1, boon: 0.15, bane: 0.08, bonk: 0.2, honk: 0.12 })[v],
  tap:    (v) => ({ bone: 0.05, boon: 0.08, bane: 0.03, bonk: 0.1, honk: 0.08 })[v],
  wave:   (v) => (n) => 0.05 * n,  // Per iteration
  couple: (v) => ({ bone: 0.1, boon: 0.15, bane: 0.05, bonk: 0.2, honk: 0.18 })[v],
  probe:  (v) => () => (1 - current_saturation) * 0.3,  // Dynamic!
  // ... etc
};
```

---

## 4. Trajectory Builder in Interpreter

### 4.1 Integration Point in Evaluator

```typescript
// src/runtime/interpreter/interpreter.ts (modify existing)

class Interpreter {
  private trajectory: SemanticTrajectory;
  private current_state: SemanticPoint;
  private registers: RegisterState;

  constructor(seed: SeedNode, initial_lens?: LensMorphism) {
    this.trajectory = {
      seed,
      initial_state: [0, 0, 0],
      steps: [],
      final_state: [0, 0, 0],
      final_registers: empty_registers(),
      saturation_level: 0,
      resonance_count: 0,
      trajectory_hash: "",
      intensity_curve: [0],
      proximity_curve: [0],
      clarity_curve: [0],
    };

    this.current_state = [0, 0, 0];
    this.registers = empty_registers();
    this.current_lens = initial_lens || neutral_lens();
  }

  /**
   * Execute an operator and record the transition.
   */
  private apply_operator(
    op: OperatorKind,
    valence: Valence,
    context: EvaluationContext
  ): void {
    const state_before = [...this.current_state];
    const registers_before = { ...this.registers };

    // Calculate new state using Jacobian + coupling + valence
    const jacobian = OPERATOR_JACOBIANS[op];
    const offset = VALENCE_OFFSETS[valence][op];
    const coupled_offset = apply_dimension_coupling(offset, this.current_state);

    // State update
    this.current_state = matrix3_multiply(jacobian, this.current_state);
    this.current_state = vector3_add(this.current_state, coupled_offset);
    this.current_state = clamp_manifold(this.current_state);

    // Register update
    this.update_registers(op, valence);

    // Apply lens transformation
    const state_for_lens = matrix3_multiply(
      this.current_lens.weighting_matrix,
      this.current_state
    );

    // Record step
    const step: TransitionStep = {
      operator: op,
      valence,
      state_before,
      state_after: [...this.current_state],
      coupling_matrix: DIMENSION_COUPLING,
      jacobian,
      offset: coupled_offset,
      registers: { ...this.registers },
      timestamp: Date.now(),
      lens_perspective: this.current_lens,
      saturation_before: registers_before.saturation,
      saturation_after: this.registers.saturation,
    };

    this.trajectory.steps.push(step);
    this.trajectory.intensity_curve.push(this.current_state[0]);
    this.trajectory.proximity_curve.push(this.current_state[1]);
    this.trajectory.clarity_curve.push(this.current_state[2]);
  }

  private update_registers(op: OperatorKind, valence: Valence): void {
    // Increment lexical registers
    switch (op) {
      case '!': this.registers.inject_count++; break;
      case '^': this.registers.tap_count++; break;
      case '~': this.registers.wave_phase++; break;
      case '<>': this.registers.couple_depth++; break;
      case '?': this.registers.probe_count++; break;
      case '*': this.registers.branch_count++; break;
      case '=': this.registers.constraint_count++; break;
      case '@': this.registers.emit_count++; break;
      case '#': this.registers.reflect_count++; break;
    }

    // Update saturation
    const delta_sigma = SATURATION_DELTAS[op](valence);
    this.registers.saturation = Math.min(1.0, this.registers.saturation + delta_sigma);

    // Record phase
    this.registers.phase.push(op);
  }

  /**
   * Finalize the trajectory and compute trajectory hash.
   */
  finalize(): SemanticTrajectory {
    this.trajectory.final_state = [...this.current_state];
    this.trajectory.final_registers = { ...this.registers };
    this.trajectory.saturation_level = this.registers.saturation;
    this.trajectory.resonance_count = this.registers.resonance;
    this.trajectory.trajectory_hash = this.compute_trajectory_hash();

    return this.trajectory;
  }

  private compute_trajectory_hash(): string {
    const trajectory_str = JSON.stringify([
      this.trajectory.intensity_curve,
      this.trajectory.proximity_curve,
      this.trajectory.clarity_curve,
      this.trajectory.final_registers,
    ]);

    return sha256(trajectory_str);
  }
}
```

---

## 5. Lens Perspective Integration

### 5.1 Lens Application in Trajectory

```typescript
// src/core/lenses.ts (add to existing file)

interface LensMorphism {
  name: string;  // e.g., "compiler@", "designer@"
  weighting_matrix: Matrix3x3;
}

const LENS_WEIGHTING_MATRICES: Record<string, Matrix3x3> = {
  "compiler@": [[1.0, 0.0, 0.0], [0.0, 0.6, 0.0], [0.0, 0.0, 1.5]],
  "designer@": [[1.2, 0.0, 0.0], [0.0, 1.3, 0.0], [0.0, 0.0, 0.8]],
  "user@":     [[1.3, 0.0, 0.0], [0.0, 1.5, 0.0], [0.0, 0.0, 1.1]],
  "critic@":   [[0.7, 0.0, 0.0], [0.0, 1.1, 0.0], [0.0, 0.0, 1.4]],
  // ... more lenses
};

function get_lens(name: string): LensMorphism {
  return {
    name,
    weighting_matrix: LENS_WEIGHTING_MATRICES[name],
  };
}

/**
 * Apply lens transformation to a trajectory.
 * Returns a new trajectory as seen through this lens.
 */
function apply_lens_to_trajectory(
  trajectory: SemanticTrajectory,
  lens: LensMorphism
): SemanticTrajectory {
  return {
    ...trajectory,
    intensity_curve: trajectory.intensity_curve.map(
      (i) => i * lens.weighting_matrix[0][0]
    ),
    proximity_curve: trajectory.proximity_curve.map(
      (p) => p * lens.weighting_matrix[1][1]
    ),
    clarity_curve: trajectory.clarity_curve.map(
      (c) => c * lens.weighting_matrix[2][2]
    ),
    // Register state is lens-independent
    // Saturation is lens-independent
    trajectory_hash: trajectory.trajectory_hash,  // Same hash across lenses!
  };
}
```

---

## 6. Probe State & Saturation Management

### 6.1 Probe Handler with Saturation

```typescript
// src/runtime/interpreter/probe-handler.ts (NEW)

interface ProbeState {
  condition: Expression;
  intensity_before_probe: number;
  measurement_variance: number;  // Depends on intensity
  result: boolean;
  saturation_delta: number;
}

function evaluate_probe(
  condition: Expression,
  current_state: SemanticPoint,
  current_saturation: number
): ProbeState {
  // Evaluate condition on current state
  const result = eval_condition(condition, current_state);

  // Calculate measurement uncertainty
  const intensity = current_state[0];
  const measurement_variance = Math.pow(1 - intensity, 2) * 0.2;

  // Saturation increases by ~30% of remaining uncertainty
  const saturation_delta = (1 - current_saturation) * 0.3;

  return {
    condition,
    intensity_before_probe: intensity,
    measurement_variance,
    result,
    saturation_delta,
  };
}
```

---

## 7. Container State & Polarity Tracking

### 7.2 Polarity Inversion Detection

```typescript
// src/runtime/state/container-state.ts (NEW)

interface ContainerState {
  kind: 'body' | 'frame' | 'scope' | 'couple';
  polarity: 'inward' | 'outward';
  unresolved_references: string[];
  depth: number;
}

/**
 * Check if container should flip polarity.
 */
function should_invert_polarity(
  container: ContainerState,
  bindings: Map<string, any>
): boolean {
  if (container.kind !== 'body') return false;

  // Polarity inverts when all external references are resolved
  const all_resolved = container.unresolved_references.every(
    (ref) => bindings.has(ref)
  );

  return all_resolved;
}

/**
 * Update container polarity based on binding resolution.
 */
function update_container_polarity(
  container: ContainerState,
  bindings: Map<string, any>
): ContainerState {
  if (should_invert_polarity(container, bindings)) {
    return {
      ...container,
      polarity: container.polarity === 'inward' ? 'outward' : 'inward',
    };
  }
  return container;
}
```

---

## 8. Determinism & Reproducibility

### 8.1 Golden Snapshot Tests

```typescript
// tests/trajectory/determinism.test.ts (NEW)

describe('Trajectory Determinism', () => {
  it('same seed produces same trajectory hash', () => {
    const seed = parse("^['x']{!['value']}");
    const ctx1 = new EvaluationContext();
    const ctx2 = new EvaluationContext();

    const interp1 = new Interpreter(seed);
    const interp2 = new Interpreter(seed);

    const traj1 = interp1.eval(ctx1);
    const traj2 = interp2.eval(ctx2);

    expect(traj1.trajectory_hash).toBe(traj2.trajectory_hash);
  });

  it('trajectory is reproducible across multiple runs', () => {
    const seed = parse("~[5]{!['data']}");
    const hashes = [];

    for (let i = 0; i < 100; i++) {
      const interp = new Interpreter(seed);
      const traj = interp.eval(new EvaluationContext());
      hashes.push(traj.trajectory_hash);
    }

    // All 100 hashes should be identical
    expect(new Set(hashes).size).toBe(1);
  });

  it('trajectory is lens-invariant (same hash across lenses)', () => {
    const seed = parse("![hello]");
    const interp_c = new Interpreter(seed, get_lens('compiler@'));
    const interp_d = new Interpreter(seed, get_lens('designer@'));

    const traj_c = interp_c.eval();
    const traj_d = interp_d.eval();

    // Same trajectory hash despite different lenses
    expect(traj_c.trajectory_hash).toBe(traj_d.trajectory_hash);

    // But state curves are different (lenses rescale)
    expect(traj_c.intensity_curve).not.toEqual(traj_d.intensity_curve);
  });
});
```

---

## 9. Implementation Phases (Phase 5a-5e)

### 9.1 Phase 5a: Define Types & Storage

**Goal**: Add types to codebase, store trajectories in REPL history

**Files to Create/Modify**:
- `src/runtime/state/semantic-state.ts` (NEW) — Types
- `src/runtime/state/registers.ts` (NEW) — Register tracking
- `src/runtime/repl/repl.ts` (MODIFY) — Store trajectories in history
- `src/core/operators.ts` (ADD) — Jacobian lookup tables

**Milestones**:
- [ ] Compile without errors
- [ ] REPL stores trajectory for each evaluation
- [ ] Can inspect trajectory via `#trajectory` annotation

### 9.2 Phase 5b: Jacobian & Coupling Calculations

**Goal**: Implement dimension coupling and Jacobian multiplication

**Files to Create/Modify**:
- `src/core/math/matrix3.ts` (NEW) — 3×3 matrix operations
- `src/runtime/interpreter/state-transition.ts` (NEW) — Apply coupling
- Tests for matrix operations

**Milestones**:
- [ ] Matrix multiplication produces correct results
- [ ] Coupling matrix correctly mixes dimensions
- [ ] Saturation increases monotonically

### 9.3 Phase 5c: Wire Trajectory Building into Interpreter

**Goal**: Integrate trajectory tracking into main evaluation loop

**Files to Create/Modify**:
- `src/runtime/interpreter/interpreter.ts` (MODIFY) — Add trajectory building
- `src/runtime/interpreter/trajectory-builder.ts` (NEW) — Separate builder class

**Milestones**:
- [ ] Each operator execution records a TransitionStep
- [ ] Trajectory is complete and finalizable
- [ ] Stepping works (can pause/resume evaluation)

### 9.4 Phase 5d: Verify Determinism

**Goal**: Prove evaluations are deterministic and reproducible

**Files to Create/Modify**:
- `tests/trajectory/determinism.test.ts` (NEW)
- `tests/trajectory/golden-snapshots/` (NEW) — Golden trajectory files

**Milestones**:
- [ ] Same seed → same trajectory hash (100 runs)
- [ ] Trajectory hash is lens-independent
- [ ] Golden snapshot tests pass

### 9.5 Phase 5e: Integrate with Visualization

**Goal**: Display trajectories in 3D semantic space

**Files to Create/Modify**:
- `src/viz/flow/trajectory-visualizer.ts` (NEW) — 3D curve rendering
- `src/viz/state/saturation-visualizer.ts` (NEW) — Saturation curves
- `src/viz/state/register-viewer.ts` (NEW) — Show register state

**Milestones**:
- [ ] Can render trajectory as 3D curve
- [ ] Saturation bar shows progression
- [ ] Step-by-step animation works

---

## 10. References

- **OPERATOR-ALGEBRA.md**: Register and Jacobian details
- **LENS-ALGEBRA.md**: Weighting matrix definitions
- **PROBE-CALCULUS.md**: Saturation and measurement mechanics
- **CONTAINER-TOPOLOGY.md**: Polarity inversion rules
- **RUNTIME-TRAJECTORY-MODEL.md**: This document

---

## 11. Critical Success Metrics

1. **Determinism**: SHA256(trajectory) identical for same seed across 1000 runs
2. **Lens Invariance**: trajectory_hash unchanged when lens changes
3. **Saturation Monotonicity**: σ_{t} ≤ σ_{t+1} for all steps
4. **Reversibility**: Probes don't mutate original state
5. **Performance**: Trajectory recording adds < 10% overhead to evaluation time

---

**Status**: Phase 5 design document complete.

**Next**: Implement Phase 5a (define types) → 5b (Jacobians) → 5c (wire up) → 5d (verify) → 5e (visualize).
