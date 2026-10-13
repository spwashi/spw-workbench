-- lua/spw/health.lua — Health check provider for Spw Neovim plugin (:checkhealth spw)
local M = {}

--- Instrument commands this plugin registers; health confirms each one.
M.instrument_commands = {
  'SpwInspect', 'SpwFingerprint', 'SpwMemory', 'SpwPerf', 'SpwProject', 'SpwQuest',
  'SpwForm', 'SpwStack', 'SpwCache', 'SpwRefactorPlan',
}

---@param bufnr integer
---@return boolean
local function is_spw_file(bufnr)
  return bufnr > 0 and vim.api.nvim_buf_is_valid(bufnr)
    and vim.bo[bufnr].filetype == 'spw' and vim.bo[bufnr].buftype == ''
end

--- The buffer health reports on. :checkhealth makes its own buffer current, so
--- prefer the current, then the alternate, then the most recently used .spw file.
---@return integer|nil
function M.target_buffer()
  local current = vim.api.nvim_get_current_buf()
  if is_spw_file(current) then return current end
  local alternate = vim.fn.bufnr('#')
  if is_spw_file(alternate) then return alternate end
  local best, best_used
  for _, info in ipairs(vim.fn.getbufinfo({ bufloaded = 1 })) do
    if is_spw_file(info.bufnr) and (not best_used or info.lastused > best_used) then
      best, best_used = info.bufnr, info.lastused
    end
  end
  return best
end

---@param report table
---@param bufnr integer
local function check_routes(report, bufnr)
  local lsp = require('spw.lsp')
  local label = vim.fn.fnamemodify(vim.api.nvim_buf_get_name(bufnr), ':t')
  local client = lsp.attached_client(bufnr)
  if client then
    report.ok(string.format('LSP client attached: spw (id %d) on %s', client.id, label))
  else
    report.info(string.format('LSP client attached: none on %s (LSP disabled, starting, or failed)', label))
  end

  local path, source = lsp.navigation_route(bufnr)
  if path == 'lsp' then
    report.ok('Navigation path: lsp (' .. source .. ') for gf/gF, :SpwOpenRef, :SpwPeekRef')
  else
    report.info('Navigation path: lua (pattern fallback in lua/spw/navigation.lua; no spw client attached)')
  end

  if lsp.completion_route(bufnr) == 'lsp' then
    report.ok('Completion path: lsp (textDocument/completion through vim.lsp.omnifunc)')
  else
    report.info('Completion path: lua (shelves, in-file roots, directives)')
  end

  local last = vim.b[bufnr].spw_nav_path
  if last then
    report.info(string.format('Last navigation here: path=%s source=%s result=%s',
      last, tostring(vim.b[bufnr].spw_nav_source), tostring(vim.b[bufnr].spw_nav_result)))
  end
end

---@param report table
---@param bufnr integer|nil
local function check_instruments(report, bufnr)
  local missing = vim.tbl_filter(function(name) return vim.fn.exists(':' .. name) ~= 2 end, M.instrument_commands)
  if #missing == 0 then
    report.ok('Instrument commands registered: :' .. table.concat(M.instrument_commands, ' :'))
  else
    report.warn('Instrument commands missing: :' .. table.concat(missing, ' :'))
  end

  local instruments = require('spw.instruments')
  local consumer_root = instruments.consumer_root(bufnr or vim.api.nvim_get_current_buf())
  local host = require('spw.cli').resolve_host(consumer_root)
  if host then
    local where = host.tool_root == host.consumer_root and 'workspace npm script'
      or (vim.fn.fnamemodify(host.tool_root, ':t') == '_workbench' and 'mounted .spw/_workbench' or 'vim.g.spw_cli_root')
    report.ok('CLI host for instruments: ' .. where)
  else
    report.warn('CLI host for instruments: none', { instruments.no_host_message })
  end
end

function M.check()
  local health = vim.health or require('health')
  local start = health.start or health.report_start
  local report = {
    ok = health.ok or health.report_ok,
    warn = health.warn or health.report_warn,
    error = health.error or health.report_error,
    info = health.info or health.report_info,
  }

  start('spw.nvim integration health')

  -- 1. Neovim version
  if vim.fn.has('nvim-0.8') == 1 then
    local v = vim.version()
    report.ok(string.format('Neovim version %d.%d.%d is >= 0.8', v.major, v.minor, v.patch))
  else
    report.error('Neovim version < 0.8 is not supported')
  end

  if vim.fn.has('nvim-0.10') == 1 then
    report.ok('Neovim >= 0.10 detected (supports native inlay hints and lsp foldexpr)')
  else
    report.info('Neovim < 0.10 (inlay hints and foldexpr fall back to legacy behavior)')
  end

  -- 2. Executables
  if vim.fn.executable('node') == 1 then
    local node_ver = vim.fn.system('node --version'):gsub('%s+', '')
    report.ok('Node.js executable found in PATH: ' .. node_ver)
  else
    report.error('Node.js executable (node) not found in PATH')
  end

  if vim.fn.executable('npx') == 1 then
    report.ok('npx executable found in PATH')
  else
    report.warn('npx executable not found in PATH (direct server fallback may fail)')
  end

  -- 3. Workspace root and files
  local bufnr = M.target_buffer()
  if bufnr then
    local lsp = require('spw.lsp')
    local root = vim.g.spw_lsp_root or lsp.find_root(vim.api.nvim_buf_get_name(bufnr))
    report.ok('Workspace root resolved: ' .. root)

    local cmd, cwd = lsp.build_cmd(root)
    report.ok(string.format('LSP server start command: %s (cwd: %s)', table.concat(cmd, ' '), cwd))

    if vim.fn.filereadable(root .. '/.spw/shelves.spw') == 1 then
      report.ok('Found workspace root aliases: .spw/shelves.spw')
    else
      report.info('No .spw/shelves.spw found (root aliases will use built-in defaults)')
    end

    if vim.fn.filereadable(root .. '/.spw/topology.spw') == 1 then
      report.ok('Found workspace topography routing: .spw/topology.spw')
    else
      report.info('No .spw/topology.spw found')
    end
  else
    report.info('No .spw buffer open to resolve a workspace root')
  end

  -- 4. LSP attachment and which navigation/completion path is live
  start('spw LSP routing')
  if vim.g.spw_lsp_disable then report.info('vim.g.spw_lsp_disable is set; the LSP is not started') end
  if bufnr then
    check_routes(report, bufnr)
  else
    report.info('LSP client attached: unknown (no .spw buffer open); routes are decided per buffer')
  end

  -- 5. CLI-backed instruments
  start('spw instruments')
  check_instruments(report, bufnr)
end

return M
