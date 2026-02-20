Connecting External Editors to the Spw Language Server

Requirements: Node 22+ with TSX installed. The language server entry point is `npm run lsp`
from the root of the spw-workbench repo.

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
