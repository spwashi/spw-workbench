# neovim-spw

Neovim support for **Spw** (Symbolic Processing Workbench) files.

## Features

| Feature | Source | Notes |
|---------|--------|-------|
| Syntax highlighting | `syntax/spw.vim` | Operator-physics palette with valence, container, and sigil layers |
| LSP (hover, diagnostics, links, inlay hints) | `lua/spw-lsp.lua` | Connects to the shared `stdio-server.ts` used by VS Code and IntelliJ |
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
vim.g.spw_lsp_cmd = { 'npx', 'tsx', 'scripts/lsp/stdio-server.ts' }

-- Force a specific workspace root
vim.g.spw_lsp_root = '/path/to/spw-workbench'

-- Disable LSP entirely
vim.g.spw_lsp_disable = true
```

## Inlay hints

On Neovim 0.10+, register-slot inlay hints are enabled automatically when the LSP attaches. Toggle at runtime:

```lua
vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled(), { bufnr = 0 })
```
