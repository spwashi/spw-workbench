# Philosophy & References

This page collects key references and context that motivate the workbench design: why the layers exist, what taste means in this codebase, and where to go deeper.

## Orientation

- Spw treats code shape and meaning as first-class. Goals and disclosure levels guide how the system behaves and teaches.
- Accessibility, determinism where it matters, and debuggable UI semantics are central design values.

## Core references (low-noise, repo surfaces)

| Surface | Purpose |
| --- | --- |
| `VISION.md` | High-level intent and research handles across CS, accessibility, and cognition |
| `LORE.md` | Narrative atlas — a guided walk through the architecture as a place |
| `docs/waypoints/` | Curated routes through the docs (architecture, runtime, keyboard, release) |
| `docs/index.spw` | Primary docs graph |
| `docs/toc.spw` | Broad navigation map |

These files are part of the repository and can be explored alongside the Writerside topics. Keep links low-noise in prose; use code paths or contextual tables when in doubt.

## Where philosophy meets practice

- Architecture rules and layer boundaries shape day-to-day decisions (see Workbench Architecture).
- Experiments inform taste: small, instrumented changes with fast feedback loops.
- Documentation is executable: validations and audits are part of the workflow.

## Read next

- Workbench layers and entrypoints in `workbench-architecture.md`
- Experiments & Skills to try practical loops
- Validation Playbook for default contributor gates

<seealso>
  <category ref="spw-workbench">
    <a href="workbench-architecture.md"/>
    <a href="experiments-and-skills.md"/>
    <a href="validation-playbook.topic"/>
    <a href="documentation-map.md"/>
  </category>
</seealso>
