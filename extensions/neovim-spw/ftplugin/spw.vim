" ftplugin/spw.vim — Spw filetype settings + LSP client start
" Part of neovim-spw: syntax, LSP, and editor affordances for .spw files.

setlocal commentstring=//\ %s
setlocal comments=://,s:/*,mb:*,ex:*/
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
