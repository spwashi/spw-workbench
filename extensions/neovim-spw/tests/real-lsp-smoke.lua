-- tests/real-lsp-smoke.lua — the LSP path against the real spw server (opt-in, ~20s)
-- Run from a workbench checkout with node deps installed:
--   nvim --headless -u NONE -l extensions/neovim-spw/tests/real-lsp-smoke.lua
--
-- ftplugin starts `npm run --silent lsp`; navigation and completion must then
-- take the server's answers, and the #landing fragment must land on its line.

local H = dofile(vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h') .. '/helpers.lua')
H.bootstrap()
local lsp = require('spw.lsp')
local nav = require('spw.navigation')

print('Running neovim-spw real LSP tests...')

local sibling = vim.fn.fnamemodify(H.fixtures .. '/sibling.spw', ':p')
local fixture = H.open_fixture('instrument.spw')
H.wait(function() return lsp.attached_client(fixture, 'textDocument/definition') ~= nil end, 120000,
  'the real spw server to attach')

local function settle()
  H.wait(function()
    local result = vim.b[fixture].spw_nav_result
    return result ~= nil and result ~= 'pending'
  end, 30000, 'navigation to settle')
end

H.assert_eq(select(2, nav.route(fixture)), 'textDocument/definition', 'real server serves definition')

local row = H.cursor_on('~"./sibling.spw#landing"')
vim.api.nvim_win_set_cursor(0, { row, 6 })
vim.b[fixture].spw_nav_result = nil
vim.cmd('SpwOpenRef')
settle()
H.assert_eq(vim.b[fixture].spw_nav_path, 'lsp', 'path recorded as lsp')
H.assert_eq(vim.b[fixture].spw_nav_result, 'opened', 'server resolved the path ref')
H.assert_eq(vim.api.nvim_buf_get_name(0), sibling, 'opened sibling.spw')
H.assert_eq(vim.api.nvim_win_get_cursor(0)[1], 3, 'definition landed on the #>landing line')

vim.api.nvim_set_current_buf(fixture)
local line = vim.api.nvim_buf_get_lines(fixture, row - 1, row, false)[1]
vim.api.nvim_win_set_cursor(0, { row, line:find('@here', 1, true) + 1 })
vim.b[fixture].spw_nav_result = nil
vim.cmd('normal gf')
settle()
H.assert_eq(vim.b[fixture].spw_nav_result, 'opened', 'server resolved the @here root ref')
H.assert_eq(vim.api.nvim_buf_get_name(0), sibling, 'root ref opened sibling.spw')

-- A word that is not a reference: the server answers nothing, Vim's own gf runs.
vim.api.nvim_set_current_buf(fixture)
H.cursor_on('hinge')
vim.b[fixture].spw_nav_result = nil
vim.cmd('normal gf')
settle()
H.assert_eq(vim.b[fixture].spw_nav_result, 'empty', 'non-reference answers empty on the LSP path')
H.assert_eq(vim.b[fixture].spw_nav_path, 'lsp', 'still the LSP path; no Lua extraction')

vim.api.nvim_set_current_buf(fixture)
H.assert_eq(require('spw.completion').omnifunc(1, ''), -2, 'completion defers to the server')
H.assert_eq(vim.b[fixture].spw_completion_path, 'lsp', 'completion path recorded as lsp')

local health = H.checkhealth()
H.assert_true(H.has_line(health, 'Navigation path: lsp (textDocument/definition)'), 'health names the LSP path')

lsp.stop()
H.wait(function() return #vim.lsp.get_clients({ name = 'spw' }) == 0 end, 10000, 'server to stop')
print('✓ neovim-spw real LSP tests passed.')
