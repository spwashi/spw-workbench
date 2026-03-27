# CLI (Spw v0.3.0)

## Status

Package boundary documentation for `spw-cli` — the command-line interface.

## v0.3.0 Contract

`spw-cli` owns:
- `spw init` — workspace initialization
- `spw:dev` — development server
- `spw:select` / `spw:ls` — file and frame querying
- `spw:format` — source formatting
- `spw:mem:dump` — memory/state introspection

It depends on `spw-seed` (parsing), `spw-runtime` (execution), and `spw-lsp` (server lifecycle). It is the top-level consumer in the dependency chain.

## Source Links

- Package root: `packages/spw-cli/`
- Init entry: `packages/spw-cli/src/init.ts`
- Templates: `packages/spw-cli/templates/`

## Invariants

- CLI commands are non-destructive by default (no writes without explicit flags).
- CLI output is machine-parseable (JSON mode) or human-readable (default).
- Init templates are self-contained and produce valid `.spw` workspaces.

## Migration Notes

In v0.2.0, CLI commands were wired through root `package.json` scripts. v0.3.0 documents the CLI as a named package with its own entry points and templates.

## Open Questions

- Should the CLI bundle its own LSP server or rely on a separately installed one?
- What is the install story for end users (`npx spw init` vs. global install)?

## v0.4.0 Candidates

- CLI published as `@spwashi/spw-cli` to npm.
- `spw init` wizard with interactive workspace configuration.
- CLI-driven plugin discovery and installation.
