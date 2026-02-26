---
name: spw-semantics-rigor
description: Make the codebase's semantics model more rigorous (cognitive linguistics + physical chemistry metaphors, invariants, measurable claims). Use when formalizing semantics, writing specs, or aligning metaphor to implementation.
---

# Spw Semantics Rigor

## Default Workflow

1. Identify the concept to formalize (term, metaphor, axis, invariant, operator semantics).
2. Anchor the concept in existing repo artifacts (docs, types, runtime behavior).
3. Write down explicit definitions and at least one counterexample.
4. Translate the definition into a checkable form (tests, validators, instrumentation, lint rules).
5. Update docs/specs and add a "how to falsify" note (what evidence would disprove it).
6. Express the formalization in Spw using Gen 3 syntax alongside code.

## Output Contract

- Produce a small spec update (or new note) plus the smallest enforceable mechanism (tests/instrumentation) when appropriate.
- Avoid "metaphor drift": define terms once and reuse consistently.
- Use the ONF reduction (`σ(args)[reg=R]`) to verify that surface syntax and formal semantics align.

## Codebase Semantic Vocabulary

### Operators as Structural Invariants
Each of the 12 operators captures an invariant across all interpretive domains:

| Operator | Invariant | Comp | EM | Cognition |
|---|---|---|---|---|
| `!` | Force energy into system | execute | current injection | motor action |
| `~` | Exist without commitment | defer | potential difference | memory trace |
| `?` | Interrogate without changing | query | probe point | inquiry |
| `#` | Periodic identity | hash/tag | resonant frequency | schema |
| `.` | Baseline zero | member | ground reference | percept |
| `^` | Rise to higher abstraction | header | charge elevation | synthesis |
| `@` | Where you stand to observe | scope | field position | attention |
| `*` | Collapse to concrete value | deref | power dissipation | recognition |
| `&` | Overlay two fields | merge | superposition | integration |
| `=` | Bind name to value | assign | set voltage | categorize |
| `$` | Reflect on medium itself | meta | impedance | metacognition |
| `%` | Normalize to comparable scale | modulo | duty cycle | salience |

### Tiered Normalization
- **SNF** (Surface Normal Form): flat token stream, lexer output
- **SiNF** (Sigil Normal Form): per-sigil reduction (`!x` and `x!` → `!(x)`)
- **SeNF** (Semantic Normal Form): cross-sigil normalization (may not terminate)

### Non-Commutative Pairs
`!(~x) ≠ ~(!x)` — eagerness and laziness are distinct homotopy classes. This is the fundamental group of the register geometry space.

### Valence Pentad
Every component describes how its material changes across five qualities:
- **boon**: generative, expansive, warm
- **bane**: constrained, reductive, sharp
- **bone**: structural baseline, neutral
- **bonk**: catalytic, transformative, disruptive
- **honk**: assertive, declarative, signal

Valence couplings are axis-parameterized: the active deformation axes determine which couplings are constructive vs. destructive. For example, under a configuration with timing=swing and stability=metastable, `boon ⊗ honk` becomes constructive (generative disruption) rather than conflicting.

### Genre as Coincidence
A genre is not designed. A genre is a **coincidence** — a post-hoc label for an observed configuration of deformation axis values (timing, disclosure, stability, affect, resolution, noise) that happens to resemble something culturally recognizable. The axes are ontologically primary; genre labels are human shorthand.

When formalizing genre-adjacent semantics, define and enforce the *axis invariant*, not the genre name.

### Cascade Override
`[cascade=layer priority=N]` enables fact correction while preserving history. Higher priority overrides lower. `[resolve=cascade]` in projections automatically resolves through cascade layers.

## Codebase Tooling

```bash
npm run audit:spw-garden    # Audit .spw doc files for structural health
npm run analyze:perturb     # Perturbation analysis — what changes when X changes
npm run audit               # Extract and classify all @spw: annotation sites
npm run lint:docs           # Check .spw path references are valid
```

## Skill Care

Update this skill when:
- A new operator is added to the language → update the operator invariant table (currently 12)
- The valence pentad changes (boon/bane/bone/bonk/honk) → update the Valence Pentad section
- ONF tiers change (SNF/SiNF/SeNF) → update the Tiered Normalization section
- A new cascade mechanism is added → update Cascade Override section
- `docs/theory/spw/operators.spw` is updated → re-run `semantics-check.sh` to verify coverage
- A new deformation axis is formalized → update Genre as Coincidence section

## Scripts

- `bash .agents/skills/spw-semantics-rigor/scripts/semantics-check.sh` — verify operator coverage, branded types, metaphor consistency

## Resources

- Read `.agents/skills/spw-semantics-rigor/references/rigor-method.md` for a repeatable method to go from metaphor → definition → enforcement.
- Reference `docs/theory/spw/onf.spw` for the normalization spec.
- Reference `docs/theory/spw/operators.spw` for canonical operator definitions.
- Reference `docs/theory/spw/register-geometry.spw` for the fiber bundle model.
- Reference `src/lang/docs/operant-perspectives.spw` for cross-domain operator readings.
