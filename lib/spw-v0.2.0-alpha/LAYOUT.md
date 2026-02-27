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
  runtime/
  dialects/
  domains/
  applications/
  infra/
```

## Surface Pairing

| Purpose | Markdown Surface | Spw Surface |
|---|---|---|
| Library overview | `README.md` | `architecture/index.spw` |
| Structural map | `ARCHITECTURE.md`, `LAYOUT.md` | `architecture/layout.spw` |
| Theory coupling | `ARCHITECTURE.md` | `architecture/theory-bridge.spw` |
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
