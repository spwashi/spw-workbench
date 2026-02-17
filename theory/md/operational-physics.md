# Operational Physics: Valence Saturation Model

**Date**: 2026-01-19
**Status**: 🟢 **THEORETICAL FOUNDATION** (Ready for implementation)
**Scope**: Reframes operator semantics from validity/invalidity to saturation/emergence

---

## Executive Summary

**Previous Model**: Operators have fixed semantics. Unsatisfied valence = error.

**New Model**: Operators have **saturation-dependent semantics**. Unsatisfied valence = valid probe state that generates emergent behavior across multiple semantic representations.

**Key Insight**: Invalid is not a category. Instead:
- **Fully saturated** (≈1.0) = operation executing, deterministic
- **Partially saturated** (≈0.5) = operation resonating, emergent behavior
- **Unsaturated** (≈0.0) = operation probing, querying system structure

**Consequence**: Same syntax `![ ]` has **different meanings** depending on saturation level and representation (AST, type, runtime, inspection).

---

## Part I: Theoretical Foundations

### I.1 Valence Saturation Spectrum

Instead of binary valid/invalid, model each operator-container pair as having **continuous saturation**.

```typescript
type Saturation = number  // 0.0 to 1.0

interface ValenceState {
  saturation: Saturation
  representation: 'ast' | 'type' | 'runtime' | 'inspection'
  emergentMeaning: string
  behavior: 'deterministic' | 'emergent' | 'resonant' | 'probing'
}
```

#### Saturation Regions

```
[0.0]─────────────────────────────────────────────→ [1.0]
PROBE    RESONANT          EMERGENT      SATURATED
│         │                 │             │
Free      Weakly            Tuned         Executing
Query     Coupled           Not Locked    Deterministic
```

#### Interpretation by Region

**0.0: Free Probe State**
- Operator has no bindings
- Meaning: "What could bind here?"
- Example: `!` with no frame or reference
- Status: Query, not error
- Behavior: Probing for possibilities

**0.25: Weakly Coupled State**
- Operator has partial binding
- Meaning: "Loosely connected, many possibilities"
- Example: `~[ ]{ }` with empty frame (iteration count unspecified)
- Status: Resonant, potential emerges
- Behavior: Default behaviors activate

**0.5: Resonant State**
- Operator and container in harmonic relationship
- Meaning: "Tuned but not locked"
- Example: `!{ }` (inject into procedure—emergent: what procedure?)
- Status: Emergent, context-dependent
- Behavior: Multiple valid interpretations coexist

**0.75: Mostly Bound State**
- Operator has most bindings satisfied
- Meaning: "Nearly executing"
- Example: `~[3]{ }` (iterate 3 times, body defined)
- Status: Mostly deterministic
- Behavior: Minor details pending

**1.0: Fully Saturated State**
- Operator fully bound, all valence satisfied
- Meaning: "Operation executing"
- Example: `~[3]{ !["x"] }` (complete iteration)
- Status: Deterministic
- Behavior: Execute, produce result

---

### I.2 Multi-Representation Semantics

**Same syntax, different meanings by context.**

The key realization: An unsaturated operator doesn't fail—it **queries differently** depending on how you inspect it.

#### Four Representations

```
1. AST Level
   What: Structural form
   How: Parse tree, node types
   Example: ~ is a "wave" operation with [ ] and { }

2. Type Level
   What: Type constructors, polymorphism
   How: Unification, inference
   Example: ~ expects [T] but given []—polymorphic

3. Runtime Level
   What: Execution semantics
   How: Interpreter, effects
   Example: ~ with empty frame defaults to once, infinite, or collect?

4. Inspection Level
   What: Semantic queries
   How: Reflection, introspection
   Example: "What is ~ doing when not fully constrained?"
```

#### Example: `~[ ]{ !["x"] }`

```
AST LEVEL (Structure):
  Syntactic: wave operator with empty frame, body with inject
  Meaning: "Iterate, but count unspecified"
  Saturation: 0.25
  Completeness: partial
  Emergent meaning: "What is the iteration strategy?"

TYPE LEVEL (Polymorphism):
  Signature: ~[T]{ Body } where T ∈ {count, collection, infinity}
  Given: ~[∅]{ ... }
  Meaning: "Polymorphic iteration—which interpretation?"
  Saturation: 0.25
  Possibilities: ["once", "infinite", "collect-all"]
  Emergent behavior: Type inference resolves via usage context

RUNTIME LEVEL (Execution):
  If count=1: Execute body once (saturate to 1.0)
  If count=∞: Loop indefinitely (sustained resonance, 0.5)
  If count=[]: Iterate over collection (saturate to 0.75+)
  Meaning: "Default behavior fills in missing info"
  Saturation: 0.0→1.0 depending on resolution
  Emergent behavior: Runtime fills what parse didn't specify

INSPECTION LEVEL (Query):
  Question: "What does ~ do when iteration unspecified?"
  Discovery: ~ has implicit defaults, is polymorphic, adapts to context
  Meaning: "~ is more flexible than syntax suggests"
  Saturation: 0.0 (pure question)
  Emergent behavior: Learning system semantics
```

**All four are valid simultaneously. No contradiction.**

---

### I.3 Operator Valence Chemistry

Each operator has intrinsic **valence characteristics** that determine how saturation behaves.

#### Donor Operators (Outbound, Source)
```
! (inject): Valence +5
  Role: Introduces content into flow
  Arity: 1
  Polarity: Directional (outward)
  Bonding:
    0.0  = Free source (what to inject?)
    0.5  = Partial source (inject, but target unspecified)
    1.0  = Complete injection (content + destination clear)

~ (wave): Valence +3
  Role: Generates iterations
  Arity: 1-N
  Polarity: Oscillating (creates rhythm)
  Bonding:
    0.0  = Free oscillation (what to repeat?)
    0.5  = Resonant cycle (repeating but count unclear)
    1.0  = Locked cycle (execution pattern determined)
```

#### Acceptor Operators (Inbound, Sink)
```
@ (emit): Valence -5
  Role: Receives and transmits result
  Arity: 1
  Polarity: Directional (inward)
  Bonding:
    0.0  = Free receptor (where is the output?)
    0.5  = Partial output (emitting somewhere vague)
    1.0  = Complete emission (destination specified)

? (probe): Valence -1
  Role: Tests received value
  Arity: 1
  Polarity: Conditional (binary)
  Bonding:
    0.0  = Free test (what condition?)
    0.5  = Resonant condition (condition specified, outcome branches)
    1.0  = Locked test (both branches determined)
```

#### Symmetric Operators (Mutual, Relation)
```
<> (couple): Valence +2/+2
  Role: Forms symmetric binding
  Arity: 2+
  Polarity: Symmetric
  Bonding:
    0.0  = Free couple (what couples with what?)
    0.33 = Single bond (one element bound)
    0.66 = Dual bond (two elements, but relationship unspecified)
    1.0  = Locked couple (symmetric binding complete)

^ (tap): Valence +2
  Role: Anchors named binding
  Arity: 1
  Polarity: Anchoring (creates reference point)
  Bonding:
    0.0  = Free anchor (what to anchor?)
    0.5  = Weak anchor (name specified, value pending)
    1.0  = Locked anchor (name + value bound)
```

#### Constraint Operators (Fixing)
```
= (bias): Valence +4
  Role: Fixes constraint or invariant
  Arity: 1
  Polarity: Locking (once set, resistant to change)
  Bonding:
    0.0  = Free constraint (what to fix?)
    0.75 = Strong constraint (constraint specified, slightly flexible)
    1.0  = Locked constraint (immutable invariant)

* (branch): Valence +1
  Role: Selects among alternatives
  Arity: N
  Polarity: Multi-path (each path equally valid until selection)
  Bonding:
    0.0  = Free branch (what to select between?)
    0.5  = Resonant branch (alternatives available, selector unspecified)
    1.0  = Locked branch (selection determined)
```

#### Meta Operator (Emerging)
```
# (reflect): Valence variable
  Role: Reifies operator essence, creates metadata
  Arity: 1 (reflects on one thing)
  Polarity: Bidirectional (reflects back)
  Bonding:
    0.0  = Free reflection (what to reflect on?)
    0.5  = Resonant reflection (what emerges from reflection?)
    1.0  = Locked reflection (reified form available)
```

---

### I.4 Container Bonding Affinity

Containers are **bonding substrates** with affinities for certain operators.

```typescript
interface ContainerBond {
  container: '[ ]' | '{ }' | '< >' | '( )'
  operator: Operator
  affinity: 'preferred' | 'compatible' | 'exotic'
  emergentBehavior: string
}
```

#### Frame `[ ]`: Referential Bonding

```
Preferred operators: ! @ ? ^
Reason: Data, references, facts
Bonding semantics:
  ![frame]      = Inject into frame (frame is data source)
  @[frame]      = Emit from frame (frame is destination)
  ?[frame]      = Probe frame condition
  ^[name]       = Anchor name in frame

Exotic operators: ~ <> ( )
Emergent behavior:
  ~[ ][ ][ ]    = Iterate over multiple frames (collective)
  <>[]          = Couple frames (relational frame)
  [( )]         = Scoped frame (nested lexical)
```

#### Procedure `{ }`: Behavioral Encapsulation

```
Preferred operators: ~ ^ *
Reason: Iteration, actions, side effects
Bonding semantics:
  ~{body}       = Wave with procedural body (execute repeatedly)
  ^[name]{body} = Anchor with procedure (named block)
  *{branch}     = Branch with alternatives (switch)

Exotic operators: ! @ ? <>
Emergent behavior:
  !{body}       = Inject a closure (procedure as data)
  @{body}       = Emit from procedure (procedural output)
  ?{body}       = Probe with procedure (conditional block)
  <>{A}{B}      = Couple procedures (symmetric execution)
```

#### Relational `< >`: Symmetric Coupling

```
Preferred operators: <>
Reason: Bidirectional, mutual binding
Bonding semantics:
  <>["A", "B"]  = Couple two elements (symmetric)

Exotic operators: ! ~ ? @ ^
Emergent behavior:
  !<data>       = Inject into relational (broadcast?)
  ~<items>      = Wave over relational (iterate coupled)
  ?<cond>       = Probe relationally (both sides tested)
  @<dest>       = Emit to both (fanout)
  ^<bound>      = Anchor relational (coupled reference)
```

#### Spatial `( )`: Lexical Isolation

```
Preferred: Any operator (universal scoping)
Reason: Creates isolated context, lexical boundary
Bonding semantics:
  (scope: body)       = Named scope
  ( body )            = Anonymous scope
  Bindings don't leak outward

Exotic operators: (unusual but valid)
  !(body)             = Inject a scope (delayed evaluation)
  ~(body)             = Wave in scope (iteration inside boundary)
  ^(name: body)       = Scoped anchor (local binding)
```

---

### I.5 Emergence Rules

**How saturation generates emergent behavior:**

#### Rule 1: Default Filling

When saturation < 1.0, **runtime fills missing information from context or defaults.**

```spw
~{ !["x"] }            # Saturation 0.25
                       # Emergent: ~ defaults to iterate-once
                       # Runtime fills: ~[1]{ !["x"] }

?[ condition ]         # Saturation 0.5
                       # Emergent: ? expects { branch1 | branch2 }
                       # If missing, default: single-branch conditional
```

#### Rule 2: Polymorphic Resolution

When saturation = 0.5, **type system resolves ambiguity from usage context.**

```spw
~[ ] { !["x"] .. @out }
                       # Type sees: ~[T]
                       # Context shows: result goes to @out (single value)
                       # Resolution: ~[1] (iterate once)

~ [ ] { !["a"] & !["b"] }
                       # Type sees: ~[T]
                       # Context shows: parallel execution
                       # Resolution: ~[2] (iterate twice, parallel)
```

#### Rule 3: Resonant Feedback

When saturation ≈ 0.5 in runtime, **operator resonates with surroundings, amplifying semantic signals.**

```spw
? [ ] {                # Unsaturated probe (saturation 0.0)
  !["branch1"]         # In context of ~ (wave)
| !["branch2"]         # Resonates: each branch iterates?
}
```

#### Rule 4: Inspection Queries

When saturation = 0.0 at inspection level, **system returns all possible interpretations.**

```typescript
operator('~').in('~[ ]{ ... }').inspect()
// Returns:
// {
//   saturation: 0.0,
//   possibleInterpretations: [
//     "iterate once (default)",
//     "iterate infinite (runaway)",
//     "collect all (if over collection)",
//   ],
//   emergentMeaning: "How should ~ behave when count unspecified?",
//   probeQuestion: "What is the iteration strategy?"
// }
```

---

### I.6 Physical Chemistry Correspondence

**Saturation ↔ Chemical Bonding States**

```
Chemistry                          Spw Operations

Atom with free valence             Operator at saturation 0.0
(ready to bond)                    (ready to bind, probing)

Weakly bonded (Van der Waals)      Operator at saturation 0.25
(loose attraction)                 (loosely coupled, resonant)

Covalent bond forming              Operator at saturation 0.5
(sharing electrons, energy release) (harmonic with context, emergent)

Covalent bond complete             Operator at saturation 1.0
(stable molecule)                  (fully executed, deterministic)

Excited state (higher energy)      Operator oscillating between states
(vibrating, absorbing energy)      (repeatedly transitioning saturation)

Resonance structures               Operator across representations
(multiple valid structures)        (AST, type, runtime, inspection)
```

**Energy Levels**:
```
Saturation 0.0   ← Highest energy (most question, least constraint)
Saturation 0.5   ← Resonant energy (harmonic oscillation)
Saturation 1.0   ← Ground state (lowest energy, deterministic)
```

---

## Part II: Implementation Strategy

### II.1 AST Representation

Track saturation on each operator node:

```typescript
interface OperatorNode {
  type: 'operator'
  operator: string              // ! ^ ~ <> ? * = @ #
  modifier?: Modifier[]
  frame?: FrameNode            // [ content ]
  body?: BodyNode              // { sequence }

  // NEW: Saturation tracking
  saturation: {
    value: number              // 0.0 to 1.0
    computedAt: 'parse' | 'type' | 'runtime'
    reasons: string[]          // Why this saturation level?
  }

  // NEW: Multi-representation meanings
  representations: {
    ast: SemanticDescription
    type?: SemanticDescription
    runtime?: SemanticDescription
    inspection?: SemanticDescription
  }
}

interface SemanticDescription {
  meaning: string
  saturation: number
  emergentBehavior?: string[]
  possibleInterpretations?: string[]
}
```

### II.2 Saturation Calculator

```typescript
function calculateSaturation(
  operator: Operator,
  frame: FrameNode | undefined,
  body: BodyNode | undefined,
  context: SemanticContext
): number {
  const baseArity = getOperatorArity(operator)
  const frameProvided = frame ? 1 : 0
  const bodyProvided = body ? 1 : 0
  const contextualBindings = countContextBindings(operator, context)

  const totalBonds = frameProvided + bodyProvided + contextualBindings
  const saturation = Math.min(1.0, totalBonds / baseArity)

  return saturation
}

// Example:
// ~ (arity=1) with empty frame [] and body { } :
//   totalBonds = 0 (frame doesn't count as binding)
//   saturation = 0 / 1 = 0.0
//
// ~ (arity=1) with frame [3] and body { }:
//   totalBonds = 1 (frame specifies iteration count)
//   saturation = 1 / 1 = 1.0
```

### II.3 Emergent Behavior Resolution

At runtime, unsaturated operations trigger emergence:

```typescript
function resolveEmergence(
  operator: Operator,
  saturation: number,
  context: RuntimeContext
): RuntimeBehavior {
  if (saturation === 1.0) {
    return deterministic(operator, context)
  }

  if (saturation > 0.5) {
    return emergent(operator, context)
  }

  if (saturation > 0.0) {
    return resonant(operator, context)
  }

  // saturation === 0.0
  return probing(operator, context)
}

// For ~ (wave) with saturation 0.25:
function emergent_wave(context: RuntimeContext): Generator {
  // Check context for clues about iteration
  if (iteratingOverCollection(context)) {
    return iterateCollection(context)
  }

  // Resonate with surrounding operators
  if (context.parentOperator === '&') {
    return iterateParallel(context)
  }

  // Default: iterate once
  return iterateOnce(context)
}
```

### II.4 Multi-Representation Query API

```typescript
class OperatorInspector {
  private operatorNode: OperatorNode
  private context: SemanticContext

  constructor(node: OperatorNode, context: SemanticContext) {
    this.operatorNode = node
    this.context = context
  }

  saturation(): number {
    return this.operatorNode.saturation.value
  }

  meanings(): {
    ast: string
    type?: string
    runtime?: string
    inspection?: string
  } {
    return {
      ast: this.operatorNode.representations.ast.meaning,
      type: this.operatorNode.representations.type?.meaning,
      runtime: this.operatorNode.representations.runtime?.meaning,
      inspection: this.operatorNode.representations.inspection?.meaning,
    }
  }

  possibleInterpretations(): string[] {
    if (this.saturation() > 0.5) {
      return this.operatorNode.representations.type?.possibleInterpretations || []
    }
    return []
  }

  probeQuestions(): string[] {
    return [
      `What is ${this.operatorNode.operator} doing at saturation ${this.saturation()}?`,
      `How many representations apply? ${Object.keys(this.operatorNode.representations).length}`,
      `Is this deterministic? ${this.saturation() === 1.0 ? 'Yes' : 'No (emergent)'}`,
    ]
  }

  crossRepresentationMeanings(): Record<Representation, string> {
    const rep = this.operatorNode.representations
    return {
      ast: rep.ast.meaning,
      type: rep.type?.meaning || '(monomorphic)',
      runtime: rep.runtime?.meaning || '(deterministic)',
      inspection: rep.inspection?.meaning || '(opaque)',
    }
  }
}
```

### II.5 Visualization: Saturation Indicator

In the Keybinding Geology and Flow Inspector:

```
Saturation 0.0   □ ○ ◯ ◯ ◯    (all empty—full probe state)
Saturation 0.25  ■ ○ ◯ ◯ ◯    (1/4 filled—weakly coupled)
Saturation 0.5   ■ ■ ◯ ◯ ◯    (1/2 filled—resonant)
Saturation 0.75  ■ ■ ■ ○ ◯    (3/4 filled—mostly bound)
Saturation 1.0   ■ ■ ■ ■ ■    (fully filled—saturated)

Color coding:
  Green: 1.0 (deterministic)
  Yellow: 0.5-0.75 (emergent)
  Blue: 0.25-0.5 (resonant)
  Gray: 0.0 (probing)

Glow intensity = saturation level
Pulse speed = 1 - saturation (fast pulse for free probes, no pulse for saturated)
```

---

## Part III: Documentation Updates

### Files to Create

1. **`/OPERATIONAL-PHYSICS.md`** (THIS FILE)
   - Complete theoretical foundation
   - Valence saturation model
   - Multi-representation semantics
   - Implementation strategy

2. **`/docs/SATURATION-MODEL.md`**
   - Quick reference guide for developers
   - Saturation levels and their meanings
   - Emergence rules
   - Query API reference

3. **`/docs/MULTI-REPRESENTATION-SEMANTICS.md`**
   - How to think about operators across AST/type/runtime/inspection
   - Examples for each operator
   - Cross-representation consistency rules

4. **`/docs/decisions/002-valence-saturation.md`** (ADR)
   - Why saturation replaces validity
   - How emergence enables nuanced probes
   - Trade-offs: implicit defaults vs explicit specification

### Files to Update

1. **`/lib/spw-v0.1.0-alpha/core/SPEC.md`**
   - Section 3 (Operators): Add saturation model
   - Define each operator's valence characteristics
   - Document container affinities
   - Show emergence rules

2. **`/lib/spw-v0.1.0-alpha/core/OPERATORS.md`**
   - Replace informal descriptions with saturation semantics
   - Add multi-representation tables
   - Document emergent behaviors
   - Physical chemistry correspondences

3. **`/IMPLEMENTATION-BLUEPRINT.md`**
   - Update "Operator System" section
   - Replace 8-operator model with saturation-based model
   - Revise testing strategy to include saturation tests

4. **`/PHASE-4-FORMAL-SPEC-INTEGRATION.md`**
   - Rename or supersede with saturation-based approach
   - Integration becomes: "Add saturation tracking + multi-representation meanings"
   - Update critical files list

5. **`/src/core/operators.ts`**
   - Add saturation calculation
   - Document operator valence properties
   - Add representation-specific metadata

6. **`/src/features/keyboard/VIM-KEYBINDINGS.md`**
   - Explain saturation in keybinding context
   - Show how bindings probe when unsaturated
   - Examples of emergent keybindings

7. **`/README.md`**
   - Add "Operational Physics" section
   - Explain saturation model to new users
   - Link to detailed docs

### Documentation Hierarchy

```
README.md (overview)
  ↓
OPERATIONAL-PHYSICS.md (comprehensive theory)
  ↓
docs/SATURATION-MODEL.md (quick reference)
docs/MULTI-REPRESENTATION-SEMANTICS.md (how-to)
docs/decisions/002-valence-saturation.md (why)
  ↓
/lib/spw-v0.1.0-alpha/core/SPEC.md (formal spec)
/lib/spw-v0.1.0-alpha/core/OPERATORS.md (operator theory)
  ↓
Code: /src/core/operators.ts, /src/design/semantics/features.ts, etc.
```

---

## Part IV: Implementation Roadmap

### Phase 4A: Theoretical Integration (Week 1)

**Goal**: Establish saturation tracking in AST

- [ ] Update `OperatorNode` type to include saturation
- [ ] Implement `calculateSaturation()` function
- [ ] Add saturation to parser output
- [ ] Document operator valence for all 9 operators
- [ ] Create representation-specific metadata in operator definitions

**Files**:
- `/src/core/operators.ts` — add valence characteristics
- `/src/lib/spw/types/ast.ts` — extend OperatorNode
- `/src/lib/spw/parser/index.ts` — compute saturation

**Testing**:
- Test saturation calculation for each operator-container pair
- Verify saturation values match valence expectations
- Property tests: saturation always ∈ [0.0, 1.0]

### Phase 4B: Emergent Behavior (Week 2)

**Goal**: Implement emergence rules at runtime

- [ ] Implement `resolveEmergence()` for each operator
- [ ] Add default-filling for unsaturated operations
- [ ] Polymorphic resolution via type system
- [ ] Resonant feedback in parent-child contexts
- [ ] Test with cross-representation meaning consistency

**Files**:
- `/src/runtime/interpreter/interpreter.ts` — emergence resolution
- `/src/lang/semantic/analyzer/analyzer.ts` — type-driven emergence
- New: `/src/runtime/emergence.ts` — emergence rules

**Testing**:
- Unsaturated operators produce expected defaults
- Type system resolves polymorphism correctly
- Resonant feedback activates in correct contexts
- Golden snapshots: canonical unsaturated examples

### Phase 4C: Multi-Representation Queries (Week 3)

**Goal**: Implement inspection API

- [ ] Create `OperatorInspector` class
- [ ] Implement representation queries (AST, type, runtime, inspection)
- [ ] Add probe question generation
- [ ] Cross-representation consistency checking
- [ ] Integration with UI for visualization

**Files**:
- New: `/src/viz/inspector.ts` — OperatorInspector
- `/src/app/components/detail-drawer.ts` — UI queries
- `/src/features/keyboard/components/keybinding-geology.ts` — display saturation

**Testing**:
- All representations present for each operator-container pair
- Saturation consistent across representations
- Probe questions correctly identify ambiguities

### Phase 4D: Visualization (Week 4)

**Goal**: Display saturation in UI

- [ ] Implement saturation indicator (■ ○ ◯ pattern)
- [ ] Color coding (green/yellow/blue/gray)
- [ ] Glow intensity mapping
- [ ] Pulse speed inversely proportional to saturation
- [ ] Interactive: click unsaturated operator to see interpretations

**Files**:
- `/src/styles/components/saturation-indicator.css`
- `/src/app/components/saturation-display.ts` (new)
- Update Geology panel and Flow Inspector components

---

## Part V: Commit Message & Direction

### Git Commit

```
docs: establish operational physics—saturation-based semantics

Replace validity/invalidity binary with continuous saturation spectrum.
Operators now have context-dependent meanings across four representations:

- AST: structural form
- Type: polymorphic interpretation
- Runtime: execution behavior
- Inspection: semantic query

Key changes:
- Saturation: 0.0 (free probe) to 1.0 (fully executed)
- Emergence rules: defaults fill unspecified parameters
- Multi-representation: same syntax, context-dependent meaning
- Invalid is not a category: all saturation levels are valid

Emergence replaces error. Unsaturated operations generate nuanced
semantic signals across runtime/AST/type/inspection layers.

Physical chemistry analogy: saturation ≈ bonding state energy level.

Documentation:
- OPERATIONAL-PHYSICS.md: comprehensive theory
- docs/SATURATION-MODEL.md: quick reference
- docs/decisions/002-valence-saturation.md: rationale

Ready for implementation of saturation tracking in AST and runtime.

See: OPERATIONAL-PHYSICS.md for details.
```

### Direction Statement

**What We're Committing To**:

1. **Saturation is canonical** — Replaces "valid/invalid" throughout codebase
2. **Emergence is feature, not bug** — Unsaturated states produce meaningful behavior
3. **Multi-representation meaning** — Same code means different things in different contexts
4. **Physical chemistry grounding** — Saturation ↔ bonding energy is fundamental
5. **Nuanced probes over binary errors** — Better error messages, better learning, better debugging

**What Changes**:

- Parser outputs saturation values
- Runtime resolves emergence from context
- Type system uses polymorphic saturation
- UI visualizes saturation as atomic unit
- Documentation emphasizes saturation, not validity

**What Stays**:

- All Phase 1-3 work unchanged (backward compatible)
- 9-operator system intact
- Container system intact
- Keybinding geology architecture intact

**Next Steps**:

1. Merge this theoretical foundation
2. Implement Phase 4A: saturation tracking in AST (Week 1)
3. Test emergence rules thoroughly
4. Visualize saturation in UI
5. Update all documentation

---

## References

- **Previous Plan**: `/PHASE-4-FORMAL-SPEC-INTEGRATION.md` (superseded, keep for context)
- **Semantic Features**: `/src/design/semantics/features.ts` (complementary to saturation)
- **Formal Spec**: `/lib/spw-v0.1.0-alpha/core/SPEC.md` (to be updated)
- **Implementation Blueprint**: `/IMPLEMENTATION-BLUEPRINT.md` (context)

---

**Status**: Ready to commit theoretical direction
**Next Action**: Execute Phase 4A implementation
**Timeline**: 4 weeks for full implementation

---

## Material Properties for Resonant Cognition

The shader renderer's narrative personality system (`u_warmth`, `u_rhythm`, `u_narrativeGrain`, `u_depth`) provides the material substrate for operational physics. These properties modulate the visual "feel" of saturation.

### Current 4D Narrative Vector

| Property | Uniform | Range | Cognitive Channel |
|:---------|:--------|:------|:-----------------|
| Warmth | `u_warmth` | [0,1] | Arousal (partial — conflates valence) |
| Rhythm | `u_rhythm` | [0,1] | Temporal binding |
| Grain | `u_narrativeGrain` | [0,1] | Perceptual salience |
| Depth | `u_depth` | [0,1] | Hierarchical processing |

### Proposed 6D Refinement

Split into two vec4 packs using existing unused shader uniform slots:

- **Pack 1** (`u_narrative`): `(valence, rhythm, grain, depth)` — base material properties
- **Pack 2** (`u_resonance`): `(coherence, novelty, warmth, arc)` — cognitive state

Where:
- `valence` ∈ [-1, 1]: approach/avoidance (split from warmth)
- `coherence` ∈ [0, 1]: pattern completeness (maps to scene readiness σ)
- `novelty` ∈ [0, 1]: surprise/expectation violation (drives schema updating)

### Hardware Scaling

For advanced hardware, saturation evaluation extends to **saturation matrices** where each brace pair contributes a row vector to a per-scope matrix. Script execution becomes matrix reduction — each operator application is a row operation. This enables parallel saturation evaluation on hardware with matrix instruction sets (Tensor Cores, AMX).

The `%` operator returns saturation with precision dependent on execution context:
- GPU (WebGL): `mediump float` (~3 decimal digits)
- CPU (JS runtime): IEEE 754 `f64` (~15 digits)
- Serialization: `f32` or `f16` for network transfer

See also: `docs/theory/spw/spatial-model.spw` for the uniform vector mapping.

