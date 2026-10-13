-- tests/lsp-route-smoke.lua — command registration and the LSP-or-fallback choice
-- Run with: nvim --headless -u NONE -l extensions/neovim-spw/tests/lsp-route-smoke.lua
--
-- No real server: an in-process fake `spw` client answers definition,
-- documentLink, and completion, so the test proves which path ran.

local H = dofile(vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h') .. '/helpers.lua')
vim.g.spw_lsp_disable = true -- the real server never starts here
H.bootstrap()
local nav = require('spw.navigation')
local completion = require('spw.completion')

print('Running neovim-spw LSP routing tests...')

-- 1. Command registration
for _, command in ipairs({
  'SpwOpenRef', 'SpwPeekRef', 'SpwInspect', 'SpwFingerprint', 'SpwMemory',
  'SpwPerf', 'SpwProject', 'SpwQuest',
}) do
  H.assert_true(vim.fn.exists(':' .. command) == 2, ':' .. command .. ' command registered')
end

local sibling = vim.fn.fnamemodify(H.fixtures .. '/sibling.spw', ':p')
local fixture = H.open_fixture('instrument.spw')
H.assert_eq(vim.bo[fixture].filetype, 'spw', 'fixture opens as filetype spw')
H.assert_true(vim.fn.maparg('gf', 'n'):find('open_ref_under_cursor') ~= nil, 'ftplugin routes gf through spw.navigation')

-- 2. No client attached → Lua pattern fallback
H.assert_eq(nav.route(fixture), 'lua', 'route is lua with no spw client')
local ref_row = H.cursor_on('~"./sibling.spw#landing"')
vim.cmd('SpwOpenRef')
H.assert_eq(vim.b[fixture].spw_nav_path, 'lua', 'fallback records path=lua')
H.assert_eq(vim.b[fixture].spw_nav_source, 'lua_patterns', 'fallback records source=lua_patterns')
H.assert_eq(vim.b[fixture].spw_nav_result, 'opened', 'fallback opened the target')
H.assert_eq(vim.api.nvim_buf_get_name(0), sibling, 'fallback opened sibling.spw')
H.assert_eq(vim.api.nvim_win_get_cursor(0)[1], 3, 'fallback jumped to the #>landing line by pattern')

vim.api.nvim_set_current_buf(fixture)
H.assert_eq(completion.omnifunc(0, '@') ~= nil, true, 'lua omnifunc answers')
H.assert_eq(vim.b[fixture].spw_completion_path, 'lua', 'completion records path=lua')

local health = H.checkhealth()
H.assert_true(H.has_line(health, 'LSP client attached: none'), 'health reports no client attached')
H.assert_true(H.has_line(health, 'Navigation path: lua'), 'health reports the lua navigation path')
H.assert_true(H.has_line(health, 'Completion path: lua'), 'health reports the lua completion path')

-- 3. Fake client with definition + completion → LSP path, server's answer wins
local log = {}
local definition_row = 3 -- 0-based: line 4 of sibling.spw, not the #>landing line the patterns pick
H.attach_fake(fixture, {
  log = log,
  capabilities = {
    definitionProvider = true,
    documentLinkProvider = { resolveProvider = false },
    completionProvider = { triggerCharacters = { '@', '~' } },
  },
  handlers = {
    ['textDocument/definition'] = function()
      local at = { line = definition_row, character = 0 }
      return { { uri = vim.uri_from_fname(sibling), range = { start = at, ['end'] = at } } }
    end,
    ['textDocument/completion'] = function()
      return { isIncomplete = false, items = { { label = '@fake/' } } }
    end,
  },
}, 'textDocument/definition')

vim.api.nvim_set_current_buf(fixture)
local path, source = nav.route(fixture)
H.assert_eq(path, 'lsp', 'route is lsp with an spw client attached')
H.assert_eq(source, 'textDocument/definition', 'definition is preferred over documentLink')

vim.api.nvim_win_set_cursor(0, { ref_row, 6 })
vim.b[fixture].spw_nav_result = nil
vim.cmd('SpwOpenRef')
H.wait(function() return vim.b[fixture].spw_nav_result == 'opened' end, 3000, ':SpwOpenRef through LSP')
H.assert_eq(vim.b[fixture].spw_nav_path, 'lsp', 'LSP path recorded')
H.assert_eq(vim.b[fixture].spw_nav_source, 'textDocument/definition', 'definition source recorded')
H.assert_true(vim.tbl_contains(log, 'textDocument/definition'), 'server received textDocument/definition')
H.assert_eq(vim.api.nvim_buf_get_name(0), sibling, 'LSP path opened sibling.spw')
H.assert_eq(vim.api.nvim_win_get_cursor(0)[1], definition_row + 1, "LSP path landed on the server's line")

-- gf through the ftplugin/on_attach map: opens the file without the anchor jump
vim.api.nvim_set_current_buf(fixture)
vim.api.nvim_win_set_cursor(0, { ref_row, 6 })
vim.b[fixture].spw_nav_result = nil
vim.cmd('normal gf')
H.wait(function() return vim.b[fixture].spw_nav_result == 'opened' end, 3000, 'gf through LSP')
H.assert_eq(vim.b[fixture].spw_nav_path, 'lsp', 'gf took the LSP path')
H.assert_eq(vim.api.nvim_win_get_cursor(0)[1], 1, 'gf opens at the file start (gF jumps to the anchor)')

-- :SpwPeekRef → preview window at the server's line
vim.api.nvim_set_current_buf(fixture)
vim.api.nvim_win_set_cursor(0, { ref_row, 6 })
vim.b[fixture].spw_nav_result = nil
vim.cmd('SpwPeekRef')
H.wait(function() return vim.b[fixture].spw_nav_result == 'peeked' end, 3000, ':SpwPeekRef through LSP')
local preview
for _, win in ipairs(vim.api.nvim_list_wins()) do
  if vim.wo[win].previewwindow then preview = win end
end
H.assert_true(preview ~= nil, 'preview window opened')
H.assert_eq(vim.api.nvim_win_get_cursor(preview)[1], definition_row + 1, "preview sits on the server's line")
vim.cmd('pclose')

-- Completion hands off to vim.lsp.omnifunc
H.assert_eq(completion.omnifunc(1, ''), -2, 'omnifunc defers to vim.lsp.omnifunc (async -2)')
H.assert_eq(vim.b[fixture].spw_completion_path, 'lsp', 'completion records path=lsp')
H.wait(function() return vim.tbl_contains(log, 'textDocument/completion') end, 3000, 'completion request')

health = H.checkhealth()
H.assert_true(H.has_line(health, 'LSP client attached: spw'), 'health reports the attached client')
H.assert_true(H.has_line(health, 'Navigation path: lsp (textDocument/definition)'), 'health reports the lsp navigation path')
H.assert_true(H.has_line(health, 'Completion path: lsp'), 'health reports the lsp completion path')
H.assert_true(H.has_line(health, 'Last navigation here: path=lsp'), 'health reports the last navigation')

-- 4. documentLink-only client → link target with #L<n>
H.detach_all(fixture)
H.assert_eq(nav.route(fixture), 'lua', 'route returns to lua after detach')
local link_log = {}
H.attach_fake(fixture, {
  log = link_log,
  capabilities = { documentLinkProvider = { resolveProvider = false } },
  handlers = {
    ['textDocument/documentLink'] = function()
      return { {
        range = { start = { line = ref_row - 1, character = 0 }, ['end'] = { line = ref_row - 1, character = 200 } },
        target = vim.uri_from_fname(sibling) .. '#L4',
      } }
    end,
  },
}, 'textDocument/documentLink')
vim.api.nvim_set_current_buf(fixture)
path, source = nav.route(fixture)
H.assert_eq(source, 'textDocument/documentLink', 'documentLink serves when definition is absent')
vim.api.nvim_win_set_cursor(0, { ref_row, 6 })
vim.b[fixture].spw_nav_result = nil
vim.cmd('SpwOpenRef')
H.wait(function() return vim.b[fixture].spw_nav_result == 'opened' end, 3000, ':SpwOpenRef through documentLink')
H.assert_eq(vim.b[fixture].spw_nav_source, 'textDocument/documentLink', 'documentLink source recorded')
H.assert_eq(vim.api.nvim_buf_get_name(0), sibling, 'documentLink path opened sibling.spw')
H.assert_eq(vim.api.nvim_win_get_cursor(0)[1], 4, 'documentLink #L4 honoured')
H.detach_all(fixture)

print('✓ neovim-spw LSP routing tests passed.')
