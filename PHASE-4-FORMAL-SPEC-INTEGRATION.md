# Phase 4: Formal Spec Integration + Visual Pedagogy

**Date**: 2026-01-18
**Status**: 🟡 **PLANNING PHASE** (Ready for implementation)
**Scope**: 9-operator system, determinism contracts, container disambiguation, visual pedagogy enhancement

---

## Overview

Phase 4 integrates the formal Spw language specification with the existing pedagogical architecture. This phase builds on completed work:

- **Phase 1**: Semantic Features (3D feature space, modal contexts) ✅
- **Phase 2**: Keybinding Geology (6-layer operator navigation) ✅
- **Phase 3**: Flow Inspector + Unified Visual Language ✅
- **Phase 4**: Formal Spec Integration (9 operators, determinism, pedagogy enhancement) 🔄

---

## Part A: Formal Language Foundation

### A.1 Nine-Operator System

#### Current State
The codebase has 8 operators with informal semantics:
```
! ^ ~ <> ? * = @
```

#### Formal Spec Upgrade
Add `#` (reflect) as 9th operator, promoting metadata to first-class concern:
```
! ^ ~ <> ? * = @ #
```

#### Operator Definitions

| Sigil | Name | Essence | Function |
|-------|------|---------|----------|
| `!` | inject | source | Introduce content into flow |
| `^` | tap | anchor | Establish named binding |
| `~` | wave | rhythm | Create iterative/oscillating pattern |
| `<>` | couple | relation | Form symmetric binding between elements |
| `?` | probe | query | Evaluate condition, branch on result |
| `*` | branch | gate | Select among alternatives |
| `=` | bias | constraint | Fix parameter or invariant |
| `@` | emit | sink | Output or transmit result |
| `#` | reflect | meta | Annotate, reify operator essence, create metadata |

#### Semantic Physics: `!` and `@`

**Resolution**: The user's original intuitions align with formal spec semantics:
- `!` = "action" + "moment" = **inject** (source/initiating)
- `@` = "perspective" + "location" = **emit** (sink/terminal)

Both interpretations are valid projections from deeper essences:
```
! = SOURCE of change        @ = SINK/TARGET of flow
  - Introduces content        - Outputs result
  - Triggers execution        - Establishes viewpoint
  - Marks temporal boundary   - Names destination
  - Directionality: INWARD    - Directionality: OUTWARD
```

**Implementation**: Use formal terminology (`inject`/`emit`) with semantic metadata including original framings (`action`, `moment`, `perspective`, `location`).

---

### A.2 Container System Upgrade

#### Problem
`<>` serves dual roles:
1. **Couple container** (SPEC.md) - relational binding between elements
2. **Capsule container** (current codebase) - component with tag/frame/body

#### Solution: Context-Aware Parsing

Support both via intelligent disambiguation:

**Couple container** (no tag, operator position):
```spw
<>["Alice", "Bob"]          # Couple: no tag, just frame
<>[@x, @y]                  # Couple: references
<>                          # Couple: empty
```

**Capsule container** (with tag identifier):
```spw
<Hero[name: "Alice"]{ }>    # Capsule: tag + frame + body
<Button />                  # Capsule: tag only (self-closing)
<Widget[config]{body}>      # Capsule: full syntax
```

**Parser Logic**:
```typescript
// After lexing '<':
if (nextToken === IDENTIFIER) {
  parseCapsule()    // Tag present → Capsule
} else if (nextToken === '>') {
  parseCouple()     // No tag → Couple
}
```

---

### A.3 Determinism Contracts

**Goal**: Make Spw parsing and evaluation deterministic and reproducible.

#### 1. Stable ID Generation

Replace random UUIDs with hash-based deterministic IDs:

```typescript
function deterministicId(
  sourceSpan: Span,
  parentPath: string,
  nodeType: string
): string {
  const input = `${sourceSpan.start.line}:${sourceSpan.start.column}:${parentPath}:${nodeType}`
  return hashToBase62(SHA256(input))
}
```

**Properties**:
- ✅ Same source position → same ID (always)
- ✅ Different source → different ID (collision-resistant)
- ✅ Reproducible across all parser runs
- ✅ Portable across machines and sessions

#### 2. TraceEvent Spine

Unified event stream across all pipeline phases:

```typescript
type TraceEvent =
  | { phase: 'lex',      type: 'token',      data: Token }
  | { phase: 'parse',    type: 'node',       data: ASTNode }
  | { phase: 'semantic', type: 'register',   data: Register }
  | { phase: 'flow',     type: 'projection', data: FlowNode }
  | { phase: 'runtime',  type: 'execute',    data: RuntimeEvent }

interface Trace {
  seed: string              // Input source code
  config: ParserConfig      // Parser configuration
  events: TraceEvent[]      // Ordered event sequence (deterministic)
}
```

**Contract**: Given identical `seed` + `config`, produce identical `events` array.

**Testing Strategy**:
```typescript
test('determinism: 1000 parses produce identical output', () => {
  const input = '!["hello"] .. @out'
  const config = { strict: true }

  const traces = Array(1000).fill(null).map(() =>
    parseAndTrace(input, config)
  )

  const firstTrace = traces[0]
  for (const trace of traces.slice(1)) {
    expect(trace.events).toEqual(firstTrace.events)  // Deep equality
  }
})
```

#### 3. Reproducible Lifecycle

Component lifecycle states derived deterministically from trace events:
- Replace random timing with deterministic scheduling
- Lifecycle phase transitions triggered by specific trace events
- State machine outputs reproducible for identical input

---

## Part B: Visual Pedagogy Enhancement

### B.1 9-Operator Color Wheel

Evenly distributed 40° hue intervals for intuitive operator affinity:

```
0°    = Red (!) — Inject/Source
40°   = Orange (^) — Tap/Anchor
60°   = Yellow (=) — Bias/Constraint
120°  = Green (*) — Branch/Gate
180°  = Cyan (~) — Wave/Rhythm
240°  = Blue (?) — Probe/Query
270°  = Violet (#) — Reflect/Meta
280°  = Purple (<>) — Couple/Relation
320°  = Magenta (@) — Emit/Sink
```

**Color Temperature Application**:
- **Visual mode** (cool blue, 200°): Operators shift toward cyan
- **Editing mode** (warm amber, 45°): Operators shift toward orange/red
- **Structural mode** (neutral green, 140°): Operators remain neutral

### B.2 Salience-Based Visual Hierarchy

Implement exponential salience function across 6 layers:

```
S(λ, μ, τ) = e^(-0.4λ) × M(μ) × L(τ)

λ = layer depth (0-5)
μ = modal context (Visual/Editing/Structural)
τ = learnability time (interaction count)
```

**Layer Mappings**:
- Layer 0 (Base):        S ≈ 1.00  → Full opacity, navigation (hjkl)
- Layer 1 (Operator):    S ≈ 0.67  → Primary attention (d/y/c)
- Layer 2 (Activation):  S ≈ 0.45  → Secondary (space+v/e)
- Layer 3 (Text Object): S ≈ 0.30  → Tertiary (aw/ab/as/af)
- Layer 4 (Op-Focused):  S ≈ 0.20  → Advanced (O/T/I/E/P/A/V/C/R)
- Layer 5 (Val-Focused): S ≈ 0.13  → Expert (space+modifiers)

### B.3 Unified Flow + Geology Language

Both views use consistent encoding:
- **Operator type** → color (sigil-based)
- **Modal context** → temperature shift
- **Layer depth** → size/stacking order
- **Salience** → opacity/glow intensity
- **Learnability** → animation speed/pulse frequency

---

## Implementation Roadmap

### Week 1: Formal Spec Integration

**Steps 1-7** (Type foundations → UI components)

1. **Type Foundations**
   - Add `'#'` to `OperatorKind` in `/src/lib/spw/types/token.ts`
   - Add `reflect: 'reflect'` to `OPERATORS` in `/src/core/operators.ts`
   - Add OPERATOR_META entry for reflect

2. **Lexer Recognition**
   - Update `/src/lib/spw/lexer/matchers/operators.ts` to recognize `#`
   - Handle `#` as operator (not just annotation prefix)

3. **Grammar + Parser**
   - Add disambiguation logic to `/src/lib/spw/grammar/containers.ts`
   - Implement context-aware parsing for `<>` Couple vs Capsule
   - Check for IDENTIFIER token after `<` to determine type

4. **Semantic Database**
   - Extend `/src/semantics/spw-knowledge.ts` with reflect operator
   - Define modifier interactions: `#bone`, `#boon`, `#bane`, `#bonk`, `#honk`

5. **Flow Visualization**
   - Add reflect mapping to `/src/viz/flow/graph.ts`
   - Update `/src/viz/flow/renderer.ts` for reflect sigil display

6. **Keybinding Geology**
   - Add 9th operator motion to `/src/features/keyboard/geology-schema.ts`
   - New key: `R` for "Jump to next reflect (#)"
   - Update `OPERATOR_FOCUSED_MOTIONS` array (lines 184-233)

7. **UI Components**
   - Update `/src/app/components/detail-drawer.ts` with reflect features
   - Update `/src/app/components/keyboard-hints.ts` with reflect hints
   - Add `'#'` to `/src/app/transforms/operations.ts` availableOperators

**Validation**:
- ✅ `#` operator recognized in lexer
- ✅ All 9 operators parseable and displayable
- ✅ Keybinding geology shows 9 operator navigation keys
- ✅ Couple vs Capsule correctly disambiguated in tests

---

### Week 2: Determinism & Testing

**Steps 8-10** (Determinism infrastructure → Testing)

8. **Determinism Infrastructure**
   - Replace UUID generation with deterministic IDs in `/src/lib/spw/parser/index.ts`
   - Create `/src/infra/lifecycle/trace.ts` (new) for TraceEvent system
   - Extend `/src/lib/spw/types/events.ts` with TraceEvent union

9. **Documentation**
   - Update `/lib/spw-v0.1.0-alpha/core/SPEC.md` (line 69) to "nine operators"
   - Promote `#` in `/lib/spw-v0.1.0-alpha/core/OPERATORS.md`
   - Create `/docs/decisions/001-nine-operators.md` (ADR)

10. **Testing**
    - Create `/src/core/operators.test.ts` (9-operator recognition tests)
    - Add `#` operator parsing tests to `/src/lib/spw/__tests__/parser.test.ts`
    - Create `/src/lib/spw/__tests__/determinism.test.ts` (determinism contract tests)

**Validation**:
- ✅ 1000 parses produce identical output
- ✅ Deterministic IDs match expected pattern
- ✅ TraceEvent sequence reproducible
- ✅ Container disambiguation 100% accuracy in test suite

---

### Week 3: Visual Pedagogy Enhancement

**Phases 1-3** (Color temperature → Flow unification)

**Phase 1: Modal Context Color Temperature**
- Add CSS custom properties for 9-operator hue wheel
- Implement 400ms transitions between modal contexts
- Apply color temperature influence (α = 0.3) to operator colors

**Phase 2: Salience-Based Visual Hierarchy**
- Implement salience function S(λ, μ, τ) in TypeScript
- Map to CSS variables: `--opacity`, `--saturation`, `--glow-intensity`
- Progressive disclosure: collapsed layers by default
- Learnability tracking: persist τ to localStorage

**Phase 3: Flow Inspector + Geology Unification**
- Wire Flow Inspector to actual FlowGraph data
- Apply same color temperature system to flow nodes
- Implement cross-view synchronization (click binding → highlight flow)
- Match salience encoding (node size = layer depth, stroke width = salience)

**Validation**:
- ✅ Entropy reduction > 30% in collapsed vs expanded
- ✅ Primary zone = 55-65% of visual weight
- ✅ Color temperature shifts visibly on mode change
- ✅ Cross-highlighting works across tabs seamlessly

---

## Critical Files Summary

### Core Language (Part A)
- `/src/core/operators.ts` — Operator definitions (add reflect)
- `/src/lib/spw/types/token.ts` — Operator type definitions
- `/src/lib/spw/lexer/matchers/operators.ts` — Operator token recognition
- `/src/semantics/spw-knowledge.ts` — Semantic operator database
- `/src/lib/spw/grammar/containers.ts` — Couple/Capsule disambiguation

### Determinism Infrastructure (Part A)
- `/src/lib/spw/parser/index.ts` — Deterministic ID generation
- `/src/infra/lifecycle/trace.ts` — TraceEvent system (new)
- `/src/lib/spw/types/events.ts` — Event type definitions

### Visualization + Pedagogy (Part B)
- `/src/features/keyboard/geology-schema.ts` — Add 9th operator motion (R key)
- `/src/viz/flow/graph.ts` — Flow visualization for 9 operators
- `/src/app/components/detail-drawer.ts` — Operator semantic features
- `/src/design/tokens.ts` — 9-operator color wheel
- `/src/design/semantics/features.ts` — Semantic features for reflect operator

---

## Testing Strategy

### Unit Tests (Fast, Many)
```
✅ Lexer recognizes all 9 operators
✅ Deterministic ID: same input → same ID
✅ Container disambiguation: Couple vs Capsule
✅ Reflect operator parsing with all modifiers
```

### Integration Tests (Medium, Some)
```
✅ Full parser produces deterministic AST
✅ TraceEvent sequence matches expected pattern
✅ Cross-highlighting works with all 9 operators
✅ Modal context colors apply to all 9 operators
```

### Property Tests (Slow, Thorough)
```
✅ Determinism: 1000 parses → identical output
✅ Disambiguation: Generate random Spw → parse unambiguously
✅ Trace replay: Recorded trace reproduces state
✅ Salience function: S(λ,μ,τ) properties hold
```

### Golden Snapshots
```
Canonical Spw examples with:
- Expected AST/token outputs
- Expected semantic features
- Expected flow visualizations
- Regression detection on changes
```

---

## Success Criteria

### Part A: Formal Spec
- ✅ All 9 operators recognized and parsable
- ✅ `#` (reflect) integrated into keybinding geology (R key)
- ✅ 100% determinism: 1000 parses → identical output
- ✅ `<>` correctly disambiguated in all test cases
- ✅ Capsule syntax backward compatible or migrated

### Part B: Visual Pedagogy
- ✅ 9-operator color wheel renders correctly
- ✅ Modal context temperature shifts smoothly (400ms)
- ✅ Entropy reduction > 30% (collapsed vs expanded layers)
- ✅ Primary zone = 55-65% of visual weight
- ✅ Cross-highlighting synchronizes across views

### Overall
- ✅ Phase 2/3 work unbroken (backward compatible)
- ✅ Formal spec and pedagogy mutually reinforce each other
- ✅ System teaches itself through consistent affordances

---

## Dependencies

### Completed Work (Builds On)
- Phase 1: Semantic Features (3D feature space) ✅
- Phase 2: Keybinding Geology (6 layers) ✅
- Phase 3: Flow Inspector (unified visual language) ✅
- Design System (tokens, themes, topology) ✅

### External Dependencies
- Spw formal spec: `/lib/spw-v0.1.0-alpha/core/SPEC.md`
- Operator theory: `/lib/spw-v0.1.0-alpha/core/OPERATORS.md`
- Semantic features: `/src/design/semantics/features.ts`

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| `!`/`@` semantic swap | Keep formal terminology, document both lenses |
| Container conflict (`<>`) | Context-aware parser, comprehensive disambiguation tests |
| Determinism hard to achieve | Test with property-based testing, 1000+ iterations |
| Pedagogy disruption | Feature flag during rollout, backward compat |
| Performance regression | Benchmark salience calculations, lazy evaluation |

---

## Future Enhancements (@spw:todo)

- [ ] Operator composition (`A#B` syntax for v0.2.0)
- [ ] Reflection introspection (`!#` as first-class value)
- [ ] Deterministic seeding for reproducible examples
- [ ] Voice control integration via semantic features
- [ ] Multimodal LLM theme generation based on operators
- [ ] Time-travel debugging via TraceEvent replay
- [ ] Operator-specific keybinding customization

---

## References

- **Formal Spec**: `/lib/spw-v0.1.0-alpha/core/SPEC.md`
- **Operator Theory**: `/lib/spw-v0.1.0-alpha/core/OPERATORS.md`
- **Implementation Blueprint**: `/IMPLEMENTATION-BLUEPRINT.md`
- **Phase 3 Demo Guide**: `/docs/phase-3-demo-guide.md`
- **Plan Details**: `hashed-finding-puddle.md` (local Claude plan artifact, not tracked)

---

**Status**: Ready for implementation
**Timeline**: 3 weeks
**Next Step**: Execute Week 1 (Formal Spec Integration Steps 1-7)
