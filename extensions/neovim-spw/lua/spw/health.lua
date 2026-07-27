-- lua/spw/health.lua — Health check provider for Spw Neovim plugin (:checkhealth spw)
local M = {}

function M.check()
  local health = vim.health or require('health')
  local start = health.start or health.report_start or function(title) vim.health.start(title) end
  local ok = health.ok or health.report_ok or function(msg) vim.health.ok(msg) end
  local warn = health.warn or health.report_warn or function(msg) vim.health.warn(msg) end
  local err_fn = health.error or health.report_error or function(msg) vim.health.error(msg) end
  local info = health.info or health.report_info or function(msg) vim.health.info(msg) end

  start('spw.nvim integration health')

  -- 1. Neovim version
  if vim.fn.has('nvim-0.8') == 1 then
    local v = vim.version()
    ok(string.format('Neovim version %d.%d.%d is >= 0.8', v.major, v.minor, v.patch))
  else
    err_fn('Neovim version < 0.8 is not supported')
  end

  if vim.fn.has('nvim-0.10') == 1 then
    ok('Neovim >= 0.10 detected (supports native inlay hints and lsp foldexpr)')
  else
    info('Neovim < 0.10 (inlay hints and foldexpr fall back to legacy behavior)')
  end

  -- 2. Executables
  if vim.fn.executable('node') == 1 then
    local node_ver = vim.fn.system('node --version'):gsub('%s+', '')
    ok('Node.js executable found in PATH: ' .. node_ver)
  else
    err_fn('Node.js executable (node) not found in PATH')
  end

  if vim.fn.executable('npx') == 1 then
    ok('npx executable found in PATH')
  else
    warn('npx executable not found in PATH (direct server fallback may fail)')
  end

  -- 3. Workspace root and files
  local bufpath = vim.api.nvim_buf_get_name(0)
  if bufpath ~= '' then
    local lsp = require('spw.lsp')
    local root = lsp.find_root(bufpath)
    ok('Workspace root resolved: ' .. root)

    local cmd, cwd = lsp.build_cmd(root)
    ok(string.format('LSP server start command: %s (cwd: %s)', table.concat(cmd, ' '), cwd))

    local shelves = root .. '/.spw/shelves.spw'
    if vim.fn.filereadable(shelves) == 1 then
      ok('Found workspace root aliases: .spw/shelves.spw')
    else
      info('No .spw/shelves.spw found (root aliases will use built-in defaults)')
    end

    local topology = root .. '/.spw/topology.spw'
    if vim.fn.filereadable(topology) == 1 then
      ok('Found workspace topography routing: .spw/topology.spw')
    else
      info('No .spw/topology.spw found')
    end
  else
    info('No active buffer path to resolve workspace root')
  end

  -- 4. Active LSP client attached
  local get_clients = vim.lsp.get_clients or vim.lsp.get_active_clients
  if get_clients then
    local clients = get_clients({ name = 'spw' })
    if #clients > 0 then
      ok(string.format('Spw LSP client attached (%d active instance)', #clients))
    else
      info('Spw LSP client is not currently attached to the current buffer')
    end
  end
end

return M
