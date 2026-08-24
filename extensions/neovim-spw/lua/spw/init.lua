-- lua/spw/init.lua — Main module for neovim-spw
local M = {}
package.loaded['spw'] = M

local lsp = require('spw.lsp')
local nav = require('spw.navigation')
local health = require('spw.health')
local form = require('spw.form')
local completion = require('spw.completion')
local cli = require('spw.cli')

function M.start() return lsp.start() end
function M.stop() return lsp.stop() end
function M.restart() return lsp.restart() end
function M.find_root(bufpath) return lsp.find_root(bufpath) end
function M.build_cmd(root) return lsp.build_cmd(root) end
function M.build_cli_cmd(host, invocation) return cli.command(host, invocation) end
function M.resolve_cli_host(root) return cli.resolve_host(root) end
function M.request_custom(method, params, cb) return lsp.request_custom(method, params, cb) end
function M._on_attach(client, bufnr) return lsp._on_attach(client, bufnr) end

function M.open_ref_under_cursor(opts) return nav.open_ref_under_cursor(opts) end
function M.open_ref_under_cursor_and_anchor() return nav.open_ref_under_cursor_and_anchor() end
function M.peek_ref_under_cursor(opts) return nav.peek_ref_under_cursor(opts) end
function M.references_to_quickfix(opts) return nav.references_to_quickfix(opts) end
function M.code_action_under_cursor(opts) return nav.code_action_under_cursor(opts) end
function M.collect_refs_in_line(line) return nav.collect_refs_in_line(line) end
function M.ref_under_cursor(line, col0) return nav.ref_under_cursor(line, col0) end
function M.resolve_ref(ref, root, bufdir, lines) return nav.resolve_ref(ref, root, bufdir, lines) end

function M.insert_form_wrap(notation) return form.insert_form_wrap(notation) end
function M.wrap_selection_in_container(label) return form.wrap_selection_in_container(label) end

function M.omnifunc(findstart, base) return completion.omnifunc(findstart, base) end

function M.health() return health.check() end

local _last_statusline = '⚡ spw'
function M.statusline()
  local bufnr = vim.api.nvim_get_current_buf()
  if vim.bo[bufnr].filetype ~= 'spw' then return '' end
  local uri = vim.uri_from_bufnr(bufnr)
  lsp.request_custom('spw/activity', { textDocument = { uri = uri } }, function(err, result)
    if err or not result then return end
    local epoch = result.requestEpoch or 0
    local age = result.surface and result.surface.accessAgeRequests or 0
    _last_statusline = string.format('⚡ e:%d a:%d', epoch, age)
  end)
  return _last_statusline
end

function M.setup(opts)
  opts = opts or {}
  if opts.lsp_cmd then vim.g.spw_lsp_cmd = opts.lsp_cmd end
  if opts.lsp_root then vim.g.spw_lsp_root = opts.lsp_root end
  if opts.lsp_disable ~= nil then vim.g.spw_lsp_disable = opts.lsp_disable end
  if opts.auto_mkdir ~= nil then vim.g.spw_auto_mkdir = opts.auto_mkdir end
  if opts.lsp_settings then vim.g.spw_lsp_settings = opts.lsp_settings end
  if opts.cli_root then vim.g.spw_cli_root = opts.cli_root end

  require('spw.commands').setup()
end

-- Initialize user commands automatically
require('spw.commands').setup()

return M
