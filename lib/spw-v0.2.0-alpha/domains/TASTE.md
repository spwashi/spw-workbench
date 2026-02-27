# Taste Meta-Domain

Version: 0.2.0-alpha
Status: Contract stub — convention only, not machined

---

## v0.2.0 Contract Stub

`Taste@` evaluates seeds through aesthetic and quality dimensions. Unlike interpretive domains that project content, `Taste@` measures **how well-crafted** a seed is.

**v0.2.0 reality**: taste is used as a **convention** in agent skills and wip.spw streams, not as machinery. The `spw-craft-quality` skill references taste concepts. No automated taste scoring or taste-gated workflows exist in code.

### Six Axes

| Axis | Low → High | Measures |
|------|-----------|----------|
| Density | Sparse → Dense | Token economy |
| Valence | Neutral → Charged | Emotional texture |
| Depth | Flat → Deep | Nesting complexity |
| Explicit | Implicit → Explicit | Self-documentation |
| Abstract | Concrete → Abstract | Generality |
| Temporal | Instant → Processual | Unfolding |

### Eight Elegance Criteria

| Criterion | Weight | Question |
|-----------|--------|----------|
| Inevitability | 20% | Only way to write this? |
| Economy | 20% | Every token necessary? |
| Balance | 15% | Structure ↔ feeling? |
| Rhythm | 15% | Reads smoothly? |
| Surprise | 10% | Turn or insight? |
| Resonance | 10% | Form echoes content? |
| Composability | 5% | Combines with others? |
| Memorability | 5% | Will it stick? |

### Five Style Profiles

| Profile | Character | Use case |
|---------|-----------|----------|
| Minimalist | Dense, implicit | Expert tools |
| Literate | Explicit, balanced | Team docs |
| Poetic | High valence, rhythmic | Creative work |
| Mechanical | Explicit, checkpointed | Production |
| Research | Structured, linked | Analysis |

### Where Taste Lives Today

| Surface | How taste is used | Machined? |
|---------|------------------|-----------|
| `spw-craft-quality` skill | Agent applies taste lens during refactors | ❌ Convention |
| `wip.spw` stream entries | `>> taste — "naming feels right"` | ❌ Convention |
| `#taste[7,3,5,8,6,7\|...]` annotation | Inline micro-evaluation | ❌ Not parsed |
| `Taste@{?[composite > 8.0]}` workflow gate | Quality gate | ❌ Not implemented |

---

## Invariants

1. Taste never changes `canonical_text` or hashing — purely evaluative.
2. Taste and Posture are orthogonal — aesthetics vs. behavior.

---

## See Also

- [PROFILES.md](./PROFILES.md) — Domain profiles
- [POSTURE.md](./POSTURE.md) — Behavioral profiles
- `.agents/skills/spw-craft-quality/` — Agent skill using taste concepts
