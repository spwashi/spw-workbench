# GitHub Reading Map

This is the fastest useful path through the repository.

Use it to answer three questions:

- What does the workbench contain?
- What is the current install and tooling model?
- Where should extension work begin?

## Start Here

1. [README.md](../../../README.md)
2. [quick-start.md](./quick-start.md)
3. [mounted-workbench.md](./mounted-workbench.md)

Those three surfaces define the repository, its mount boundary, and the current public contract.

## Language And LSP

Read in this order:

1. [`packages/spw-seed/src/parser.ts`](../../../packages/spw-seed/src/parser.ts)
2. [`packages/spw-lsp/src/stdio-server.ts`](../../../packages/spw-lsp/src/stdio-server.ts)
3. [`packages/spw-lsp/src/server-index.ts`](../../../packages/spw-lsp/src/server-index.ts)
4. [`packages/spw-lsp/src/handlers/`](../../../packages/spw-lsp/src/handlers)
5. [`extensions/vscode-spw/src/extension.ts`](../../../extensions/vscode-spw/src/extension.ts)

This path covers parsing, server entry, shared index state, handler behavior, and the thin editor client.

## Runtime

Read:

1. [`packages/spw-runtime/src/`](../../../packages/spw-runtime/src)
2. [`.spw/runtime/`](../../../.spw/runtime)
3. [`.spw/substrates/`](../../../.spw/substrates)

The runtime code and the canon surfaces are meant to be read together.

## Workspace Contract

Read:

1. [`.spw/workspace.spw`](../../../.spw/workspace.spw)
2. [`.spw/mount.spw`](../../../.spw/mount.spw)
3. [`.spw/conventions/submodule.spw`](../../../.spw/conventions/submodule.spw)
4. [quick-start.md](./quick-start.md)
5. [mounted-workbench.md](./mounted-workbench.md)

This is the shortest route to the consumer/workbench boundary.

## Editor Surfaces

Read:

1. [`.spw/tooling/vscode-spw.spw`](../../../.spw/tooling/vscode-spw.spw)
2. [`packages/spw-lsp/src/handlers/display.ts`](../../../packages/spw-lsp/src/handlers/display.ts)
3. [`extensions/vscode-spw/src/views/`](../../../extensions/vscode-spw/src/views)
4. [`extensions/vscode-spw/README.md`](../../../extensions/vscode-spw/README.md)

This is where display behavior, request wrappers, and the current client/server split are most visible.

## Quick Credibility Check

Look for these properties:

- explicit package boundaries
- a written install model
- editor behavior behind an LSP boundary
- source surfaces used as real contracts
- public docs that describe current behavior instead of future aspirations

## Do Not Start With

- the full `.agents/` tree
- the entire `.spw/` corpus
- every design surface under `docs/design/`

Those are useful later. They are not the shortest path to working context.

## Next Step

After the first pass:

1. run `npm install`
2. run `npm run build`
3. run `npm run test:lsp`
4. trace one behavior from `.spw` source to parser to LSP output

That establishes working context quickly.
