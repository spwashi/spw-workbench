-- spw-lsp.lua — Neovim LSP client for the Spw Language Server
--
-- The LSP server is the same stdio-server.ts used by VS Code and IntelliJ.
-- It provides: diagnostics, hover (operator + symmetry), document links,
-- inlay hints (register slots), folding, completion, references, and symbols.
--
-- Usage:
--   1. Ensure this plugin is on your runtimepath (symlink or package manager)
--   2. The LSP starts automatically when a .spw file is opened (via ftplugin)
--   3. Override the command or root detection via vim.g.spw_lsp_*
--
-- Global overrides:
--   vim.g.spw_lsp_cmd      = { 'npx', 'tsx', 'scripts/lsp/stdio-server.ts' }
--   vim.g.spw_lsp_root     = '/path/to/workspace'
--   vim.g.spw_lsp_disable  = true
--   vim.g.spw_lsp_settings = { inlayHints = { paths = false } }
--   vim.g.spw_lsp_keymaps  = false   -- disable default buffer keymaps

local M = {}

--- Locate the workspace root by walking up from `bufpath` looking for
--- marker files that indicate an Spw project.
---@param bufpath string
---@return string
local function find_root(bufpath)
  local markers = { 'package.json', '.spw', 'index.spw', '.git' }
  local dir = vim.fn.fnamemodify(bufpath, ':h')

  -- Walk upward until we hit / or find a marker
  while dir ~= '/' and dir ~= '' do
    for _, marker in ipairs(markers) do
      local candidate = dir .. '/' .. marker
      if vim.fn.isdirectory(candidate) == 1 or vim.fn.filereadable(candidate) == 1 then
        return dir
      end
    end
    dir = vim.fn.fnamemodify(dir, ':h')
  end

  -- Fallback: directory of the current file
  return vim.fn.fnamemodify(bufpath, ':h')
end

--- Build the command to start the LSP server.
--- Checks `vim.g.spw_lsp_cmd` first, then falls back to `npm run lsp`
--- (which invokes `npx tsx scripts/lsp/stdio-server.ts` via package.json).
---@param root string  workspace root
---@return string[]
local function build_cmd(root)
  -- User override: vim.g.spw_lsp_cmd = { 'npx', 'tsx', 'scripts/lsp/stdio-server.ts' }
  if vim.g.spw_lsp_cmd then
    return vim.g.spw_lsp_cmd
  end

  -- Check for the npm "lsp" script in the workspace
  local pkg = root .. '/package.json'
  if vim.fn.filereadable(pkg) == 1 then
    local content = table.concat(vim.fn.readfile(pkg), '\n')
    if content:find('"lsp"') then
      return { 'npm', 'run', 'lsp' }
    end
  end

  -- Direct invocation fallback
  local server = root .. '/scripts/lsp/stdio-server.ts'
  if vim.fn.filereadable(server) == 1 then
    return { 'npx', 'tsx', server }
  end

  -- Last resort
  return { 'npm', 'run', 'lsp' }
end

---@param root string
---@param bufdir string
---@param lines string[]
---@return table<string, string>
local function build_roots(root, bufdir, lines)
  local roots = {
    docs = root .. '/docs',
    src = root .. '/src',
    spec = root .. '/lib/spw-v0.2.0-alpha',
    lib = root .. '/lib',
    scripts = root .. '/scripts',
    spw = root .. '/.spw',
    biome = root .. '/.spw/biome/ocean',
    harness = root .. '/.spw/harness',
    gen = root .. '/.spw/gen',
    agents = root .. '/.agents',
    plans = root .. '/.agents/plans',
    state = root .. '/.agents/state',
    skills = root .. '/.agents/skills',
    here = bufdir,
    repo = root,
  }

  -- Parse in-file root declarations such as: @docs: ~"."
  for _, line in ipairs(lines) do
    local name, rel = line:match('@([%w_%-]+)%s*:%s*~"([^"]+)"')
    if name and rel then
      roots[name] = vim.fn.fnamemodify(bufdir .. '/' .. rel, ':p')
    end
  end

  return roots
end

---@param line string
---@param col0 number
---@return string|nil, string|nil, string|nil
local function detect_ref_under_cursor(line, col0)
  local col1 = col0 + 1

  -- ~"..." or ~<label>"..."
  for s, ref, e in line:gmatch('()~[^"]-"([^"]+)"()') do
    if col1 >= s and col1 <= e then
      return 'path', ref, nil
    end
  end

  -- @root/path
  for s, rootName, target, e in line:gmatch('()@([%w_%-]+)/([^%s"%)%]}>,;]+)()') do
    if col1 >= s and col1 <= e then
      return 'root', target, rootName
    end
  end

  return nil, nil, nil
end

---@param target string
---@return string, string|nil
local function split_anchor(target)
  local file_part, anchor = target:match('^(.-)#(.+)$')
  if file_part and anchor then
    return file_part, anchor
  end
  return target, nil
end

---@param s string
---@return string
local function normalize_slug(s)
  local out = s:lower()
  out = out:gsub('[^%w%s%-_]', '')
  out = out:gsub('%s+', '-')
  out = out:gsub('_+', '-')
  out = out:gsub('%-+', '-')
  out = out:gsub('^%-', '')
  out = out:gsub('%-$', '')
  return out
end

---@param bufnr integer
---@param anchor string
local function jump_to_anchor(bufnr, anchor)
  if not anchor or anchor == '' then return end
  if anchor:match('^%d+$') then
    vim.api.nvim_win_set_cursor(0, { tonumber(anchor), 0 })
    return
  end

  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local anchor_lc = anchor:lower()
  local anchor_slug = normalize_slug(anchor)

  local candidates = {
    '#>' .. anchor_lc,
    '#:' .. anchor_lc,
    '#!' .. anchor_lc,
    '^"' .. anchor_lc .. '"',
    '^["' .. anchor_lc .. '"]',
  }

  for i, line in ipairs(lines) do
    local line_lc = line:lower()
    for _, c in ipairs(candidates) do
      if line_lc:find(c, 1, true) then
        vim.api.nvim_win_set_cursor(0, { i, 0 })
        return
      end
    end

    local md_heading = line:match('^%s*#+%s+(.+)$')
    if md_heading and normalize_slug(md_heading) == anchor_slug then
      vim.api.nvim_win_set_cursor(0, { i, 0 })
      return
    end
  end
end

---Open Spw reference under cursor (~"..." or @root/path).
---Falls back to native gf/gF when no Spw reference is detected.
---@param opts? { jump_anchor?: boolean }
function M.open_ref_under_cursor(opts)
  opts = opts or {}
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  if bufpath == '' then
    vim.cmd(opts.jump_anchor and 'normal! gF' or 'normal! gf')
    return
  end

  local row, col0 = unpack(vim.api.nvim_win_get_cursor(0))
  local line = vim.api.nvim_buf_get_lines(bufnr, row - 1, row, false)[1] or ''
  local kind, target, rootName = detect_ref_under_cursor(line, col0)
  if not kind or not target then
    vim.cmd(opts.jump_anchor and 'normal! gF' or 'normal! gf')
    return
  end

  local targetNoAnchor, anchor = split_anchor(target)
  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local roots = build_roots(root, bufdir, lines)

  local resolved
  if kind == 'path' then
    resolved = vim.fn.fnamemodify(bufdir .. '/' .. targetNoAnchor, ':p')
  else
    local base = roots[rootName] or (root .. '/' .. rootName)
    resolved = vim.fn.fnamemodify(base .. '/' .. targetNoAnchor, ':p')
  end

  vim.cmd('edit ' .. vim.fn.fnameescape(resolved))
  if opts.jump_anchor then
    jump_to_anchor(vim.api.nvim_get_current_buf(), anchor)
  end
end

---Open Spw reference under cursor and jump to #anchor when present.
function M.open_ref_under_cursor_and_anchor()
  M.open_ref_under_cursor({ jump_anchor = true })
end

--- Called when the Spw LSP client attaches to a buffer.
--- Sets up inlay hints (0.10+) and optional buffer-local keymaps.
---@param _ any  client (unused)
---@param bufnr integer
function M._on_attach(_, bufnr)
  -- Auto-enable inlay hints (Neovim 0.10+)
  if vim.lsp.inlay_hint and vim.lsp.inlay_hint.enable then
    vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
  end

  -- LSP-driven folding (Neovim 0.10+ via vim.lsp.foldexpr).
  -- Falls back to the syntax fold already set by ftplugin.
  -- Disable with: vim.g.spw_lsp_folds = false
  if vim.g.spw_lsp_folds ~= false and vim.lsp.foldexpr then
    vim.wo.foldmethod = 'expr'
    vim.wo.foldexpr   = 'v:lua.vim.lsp.foldexpr()'
    vim.wo.foldlevel  = 99  -- open all folds on first load
  end

  -- Skip keymaps if the user disabled them
  if vim.g.spw_lsp_keymaps == false then return end

  local map = function(lhs, rhs, desc)
    vim.keymap.set('n', lhs, rhs, { buffer = bufnr, silent = true, desc = desc })
  end

  map('gd',         vim.lsp.buf.definition,                          'Spw: go to definition')
  map('gf',         M.open_ref_under_cursor,                         'Spw: open reference under cursor')
  map('gF',         M.open_ref_under_cursor_and_anchor,              'Spw: open reference and jump to #anchor')
  map('K',          vim.lsp.buf.hover,                               'Spw: hover docs')
  map('gr',         vim.lsp.buf.references,                          'Spw: references')
  map('<leader>rn', vim.lsp.buf.rename,                              'Spw: rename symbol')
  map('<leader>f',  function() vim.lsp.buf.format({ async = true }) end, 'Spw: format document')
  map('[d',         vim.diagnostic.goto_prev,                        'Spw: previous diagnostic')
  map(']d',         vim.diagnostic.goto_next,                        'Spw: next diagnostic')
  map('<leader>e',  vim.diagnostic.open_float,                       'Spw: show diagnostic float')
end

--- Start (or attach to) the Spw LSP server for the current buffer.
function M.start()
  -- Guard: only in Neovim 0.8+ with the native LSP client
  if not vim.lsp or not vim.lsp.start then return end

  -- Respect a kill switch: vim.g.spw_lsp_disable = true
  if vim.g.spw_lsp_disable then return end

  local bufpath = vim.api.nvim_buf_get_name(0)
  if bufpath == '' then return end

  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local cmd = build_cmd(root)

  vim.lsp.start({
    name = 'spw',
    cmd = cmd,
    root_dir = root,
    filetypes = { 'spw' },
    settings = {},
    capabilities = vim.lsp.protocol.make_client_capabilities(),

    -- Forward user settings as initializationOptions.
    -- These overlay .spw/config.json on the server side.
    -- Usage: vim.g.spw_lsp_settings = { inlayHints = { paths = false } }
    init_options = vim.g.spw_lsp_settings or {},

    on_attach = M._on_attach,
  })
end

--- Stop all running Spw LSP clients.
function M.stop()
  -- Handle both pre-0.10 (get_active_clients) and 0.10+ (get_clients) APIs
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

-- Register user commands once per session
if not vim.g._spw_lsp_commands_loaded then
  vim.g._spw_lsp_commands_loaded = true

  vim.api.nvim_create_user_command('SpwRestart', M.restart, {
    desc = 'Restart the Spw LSP server',
  })

  vim.api.nvim_create_user_command('SpwInlayHints', function()
    if vim.lsp.inlay_hint then
      local enabled = vim.lsp.inlay_hint.is_enabled({ bufnr = 0 })
      vim.lsp.inlay_hint.enable(not enabled, { bufnr = 0 })
    end
  end, { desc = 'Toggle Spw inlay hints for current buffer' })

  vim.api.nvim_create_user_command('SpwStop', M.stop, {
    desc = 'Stop the Spw LSP server',
  })
end

return M
