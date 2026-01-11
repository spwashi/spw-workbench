# Design History

Background context for the design decisions in this codebase.

## Origins

Spw was originally designed as a concept tagging language to model cognitive psychology and bridge subjective phenomena. Development began around 2014-2017 during university studies in:

- Electrical and Computer Engineering (phasors as relational metaphor)
- Learning and Education Studies (Applied Learning Science)

Research assistance in the Photonic Systems Lab and Adult Learning Lab informed the approach.

## Formative Influences

Two jobs shaped the design philosophy:

1. **Indexing research papers** - Creating findable structure over heterogeneous knowledge. Printing, skimming, highlighting, organizing for a geologist. The work of making things discoverable.

2. **Preparing learning kits** - Sorting electrical components, trimming wires, salvaging chips, assembling kits for the next cohort of ECE students. Preparing material so learners encounter it ready.

Both involve preparing a space for someone else to learn in.

## Phasors

From ECE: a phasor represents a sinusoidal function as a rotating vector. The same phenomenon viewed across different phase angles. This metaphor applies to the three-layer model:

```
Syntactic ─── phase 0° ─── structure, form
Semantic  ─── phase 120° ── meaning, value
Pragmatic ─── phase 240° ── purpose, effect
```

Same signal, different projections.

## Design Mnemonics

When considering multiple dimensions of a single thing, countable structures help ensure systematic coverage. The number of dimensions varies by context (2, 3, 5, or more).

These thinking tools inform how the codebase is organized—the "learnable edges traced into familiarity when cruising through." They're scaffolding for design, not surface vocabulary.

## WAP

Wonder About Pi(e).

---

*See `/src/core/tally.ts` for the generic implementation.*
