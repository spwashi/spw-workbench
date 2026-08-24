# Workbench Architecture

This project is a package-oriented monorepo with canon and editor surfaces around a portable language kernel. Keep semantic ownership aligned to these boundaries.

## Package order

From portable meaning to host projection:

1. `packages/spw-seed` — lexer, parser, AST types, and portable source products
2. `packages/spw-runtime` — interpreter and substrate-driven event system
3. `packages/spw-lsp` — editor-neutral language and workspace semantics
4. `packages/spw-cli` — commands, intermediate products, and projections
5. `extensions` — VS Code, WebStorm/IntelliJ, and Neovim adapters
6. `.spw` and `lib/spw-v0.3.0` — current canon, conventions, and specification surfaces

## Key entrypoints

- Parser kernel: `packages/spw-seed/src/index.ts`
- Runtime package: `packages/spw-runtime/src/index.ts`
- LSP server: `packages/spw-lsp/src/stdio-server.ts`
- CLI entry: `packages/spw-cli/src/main.ts`
- Canon workspace: `.spw/workspace.spw`
- Docs index map: `docs/index.spw`

## Architecture rules

- Seed remains portable and does not absorb runtime, editor, or UI concerns.
- Runtime and LSP consume shared Seed contracts rather than reparsing with host-local semantics.
- Editor clients discover, launch, and project; they do not become second semantic engines.
- Consumer repositories remain authoritative when the workbench is mounted at `.spw/_workbench`.
- Stable, observational, and experimental syntax claims remain visibly distinct.

## Where to read next

- `docs/toc.spw`
- `docs/plans/spw/architecture.spw`
- `src/README.md`
