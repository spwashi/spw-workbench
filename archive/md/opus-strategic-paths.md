# Opus Strategic Paths: Visual/UX + Architecture + Performance Mental Models

**Date Created**: January 19, 2026
**Purpose**: Define focused Opus workstreams for practical application of formalization
**Audience**: Opus (next session) + depth-loving engineers
**Status**: Ready for Opus to execute

---

## Overview: Three Integrated Paths

Opus will execute three complementary workstreams that together make the formalization **visible, integrated, and optimizable**:

```
Path A: Visual/UX Design
  └─ Make formalization visible in workbench inspector
  └─ Trajectory visualization, saturation curves, register display
  └─ Stepping debugger that teaches semantics implicitly

Path B: Architectural Integration
  └─ Map formalization to 12-domain architecture
  └─ Define domain ownership (who implements trajectory, lenses, probes?)
  └─ Integration points and data flow

Path D: Performance/Scale Mental Models
  └─ NOT implementation optimization (yet)
  └─ Shareable mental models for engineers thinking deeply
  └─ How to reason about caching, laziness, determinism at scale
```

**Integration**: A (UI) depends on B (architecture deciding what to show). D (mental models) informs both A and B.

---

## Path A: Visual/UX Design for Formalization

### Scope
Design how the workbench interface renders the mathematical formalization. Make register state, saturation, polarity, dimension coupling, and lenses *visible* and *interactive*.

### Key Constraints
- Must work with existing workbench architecture (editor, inspector, steps viewer)
- Stepping debugger is the primary interaction surface
- Should teach formalization implicitly (user learns by using)

### Deliverables

#### 1. **Trajectory Inspector Panel** (Primary)
**What it shows**:
- Saturation curve (σ over time, 0→1)
- Resonance indicator (ρ count of concurrent paths)
- Polarity state (inward/outward/neutral, with flip events highlighted)
- Current semantic point (i, p, c) as 3D coordinates or 2D projection
- Register snapshot (inject_count, tap_count, wave_phase, etc.)

**Design questions Opus should answer**:
- How to visualize σ curve that's easy to scan? (progress bar? sparkline? waveform?)
- When polarity flips, what visual feedback? (flash? transition animation? log entry?)
- Should (i, p, c) be a 3D plot (interactive?) or 2D with sliders?
- How much register detail to show? (all 9 counters? just active ones?)

**Wireframe output**: ASCII mockup or description of panel layout

#### 2. **Lens Perspective Toggle** (Secondary)
**What it shows**:
- Dropdown: Select active lens (compiler@, designer@, user@, critic@, custom)
- Live update: State curves recalculate (or show weighting deltas)
- Isotope explorer: Side-by-side comparison of same seed through two lenses

**Design questions**:
- How to show weighting matrix effects without overwhelming? (delta display? ratio?)
- Should "compare lenses" be a special mode or always visible?
- When user switches lenses, what transitions? (fade? slide? highlight changes?)

**Output**: Interaction pattern documentation + wireframes

#### 3. **Dimension Coupling Visualizer** (Tertiary, Teaching Tool)
**What it shows**:
- The coupling matrix C in visual form
- Highlight active couplings (which dimensions are currently affecting each other?)
- Show Δi_actual vs. Δi (coupled vs. raw offset)

**Design questions**:
- Is this too low-level for the main inspector, or should it be a toggle?
- How to animate coupling effects so users see "oh, when intensity changes, proximity is dragged along"?
- Should this only activate in "learning mode" or be always available?

**Output**: Wireframes + interaction specs

#### 4. **Saturation State Legend** (Teaching)
**Legend explaining**:
```
σ = 0.0  Fully latent      (all interpretations possible, no resolution)
σ = 0.25 Weakly resolved   (one region narrowed)
σ = 0.5  Resonant          (standing wave, multiple paths stable)
σ = 0.75 Mostly saturated  (few paths remain)
σ = 1.0  Fully saturated   (single path, no ambiguity)
```

**Visual mapping**:
- Color gradient (blue → purple → red) for saturation levels
- Icon/symbol for resonant state (special visual treatment at σ ≈ 0.5)
- Animation showing field "crystallizing" as σ increases

**Output**: Color palette, icon designs, animation storyboard

### Integration with Existing UI
- **Editor pane** (left): Show saturation/polarity indicator on left gutter
- **Inspector pane** (right, currently shows STEPS|TOKENS|AST|FLOW): Add **TRAJECTORY** tab
- **Bottom panel** (timing info): Show final saturation/resonance summary
- **Keybinding**: `Shift+T` to toggle trajectory details

### Success Metrics
- User can answer "what's the saturation curve?" without explanation
- Polarity flips are visually obvious
- Register state is inspectable
- Switching lenses updates display instantly

---

## Path B: Architectural Integration

### Scope
Map the mathematical formalization (registers, operators, lenses, probes, trajectories) to the **12-domain architecture** in CLAUDE.md. Define who owns what, integration points, and data flow.

### 12-Domain Architecture Reference
```
platform (11) ─→ app (10) ─→ features (7) ─→ viz (5) ─→ lang (4)
                    │            │            │           │
                    ↓            ↓            ↓           ↓
               design (2) ←── ui (3)      runtime (6)  infra (1)
                    │                         │           │
                    └─────────────────────────┴───────────┘
                                      │
                                   core (0)
```

### Key Questions Opus Should Answer

#### 1. **Register Ownership**
"Who in the 12 domains owns the RegisterState? Should it be:"
- [ ] **infra (1)**: Registers are lifecycle/state infrastructure
- [ ] **core (0)**: Registers are language primitives
- [ ] **runtime (6)**: Registers are runtime state for execution
- [ ] **Split**: Semantic registers in runtime, lexical in core

**Opus deliverable**: Recommendation with reasoning

#### 2. **Trajectory Building Pipeline**
"Where does trajectory recording happen? Map the flow:"
```
Seed (lang) ──→ Interpreter (runtime) ──→ Register updates ──→ Trajectory (runtime?)
                                                                    ↓
                                                            Visualization (viz?)
```

**Questions**:
- Should trajectory be built in `runtime/interpreter` or separate `runtime/trajectory-builder`?
- Should viz layer query trajectory, or should runtime push updates?
- How do we avoid coupling viz to runtime details?

**Output**: Data flow diagram + module structure

#### 3. **Lens Application**
"Lenses transform semantic points. Where does this happen?"

```
Base trajectory (core representation) ──→ Apply lens W_ℓ ──→ Lens-specific trajectory
```

**Questions**:
- Should lens application be in `core` (language semantics) or `runtime` (evaluation)?
- Should lenses be immutable lookups (core/lenses.ts) or mutable state (runtime)?
- How do we recompute trajectory through different lenses efficiently?

**Output**: Module ownership + caching strategy

#### 4. **Probe & Measurement**
"Probes collapse the field. Where do they fit?"

**Questions**:
- Is probe handling in `lang/operators/probe.ts` or `runtime/operators/probe.ts`?
- Where is saturation updated? (runtime state? operator result?)
- How do we detect polarity inversion (container boundary detection)?

**Output**: Probe execution pipeline + state update sequence

#### 5. **Container Polarity Tracking**
"Bodies must flip polarity when references resolve. Architecture?"

**Questions**:
- Who detects "all references resolved"? (lang semantic analysis? runtime bindings?)
- When does polarity flip happen? (at parse time? eval time? on probe?)
- Where is polarity state stored? (RegisterState? ContainerState?)

**Output**: Polarity detection + inversion algorithm placement

### Integration Matrices

Opus should produce two matrices:

#### Matrix 1: Feature Ownership
```
Feature              | Domain        | File
─────────────────────┼───────────────┼──────────────────────────
Register tracking    | runtime (6)   | src/runtime/state/registers.ts
Operator execution   | runtime (6)   | src/runtime/interpreter/interpreter.ts
Trajectory building  | runtime (6)   | src/runtime/interpreter/trajectory-builder.ts
Lens application     | core (0)      | src/core/lenses.ts
Probe evaluation     | runtime (6)   | src/runtime/operators/probe.ts
Polarity detection   | lang (4)      | src/lang/semantic/reference-binding.ts
Visualization        | viz (5)       | src/viz/trajectory/trajectory-visualizer.ts
UI integration       | ui (3)        | src/ui/inspector/trajectory-panel.tsx
```

#### Matrix 2: Data Dependencies
```
Component A          | Depends on    | Passes              | Receives
─────────────────────┼───────────────┼─────────────────────┼─────────────────
Interpreter          | RegisterState | Trajectory steps    | RegisterState
Trajectory builder   | Interpreter   | SemanticTrajectory  | TransitionStep
Lens applier         | Trajectory    | Lens-transformed Traj | W_ℓ matrix
Visualizer           | Trajectory    | Visual representation| SemanticTrajectory
Probe handler        | Current state | Measurement result  | Intensity, σ
Polarity detector    | Bindings      | Flip event          | Reference resolved
```

### Design Constraints
1. **No circular dependencies** (enforce with ESLint)
2. **Trajectory is immutable** (built up, never mutated)
3. **Registers are source of truth** (all state flows from registers)
4. **Lenses are stateless** (W_ℓ is just a matrix)
5. **Visualization is passive** (reads trajectory, doesn't affect execution)

### Success Metrics
- Every formalization concept maps to exactly one domain
- No component needs to know about domains outside its import layer
- Integration can be tested independently (trajectory tests don't require UI)

---

## Path D: Performance/Scale Mental Models

### Scope
NOT concrete optimization code, but **shareable mental models** that engineers can use to reason about scaling, caching, and optimization. These models guide implementation without locking it in.

### Audience
Depth-loving engineers who:
- Want to understand *why* optimizations are possible
- Need to extend the system (add new lenses, operators, domains)
- Will review code and make architecture decisions
- Value explainability over premature optimization

### Four Mental Models

#### Model 1: **Registers as Determinism Anchor**
**The Idea**:
```
All non-determinism in Spw comes from:
  1. Random RNG (controllable, can be seeded)
  2. External input (controllable, can be recorded)
  3. Floating-point precision (irrelevant, clamped to [0,1])

Everything else is DETERMINISTIC because it's register-based.

Therefore: trajectory_hash = hash(register_sequence)

Implication: We can cache based on register sequence, not full state.
```

**Why engineers need this**:
- Explains why determinism is *possible* (not just aspirational)
- Shows what to test (register sequences, not raw values)
- Guides caching strategy (same registers = same result)

**Elaboration Opus should provide**:
- Proof sketch (why registers guarantee determinism)
- Examples (show two different-looking seeds with same register sequence)
- Counterexamples (what would break determinism?)
- Caching implications (how to use this for optimization)

#### Model 2: **Saturation as Computation Depth**
**The Idea**:
```
σ measures "how much of the semantic field has been resolved"

Correlated with: Number of probes executed, constraints applied, bindings locked
NOT correlated with: Wall-clock time, lines of code, operators executed

Therefore: σ can be a proxy for "computational expense"

Implication: We can estimate cost without full trajectory:
  cheap_estimate = final_saturation + probe_count * 0.3
```

**Why engineers need this**:
- Shows how to estimate whether a seed is "cheap" or "expensive" to evaluate
- Enables optimization (abort early if σ exceeds budget?)
- Guides parallelization (low-σ paths are independent)

**Elaboration Opus should provide**:
- Examples mapping seeds to saturation curves
- Cost model (σ + probe count → estimated wall time?)
- How saturation relates to resonance (ρ paths = competition for CPU)
- Practical heuristic: "Resonant seeds are parallelizable"

#### Model 3: **Lens Commutativity as Caching Opportunity**
**The Idea**:
```
All lenses commute: ℓ₁ ∘ ℓ₂ = ℓ₂ ∘ ℓ₁

Therefore: trajectory_hash(seed, ℓ₁) = trajectory_hash(seed, ℓ₂)

Implication: Cache key = (seed_hash, "any_lens")
           Different lenses can reuse the same trajectory cache!
```

**Why engineers need this**:
- Explains why multi-lens evaluation doesn't triple the work
- Shows how to build efficient lens cache (one canonical trajectory per seed)
- Suggests "lazy lens application" (compute base trajectory once, apply weighting on demand)

**Elaboration Opus should provide**:
- Proof that commutativity holds (diagonal matrices don't rotate)
- Cache design: (seed_hash) → canonical_trajectory + lens_weights
- Memory analysis: How much extra memory for N lenses? (negligible—just matrices)
- Performance: When is lazy lens application faster than recomputing?

#### Model 4: **Polarity Inversion as Memoization Boundary**
**The Idea**:
```
Polarity inversion is RARE (happens only when references resolve)

Before inversion: Subject state (depends on internal structure)
After inversion: Object state (depends only on final value)

Therefore: We can memoize at polarity boundaries
           Cache key = final_value, not evaluation_path
```

**Why engineers need this**:
- Shows where aggressive memoization is *safe* (after polarity inversion, state is stable)
- Explains why bodies can be both agents (subject, no memoization) and values (object, memoizable)
- Guides optimization: "Memoize object-like states, not subject-like"

**Elaboration Opus should provide**:
- Examples of polarity inversion in real Spw code
- Memoization safety proof (object state is truly memoizable)
- Cost-benefit: When is memoization worth it? (estimate savings)
- Practical heuristic: "After emit, everything is memoizable"

### Integration with Implementation

Each mental model should include: **Implementation Guidance Section**

```markdown
### Implementation Guidance

**Pattern 1: Determinism Testing**
Use register sequences as test cases:
  - Generate random register sequences
  - Verify trajectory_hash uniqueness (no collisions)
  - Prove: same sequence → same hash

**Pattern 2: Cost Estimation**
Build saturation profiler:
  - Track σ and probe_count per seed
  - Correlate with wall-clock time
  - Build regression model: time ≈ f(σ, ρ, probe_count)

**Pattern 3: Lens Caching**
Implement cache keyed by seed_hash (not lens):
  - Compute base trajectory once
  - Apply W_ℓ on demand for each lens
  - Measure cache hit rate (should be high)

**Pattern 4: Memoization Boundaries**
Track polarity flips:
  - Log "polarity inversion at step N"
  - Cache state after step N (it's now memoizable)
  - Skip caching state before N (it's subject-like, not memoizable)
```

### Deliverable Structure

For each mental model, Opus should provide:

1. **Core Idea** (1 paragraph, quotable)
2. **Why It Matters** (2-3 practical implications)
3. **Mathematical Foundation** (proof sketch or formal statement)
4. **Examples** (2-3 concrete Spw seeds)
5. **Counterexamples** (what would break this model?)
6. **Implementation Guidance** (how to use this to optimize)
7. **Scaling Implications** (what happens at 10k operators? 1M?)
8. **Open Questions** (what we don't know yet)

### Success Metrics
- An experienced engineer reads Model 1 and says "oh, that's *why* we can guarantee determinism"
- An optimization engineer reads Model 3 and immediately sketches a better cache strategy
- A researcher reads Model 4 and thinks "I could write a paper about memoization boundaries"

---

## Integrated Execution Plan for Opus

### Session 1 (Recommended): A + B Together
**Why**: UI design (A) depends on architecture decisions (B). Parallel work, tight feedback loop.

**Opus Prompt**:
```
Given the formalization (OPERATOR-ALGEBRA.md, LENS-ALGEBRA.md,
PROBE-CALCULUS.md, CONTAINER-TOPOLOGY.md), and the 12-domain
architecture (CLAUDE.md):

PART 1 (Architecture):
- Map trajectory building, register tracking, lens application,
  probe evaluation, polarity detection to the 12 domains.
- Produce: Feature Ownership Matrix + Data Dependencies Matrix
- Identify integration points (how components pass data)
- Flag any circular dependencies or design issues

PART 2 (Visual/UX):
- Design the Trajectory Inspector panel that makes the formalization visible
- Show saturation curve, resonance indicator, polarity state, (i,p,c) coordinates
- Design lens perspective toggle and weighting delta display
- Design dimension coupling visualizer
- Produce: Wireframes + interaction patterns
- Map panel to workbench layout (editor, inspector, steps viewer)

PART 3 (Reconciliation):
- Does the architecture support the UI?
- Do the UI requirements reveal architecture issues?
- Final: Integrated architecture + UI design that fit together

Reference: FORMALIZATION-PHASE-1-SUMMARY.md (executive summary)
Reference: CONTEXT-RESUME-POINT.md (critical decisions)
```

### Session 2 (Optional, Separate): D - Mental Models
**Why**: Mental models are foundational; they guide Sessions 1 work.

**Opus Prompt**:
```
Create four shareable mental models that help depth-loving engineers
reason about scaling, caching, and optimization for Spw:

1. Registers as Determinism Anchor
   - Why trajectory_hash = hash(register_sequence)
   - Caching implications

2. Saturation as Computation Depth
   - How σ correlates with cost
   - Cost estimation heuristics

3. Lens Commutativity as Caching Opportunity
   - Why different lenses can share cached trajectories
   - Cache design

4. Polarity Inversion as Memoization Boundary
   - Why memoization is safe after polarity flips
   - Memoization strategy

For each model:
- Core idea (1 paragraph)
- Mathematical foundation
- Examples + counterexamples
- Implementation guidance
- Scaling implications
- Open questions

Audience: Depth-loving engineers who will extend/optimize the system.
Goal: Make them think "I understand *why* this optimization is possible"
```

---

## Document Cross-References

### For Opus to understand the formalization:
- **FORMALIZATION-PHASE-1-SUMMARY.md** (read first, 380 lines)
- **OPERATOR-ALGEBRA.md** § 2-3 (register model, dimension coupling)
- **LENS-ALGEBRA.md** § 3-4 (weighting matrices, group structure)
- **PROBE-CALCULUS.md** § 2-4 (saturation, measurement)
- **CONTAINER-TOPOLOGY.md** § 5-6 (polarity inversion)
- **RUNTIME-TRAJECTORY-MODEL.md** § 2-3 (data structures)

### For Opus to understand architecture:
- **CLAUDE.md** (12-domain architecture, import boundaries)
- **SPEC.md** (language specification, updated with formalizations)

### For Opus to understand interface:
- Screenshots of workbench (showing editor, inspector, steps viewer)
- Existing UI components (keybinding conventions, panel layouts)

---

## Success Criteria for Opus Deliverables

### Path A (Visual/UX)
- [ ] Wireframes are detailed enough to implement
- [ ] Interaction patterns are clearly specified
- [ ] Teaching aspect is explicit (what should user learn?)
- [ ] No mockups that require unjustified technology (keep it simple)

### Path B (Architecture)
- [ ] Every formalization concept maps to one domain
- [ ] No circular imports
- [ ] Integration points are specific (file locations, function signatures)
- [ ] Data flow diagram is complete
- [ ] Design decisions are justified

### Path D (Mental Models)
- [ ] Each model is independently understandable
- [ ] Mathematical foundation is sound (or clearly speculative)
- [ ] Examples are runnable (actual Spw code)
- [ ] Implications are actionable (guide implementation)
- [ ] Counterexamples strengthen, not weaken, the model

---

## Ready for Opus

All three paths are:
- ✅ Scoped (clear deliverables)
- ✅ Connected (A depends on B, D informs both)
- ✅ Focused (not trying to do too much)
- ✅ Deep (for engineers who want to understand, not just use)

**Next step**: Clear context, then ask Opus to proceed with Path A + B (visual/architecture), optionally followed by Path D (mental models).

---

**Created**: January 19, 2026
**Status**: Ready for Opus execution
**Estimated Opus tokens needed**: A+B together ≈ 50-70k tokens (well within budget)
