# Documentation Roadmap: Saturation-Based Semantics

**Status**: 🟢 **DIRECTION COMMITTED** (1ae9a95)
**Created**: 2026-01-19
**Scope**: All documentation that needs updating for saturation model

---

## Summary

Commit `1ae9a95` establishes **operational physics** as the foundation. This document maps all documentation updates needed to fully integrate saturation-based semantics.

---

## Documentation by Priority

### CRITICAL (Blocking implementation)

#### 1. `/lib/spw-v0.1.0-alpha/core/SPEC.md`
**Current**: Operators defined informally with fixed semantics
**Update**: Add saturation model to Section 3

**Changes**:
- Add subsection 3.4: "Operator Saturation States"
- Define saturation spectrum (0.0 to 1.0)
- Update operator table to include valence characteristics
- Add emergence rules section
- Document multi-representation meanings

**Example**:
```markdown
### 3.4 Saturation States

Each operator has a saturation state s ∈ [0.0, 1.0]:

- s = 0.0: Free probe (valence unsatisfied, probing system)
- s = 0.5: Resonant (polymorphic, emergent behavior)
- s = 1.0: Saturated (valence satisfied, deterministic)

#### Operator Valence

| Sigil | Name | Valence | Arity | Polarity |
|-------|------|---------|-------|----------|
| `!` | inject | +5 | 1 | Donor |
| `@` | emit | -5 | 1 | Acceptor |
| ... | ... | ... | ... | ... |
```

**Priority**: CRITICAL — blocks all Phase 4 work

---

#### 2. `/lib/spw-v0.1.0-alpha/core/OPERATORS.md`
**Current**: Theoretical operator descriptions
**Update**: Add saturation semantics to each operator

**Changes**:
- Add saturation interpretation for each operator
- Document emergence behaviors
- Add multi-representation tables
- Physical chemistry correspondences

**Example**:
```markdown
## ~ (Wave)

### Saturation States

| Saturation | State | Meaning | Example |
|------------|-------|---------|---------|
| 0.0 | Free | What to iterate? | `~` alone |
| 0.25 | Weak | Loosely coupled | `~[ ]{ ... }` |
| 0.5 | Resonant | Polymorphic | Uses context |
| 1.0 | Saturated | Deterministic | `~[3]{ ... }` |

### Multi-Representation

AST: wave with frame [ ] and body { }
Type: ~[T] where T ∈ {count, collection}
Runtime: iterations specified or defaulted
Inspection: emergent iteration strategy
```

**Priority**: CRITICAL — defines operator behavior

---

### HIGH (Implementation support)

#### 3. `/docs/SATURATION-MODEL.md` (NEW)
**Purpose**: Quick reference for developers implementing saturation

**Contents**:
- Saturation spectrum (visual + explanation)
- Each operator's saturation characteristics
- Emergence rules at-a-glance
- Common patterns and anti-patterns
- Troubleshooting

**Example structure**:
```
# Saturation Model: Quick Reference

## Saturation Spectrum

[0.0]─────────[0.5]─────────[1.0]
PROBE      RESONANT     SATURATED

## Operators Quick Reference

### ! (Inject)
- Valence: +5 (donor)
- Saturation 0.0: Free source (what to inject?)
- Saturation 0.5: Partial source (target unclear)
- Saturation 1.0: Complete injection

## Emergence Rules

1. Default Filling: Unsaturated ops get context defaults
2. Polymorphic Resolution: Type system resolves at 0.5
...
```

**Priority**: HIGH — blocks UI implementation

---

#### 4. `/docs/decisions/002-valence-saturation.md` (NEW - ADR)
**Purpose**: Architecture decision record (why we chose saturation)

**Contents**:
- Problem: binary valid/invalid inadequate
- Solution: continuous saturation spectrum
- Consequences: emergence, multi-representation meaning
- Alternatives considered and rejected
- Trade-offs

**Example**:
```markdown
# ADR 002: Valence Saturation Model

## Status: Accepted (2026-01-19)

## Problem

Previous model: operators are either valid (all valence satisfied) or invalid (error).
This binary classification loses semantic nuance:
- Unsaturated operations have meaningful interpretations
- Multiple valid meanings coexist (polymorphism)
- Emergence is a feature, not a bug

## Solution

Continuous saturation spectrum [0.0, 1.0]:
- 0.0: free probe (query the system)
- 0.5: resonant (emergent behavior)
- 1.0: saturated (deterministic)

## Consequences

+ Enables rich error messages (not binary failure)
+ Models polymorphism naturally
+ Grounds in physical chemistry (intuitive)
- Requires multi-representation tracking
- Complicates AST (adds saturation field)
- Runtime must implement emergence rules

## Alternatives

1. Keep binary validity, add warning/hint system
   - Rejected: doesn't capture nuance
2. Use three-level (valid/ambiguous/invalid)
   - Rejected: still too coarse-grained
3. Fuzzy logic (0.0-1.0, current choice)
   - Accepted: continuous spectrum captures all states
```

**Priority**: HIGH — documents design rationale

---

#### 5. `/IMPLEMENTATION-BLUEPRINT.md`
**Current**: 928 lines describing system architecture
**Update**: Update "Operator System" section for saturation

**Changes in "Operator System" section**:
- Explain saturation replaces validity
- Update operator descriptions with saturation semantics
- Add multi-representation meaning tables
- Update testing strategy to include saturation tests

**Changes in "Testing Strategy" section**:
- Add saturation unit tests
- Property tests: saturation ∈ [0.0, 1.0]
- Emergence integration tests
- Multi-representation consistency tests

**Priority**: HIGH — guides implementation

---

### MEDIUM (Operational context)

#### 6. `/src/core/operators.ts`
**Current**: 8 operators with informal metadata
**Update**: Add saturation and representation properties

**Changes**:
```typescript
export interface OperatorMeta {
  name: Operator
  sigil: string
  label: string
  description: string
  examples: string[]

  // NEW: Saturation properties
  valence: number              // +5 for donor, -5 for acceptor, etc.
  arity: number | [number, number]  // 1 or N
  polarity: 'donor' | 'acceptor' | 'symmetric'

  // NEW: Container affinities
  preferredContainers: Container[]

  // NEW: Multi-representation meanings
  representations: {
    ast: string
    type?: string
    runtime?: string
    inspection?: string
  }
}
```

**Priority**: MEDIUM — implementation detail

---

#### 7. `/src/features/keyboard/VIM-KEYBINDINGS.md`
**Current**: Describes 6 keybinding layers
**Update**: Explain layers in terms of saturation

**Addition**:
```markdown
## Saturation and Keybinding Layers

Each layer corresponds to saturation states:

- Layer 0 (Base): Saturated (hjkl always deterministic)
- Layer 1 (Operator): Resonant (d/y/c operate at 0.5 saturation)
- Layer 2 (Activation): Weakly coupled (context toggles)
- Layer 3 (Text Object): Free probes (discover text objects)
- Layer 4 (Op-Focused): Free probes (discover operators)
- Layer 5 (Val-Focused): Free probes (discover valences)

Interactions can raise saturation:
- Bind operator to motion → increase saturation
- Specify iteration count → increase saturation
```

**Priority**: MEDIUM — helps users understand keybindings

---

### LOW (General context)

#### 8. `/README.md`
**Current**: Overview of Spw Workbench
**Update**: Add "Operational Physics" section

**Addition**:
```markdown
## Operational Physics

Spw uses a **saturation-based semantic model** where operators have
context-dependent meanings:

- **Saturated** (1.0): Fully specified, deterministic
- **Resonant** (0.5): Polymorphic, emergent behavior
- **Probing** (0.0): Unspecified, querying system

Same syntax can mean different things depending on saturation level
and how you inspect it (AST, type, runtime, or semantic query).

See [OPERATIONAL-PHYSICS.md](OPERATIONAL-PHYSICS.md) for detailed theory.
```

**Priority**: LOW — user-facing overview

---

#### 9. `/PHASE-4-FORMAL-SPEC-INTEGRATION.md`
**Current**: Plan for formal spec integration (superseded)
**Update**: Archival note, link to new model

**Addition**:
```markdown
## Note (2026-01-19)

This plan has been superseded by [OPERATIONAL-PHYSICS.md](OPERATIONAL-PHYSICS.md).
The saturation-based semantic model replaces the previous "9-operator migration"
approach with a more fundamental shift: from binary validity to continuous saturation.

See OPERATIONAL-PHYSICS.md for the new theoretical foundation and implementation roadmap.
```

**Priority**: LOW — housekeeping

---

## Update Sequence

### Week 1: Foundational Updates (Blocking)
```
1. /lib/spw-v0.1.0-alpha/core/SPEC.md
   - Add Section 3.4 on saturation states
   - Update operator table with valence

2. /lib/spw-v0.1.0-alpha/core/OPERATORS.md
   - Add saturation interpretation per operator
   - Multi-representation tables

3. /docs/SATURATION-MODEL.md (new)
   - Quick reference for developers
```

### Week 2: Implementation Support
```
4. /IMPLEMENTATION-BLUEPRINT.md
   - Update operator system description
   - Update testing strategy

5. /docs/decisions/002-valence-saturation.md (new)
   - Rationale and alternatives

6. /src/core/operators.ts
   - Add valence/arity/polarity properties
```

### Week 3: Operational Context
```
7. /src/features/keyboard/VIM-KEYBINDINGS.md
   - Connect layers to saturation states

8. /README.md
   - Add operational physics overview
```

### Week 4: Housekeeping
```
9. /PHASE-4-FORMAL-SPEC-INTEGRATION.md
   - Archival note
```

---

## Cross-Reference Map

```
OPERATIONAL-PHYSICS.md (foundational theory)
├── references /lib/spw-v0.1.0-alpha/core/SPEC.md (to update)
├── references /lib/spw-v0.1.0-alpha/core/OPERATORS.md (to update)
├── guides /docs/SATURATION-MODEL.md (new quick ref)
├── guides /docs/decisions/002-valence-saturation.md (new ADR)
├── guides /IMPLEMENTATION-BLUEPRINT.md (update)
├── guides /src/core/operators.ts (add properties)
├── guides /src/features/keyboard/VIM-KEYBINDINGS.md (update context)
└── guides /SYNTAX-EXPLORATION-MODEL.md (new, creative sandbox strategy)

README.md (user overview)
└── links to OPERATIONAL-PHYSICS.md
```

---

## File Status Checklist

- [x] `OPERATIONAL-PHYSICS.md` — Created ✅
- [ ] `/lib/spw-v0.1.0-alpha/core/SPEC.md` — To update (Priority: CRITICAL)
- [ ] `/lib/spw-v0.1.0-alpha/core/OPERATORS.md` — To update (Priority: CRITICAL)
- [ ] `/docs/SATURATION-MODEL.md` — To create (Priority: HIGH)
- [ ] `/docs/decisions/002-valence-saturation.md` — To create (Priority: HIGH)
- [ ] `/IMPLEMENTATION-BLUEPRINT.md` — To update (Priority: HIGH)
- [ ] `/src/core/operators.ts` — To update (Priority: MEDIUM)
- [ ] `/src/features/keyboard/VIM-KEYBINDINGS.md` — To update (Priority: MEDIUM)
- [ ] `/README.md` — To update (Priority: LOW)
- [ ] `/PHASE-4-FORMAL-SPEC-INTEGRATION.md` — Archive note (Priority: LOW)

---

## Implementation Readiness

**Current Status**: Ready to implement Phase 4A

**Blocked by**: Nothing (theory complete)

**Next Steps**:
1. Update SPEC.md and OPERATORS.md (critical path)
2. Implement saturation tracking in AST
3. Add saturation calculation to parser
4. Test saturation values
5. Implement emergence rules at runtime

**Timeline**: 4 weeks total for full saturation implementation

---

## Notes

- Keep `/PHASE-4-FORMAL-SPEC-INTEGRATION.md` as historical reference (rename to `PHASE-4-FORMAL-SPEC-INTEGRATION.archive.md`?)
- Documentation hierarchy: README → OPERATIONAL-PHYSICS → specific docs → code
- All updates should emphasize: "Invalid is not a category; all saturation levels are valid"
- Use physical chemistry analogy consistently across all docs

---

**Last Updated**: 2026-01-19
**Commit**: 1ae9a95 (operational physics foundation)
