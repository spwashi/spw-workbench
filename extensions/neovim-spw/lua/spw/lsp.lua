-- lua/spw/lsp.lua — Spw LSP client management for Neovim
local M = {}

---@param msg string
---@param level integer
local function notify(msg, level)
  if vim.notify then
    vim.notify(msg, level, { title = 'spw' })
  end
end

--- Locate the workspace root by walking up from `bufpath` looking for
--- marker files that indicate an Spw project.
---@param bufpath string
---@return string
function M.find_root(bufpath)
  local strong = { '.spw', 'package.json', '.git' }
  local dir = vim.fn.fnamemodify(bufpath, ':h')
  local weak

  while dir ~= '/' and dir ~= '' do
    for _, marker in ipairs(strong) do
      local candidate = dir .. '/' .. marker
      if vim.fn.isdirectory(candidate) == 1 or vim.fn.filereadable(candidate) == 1 then
        return dir
      end
    end
    if not weak and vim.fn.filereadable(dir .. '/index.spw') == 1 then
      weak = dir
    end
    dir = vim.fn.fnamemodify(dir, ':h')
  end

  return weak or vim.fn.fnamemodify(bufpath, ':h')
end

---True when `dir` is a workbench checkout whose package.json has an "lsp" script.
---@param dir string
---@return boolean
function M.has_lsp_script(dir)
  local pkg = dir .. '/package.json'
  if vim.fn.filereadable(pkg) ~= 1 then return false end
  local content = table.concat(vim.fn.readfile(pkg), '\n')
  return content:find('"lsp"') ~= nil
end

--- Build the command to start the LSP server, and the directory to launch it from.
---@param root string workspace root
---@return string[] cmd
---@return string cwd
function M.build_cmd(root)
  if vim.g.spw_lsp_cmd then
    return vim.g.spw_lsp_cmd, root
  end

  if M.has_lsp_script(root) then
    return { 'npm', 'run', '--silent', 'lsp' }, root
  end

  local mounted = root .. '/.spw/_workbench'
  if M.has_lsp_script(mounted) then
    return { 'npm', 'run', '--silent', 'lsp' }, mounted
  end

  local server = root .. '/packages/spw-lsp/src/stdio-server.ts'
  if vim.fn.filereadable(server) == 1 then
    return { 'npx', 'tsx', server }, root
  end

  return { 'npm', 'run', '--silent', 'lsp' }, root
end

--- Called when the Spw LSP client attaches to a buffer.
---@param _ any client (unused)
---@param bufnr integer
function M._on_attach(_, bufnr)
  if vim.lsp.inlay_hint and vim.lsp.inlay_hint.enable then
    vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
  end

  if vim.g.spw_lsp_folds ~= false and vim.lsp.foldexpr then
    vim.wo.foldmethod = 'expr'
    vim.wo.foldexpr   = 'v:lua.vim.lsp.foldexpr()'
    vim.wo.foldlevel  = 99
  end

  if vim.g.spw_lsp_keymaps == false then return end

  local nav = require('spw.navigation')
  local map = function(lhs, rhs, desc)
    vim.keymap.set('n', lhs, rhs, { buffer = bufnr, silent = true, desc = desc })
  end

  map('gd',         vim.lsp.buf.definition,                          'Spw: go to definition')
  map('gf',         nav.open_ref_under_cursor,                       'Spw: open reference under cursor')
  map('gF',         nav.open_ref_under_cursor_and_anchor,            'Spw: open reference and jump to #anchor')
  map('<localleader>a', nav.code_action_under_cursor,                'Spw: code action under cursor')
  map('<localleader>q', nav.references_to_quickfix,                  'Spw: unresolved refs to quickfix')
  map('<localleader>p', function() nav.peek_ref_under_cursor({ jump_anchor = true }) end, 'Spw: preview reference')
  map('K',          vim.lsp.buf.hover,                               'Spw: hover docs')
  map('gr',         vim.lsp.buf.references,                          'Spw: references')
  map('<leader>rn', vim.lsp.buf.rename,                              'Spw: rename symbol')
  map('<leader>f',  function() vim.lsp.buf.format({ async = true }) end, 'Spw: format document')
  map('[d',         vim.diagnostic.goto_prev,                        'Spw: previous diagnostic')
  map(']d',         vim.diagnostic.goto_next,                        'Spw: next diagnostic')
  map('<leader>e',  vim.diagnostic.open_float,                       'Spw: show diagnostic float')
end

--- Send a custom spw/* request to the attached Spw client.
---@param method string
---@param params table|nil
---@param cb fun(err: any, result: any)
function M.request_custom(method, params, cb)
  local get_clients = vim.lsp.get_clients or vim.lsp.get_active_clients
  if not get_clients then
    cb('no lsp client api', nil)
    return
  end
  local clients = get_clients({ name = 'spw', bufnr = 0 })
  if not clients or #clients == 0 then
    clients = get_clients({ name = 'spw' })
  end
  local client = clients and clients[1]
  if not client then
    cb('Spw LSP not attached', nil)
    return
  end
  client.request(method, params or {}, function(err, result)
    cb(err, result)
  end, 0)
end

--- Start (or attach to) the Spw LSP server for the current buffer.
function M.start()
  if not vim.lsp or not vim.lsp.start then return end
  if vim.g.spw_lsp_disable then return end

  local bufpath = vim.api.nvim_buf_get_name(0)
  if bufpath == '' then return end

  local root = vim.g.spw_lsp_root or M.find_root(bufpath)
  local cmd, cmd_cwd = M.build_cmd(root)

  vim.lsp.start({
    name = 'spw',
    cmd = cmd,
    cmd_cwd = cmd_cwd,
    root_dir = root,
    filetypes = { 'spw' },
    settings = {},
    capabilities = vim.lsp.protocol.make_client_capabilities(),
    init_options = vim.g.spw_lsp_settings or {},
    on_attach = M._on_attach,
  })
end

--- Stop all running Spw LSP clients.
function M.stop()
  local get_clients = vim.lsp.get_clients or vim.lsp.get_active_clients
  if not get_clients then return end
  for _, client in ipairs(get_clients({ name = 'spw' })) do
    client.stop()
  end
end

--- Restart the Spw LSP server for the current buffer.
function M.restart()
  M.stop()
  M.start()
end

return M
