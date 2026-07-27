-- lua/spw/navigation.lua — Spw reference resolution and navigation for Neovim
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
function M.has_lsp_code_action_provider(bufnr)
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

---@param root string
---@param bufdir string
---@param lines string[]
---@return table<string, string>
function M.build_roots(root, bufdir, lines)
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
function M.is_angle_path_like(inner)
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
function M.collect_refs_in_line(line)
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
    if not after:match('^%s*"') and M.is_angle_path_like(inner) then
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
function M.ref_under_cursor(line, col0)
  for _, ref in ipairs(M.collect_refs_in_line(line)) do
    if col0 >= ref.start_col and col0 <= ref.end_col then
      return ref
    end
  end
  return nil
end

---@param target string
---@return string, string|nil
function M.split_anchor(target)
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
function M.resolve_ref(ref, root, bufdir, lines)
  local targetNoAnchor, anchor = M.split_anchor(ref.target)
  local roots = M.build_roots(root, bufdir, lines)

  local resolved
  if ref.kind == 'path' then
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
function M.create_missing_ref_target(ref, resolved, is_dir_intent)
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
function M.normalize_slug(s)
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
function M.jump_to_anchor(bufnr, anchor)
  if not anchor or anchor == '' then return false end
  if anchor:match('^%d+$') then
    local max_line = vim.api.nvim_buf_line_count(bufnr)
    local line = math.max(1, math.min(tonumber(anchor), max_line))
    vim.api.nvim_win_set_cursor(0, { line, 0 })
    return true
  end

  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local anchor_lc = anchor:lower()
  local anchor_slug = M.normalize_slug(anchor)

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
    if md_heading and M.normalize_slug(md_heading) == anchor_slug then
      vim.api.nvim_win_set_cursor(0, { i, 0 })
      return true
    end
  end

  return false
end

---Open Spw reference under cursor (~"..." or @root/path).
---@param opts? { jump_anchor?: boolean, find_root?: fun(path: string): string }
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
  local ref = M.ref_under_cursor(line, col0)
  if not ref then
    vim.cmd(opts.jump_anchor and 'normal! gF' or 'normal! gf')
    return
  end

  local find_root_fn = opts.find_root or require('spw.lsp').find_root
  local root = vim.g.spw_lsp_root or find_root_fn(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local resolved, anchor, existed = M.resolve_ref(ref, root, bufdir, lines)

  vim.cmd('edit ' .. vim.fn.fnameescape(resolved))
  if not existed then
    notify('Opened missing target. Use :w to create it on disk.', vim.log.levels.INFO)
  end
  if opts.jump_anchor then
    local jumped = M.jump_to_anchor(vim.api.nvim_get_current_buf(), anchor)
    if anchor and not jumped then
      notify(('Anchor not found: #%s'):format(anchor), vim.log.levels.WARN)
    end
  end
end

function M.open_ref_under_cursor_and_anchor()
  M.open_ref_under_cursor({ jump_anchor = true })
end

---@param opts? { jump_anchor?: boolean, find_root?: fun(path: string): string }
function M.peek_ref_under_cursor(opts)
  opts = opts or {}
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  if bufpath == '' then return end

  local row, col0 = unpack(vim.api.nvim_win_get_cursor(0))
  local line = vim.api.nvim_buf_get_lines(bufnr, row - 1, row, false)[1] or ''
  local ref = M.ref_under_cursor(line, col0)
  if not ref then
    notify('No Spw reference under cursor.', vim.log.levels.INFO)
    return
  end

  local find_root_fn = opts.find_root or require('spw.lsp').find_root
  local root = vim.g.spw_lsp_root or find_root_fn(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local resolved, anchor, exists = M.resolve_ref(ref, root, bufdir, lines)
  if not exists then
    notify('Target does not exist yet; use code action to create.', vim.log.levels.WARN)
    return
  end

  local current_win = vim.api.nvim_get_current_win()
  vim.cmd('pedit ' .. vim.fn.fnameescape(resolved))
  local ok = pcall(vim.cmd, 'wincmd P')
  if ok and opts.jump_anchor then
    local jumped = M.jump_to_anchor(vim.api.nvim_get_current_buf(), anchor)
    if anchor and not jumped then
      notify(('Anchor not found in preview: #%s'):format(anchor), vim.log.levels.WARN)
    end
  end
  if ok then
    vim.api.nvim_set_current_win(current_win)
  end
end

---@param opts? { find_root?: fun(path: string): string }
function M.references_to_quickfix(opts)
  opts = opts or {}
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  if bufpath == '' then return end

  local find_root_fn = opts.find_root or require('spw.lsp').find_root
  local root = vim.g.spw_lsp_root or find_root_fn(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local items = {}

  for row, line in ipairs(lines) do
    for _, ref in ipairs(M.collect_refs_in_line(line)) do
      local resolved, _, exists = M.resolve_ref(ref, root, bufdir, lines)
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

---@param opts? { find_root?: fun(path: string): string }
function M.code_action_under_cursor(opts)
  opts = opts or {}
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  local lspCanCodeAction = M.has_lsp_code_action_provider(bufnr)
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
  local ref = M.ref_under_cursor(line, col0)
  if not ref then
    if lspCanCodeAction then
      vim.lsp.buf.code_action()
    else
      notify('No Spw reference under cursor and no LSP code-action provider attached.', vim.log.levels.INFO)
    end
    return
  end

  local find_root_fn = opts.find_root or require('spw.lsp').find_root
  local root = vim.g.spw_lsp_root or find_root_fn(bufpath)
  local bufdir = vim.fn.fnamemodify(bufpath, ':h')
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local resolved, _, exists, is_dir_intent = M.resolve_ref(ref, root, bufdir, lines)
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
      if M.create_missing_ref_target(ref, resolved, is_dir_intent) then
        vim.cmd('edit ' .. vim.fn.fnameescape(resolved))
      end
    elseif showLspChoice and choice == showLspChoice then
      vim.lsp.buf.code_action()
    end
  end)
end

return M
