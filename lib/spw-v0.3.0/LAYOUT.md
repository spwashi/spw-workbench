# Spw v0.3.0 Layout

## Purpose

Define the folder-level architecture so the spec library stays orderly and reviewable across versions.

## Canon Layout

```
lib/spw-v0.3.0/
  README.md
  ARCHITECTURE.md
  LAYOUT.md
  DELTAS.md
  ROADMAP.md
  CHANGELOG.md
  architecture/
    index.spw
    layout.spw
    theory-bridge.spw
  core/
    index.spw
    SPEC.md
    OPERATORS.md
    CONTAINERS.md
    SEEDS.md
    CAPSULES.md
    BOUNDARIES.md
    LAYERS.md
    SAFETY.md
    INTEGRITY.md
    CONFORMANCE.md
  runtime/
    index.spw
    PIPELINE.md
    REGISTERS.md
    GOALS.md
    CACHE-IR.md
    TRAJECTORY.md
  dialects/
    index.spw
    FUNCTIONS.md
    GEOMETRY.md
    PHASES.md
  domains/
    index.spw
    TASTE.md
    PROFILES.md
    POSTURE.md
  applications/
    index.spw
    HARDWARE.md
    THEATRE.md
    BROADCAST.md
    QUERY.md
  infra/
    index.spw
    CONFORMANCE.md
  packages/          # new in v0.3.0
    TOPOLOGY.md
    SEED.md
    RUNTIME.md
    LSP.md
    CLI.md
  surfaces/          # new in v0.3.0
    PLUGIN-PROTOCOL.md
    PROJECTIONS.md
```

## Surface Pairing

| Purpose | Markdown Surface | Spw Surface |
|---|---|---|
| Library overview | `README.md` | `architecture/index.spw` |
| Structural map | `ARCHITECTURE.md`, `LAYOUT.md` | `architecture/layout.spw` |
| Theory coupling | `ARCHITECTURE.md` | `architecture/theory-bridge.spw` |
| Core kernel | `core/*.md` | `core/index.spw` |
| Runtime execution | `runtime/*.md` | `runtime/index.spw` |
| Dialect map | `dialects/*.md` | `dialects/index.spw` |
| Domain lenses | `domains/*.md` | `domains/index.spw` |
| Applications | `applications/*.md` | `applications/index.spw` |
| Infrastructure | `infra/*.md` | `infra/index.spw` |
| Package topology | `packages/*.md` | (v0.4.0 candidate) |
| Surface protocol | `surfaces/*.md` | `.spw/surfaces/plugin-protocol.spw` |
| Delta tracking | `DELTAS.md`, `CHANGELOG.md` | (v0.4.0 candidate) |
| Forward plan | `ROADMAP.md` | (v0.4.0 candidate) |

## Naming Rules

- Directory names: lowercase kebab-case.
- Architecture support files: lowercase kebab-case `.spw` names.
- Contract docs: uppercase canonical names for specification titles (e.g., `OPERATORS.md`).
- Package docs: uppercase name matching the package (e.g., `CLI.md` for `spw-cli`).

## Document Scaffold (v0.3.0)

Every contract stub uses this heading sequence:

```markdown
# TITLE (Spw v0.3.0)

## Status
## v0.3.0 Contract
## Source Links
## Invariants
## Migration Notes
## Open Questions
## v0.4.0 Candidates
```

This extends the v0.2.0 scaffold (`Status / Contract Stub / Invariants / Implementation Hooks / Open Questions`) with source traceability, migration notes, and forward staging.
