# neovim-spw

Neovim support for **Spw** (Symbolic Processing Workbench) files.

## Features

| Feature | Source | Notes |
|---------|--------|-------|
| Syntax highlighting | `syntax/spw.vim` | Operator-physics palette with valence, container, and sigil layers |
| LSP | `lua/spw-lsp.lua` | Connects to the shared `stdio-server.ts` used by VS Code and IntelliJ |
| Filetype detection | `ftdetect/spw.vim` | `*.spw` → `filetype=spw` |
| Editor defaults | `ftplugin/spw.vim` | Comment strings, fold method, suffix resolution |

## Install

### lazy.nvim
```lua
{ dir = '~/path/to/spw-workbench/extensions/neovim-spw' }
```

### Manual (symlink)
```sh
ln -s /path/to/spw-workbench/extensions/neovim-spw \
      ~/.local/share/nvim/site/pack/spw/start/neovim-spw
```

## Configuration

The LSP starts automatically when you open a `.spw` file. Override defaults:

```lua
-- Custom LSP command (default: npm run lsp)
vim.g.spw_lsp_cmd = { 'npx', 'tsx', 'packages/spw-lsp/src/stdio-server.ts' }

-- Force a specific workspace root
vim.g.spw_lsp_root = '/path/to/spw-workbench'

-- Disable LSP entirely
vim.g.spw_lsp_disable = true

-- Auto-create missing parent directories when writing .spw files (default: true)
vim.g.spw_auto_mkdir = false

-- Pass server-side settings (overlaid on .spw/config.json)
vim.g.spw_lsp_settings = { inlayHints = { paths = false } }

-- Disable the default buffer keymaps (set your own in on_attach)
vim.g.spw_lsp_keymaps = false

-- Disable LSP-driven folding (keeps syntax folding from ftplugin)
vim.g.spw_lsp_folds = false
```

## Default keymaps

Set on attach (disable with `vim.g.spw_lsp_keymaps = false`):

`<localleader>` is your Neovim `maplocalleader` key. If you never set it, Vim default is `\`.

| Key | Action |
|-----|--------|
| `gf` | Open Spw reference under cursor (`~"…"`, `~<path>`, `~<label>"…"`, `@root/...`) |
| `gF` | Open Spw reference and jump to `#anchor` (line number or label) |
| `<localleader>a` | Spw code action at cursor (create missing target, or fallback LSP actions) |
| `<localleader>q` | Populate quickfix with unresolved references in current buffer |
| `<localleader>p` | Preview reference under cursor and jump to `#anchor` |
| `gd` | Go to definition |
| `K` | Hover docs |
| `gr` | References |
| `<leader>rn` | Rename symbol |
| `<leader>f` | Format document |
| `[d` / `]d` | Prev / next diagnostic |
| `<leader>e` | Diagnostic float |

## User commands

| Command | Description |
|---------|-------------|
| `:SpwRestart` | Restart the LSP server |
| `:SpwStop` | Stop the LSP server |
| `:SpwInlayHints` | Toggle inlay hints for current buffer |
| `:SpwOpenRef` | Open reference under cursor and jump to `#anchor` |
| `:SpwPeekRef` | Preview reference under cursor and jump to `#anchor` |
| `:SpwRefsQuickfix` | Quickfix list of unresolved references in current buffer |
| `:SpwCodeAction` | Local Spw code actions under cursor |

If a leader mapping does not trigger, inspect what owns it in the current buffer:

```vim
:verbose nmap <localleader>a
:verbose nmap <localleader>q
:verbose nmap <localleader>p
```

## File creation ergonomics

By default, this plugin creates missing parent directories on `:w` for `.spw` buffers.
This makes `gf` followed by `:w` work even when intermediate folders do not exist yet.

Disable it with:

```lua
vim.g.spw_auto_mkdir = false
```

## Folding

On Neovim 0.10+, brace-depth folding is driven by the LSP (`foldexpr=v:lua.vim.lsp.foldexpr()`), replacing the syntax fold. Falls back to `foldmethod=syntax` on older versions. Disable with `vim.g.spw_lsp_folds = false`.

## Inlay hints

On Neovim 0.10+, inlay hints are enabled automatically when the LSP attaches. Toggle with `:SpwInlayHints` or directly:

```lua
vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled(), { bufnr = 0 })
```

## `.spw/` workspace integration

The LSP server reads three files from the workspace's `.spw/` directory at startup to self-describe the project:

| File | Role |
|------|------|
| `.spw/shelves.spw` | Root aliases (`@biome`, `@harness`, `@gen`, …) — makes `@root/path` references resolve correctly |
| `.spw/topology.spw` | Subroot routing (`^subroot[name]`) — drives subroot classification and cache-tier detection |
| `.spw/editing.spw` | Editing categories (`^category[macro]`) — shown in code lens and used for per-file context |

Code lens on the first line of `.spw/` files shows the **workspace plane** and **editing category**:
```
◈ register · macro   ← plane · category
⚠ generated surface — do not hand-edit   ← files in .spw/gen/
```
