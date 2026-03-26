# TOPOLOGY (Spw v0.3.0)

## Status

New in v0.3.0 — documents the monorepo workspace package boundaries.

## v0.3.0 Contract

The workspace coordinates four packages with explicit dependency direction:

```
spw-cli → spw-lsp → spw-runtime → spw-seed
```

- Each package owns its source, tests, types, and build configuration.
- Cross-package imports flow strictly downward (CLI may import from LSP; LSP may not import from CLI).
- The root `package.json` is a workspace coordinator, not an application entry point.
- `dist/` is a derived artifact from `spw-seed` and `spw-runtime` — it is not a source of truth.

## Source Links

- Root workspace: `package.json` (workspaces field)
- Seed: `packages/spw-seed/package.json`
- Runtime: `packages/spw-runtime/package.json`
- LSP: `packages/spw-lsp/package.json`
- CLI: `packages/spw-cli/package.json`

## Invariants

- No circular dependencies between packages.
- Each package can type-check independently (`tsc -p packages/<name>/tsconfig.json`).
- Version numbers stay synchronized across all packages within a release.

## Migration Notes

New stratum in v0.3.0 — no prior version equivalent. The package boundaries were implicit in v0.2.0 (everything lived under `src/` and `packages/` without formal topology documentation).

## Open Questions

- Should `dist/` be generated from `spw-seed` alone or from seed + runtime?
- When should packages publish independently to npm vs. as a single bundle?

## v0.4.0 Candidates

- Enforce cross-package import direction via lint rule.
- Each package publishes independently with its own `package.json` version lifecycle.
- Add `.spw` index surface for package topology navigation.
