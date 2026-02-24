# Workbench Architecture

This project uses a layered architecture. Keep imports and responsibilities aligned to these boundaries.

## Layer order

From inner to outer:

1. `core` - primitives, conventions, operator model
2. `infra` - timing, lifecycle, state, accessibility foundations
3. `lang` / `seed` - parsing, grammar, semantic interpretation adapters
4. `runtime` - interpreter, document/session state, REPL/API
5. `viz` - AST/tokens/flow renderers
6. `ui` / `design` - component primitives, themes, tokens, contracts
7. `features` - keyboard, onboarding, interaction behavior
8. `app` - workbench composition and components
9. `platform` - browser bootstrap and integration wiring

## Key entrypoints

- Browser entry: `src/platform/main.ts`
- App bootstrap: `src/platform/bootstrap.ts`
- Workbench root: `src/app/spw-workbench.ts`
- Source index map: `src/index.spw`
- Docs index map: `docs/index.spw`

## Architecture rules

- Inner layers must not depend on outer layers.
- `lang` and parser logic should remain portable and not absorb UI concerns.
- UI and design should consume shared contracts/tokens rather than hardcoded structure.
- Prefer adding behavior in existing layer domains before creating new top-level modules.

## Where to read next

- `docs/toc.spw`
- `docs/plans/spw/architecture.spw`
- `src/README.md`
