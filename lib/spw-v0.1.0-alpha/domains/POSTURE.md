# Posture: Behavioral Profiles

Version: 0.1.0-prealpha
Status: Specified (Optional)

---

## Overview

Posture defines behavioral characteristics: safety, performance, ergonomics, and rigor. Unlike Taste (which governs aesthetics like layout and pacing), Posture changes *how* code executes and *what* guarantees it provides.

The root namespace is `Spw.Posture`. Entry type is `BehaviorProfile`.

**Key Invariants:**
- Posture changes behavior: safety, performance, ergonomics, rigor
- Posture may require verification, logging, or determinism for audit goals
- Posture never changes surface syntax semantics

---

## Library Structure

```
Spw.Posture/
├── BehaviorProfile          # Entry type
├── ResearchRigorous         # High verification, full logging
├── StreamVelocity           # Performance-first, minimal overhead
├── TeachingGentle           # High ergonomics, forgiving defaults
├── ProductionSafe           # Safety-first, capability-gated
└── AuditComplete            # Full determinism, witness generation
```

---

## Core Profiles

### ResearchRigorous

For exploratory work requiring full traceability.

```spw
Spw.Posture.ResearchRigorous{
  #verification: required
  #logging: full
  #determinism: when_requested
  #ergonomics: moderate
  #performance: secondary
}
```

**Use when:** Analyzing data, debugging behavior, building understanding.

### StreamVelocity

For high-throughput scenarios where latency matters.

```spw
Spw.Posture.StreamVelocity{
  #verification: deferred
  #logging: minimal
  #determinism: not_required
  #ergonomics: minimal
  #performance: primary
}
```

**Use when:** Processing streams, real-time systems, batch pipelines.

### TeachingGentle

For onboarding and learning contexts.

```spw
Spw.Posture.TeachingGentle{
  #verification: helpful_hints
  #logging: explanatory
  #determinism: not_required
  #ergonomics: maximum
  #performance: secondary
}
```

**Use when:** Tutorials, documentation, first-time users.

### ProductionSafe

For deployed systems requiring safety guarantees.

```spw
Spw.Posture.ProductionSafe{
  #verification: strict
  #logging: audit_trail
  #determinism: required
  #ergonomics: moderate
  #performance: balanced
  #capabilities: gated
}
```

**Use when:** Production deployments, security-sensitive contexts.

### AuditComplete

For verifiable, reproducible execution with witnesses.

```spw
Spw.Posture.AuditComplete{
  #verification: required
  #logging: full_with_witnesses
  #determinism: required
  #ergonomics: secondary
  #performance: secondary
  #hash_verification: required
}
```

**Use when:** Audit goal, compliance requirements, reproducibility proofs.

---

## Behavioral Dimensions

| Dimension | Description | Range |
|-----------|-------------|-------|
| verification | Input/output checking | none → strict |
| logging | Execution trace detail | none → full_with_witnesses |
| determinism | Reproducibility guarantee | not_required → required |
| ergonomics | Error message helpfulness | minimal → maximum |
| performance | Optimization priority | secondary → primary |
| capabilities | Effect gating | open → gated |

---

## Posture Selection

Posture is selected explicitly via capsule configuration:

```spw
<c[use:Spw.Posture.ResearchRigorous]>{
  // content evaluated with this posture
}
```

Multiple postures can be combined (later overrides earlier):

```spw
<c[use:Spw.Posture.ProductionSafe use:Spw.Posture.StreamVelocity]>{
  // Safety from ProductionSafe, performance from StreamVelocity
}
```

---

## Relationship to Goals

Goals select default postures:

| Goal | Default Posture |
|------|----------------|
| explain | TeachingGentle |
| index | StreamVelocity |
| execute | ProductionSafe |
| onboard | TeachingGentle |
| audit | AuditComplete |

Explicit posture in capsule overrides goal default.

---

## Relationship to Taste

Taste and Posture are orthogonal:

| Concern | Library | Changes |
|---------|---------|---------|
| Aesthetic | Spw.Taste | Layout, pacing, rhythm |
| Behavioral | Spw.Posture | Safety, performance, rigor |

Both can be specified independently:

```spw
<c[use:Spw.Taste.Poetic use:Spw.Posture.ResearchRigorous]>{
  // Poetic rhythm with rigorous verification
}
```

**Invariant:** Taste never changes canonical_text (except when rhythm flags participate in canonicalization). Posture may change execution behavior and outputs.

---

## Legacy Aliases

For compatibility, these aliases are supported:

```
Spw.Profile.* == Spw.Posture.*
Spw.Stance.*  == Spw.Posture.*
```

New code should use `Spw.Posture.*`.

---

## Conformance

Posture support is optional at all conformance levels. Level 3 implementations SHOULD support posture selection. Implementations MAY define additional postures under custom namespaces.

---

## See Also

- [TASTE.md](./TASTE.md) - Aesthetic evaluation (TasteProfile)
- [../runtime/GOALS.md](../runtime/GOALS.md) - Goal-based execution modes
- [../core/CAPSULES.md](../core/CAPSULES.md) - Configuration layer syntax
