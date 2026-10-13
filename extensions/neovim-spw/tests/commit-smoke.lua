-- tests/commit-smoke.lua — git commits the server links, opened in Neovim; code lenses and inlay settings.
-- Run with: nvim --headless -u NONE -l extensions/neovim-spw/tests/commit-smoke.lua

local H = dofile(vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h') .. '/helpers.lua')
vim.g.spw_lsp_disable = true -- the fake server below stands in for spw-lsp
H.bootstrap()
local commit = require('spw.commit')
local nav = require('spw.navigation')

print('Running neovim-spw commit tests...')

-- A throwaway repository with one commit; its path holds a space.
local repo = vim.fn.tempname() .. ' repo'
vim.fn.mkdir(repo, 'p')
local function git(args)
  local cmd = { 'git', '-C', repo, '-c', 'user.name=Plan Author', '-c', 'user.email=a@example.invalid' }
  vim.list_extend(cmd, args)
  local out = vim.fn.systemlist(cmd)
  H.assert_eq(vim.v.shell_error, 0, 'git ' .. table.concat(args, ' '))
  return out
end
git({ 'init', '--quiet' })
vim.fn.writefile({ 'one', 'two' }, repo .. '/notes.txt')
vim.fn.writefile({ 'three' }, repo .. '/more.txt')
git({ 'add', 'notes.txt', 'more.txt' })
git({ 'commit', '--quiet', '--no-gpg-sign', '-m', '#[plans] — land the notes' })
local full = git({ 'rev-parse', 'HEAD' })[1]
local short = full:sub(1, 8)
local server_uri = 'spw-commit:/' .. full .. '?root=' .. repo:gsub(' ', '%%20')

-- 1. The server's link names the commit and the repository, percent-decoded.
local target = commit.parse(server_uri)
H.assert_eq(target and target.hash, full, 'parse reads the hash')
H.assert_eq(target and target.root, repo, 'parse decodes the root')
H.assert_eq(commit.parse('spw-commit:/not-a-hash?root=/x'), nil, 'a malformed link names no commit')

-- 2. Opening it shows git show, read-only, as a git buffer.
local buf = commit.open(server_uri)
H.assert_true(buf ~= nil, 'commit buffer opened')
local lines = table.concat(vim.api.nvim_buf_get_lines(buf, 0, -1, false), '\n')
H.assert_true(lines:find('land the notes', 1, true) ~= nil, 'the buffer shows the subject')
H.assert_true(lines:find('notes.txt', 1, true) ~= nil, 'the buffer shows the changed files')
H.assert_eq(vim.bo[buf].buftype, 'nofile', 'the commit buffer is not a file')
H.assert_eq(vim.bo[buf].modifiable, false, 'the commit buffer is read-only')
H.assert_eq(vim.bo[buf].filetype, 'git', 'the commit buffer reads as git')
H.assert_true(vim.api.nvim_buf_get_name(buf):find('^spw%-commit://') ~= nil, 'the buffer keeps its spw-commit name')

-- 3. The files it changed land in the quickfix list.
H.assert_eq(commit.files(server_uri), 2, 'two changed files')
local qf = vim.fn.getqflist({ title = 1, items = 1 })
H.assert_eq(qf.title, 'Spw commit ' .. short, 'quickfix title names the commit')
H.assert_true(qf.items[1].text:find('+', 1, true) ~= nil, 'quickfix rows carry line counts')
vim.cmd('cclose')

-- 4. With no server, a hash under the cursor that git confirms still opens.
local plan = repo .. '/wip.spw'
vim.fn.writefile({ 'landed in ' .. short .. ' today', 'not a hash: deadbeef' }, plan)
vim.cmd('edit ' .. vim.fn.fnameescape(plan))
local plan_buf = vim.api.nvim_get_current_buf()
H.cursor_on(short)
local found
commit.link_under_cursor(function(uri) found = uri end)
H.wait(function() return found ~= nil end, 3000, 'a confirmed hash under the cursor')
H.assert_eq(commit.parse(found).hash, full, 'the word under the cursor resolves to the full hash')
H.cursor_on('deadbeef')
local missing = 'pending'
commit.link_under_cursor(function(uri) missing = uri end)
H.wait(function() return missing ~= 'pending' end, 3000, 'an unconfirmed hex word')
H.assert_eq(missing, nil, 'a hex word git does not hold is no commit')

-- 5. With a server, gf follows its commit link when it has no definition.
local spec = {
  capabilities = { definitionProvider = true, documentLinkProvider = {}, codeLensProvider = {} },
  handlers = {
    ['textDocument/definition'] = function() return nil end,
    ['textDocument/documentLink'] = function()
      return { { range = { start = { line = 0, character = 10 }, ['end'] = { line = 0, character = 18 } }, target = server_uri } }
    end,
    ['textDocument/codeLens'] = function()
      return { { range = { start = { line = 0, character = 0 }, ['end'] = { line = 0, character = 0 } }, command = { title = '◇ 2 #tags', command = '' } } }
    end,
  },
  log = {},
}
vim.g.spw_lsp_inlay_hints = false
vim.api.nvim_set_current_buf(plan_buf)
H.attach_fake(plan_buf, spec, 'textDocument/definition')

local function logged(method)
  for _, entry in ipairs(spec.log) do if entry == method then return true end end
  return false
end
H.wait(function() return logged('textDocument/codeLens') end, 3000, 'code lenses requested at attach')
if vim.lsp.inlay_hint and vim.lsp.inlay_hint.is_enabled then
  H.assert_eq(vim.lsp.inlay_hint.is_enabled({ bufnr = plan_buf }), false, 'spw_lsp_inlay_hints = false keeps inlay hints off')
end

H.cursor_on(short)
nav.open_ref_under_cursor()
H.wait(function() return vim.b[plan_buf].spw_nav_result == 'opened' end, 3000, 'gf to settle on the commit')
H.assert_eq(vim.b[plan_buf].spw_nav_source, 'commit', 'gf took the commit link')
H.assert_true(vim.api.nvim_buf_get_name(0):find('^spw%-commit://' .. full) ~= nil, 'gf opened the commit buffer')

-- 6. The commitRef token reads in the number color unless a colorscheme says otherwise.
H.assert_eq(vim.api.nvim_get_hl(0, { name = '@lsp.type.commitRef' }).link, '@number', 'commitRef links to @number')

vim.fn.delete(repo, 'rf')
print('All neovim-spw commit tests passed!')
vim.cmd('qa!')
