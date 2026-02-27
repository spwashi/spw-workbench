# Spw v0.2.0-alpha Layout

## Purpose

Define the folder-level architecture so migration from redirect stubs to authored v0.2 contracts stays orderly and reviewable.

## Canon Layout

```
lib/spw-v0.2.0-alpha/
  ARCHITECTURE.md
  LAYOUT.md
  README.md
  DELTAS.md
  CHANGELOG.md
  architecture/
    index.spw
    layout.spw
    theory-bridge.spw
  core/
    index.spw
  runtime/
    index.spw
  dialects/
    index.spw
  domains/
    index.spw
  applications/
    index.spw
  infra/
    index.spw
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
| Delta tracking | `DELTAS.md`, `CHANGELOG.md` | (future support surface) |

## Naming Rules

- Directory names: lowercase kebab-case.
- Architecture support files: lowercase kebab-case `.spw` names.
- Contract docs: uppercase canonical names when they represent specification titles (for example `OPERATORS.md`).

## Migration Order

1. `core/` contracts
2. `runtime/` contracts
3. architecture support surfaces
4. remaining strata (`dialects/`, `domains/`, `applications/`, `infra/`)

## Notes

This layout intentionally keeps architecture supports near the spec library, not only in `docs/`, so semantic intent remains adjacent to contractual text.
