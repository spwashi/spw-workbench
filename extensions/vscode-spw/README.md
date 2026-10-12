# Spw Language Support for VS Code

This preview extension is a thin client over the bundled `spw-lsp` server. It provides syntax highlighting, snippets, standard language-server editing features, Concepts and Workspace views, navigation, and explicit workbench instruments backed by the shared LSP and CLI.

Workspace roots come from the closed, URI-first `spw/workspaceManifest/v1` response. The client preserves each root's URI, role, kind, and evidence source; it does not parse manifests, infer fallback paths, or reconstruct local filesystem authority. Invalid or unreadable authority appears as blocked diagnostics in the Workspace view.

## Get started

The **Get started with Spw** walkthrough has seven steps: write, act, hold, name, point, ask and grow. Open it from **Help > Welcome > Walkthroughs**, or run **Welcome: Open Walkthrough...** from the command palette and pick it.

Each step's **Try it** button opens that step's lines in a scratch `.spw` file, kept in the extension's storage, so the language server reads it: hover, outline and problems update as you edit. The grow step works on your repository instead. When the workspace has `.spw/_workbench`, it opens a terminal with `spw lint` and `spw resolve` typed in, and you press Enter to run them. Without a mounted workbench, it offers the quick start and spw.quest/install instead.

The steps come from `docs/learn/quest.spw`, the same file `spw quest` and spw.quest read. After that file changes, run `npm run quest:sync` in this folder; `npm run test:vscode` fails until the walkthrough matches it.

## Workbench instruments

| Command palette | Question | Source / effect |
|---|---|---|
| **Spw: Inspect Form** | What brace geometry, nesting, and operator resonance does this live surface carry? | LSP live document, read-only; reports VS Code probe-cache hit/miss state |
| **Spw: Inspect Surface Stack** | Which syntax/profile/flow layers describe this live surface? | LSP live document, read-only |
| **Spw: Inspect Cache** | What belongs to the editor TTL cache versus LSP session attention? | Local cache receipt + LSP reflection, read-only |
| **Spw: Rename Symbol** | How does this annotation, root, or frame name change at the caret? | Standard LSP Rename workspace edit |
| **Spw: Plan Corpus Refactor...** | Where would a `mark|anchor|case|mood` rename change the saved corpus? | `spw refactor` JSON plan, never `--write` |

VS Code's contour is guided and comparative: Quick Picks gather broader refactor intent, and live Form/Stack results open beside the source so a language idea can be read against its projection. File probes include unsaved text through the LSP. Corpus planning runs the CLI from the consumer workspace while selecting the executable from the workspace, mounted `.spw/_workbench`, or `spw.cli.toolRoot`. Commands use argument arrays and add no idle probe traffic.

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
- `src/instruments/` owns parameterized CLI launch, explicit probe presentation, and the editor-local cache receipt.
- `src/navigation.ts` opens server-provided URIs without path reconstruction.
- `src/quest/` owns the Get started walkthrough; `walkthrough/*.md` and `src/quest/steps.json` are generated from `docs/learn/quest.spw`.
- `src/views/workspace-tree.ts` presents workspace evidence.
- `spw-lsp` owns parsing, indexing, diagnostics, workspace authority, and language meaning.

Other editors should negotiate the same advertised v1 method and keep URI identity opaque until their final navigation boundary.
