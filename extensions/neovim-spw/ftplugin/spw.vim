" ftplugin/spw.vim — Spw filetype settings + LSP client start
" Part of neovim-spw: syntax, LSP, and editor affordances for .spw files.

setlocal commentstring=//\ %s
setlocal comments=://,s:/*,mb:*,ex:*/
setlocal suffixesadd=.spw,.ts,.md
setlocal includeexpr=substitute(v:fname,'^\\.\\?/','','')

" Folding: brace-depth based (matches IntelliJ SpwFoldingBuilder)
setlocal foldmethod=syntax

" Start LSP if available
if has('nvim-0.8')
  lua require('spw-lsp').start()
endif
