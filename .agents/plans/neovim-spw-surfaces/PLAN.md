# Plan: neovim-spw-surfaces

Extend the existing Neovim plugin to consume the 4 custom LSP requests and expose them as native UI surfaces (floats, statusline component, commands).

## Goal

The Neovim plugin at `extensions/neovim-spw/` currently has zero integration with the 4 custom request methods. This plan adds a `lua/spw/custom.lua` module with request wrappers and three new surfaces: Annotation float (`:SpwAnnotations`), Workspace Manifest float (`:SpwManifest`), and a statusline component showing frame context. Uses native Neovim APIs only (no Telescope dependency), maintaining simplicity and universal compatibility.

Taste note: clarity (focused modules), expressiveness (simple powerful surfaces), containment (no scope creep).

## Scope

- **In scope:** Custom request wrapper module, three native-UI surfaces, four Vim commands, statusline component, autocmd wiring for cursor context updates, documentation.
- **Out of scope:** Telescope integration (native-only strategy), register inspector (register-explorer is a separate future surface), operator frequency visualization (deferred).

## Files

```
[MOD] extensions/neovim-spw/lua/spw-lsp.lua        — register new commands, wire custom module
[NEW] extensions/neovim-spw/lua/spw/custom.lua      — request wrappers (annotations, manifest, temperature, context)
[NEW] extensions/neovim-spw/lua/spw/ui/annotations.lua   — annotation float + :SpwAnnotations
[NEW] extensions/neovim-spw/lua/spw/ui/manifest.lua      — manifest float + :SpwManifest
[NEW] extensions/neovim-spw/lua/spw/ui/statusline.lua    — context component + :SpwPhase command
[MOD] extensions/neovim-spw/README.md               — document new commands and statusline integration
```

Craft guard: Each UI module stays focused on its surface. Custom.lua is the only place custom requests are made. Statusline component must be a pure function (no state mutation).

## Commits

1. `^seed[neovim] — add spw.custom module with LSP request wrappers`
2. `&[neovim] =surface[annotations] — annotation float and :SpwAnnotations command`
3. `&[neovim] =surface[manifest] — workspace manifest float and :SpwManifest command`
4. `&[neovim] =surface[statusline] — context statusline component, :SpwPhase, and cursor autocmds`

## Agentic Hygiene

- Rebase target: `main`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none

## Dependencies

none

## Spw Artifact

None beyond `wip.spw` yet; create `.agents/plans/neovim-spw-surfaces/neovim-spw-surfaces.spw` only if the branch earns a distilled artifact.
