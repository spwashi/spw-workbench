# Plan: fragment-pointers

A selection becomes a pointer you can cite, tile into another block, or collapse to its value, and every reader resolves it the same way. Source is read as a metamaterial: what a fragment does depends on its form and its boundary, not only on its text. (Card and next move: [wip.spw](./wip.spw) · findings and the material model: [fragment-pointers.spw](./fragment-pointers.spw) · index: [../index.spw](../index.spw))

## Goal

On 2026-10-13 the owner asked whether a selection can be compiled to bytecode and then referenced or embedded in another script or block. They asked to relate the answer to source code as a metamaterial.

What exists:
- **`spw cite`** prints a `spw.geometry.bc/1` card and a pointer, `@bc:<hash>`.
- **`spw follow`** resolves the pointer, and `--collapse` evaluates it.
- **The pointer's hash** is computed from the text (FNV-1a 64). The card mislabels it as `mask`.
- **The card's body** holds the form: operator counts and vector, brace kinds, depth, and flow roles.
- **Embedding** works through an anchor plus `={ ~"file#name" }` and `spw expand`.

What is missing:
- **Selection input.** Today `spw cite` takes whole files only.
- **A tracked store.** `--remember` writes an ignored handle that points back at a path.
- **A reader in source.** The parser splits `@bc:3635905ec3dbeece` into a number and an identifier. `@bc#3635905…` loses its fragment.

The material model (in the artifact) reads a fragment four ways:
- **Composition:** the text. Its content hash is its identity.
- **Cell:** its form. Similarity is measured on the form, never identity.
- **Boundary:** the slots, refs, anchors, and placeholder hashes the host must bind.
- **Coupling:** how it enters a host:
  - *cite* moves nothing
  - *tile* copies the text into the host
  - *collapse* substitutes its value

Three claims are falsifiable. H2 asks whether tiling changes a host in ways the fragment's card does not predict. It decides whether the effective-property layer stays.

Taste note: identity comes from content and similarity from form, and the boundary is stated before anything is embedded.

## Scope

- **In scope:** the commit sequence in [wip.spw](./wip.spw):
  1. selection input for `spw cite`, and the card relabelled
  2. the boundary in the card
  3. `spw cite --like`
  4. a store and a lint for dangling pointers
  5. a reader row in the LSP
  6. tiling through `spw expand`, with before and after measures
  7. Cite Selection in VS Code and Neovim
- **Out of scope:**
  - VM or executable bytecode, a non-goal in `docs/runtime/spw/runtime-foundation.spw`.
  - Soft `@bc:tag` names, deferred by `canon-rewrite-v2`, which refused soft tags as identity.
  - IntelliJ. It follows `editor-inspection-instruments` parity once the CLI owns the answer.

## Dependencies

- `syntax-hardware-alignment` p12: before a hash-valued pointer can be read in source, the lexer has to read a digit-led run as one token with a hash kind.
- `refactor-experiment-lifecycle` `?[hash_basis]`: one hash basis for selections and pointers, settled together.
- `citation-navigation` p8 (`@root#anchor`): if `?[pointer_form]` picks `@bc#<hash>`, pointers ride the same reader.

## Files

```
[MOD] packages/spw-cli/src/cite.ts — --stdin, --expr, --range; content not mask; --like; --keep
[NEW] packages/spw-seed/src/canonical/fragment-boundary.ts — boundary scan (geometric-resonance.ts is 864 lines)
[MOD] packages/spw-seed/src/canonical/geometric-resonance.ts — card carries the boundary
[MOD] packages/spw-cli/src/expand.ts — tile a pointer; measure before and after
[MOD] packages/spw-lsp/src/handlers/commit-refs.ts — a pointer reader row beside landed and cited
[MOD] extensions/vscode-spw/src/instruments/*, extensions/neovim-spw/lua/spw/instruments.lua — Cite Selection
```

## Agentic Hygiene

- Rebase target: `main@138d2a28`.
- Before the first code commit, the owner settles `?[pointer_form]` and `?[fragment_store]`. `~[cite_selection]` and `~[cell_boundary]` do not depend on either answer and can go first.
