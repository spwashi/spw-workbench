---
name: spw-research-rigor
description: Turn engineering/design questions in this repo into rigorous, reproducible research notes (hypothesis, method, instrumentation, results, next experiments). Use for grad-school style writeups and experiment planning.
---

# Spw Research Rigor

## Default Workflow

1. Convert the prompt into a research question and falsifiable hypothesis.
2. Choose one measurable outcome and one negative control (what should not change).
3. Decide what to instrument (logs, timings, UI states, parse events, user actions).
4. Run the smallest experiment that can answer the question.
5. Write a short note using the template in `assets/notebook-template.md`.
6. If code changes are made, keep them minimal and leave a clear rollback path.

## Output Contract

- Produce either:
  - A notebook entry (preferred), or
  - A notebook entry plus a small instrumentation patch.

## Codebase Research Affordances

### Grok Probe Methodology
The codebase has an established pattern for AI-agent research probes:

1. **Write a probe** in `.spw` format: `src/lang/seeds/probes/grok-syntax-exp-v0.N.spw`
2. **Send to agent** (Grok, Claude, etc.) for exploration
3. **Archive response** as `grok-response-{topic}-v0.N.spw`
4. **Evaluate findings**: which Grok-adopted syntax is canonical vs aspirational vs experimental?
5. **Integrate**: update theory files and probes with validated findings

### Probe Header Convention
```spw
^seed[probe-name v:0.4 @profile:Spw.b @target:AgentName_VersionDate]
```

### Research Axes in This Codebase
- **Syntax generation**: Gen 1 → Gen 2 → Gen 3 evolution tracked across 217 `.spw` files
- **Operator semantics**: 12 operators read through 5+ interpretive domains
- **Normalization**: SNF → SiNF → SeNF pipeline (does it terminate? is it confluent?)
- **Facet resonance**: do shared `.{}` keys across component docs create useful navigability?
- **Cascade resolution**: does priority-ordered merge produce consistent overrides?
- **Valence pentad**: is boon/bane/bone/bonk/honk a complete and orthogonal quality basis?

### Wonder Calculus
Self-introspective research questions for the language:
- `?<self, pattern>` — structural invariant queries
- `?<self, transition>` — what has changed and why
- `?<self, missing>` — what should exist but doesn't
See `docs/theory/spw/wonder-calculus.spw` and `docs/theory/spw/wonder-probes.spw`.

## Codebase Tooling

```bash
npm run audit:spw-garden    # Structural health of .spw doc files
npm run analyze:patterns    # Pattern learner — finds repeated structures across codebase
npm run lint:docs           # Verify .spw path references are valid
npm run audit:md            # Markdown report of all @spw: markers (good for research notes)
```

## Skill Care

Update this skill when:
- A new probe format is established (new header convention) → update Probe Header Convention
- A new AI agent is used for probes (Gemini, Copilot, etc.) → update Grok Probe Methodology to be agent-agnostic
- A research axis is resolved (e.g., ONF confluence proven) → mark it as resolved in Research Axes
- New wonder calculus axioms are added → update Wonder Calculus section

## Resources

- Read `.agents/skills/spw-research-rigor/references/research-workflow.md` when choosing methods, controls, and evidence standards.
- Copy `.agents/skills/spw-research-rigor/assets/notebook-template.md` as the default note scaffold.
- Reference existing probes in `src/lang/seeds/probes/` for the established format.
