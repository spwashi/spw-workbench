# Plan: physics-runtime-canon

Separate canonical runtime semantics from exploratory physics notes, and align the theory/runtime vocabulary with the shipped runtime contract.

## Goal

The desired end state is a theory/runtime corpus that tells implementors what is binding today versus what is exploratory. The runtime lifecycle, liminality vocabulary, container model, and quality/valence language should read as one coherent contract anchored to the shipped runtime types rather than as overlapping metaphors. This improves correctness and clarity in the docs without widening the runtime surface itself.

**Taste note**: clarity, correctness, naming.

## Scope

- **In scope**: explicit canonical vs exploratory framing in the physics docs, runtime phase terminology alignment to `src/runtime/state/types.ts`, container-model bridge notes, and normalization of quality/valence/physics vocabulary across the cited theory/runtime docs.
- **Out of scope**: runtime code changes, `RegisterBank` redesign, new parser/runtime behavior, and broader chemistry/metaphysics refactors beyond documentation alignment.

## Files

```text
[NEW] .agents/plans/physics-runtime-canon/wip.spw
[MOD] docs/theory/spw/semantics-physics.spw
[MOD] docs/runtime/spw/runtime-foundation.spw
[MOD] docs/runtime/index.spw
[MOD] docs/theory/index.spw
[MOD] docs/theory/spw/register-geometry.spw
[MOD] docs/theory/spw/valence-architecture.spw
[MOD] docs/theory/spw/quality.spw
[DEL] (none)
```

### Craft guard

- Keep all changes doc-local; do not drift into runtime implementation while normalizing vocabulary.
- `docs/theory/spw/register-geometry.spw` already carries multiple concepts; add a bridge note rather than expanding the algebra substantially.
- Prefer one canonical term per concept, with explicit aliases only where the runtime still accepts them for backward compatibility.

## Commits

1. `.[plans] — stage physics/runtime canon alignment plan artifacts`
2. `.[docs] — separate exploratory physics notes from canonical runtime semantics`
3. `.[docs] — normalize phase, container, and quality vocabulary across theory/runtime docs`
4. `![docs] — validate syntax and semantics-rigor checks for the aligned corpus`

## Agentic Hygiene

- Rebase target: `main@2ab173d627141d10706e5851d57442ce5023a364`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Fuzz Strategy

- Explore: `npm run audit:spw:syntax -- --match 'semantics-physics|runtime-foundation|runtime/index|theory/index|register-geometry|valence-architecture|quality'`
- Stabilize: `npm run lint:docs && bash .agents/skills/spw-semantics-rigor/scripts/semantics-check.sh`
- Ship gate: `npm run audit:full && git diff --check`
