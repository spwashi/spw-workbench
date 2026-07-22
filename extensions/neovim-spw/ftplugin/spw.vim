" ftplugin/spw.vim — Spw filetype settings + LSP client start
" Part of neovim-spw: syntax, LSP, and editor affordances for .spw files.

" Spw culture: # line comments (// is foreign prose; format can migrate).
setlocal commentstring=#\ %s
setlocal comments=:#,:b:#,s:/*,mb:*,ex:*/
setlocal suffixesadd=.spw,.ts,.md
setlocal includeexpr=substitute(v:fname,'^\\.\\?/','','')

" Folding: brace-depth based (matches IntelliJ SpwFoldingBuilder)
setlocal foldmethod=syntax

" Auto-create missing parent directories on write for .spw buffers.
" Disable with: let g:spw_auto_mkdir = v:false
if !exists('g:spw_auto_mkdir') || g:spw_auto_mkdir
  augroup spw_auto_mkdir
    autocmd! * <buffer>
    " Before writing, create the current buffer's parent directory tree.
    " This enables a simple flow for unresolved refs: gf -> :w creates the file path.
    autocmd BufWritePre <buffer> call mkdir(expand('<afile>:p:h'), 'p')
  augroup END
endif

" Start LSP if available
if has('nvim-0.8')
  lua require('spw-lsp').start()
endif

" Fallback action maps for Spw UX commands.
" These remain available even if LSP on_attach keymaps are delayed/overridden.
if !exists('g:spw_lsp_keymaps') || g:spw_lsp_keymaps
  nnoremap <silent><buffer> <localleader>a <Cmd>SpwCodeAction<CR>
  nnoremap <silent><buffer> <localleader>q <Cmd>SpwRefsQuickfix<CR>
  nnoremap <silent><buffer> <localleader>p <Cmd>SpwPeekRef<CR>
endif
