# Plan: mounted-workbench-organelle

Make a mounted workbench a bounded orienting instrument: concise prompts and references lead directly to working CLI and VS Code navigation. “Organelle” remains an optional explanatory profile preserved by the historical slug, not the governing model.

## Goal

An independent consumer should be able to mount the workbench, give a repository-local model one short prompt, and receive an authority-correct review without first learning the workbench's internal history. Developers should be able to discover declared roots, render bounded `.spw` file trees, select AST landmarks, and navigate the same roots and annotations from VS Code. Taste note: improve clarity, correctness, portability, and low-friction orientation by making working references and executable paths carry the documentation.

## Scope

- **In scope:** Pure workspace-root parsing shared by CLI and LSP; consumer-root discovery; `spw roots`; `spw tree`; mount-safe scan exclusions; concise mounted prompt/reference documentation; scaffold README; root README correction; VS Code quick navigation across manifest roots and indexed annotations; active-workspace root selection; tests and truthful capability docs.
- **Out of scope:** An interactive terminal UI, custom tree-sitter grammar, new Spw semantics, automatic upstream writes, implementing every planned observability verb, IntelliJ/NeoVim feature work, or turning the workbench into consumer canon.

## Files

```text
[NEW] .agents/plans/mounted-workbench-organelle/PLAN.md
[NEW] .agents/plans/mounted-workbench-organelle/wip.spw
[NEW] .agents/plans/mounted-workbench-organelle/mounted-workbench-organelle.spw
[NEW] packages/spw-seed/src/workspace-roots.ts
[MOD] packages/spw-seed/src/index.ts
[NEW] src/seed/workspace-roots.test.ts
[NEW] packages/spw-cli/src/workspace.ts
[NEW] packages/spw-cli/src/roots.ts
[NEW] packages/spw-cli/src/tree.ts
[MOD] packages/spw-cli/src/run.ts
[MOD] packages/spw-cli/src/index.ts
[MOD] packages/spw-cli/src/doctor.ts
[MOD] packages/spw-cli/src/ls/constants.ts
[MOD] packages/spw-cli/src/query.ts
[MOD] packages/spw-cli/src/select.ts
[NEW] src/runtime/__tests__/spw-workspace-navigation.test.ts
[MOD] packages/spw-lsp/src/handlers/workspace.ts
[NEW] packages/spw-cli/templates/init/base/.spw/README.md
[MOD] packages/spw-cli/templates/init/base/.spw/index.spw
[MOD] packages/spw-cli/src/init.ts
[NEW] docs/runtime/md/mounted-workbench.md
[MOD] docs/runtime/md/quick-start.md
[MOD] docs/runtime/md/github-reading-map.md
[MOD] docs/toc.spw
[MOD] README.md
[NEW] extensions/vscode-spw/src/navigation.ts
[MOD] extensions/vscode-spw/src/extension.ts
[MOD] extensions/vscode-spw/src/roots.ts
[MOD] extensions/vscode-spw/src/views/workspace-tree.ts
[MOD] extensions/vscode-spw/package.json
[MOD] extensions/vscode-spw/README.md
[MOD] .spw/conventions/cli.spw
[MOD] .spw/conventions/submodule.spw
[MOD] .spw/tooling/vscode-spw.spw
[MOD] .agents/plans/plan-ecology-clustering/plan-ecology-clustering.spw
```

### Craft guard

- `packages/spw-cli/src/mount.ts` is already 541 lines and stays untouched; new discovery and tree concerns receive focused modules.
- `workspace-tree.ts` and `concepts-tree.ts` already exceed 600 lines. Shared navigation belongs in a new module; the atlas receives only narrow command reuse.
- The seed parser remains pure: it parses declarations but performs no filesystem or editor work.
- Machine-readable output uses consumer-relative paths and discriminated result types; `_workbench` is excluded unless explicitly requested.
- README prose links to runnable commands and owning source files instead of repeating architecture narration.

## Commits

1. `.[plans] =scope[mounted-workbench-organelle] — define executable orientation slice`
2. `^seed[workspace-roots] =parse[manifest] — share root declarations across tooling`
3. `&[cli] =navigate[roots,tree] — add mount-safe workspace discovery and file trees`
4. `.[mount,docs] =prompt[working-references] — seed concise consumer orientation`
5. `&[vscode] =navigate[roots,landmarks] — add workspace-aware quick navigation`
6. `.[canon,plans] =align[organelle-machinery] — register contracts and capability truth`
7. `![tooling] *verify[mounted-navigation] — exercise parser, CLI, LSP, docs, and extension`

Fuzz strategy:
- Explore: targeted root-parser, CLI-tree, LSP-workspace, and VS Code compile loops.
- Stabilize: `npm run fuzz:types`, `npm run test:seed`, `npm run test:runtime`, and `npm run test:lsp`.
- Ship: `npm run lint`, `npm run build`, VS Code compile, and commit-review polling.

## Agentic Hygiene

- Rebase target: `main@bca875c7`
- Rebase cadence: before commit 1, before source implementation, before merge
- Hygiene split: none; working tree was clean at plan creation

## Dependencies

- `mounted-consumer-tooling` — authority, evidence, and exclusion contract
- `absorb-spwq-cli` — canonical CLI naming and selector ownership
- `vscode-workspace-atlas` — existing manifest and annotation surfaces

## Failure Modes

- **Hard:** root discovery escapes the consumer, a declared root resolves incorrectly, or tree traversal follows `_workbench` by default.
- **Soft:** absent manifests fall back to `.spw`; missing roots produce actionable empty results; unavailable LSP navigation leaves built-in file opening usable.
- **Non-negotiable:** consumer authority, relative output, deterministic ordering, bounded traversal, and no automatic upstream mutation.

## Validation

- **Hypotheses:** one parsed root contract can serve LSP, CLI, prompts, and VS Code; file-tree output plus AST selection forms a sufficient terminal navigation ladder.
- **Negative controls:** existing query/select behavior and standard LSP navigation remain unchanged; editor-specific presentation does not move into seed or LSP semantics.
- **Observed refinement:** query/select path semantics now resolve through the discovered consumer because mounted npm scripts execute with the workbench as their process directory; selector behavior itself remains unchanged.
- **Demo sequence:** mount → read `.spw/README.md` → run doctor → list roots → render a selected tree → select navigable nodes → invoke VS Code navigator → open a root or annotation.

## Spw Artifact

`.agents/plans/mounted-workbench-organelle/mounted-workbench-organelle.spw` records the neutral mounted-instrument contract plus an optional organelle translation: consumer-owned intent enters through a small prompt surface, bounded root and selection machinery routes it, and editor/CLI projections remain replaceable.
