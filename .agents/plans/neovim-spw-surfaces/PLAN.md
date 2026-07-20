# Plan: neovim-spw-surfaces

Audit and strengthen the existing Neovim integration as a native, portable LSP client.

## Goal

Establish what the plugin already advertises, configures, invokes, exposes, and tests. Verify startup, root discovery, diagnostics, navigation, code actions, folding, and inlay hints from an identity-free consumer repository with the workbench mounted at `.spw/_workbench`. Add custom-request surfaces only when the shared LSP audit demonstrates a missing authoring capability.

Taste note: native affordances, graceful degradation, and evidence-led scope.

## Scope

- **In scope:** Runtime/filetype loading, server command resolution, consumer-root authority, standard LSP features, existing commands, failure behavior, headless smoke coverage, documentation accuracy.
- **Conditional:** Focused custom-request wrappers or UI surfaces justified by the shared LSP audit.
- **Out of scope:** Assuming parity with other editors; external UI dependencies; speculative panels; consumer-specific configuration.

## Candidate files

```
[MOD] extensions/neovim-spw/lua/spw-lsp.lua
[MOD] extensions/neovim-spw/ftplugin/spw.vim
[MOD] extensions/neovim-spw/README.md
[NEW] extensions/neovim-spw/tests/mounted-consumer-smoke.lua
[COND] extensions/neovim-spw/lua/spw/custom.lua
```

The audit determines whether additional UI modules are warranted.

## Commits

1. `![neovim] *audit[surfaces] — map configured, invoked, observed, and tested features`
2. `![neovim] *audit[mounted-consumer] — verify startup, roots, and failure behavior`
3. `^[neovim] =contract[native-lsp] — close portability and documentation gaps`
4. `&[neovim] =surface[earned] — expose justified semantic affordances`

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before commit 1, before conditional implementation, before merge
- Hygiene split: separate audit evidence from feature additions

## Dependencies

- `.agents/plans/mounted-consumer-tooling/PLAN.md`
- `.agents/plans/lsp-custom-request-completions/PLAN.md`
- `.spw/tooling/editor-surface-audit.spw`

## Spw Artifact

Create a distilled artifact only if the audit establishes stable Neovim-specific design constraints beyond the shared tooling contract.
