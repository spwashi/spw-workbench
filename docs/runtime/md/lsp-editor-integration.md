Connecting External Editors to the Spw Language Server

Requirements: Node 22+ with TSX installed. The language server entry point is `npm run lsp`
from the root of the spw-workbench repo.

Current local server capabilities:
- `textDocument/definition` for Spw path refs (`~"..."`) and root refs (`@root/...`)
- `textDocument/documentLink` for navigable path refs
- Full-text sync (`textDocumentSync: Full`) for stable AST-based selection
- Single-file AST selection is exposed canonically as `npm run spw -- select <file.spw> ...`
- `npm run spwq -- ...` remains as a compatibility alias over the same selector engine

Validation:
- `npm run lsp:smoke` runs a stdio smoke test for definition + documentLink navigation.
- `npm run spw -- select docs/index.spw --selector=pathRefs --format=lines` prints AST-selected path refs (jq-style starter).

Neovim (nvim-lspconfig):

  local lspconfig = require('lspconfig')
  local configs = require('lspconfig.configs')

  if not configs.spw then
    configs.spw = {
      default_config = {
        cmd = { 'npm', '--prefix', vim.fn.getcwd(), 'run', 'lsp' },
        filetypes = { 'spw' },
        root_dir = lspconfig.util.root_pattern('.git', 'package.json'),
        settings = {},
      },
    }
  end

  lspconfig.spw.setup({})

Vim (vim-lsp):

  if executable('npm')
    au User lsp_setup call lsp#register_server({
        \ 'name': 'spw-lsp',
        \ 'cmd': {server_info->['npm', '--prefix', getcwd(), 'run', 'lsp']},
        \ 'allowlist': ['spw'],
        \ 'workspace_config': {},
        \ })
  endif

Both configs resolve the workbench root at runtime via getcwd() / vim.fn.getcwd().
Launch (Neo)vim from the spw-workbench root, or replace getcwd() with an explicit path.
