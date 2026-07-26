---
name: spw-semantics-rigor
description: Make the codebase's semantics model more rigorous (cognitive linguistics + physical chemistry metaphors, invariants, measurable claims). Use when formalizing semantics, writing specs, or aligning metaphor to implementation.
---

# Spw Semantics Rigor

## Default Workflow

1. Identify the concept to formalize (term, metaphor, axis, invariant, operator semantics).
2. Anchor the concept in existing repo artifacts (docs, types, runtime behavior).
3. Classify each statement as `implemented`, `measured`, `proposed`, or `interpretive`.
4. Write down explicit definitions and at least one counterexample.
5. Describe evidence with independent basis (`observed`, `derived`, `reported`), domain, role, and provenance; keep this separate from effect authority.
6. Translate the definition into a checkable form (tests, validators, instrumentation, lint rules).
7. Update docs/specs and add a "how to falsify" note (what evidence would disprove it).
8. Express the formalization in Spw using Gen 3 syntax alongside code.

## Output Contract

- Produce a small spec update (or new note) plus the smallest enforceable mechanism (tests/instrumentation) when appropriate.
- Avoid "metaphor drift": define terms once and reuse consistently.
- Use the ONF reduction (`σ(args)[reg=R]`) to verify that surface syntax and formal semantics align.
- Quote current runtime behavior before proposing richer operator strategy.
- Treat left/right, charge, fiber, resonance, emotion, and biological language as optional profiles unless their named maps and invariants are implemented.
- For layout semantics, preserve explicit tokens and AST ancestry as authority; spacing may be measured as a soft feature without silently becoming grammar.

## Codebase Semantic Vocabulary

### Operator Readings (Interpretive Until Verified)

Seed declares 13 operator tokens: 12 single sigils plus `<>`. The table below is useful translation vocabulary, not a cross-domain invariant or runtime behavior table. Quote lexer, parsed AST, ONF, runtime value, register writes, and trace evidence separately.

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
| `<>` | Couple two positions | pair | interface | relation |

### Tiered Normalization
- **SNF-like surface**: lexer output exists.
- **SiNF**: a partial AST-to-ONF projection exists; fixity equivalence and per-sigil reducers are proposed. Current `!x`, `! x`, and `x!` do not normalize alike.
- **SeNF**: cross-sigil optimization, confluence, and termination are proposed research.

### Coupling Constructors

Treat `()`, `[]`, `{}`, `<...>`, specialized pairs, and explicit `<>` as a proposed semantic coupling family while retaining distinct lexer and AST forms. Start with a recursive tagged boundary view; use colored-operad composition and common `<>` lowering only as testable hypotheses. See `docs/theory/spw/coupling-constructors.spw`.

### Ordering Hypotheses
`!(~x)` and `~(!x)` are candidate non-commutative pairs. Compare parse, ONF, runtime value, register writes, and trace order before promoting the distinction. Homotopy or group language remains interpretive until a domain, map, composition law, invariant, and counterexample are supplied.

### Orientation Discipline
- Canonical coordinates: `open|close`, `prefix|postfix`, `before|after`, and typed `ingress|egress` ports.
- Render-only coordinates: `left|right`, `inward|outward`, `accumulate|release`.
- A render-only profile must preserve tokens, AST, normalized projection, semantic coordinates, and effects.
- Any orientation that changes operand order, containment, normalization, or evaluation is a versioned dialect.

### Evidence Provenance and Effect Grades
- `observed`: read from a named, revision-addressed artifact without another semantic classification rule.
- `derived`: computed from referenced inputs by a named, versioned method; declare determinism, profile, and uncertainty where applicable.
- `reported`: attributed to a named human, agent, or model context.
- Evidence also declares its domain (`syntax`, `topology`, `preference`, and so on) and role (`match`, `filter`, `projection`, or `annotation`).
- Evidence bases are categorical, not ordered, and never grant effect authority.
- `S0`: read/measure only.
- `S1`: in-memory or sandbox transformation.
- `S2`: workspace edit with preview, snapshot preconditions, and explicit apply authority.
- `S3`: external process, equipment, or material effect with explicit confirmation.
- Never use an epistemic grade as permission to perform an effect.

### Valence Pentad (Interpretive Profile)
A component may be rendered through five qualities when a local profile declares them:
- **boon**: generative, expansive, warm
- **bane**: constrained, reductive, sharp
- **bone**: structural baseline, neutral
- **bonk**: catalytic, transformative, disruptive
- **honk**: assertive, declarative, signal

Valence couplings and deformation axes are research hypotheses. If used, publish the mapping, observation method, counterexample, and effect boundary; do not infer affect from syntax alone.

### Genre as Coincidence
A genre is not designed. A genre is a **coincidence** — a post-hoc label for an observed configuration of deformation axis values (timing, disclosure, stability, affect, resolution, noise) that happens to resemble something culturally recognizable. The axes are ontologically primary; genre labels are human shorthand.

When formalizing genre-adjacent semantics, define and enforce the *axis invariant*, not the genre name.

### Cascade Override
`[cascade=layer priority=N]` is legacy/theory vocabulary for priority resolution. Verify parser, normalizer, and runtime implementation before describing automatic override behavior.

## Codebase Tooling

```bash
npm run audit:spw-garden    # Audit .spw doc files for structural health
npm run analyze:perturb     # Perturbation analysis — what changes when X changes
npm run audit               # Extract and classify all @spw: annotation sites
npm run lint:v020:architecture  # Library architecture/theory bridge integrity
npm run lint:v020:runtime   # Runtime contract + naming integrity
npm run lint:docs           # Check .spw path references are valid
```

## Shared Spw Integration

Skill scripts use the shared utility at `scripts/spw-lib.sh` for:
- argument parsing (`--match`, `--exclude`)
- consistent section/set/facet output framing
- common affordance rendering across skills

## Skill Care

Update this skill when:
- A new operator is added to the language → update the operator reading table (currently 13 including `<>`)
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
- Reference `docs/theory/spw/operational-topography.spw` for selection strata, orientation, spacing, hydration, and evidence packets.
- Reference `lib/spw-v0.3.0/architecture/theory-bridge.spw` for the current library-level operator/brace theory bridge; use v0.2.0-alpha only as archival precedent.
