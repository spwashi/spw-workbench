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
--   vim.g.spw_lsp_cmd      = { 'npx', 'tsx', 'packages/spw-lsp/src/stdio-server.ts' }
--   vim.g.spw_lsp_root     = '/path/to/workspace'
--   vim.g.spw_lsp_disable  = true
--   vim.g.spw_lsp_settings = { inlayHints = { paths = false } }
--   vim.g.spw_lsp_keymaps  = false   -- disable default buffer keymaps

local M = {}

---@param msg string
---@param level integer
local function notify(msg, level)
  if vim.notify then
    vim.notify(msg, level, { title = 'spw' })
  end
end

---@param bufnr integer
---@return boolean
local function has_lsp_code_action_provider(bufnr)
  local get_clients = vim.lsp.get_clients or vim.lsp.get_active_clients
  if not get_clients then return false end

  local clients = get_clients({ bufnr = bufnr })
  for _, client in ipairs(clients) do
    if client.supports_method and client:supports_method('textDocument/codeAction') then
      return true
    end
  end
  return false
end

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
--- (which invokes `npx tsx packages/spw-lsp/src/upstream-bridge.ts` via package.json).
---@param root string  workspace root
---@return string[]
local function build_cmd(root)
  -- User override: vim.g.spw_lsp_cmd = { 'npx', 'tsx', 'packages/spw-lsp/src/stdio-server.ts' }
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
  local server = root .. '/packages/spw-lsp/src/stdio-server.ts'
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

---@class SpwRef
---@field kind '"path"'|'"root"'
---@field target string
---@field rootName string|nil
---@field start_col number
---@field end_col number
---@field text string

---True when ~<inner> is a navigable path (not a bare label or pattern).
---@param inner string
---@return boolean
local function is_angle_path_like(inner)
  local s = (inner or ''):match('^%s*(.-)%s*$') or ''
  if s == '' then return false end
  if s:find('[#*{}%(%)%[%]|]', 1) then return false end
  if s:find('/', 1, true) then return true end
  if s:sub(1, 1) == '.' then return true end
  if s:match('%.[Ss][Pp][Ww]$')
    or s:match('%.[Tt][Ss][Xx]?$')
    or s:match('%.[Jj][Ss]$')
    or s:match('%.[Mm][Jj][Ss]$')
    or s:match('%.[Cc][Jj][Ss]$')
    or s:match('%.[Mm][Dd]$')
    or s:match('%.[Jj][Ss][Oo][Nn]$')
  then
    return true
  end
  return false
end

---@param line string
---@return SpwRef[]
local function collect_refs_in_line(line)
  local refs = {}

  -- ~"..." and ~<label>"..."
  for s, ref, e in line:gmatch('()~[^"]-"([^"]+)"()') do
    table.insert(refs, {
      kind = 'path',
      target = ref,
      rootName = nil,
      start_col = s - 1,
      end_col = e - 2,
      text = line:sub(s, e - 1),
    })
  end

  -- ~<.spw/foo.spw>, ~<./index.spw> — angle path without trailing quote
  for s, inner, e in line:gmatch('()~<([^>]+)>()') do
    local after = line:sub(e)
    -- Skip ~<label>"path" (already handled as quoted form)
    if not after:match('^%s*"') and is_angle_path_like(inner) then
      table.insert(refs, {
        kind = 'path',
        target = inner:match('^%s*(.-)%s*$') or inner,
        rootName = nil,
        start_col = s - 1,
        end_col = e - 2,
        text = line:sub(s, e - 1),
      })
    end
  end

  -- @root/path
  for s, rootName, target, e in line:gmatch('()@([%w_%-]+)/([^%s"%)%]}>,;]+)()') do
    table.insert(refs, {
      kind = 'root',
      target = target,
      rootName = rootName,
      start_col = s - 1,
      end_col = e - 2,
      text = line:sub(s, e - 1),
    })
  end

  table.sort(refs, function(a, b) return a.start_col < b.start_col end)
  return refs
end

---@param line string
---@param col0 number
---@return SpwRef|nil
local function ref_under_cursor(line, col0)
  for _, ref in ipairs(collect_refs_in_line(line)) do
    if col0 >= ref.start_col and col0 <= ref.end_col then
      return ref
    end
  end
  return nil
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

---@param ref SpwRef
---@param root string
---@param bufdir string
---@param lines string[]
---@return string, string|nil, boolean, boolean
local function resolve_ref(ref, root, bufdir, lines)
  local targetNoAnchor, anchor = split_anchor(ref.target)
  local roots = build_roots(root, bufdir, lines)

  local resolved
  if ref.kind == 'path' then
    -- Prefer workspace-root resolution for repo-shaped targets (.spw/..., docs/...,
    -- packages/...) so nested buffers do not invent a duplicated .spw under bufdir.
    local from_buf = vim.fn.fnamemodify(bufdir .. '/' .. targetNoAnchor, ':p')
    local from_root = vim.fn.fnamemodify(root .. '/' .. targetNoAnchor, ':p')
    local looks_repo_relative = targetNoAnchor:match('^%.?%.?/') == nil
      and (
        targetNoAnchor:match('^%.spw/')
        or targetNoAnchor:match('^docs/')
        or targetNoAnchor:match('^packages/')
        or targetNoAnchor:match('^lib/')
        or targetNoAnchor:match('^extensions/')
        or targetNoAnchor:match('^src/')
      )
    if looks_repo_relative then
      if vim.fn.filereadable(from_root) == 1 or vim.fn.isdirectory(from_root) == 1 then
        resolved = from_root
      elseif vim.fn.filereadable(from_buf) == 1 or vim.fn.isdirectory(from_buf) == 1 then
        resolved = from_buf
      else
        resolved = from_root
      end
    else
      if vim.fn.filereadable(from_buf) == 1 or vim.fn.isdirectory(from_buf) == 1 then
        resolved = from_buf
      elseif vim.fn.filereadable(from_root) == 1 or vim.fn.isdirectory(from_root) == 1 then
        resolved = from_root
      else
        resolved = from_buf
      end
    end
  else
    local base = roots[ref.rootName] or (root .. '/' .. ref.rootName)
    resolved = vim.fn.fnamemodify(base .. '/' .. targetNoAnchor, ':p')
  end

  local exists = vim.fn.filereadable(resolved) == 1 or vim.fn.isdirectory(resolved) == 1
  local is_dir_intent = targetNoAnchor:sub(-1) == '/'
  return resolved, anchor, exists, is_dir_intent
end

---@param ref SpwRef
---@param resolved string
---@param is_dir_intent boolean
local function create_missing_ref_target(ref, resolved, is_dir_intent)
  local ok, err = pcall(function()
    if is_dir_intent then
      vim.fn.mkdir(resolved, 'p')
      return
    end

    vim.fn.mkdir(vim.fn.fnamemodify(resolved, ':h'), 'p')
    if vim.fn.filereadable(resolved) == 0 then
      vim.fn.writefile({}, resolved)
    end
  end)

  if not ok then
    notify(('Failed to create %s: %s'):format(ref.text, tostring(err)), vim.log.levels.ERROR)
    return false
  end

  notify(('Created target for %s'):format(ref.text), vim.log.levels.INFO)
  return true
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
---@return boolean
local function jump_to_anchor(bufnr, anchor)
  if not anchor or anchor == '' then return false end
  if anchor:match('^%d+$') then
    local max_line = vim.api.nvim_buf_line_count(bufnr)
    local line = math.max(1, math.min(tonumber(anchor), max_line))
    vim.api.nvim_win_set_cursor(0, { line, 0 })
    return true
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
        return true
      end
    end

    local md_heading = line:match('^%s*#+%s+(.+)$')
    if md_heading and normalize_slug(md_heading) == anchor_slug then
      vim.api.nvim_win_set_cursor(0, { i, 0 })
      return true
    end
  end

  return false
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
  local ref = ref_under_cursor(line, col0)
  if not ref then
    vim.cmd(opts.jump_anchor and 'normal! gF' or 'normal! gf')
    return
  end

  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local resolved, anchor, existed = resolve_ref(ref, root, bufdir, lines)

  vim.cmd('edit ' .. vim.fn.fnameescape(resolved))
  if not existed then
    notify('Opened missing target. Use :w to create it on disk.', vim.log.levels.INFO)
  end
  if opts.jump_anchor then
    local jumped = jump_to_anchor(vim.api.nvim_get_current_buf(), anchor)
    if anchor and not jumped then
      notify(('Anchor not found: #%s'):format(anchor), vim.log.levels.WARN)
    end
  end
end

---Open Spw reference under cursor and jump to #anchor when present.
function M.open_ref_under_cursor_and_anchor()
  M.open_ref_under_cursor({ jump_anchor = true })
end

---Preview Spw reference under cursor in preview window.
---@param opts? { jump_anchor?: boolean }
function M.peek_ref_under_cursor(opts)
  opts = opts or {}
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  if bufpath == '' then return end

  local row, col0 = unpack(vim.api.nvim_win_get_cursor(0))
  local line = vim.api.nvim_buf_get_lines(bufnr, row - 1, row, false)[1] or ''
  local ref = ref_under_cursor(line, col0)
  if not ref then
    notify('No Spw reference under cursor.', vim.log.levels.INFO)
    return
  end

  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local resolved, anchor, exists = resolve_ref(ref, root, bufdir, lines)
  if not exists then
    notify('Target does not exist yet; use code action to create.', vim.log.levels.WARN)
    return
  end

  local current_win = vim.api.nvim_get_current_win()
  vim.cmd('pedit ' .. vim.fn.fnameescape(resolved))
  local ok = pcall(vim.cmd, 'wincmd P')
  if ok and opts.jump_anchor then
    local jumped = jump_to_anchor(vim.api.nvim_get_current_buf(), anchor)
    if anchor and not jumped then
      notify(('Anchor not found in preview: #%s'):format(anchor), vim.log.levels.WARN)
    end
  end
  if ok then
    vim.api.nvim_set_current_win(current_win)
  end
end

---Collect unresolved references in current buffer and load quickfix.
function M.references_to_quickfix()
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  if bufpath == '' then return end

  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local items = {}

  for row, line in ipairs(lines) do
    for _, ref in ipairs(collect_refs_in_line(line)) do
      local resolved, _, exists = resolve_ref(ref, root, bufdir, lines)
      if not exists then
        table.insert(items, {
          bufnr = bufnr,
          lnum = row,
          col = ref.start_col + 1,
          text = ('unresolved %s → %s'):format(ref.text, resolved),
          type = 'W',
        })
      end
    end
  end

  vim.fn.setqflist({}, 'r', { title = 'Spw unresolved references', items = items })
  if #items > 0 then
    vim.cmd('copen')
  else
    notify('No unresolved references in current buffer.', vim.log.levels.INFO)
    vim.cmd('cclose')
  end
end

---Show local Spw code actions at cursor (create missing target) then fallback to LSP actions.
function M.code_action_under_cursor()
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  local lspCanCodeAction = has_lsp_code_action_provider(bufnr)
  if bufpath == '' then
    if lspCanCodeAction then
      vim.lsp.buf.code_action()
    else
      notify('No LSP code-action provider is attached to this buffer.', vim.log.levels.INFO)
    end
    return
  end

  local row, col0 = unpack(vim.api.nvim_win_get_cursor(0))
  local line = vim.api.nvim_buf_get_lines(bufnr, row - 1, row, false)[1] or ''
  local ref = ref_under_cursor(line, col0)
  if not ref then
    if lspCanCodeAction then
      vim.lsp.buf.code_action()
    else
      notify('No Spw reference under cursor and no LSP code-action provider attached.', vim.log.levels.INFO)
    end
    return
  end

  local root = vim.g.spw_lsp_root or find_root(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local resolved, _, exists, is_dir_intent = resolve_ref(ref, root, bufdir, lines)
  if exists then
    if lspCanCodeAction then
      vim.lsp.buf.code_action()
    else
      notify('Target already exists; no local create action needed.', vim.log.levels.INFO)
    end
    return
  end

  local choices = {
    ('Create missing target: %s'):format(ref.text),
    'Cancel',
  }
  local showLspChoice = nil
  if lspCanCodeAction then
    showLspChoice = 'Show LSP code actions'
    table.insert(choices, 2, showLspChoice)
  end

  vim.ui.select(choices, { prompt = 'Spw actions' }, function(choice)
    if choice == choices[1] then
      if create_missing_ref_target(ref, resolved, is_dir_intent) then
        vim.cmd('edit ' .. vim.fn.fnameescape(resolved))
      end
    elseif showLspChoice and choice == showLspChoice then
      vim.lsp.buf.code_action()
    end
  end)
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
  map('<localleader>a', M.code_action_under_cursor,                  'Spw: code action under cursor')
  map('<localleader>q', M.references_to_quickfix,                    'Spw: unresolved refs to quickfix')
  map('<localleader>p', function() M.peek_ref_under_cursor({ jump_anchor = true }) end, 'Spw: preview reference')
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

  vim.api.nvim_create_user_command('SpwOpenRef', function()
    M.open_ref_under_cursor({ jump_anchor = true })
  end, {
    desc = 'Open Spw reference under cursor and jump to #anchor',
  })

  vim.api.nvim_create_user_command('SpwPeekRef', function()
    M.peek_ref_under_cursor({ jump_anchor = true })
  end, {
    desc = 'Preview Spw reference under cursor and jump to #anchor',
  })

  vim.api.nvim_create_user_command('SpwOperatorFreq', function()
    M.request_custom('spw/operatorFrequency', {
      uri = vim.uri_from_bufnr(0),
    }, function(err, result)
      if err or not result then
        notify('operatorFrequency failed', vim.log.levels.WARN)
        return
      end
      local lines = { '# Spw operator frequency', 'dominant: ' .. tostring(result.dominantOperator), '' }
      for _, e in ipairs(result.entries or {}) do
        table.insert(lines, string.format('%s  %d  %.1f%%', e.operator, e.count, e.percent))
      end
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].filetype = 'markdown'
      vim.cmd('split')
      vim.api.nvim_win_set_buf(0, buf)
    end)
  end, { desc = 'Show operator frequency for current buffer' })

  vim.api.nvim_create_user_command('SpwPhase', function()
    local row, col = unpack(vim.api.nvim_win_get_cursor(0))
    M.request_custom('spw/phaseContext', {
      uri = vim.uri_from_bufnr(0),
      position = { line = row - 1, character = col },
    }, function(err, result)
      if err or not result then
        notify('phaseContext failed', vim.log.levels.WARN)
        return
      end
      if not result.sigil then
        notify('No sigil under cursor', vim.log.levels.INFO)
        return
      end
      notify(string.format(
        'sigil=%s phase=%s  %s — %s',
        tostring(result.sigil),
        tostring(result.phase),
        tostring(result.role or ''),
        tostring(result.physics or '')
      ), vim.log.levels.INFO)
    end)
  end, { desc = 'Show spirit-phase context at cursor' })

  vim.api.nvim_create_user_command('SpwFormSeq', function(opts)
    local notation = opts.args ~= '' and opts.args or '& => {&} => {&[#label]} => {&<#tag>_label}'
    M.request_custom('spw/formSequence', {
      notation = notation,
      catalog = true,
    }, function(err, result)
      if err or not result then
        notify('formSequence failed', vim.log.levels.WARN)
        return
      end
      local lines = { '# Form sequence', result.notation or '', '' }
      for i, s in ipairs(result.steps or {}) do
        table.insert(lines, string.format('%d. [%s] %s', i - 1, s.op, s.surface))
      end
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].filetype = 'markdown'
      vim.cmd('split')
      vim.api.nvim_win_set_buf(0, buf)
    end)
  end, { nargs = '?', desc = 'Explain form sequence (default confluence wrap)' })

  vim.api.nvim_create_user_command('SpwTemperature', function()
    M.request_custom('spw/workspaceTemperature', {}, function(err, result)
      if err or not result then
        notify('workspaceTemperature failed', vim.log.levels.WARN)
        return
      end
      local lines = { '# Workspace temperature', '' }
      for _, e in ipairs(result) do
        table.insert(lines, string.format('%s  w=%s  age=%s  %s', e.tier, e.writeCount, e.beatAge, e.uri))
      end
      if #result == 0 then
        table.insert(lines, '(empty — open/save .spw files to warm tiers)')
      end
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].filetype = 'markdown'
      vim.cmd('split')
      vim.api.nvim_win_set_buf(0, buf)
    end)
  end, { desc = 'Show workspace temperature tiers' })

  vim.api.nvim_create_user_command('SpwInsertFormWrap', function()
    local row, col = unpack(vim.api.nvim_win_get_cursor(0))
    local text = '& => {&} => {&[#label]}'
    vim.api.nvim_buf_set_text(0, row - 1, col, row - 1, col, { text })
  end, { desc = 'Insert confluence form wrap sequence at cursor' })

  vim.api.nvim_create_user_command('SpwRefsQuickfix', M.references_to_quickfix, {
    desc = 'Populate quickfix with unresolved Spw references in current buffer',
  })

  vim.api.nvim_create_user_command('SpwCodeAction', M.code_action_under_cursor, {
    desc = 'Spw local code actions under cursor',
  })
end

return M
