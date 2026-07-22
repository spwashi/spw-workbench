# Spw Language Support for VS Code

This preview extension is a thin client over the bundled `spw-lsp` server. It provides syntax highlighting, snippets, standard language-server editing features, Concepts and Workspace views, `Spw: Navigate Roots and Landmarks`, and probe commands backed by custom `spw/*` methods (operator frequency, phase context, form sequences, workspace temperature, restart server).

Workspace roots come from the closed, URI-first `spw/workspaceManifest/v1` response. The client preserves each root's URI, role, kind, and evidence source; it does not parse manifests, infer fallback paths, or reconstruct local filesystem authority. Invalid or unreadable authority appears as blocked diagnostics in the Workspace view.

## Build and package

From the repository root:

```bash
npm run build:vscode
npm run test:vscode
```

The build emits both `dist/extension.js` and the matching `dist/server/spw-lsp.cjs`. Runtime startup uses only that bundled server—there is no workspace checkout search or `tsx` source fallback.

The release bundler packages the extension runtime files and runs an extracted-archive smoke in an arbitrary temporary directory:

```bash
bash scripts/release/bundle-extensions.sh --skip-build
```

## Ownership

- `src/extension.ts` owns editor activation and the bundled-server transport.
- `src/lsp/custom-requests.ts` validates custom response payloads.
- `src/navigation.ts` opens server-provided URIs without path reconstruction.
- `src/views/workspace-tree.ts` presents workspace evidence.
- `spw-lsp` owns parsing, indexing, diagnostics, workspace authority, and language meaning.

Other editors should negotiate the same advertised v1 method and keep URI identity opaque until their final navigation boundary.
