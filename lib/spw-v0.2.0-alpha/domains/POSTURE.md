# Posture: Behavioral Profiles

Version: 0.2.0-alpha
Status: Contract stub — plan exists, not machined

---

## v0.2.0 Contract Stub

Posture defines behavioral characteristics: safety, performance, ergonomics, and rigor. Unlike Taste (which governs aesthetics), Posture changes *how* code executes and *what* guarantees it provides.

**v0.2.0 reality**: posture is specified but not implemented. The `fuzz-profiles-experimental-dev` plan references posture concepts. Capsule configuration (`<c[use:Spw.Posture.*]>`) is not parsed or evaluated.

### Core Profiles

| Profile | Priority | Use when |
|---------|----------|----------|
| ResearchRigorous | Full traceability | Debugging, analysis |
| StreamVelocity | Low latency | Streams, batch, real-time |
| TeachingGentle | Max ergonomics | Tutorials, onboarding |
| ProductionSafe | Safety-first | Production, security |
| AuditComplete | Full determinism | Compliance, reproducibility |

### Behavioral Dimensions

| Dimension | Range |
|-----------|-------|
| verification | none → strict |
| logging | none → full_with_witnesses |
| determinism | not_required → required |
| ergonomics | minimal → maximum |
| performance | secondary → primary |
| capabilities | open → gated |

### Relationship to Goals

| Goal | Default posture |
|------|----------------|
| explain | TeachingGentle |
| execute | ProductionSafe |
| audit | AuditComplete |

---

## Invariants

1. Taste ⊥ Posture — aesthetics and behavior are orthogonal.
2. Posture never changes surface syntax — only execution behavior.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| Capsule config (`<c[...]>`) | Parser | ❌ Not parsed |
| Posture profiles | — | ❌ Not implemented |
| `fuzz-profiles-experimental-dev` plan | `.agents/plans/` | ⚠️ Plan exists |
| Goal-based default posture | `runtime/GOALS.md` | ⚠️ Specified only |

---

## See Also

- [TASTE.md](./TASTE.md) — Aesthetic evaluation
- [PROFILES.md](./PROFILES.md) — Domain profiles
- [../runtime/GOALS.md](../runtime/GOALS.md) — Goal-based execution
