-- tests/mounted-consumer-smoke.lua — Headless smoke test for neovim-spw plugin
-- Run with: nvim --headless -u NONE -l extensions/neovim-spw/tests/mounted-consumer-smoke.lua

local plugin_dir = vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h:h')
vim.opt.rtp:prepend(plugin_dir)
package.path = plugin_dir .. '/lua/?.lua;' .. plugin_dir .. '/lua/?/init.lua;' .. package.path
package.loaded['spw'] = nil
package.loaded['spw-lsp'] = nil

local spw = require('spw')
local spw_lsp = require('spw-lsp')

local function assert_true(cond, msg)
  if not cond then
    error('Assertion failed: ' .. (msg or 'condition was false'), 2)
  end
end

local function assert_eq(actual, expected, msg)
  if actual ~= expected then
    error(string.format('Assertion failed: %s (expected %s, got %s)', msg or '', tostring(expected), tostring(actual)), 2)
  end
end

print('Running neovim-spw smoke tests...')

-- Test 1: Backward compatibility export
assert_true(spw_lsp.start ~= nil, 'spw-lsp re-exports start')
assert_true(spw_lsp.find_root ~= nil, 'spw-lsp re-exports find_root')

-- Test 2: Reference collection
local sample_line = 'See ~".spw/shelves.spw" and @docs/architecture.md#overview for context.'
local refs = spw.collect_refs_in_line(sample_line)
assert_eq(#refs, 2, 'Collected 2 references from sample line')
assert_eq(refs[1].kind, 'path', 'First ref kind is path')
assert_eq(refs[1].target, '.spw/shelves.spw', 'First ref target')
assert_eq(refs[2].kind, 'root', 'Second ref kind is root')
assert_eq(refs[2].rootName, 'docs', 'Second ref rootName')
assert_eq(refs[2].target, 'architecture.md#overview', 'Second ref target')

-- Test 3: Root resolution logic
local cwd = vim.fn.getcwd()
local dummy_buf = cwd .. '/index.spw'
local root = spw.find_root(dummy_buf)
assert_true(root ~= nil and root ~= '', 'find_root returns valid root')
assert_eq(root, cwd, 'find_root locates current workspace root')

-- Test 4: LSP command construction
local cmd, cmd_cwd = spw.build_cmd(root)
assert_true(#cmd > 0, 'build_cmd returns non-empty command array')

-- Test 5: Auto-completion omnifunc
local comp = require('spw.completion')
local shelf_items = comp.omnifunc(0, '@')
assert_true(#shelf_items > 0, 'Completion returns shelf alias items')

-- Test 6: Form sequence template insertion
local form = require('spw.form')
assert_true(form.templates.wrap ~= nil, 'Form wrap template exists')

-- Test 7: Tree-sitter query files existence
local ts_hl = plugin_dir .. '/queries/spw/highlights.scm'
local ts_folds = plugin_dir .. '/queries/spw/folds.scm'
local ts_indents = plugin_dir .. '/queries/spw/indents.scm'
assert_true(vim.fn.filereadable(ts_hl) == 1, 'Tree-sitter highlights.scm exists')
assert_true(vim.fn.filereadable(ts_folds) == 1, 'Tree-sitter folds.scm exists')
assert_true(vim.fn.filereadable(ts_indents) == 1, 'Tree-sitter indents.scm exists')

-- Test 8: Checkhealth execution
local ok, err = pcall(function()
  spw.health()
end)
assert_true(ok, 'spw.health executes without errors: ' .. tostring(err))

-- Test 9: Statusline helper & SpwBeat command existence
local st = spw.statusline()
assert_true(type(st) == 'string', 'statusline helper returns string')
assert_true(vim.fn.exists(':SpwBeat') == 2, ':SpwBeat command registered')

print('✓ All neovim-spw smoke tests passed cleanly.')
