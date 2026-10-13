-- lua/spw/lsp_nav.lua — reference navigation through the attached server.
--
-- The server's textDocument/definition (else textDocument/documentLink) answer
-- decides the target and its anchor line. No Lua pattern reads the line here;
-- that extractor in navigation.lua runs only when no spw client is attached.
local lsp = require('spw.lsp')
local M = {}

local FILE_START = { start = { line = 0, character = 0 }, ['end'] = { line = 0, character = 0 } }

---@param msg string
---@param level integer
local function notify(msg, level)
  if vim.notify then vim.notify(msg, level, { title = 'spw' }) end
end

---@param bufnr integer
---@param fields table<string, string>
local function record(bufnr, fields)
  if not vim.api.nvim_buf_is_valid(bufnr) then return end
  for key, value in pairs(fields) do vim.b[bufnr][key] = value end
end

---@param range table
---@param pos table
---@return boolean
local function contains(range, pos)
  local s, e = range.start, range['end']
  if pos.line < s.line or pos.line > e.line then return false end
  if pos.line == s.line and pos.character < s.character then return false end
  if pos.line == e.line and pos.character > e.character then return false end
  return true
end

--- A documentLink target carries its anchor as `#L<n>` (1-based); read it as a Location.
---@param target string
---@return table
function M.link_location(target)
  local uri, line = target:match('^(.-)#L(%d+)$')
  if not uri then uri = target:gsub('#.*$', '') end
  local row = line and math.max(0, tonumber(line) - 1) or 0
  local at = { line = row, character = 0 }
  return { uri = uri, range = { start = at, ['end'] = at } }
end

--- Ask the client where the reference under the cursor points.
---@param client table
---@param source string textDocument/definition | textDocument/documentLink
---@param bufnr integer
---@param cb fun(location: table|nil, err: any)
function M.locate(client, source, bufnr, cb)
  local params = vim.lsp.util.make_position_params(0, client.offset_encoding)
  if source == 'textDocument/definition' then
    lsp.client_call(client, 'request', source, params, function(err, result)
      if err then return cb(nil, err) end
      if type(result) ~= 'table' then return cb(nil) end
      if result.uri or result.targetUri then return cb(result) end
      cb(result[1])
    end, bufnr)
    return
  end
  lsp.client_call(client, 'request', source, { textDocument = params.textDocument }, function(err, result)
    if err then return cb(nil, err) end
    for _, link in ipairs(result or {}) do
      if link.target and link.range and contains(link.range, params.position) then
        return cb(M.link_location(link.target))
      end
    end
    cb(nil)
  end, bufnr)
end

---@param location table
---@return string fname
---@return table range
local function unpack_location(location)
  local fname = vim.uri_to_fname(location.uri or location.targetUri)
  return fname, location.range or location.targetSelectionRange or FILE_START
end

---@param win integer
---@param row integer 0-based
local function set_row(win, row)
  local buf = vim.api.nvim_win_get_buf(win)
  local line = math.max(1, math.min(row + 1, vim.api.nvim_buf_line_count(buf)))
  vim.api.nvim_win_set_cursor(win, { line, 0 })
end

---@param location table
---@param client table
---@param opts { jump_anchor?: boolean }
local function open_location(location, client, opts)
  local fname, range = unpack_location(location)
  if vim.fn.isdirectory(fname) == 1 then
    vim.cmd('edit ' .. vim.fn.fnameescape(fname))
    return
  end
  local show = vim.lsp.util.show_document or vim.lsp.util.jump_to_location
  show({ uri = vim.uri_from_fname(fname), range = opts.jump_anchor and range or FILE_START },
    client.offset_encoding, { focus = true })
end

---@param location table
---@param opts { jump_anchor?: boolean }
local function peek_location(location, opts)
  local fname, range = unpack_location(location)
  local origin = vim.api.nvim_get_current_win()
  vim.cmd('pedit ' .. vim.fn.fnameescape(fname))
  if not pcall(vim.cmd, 'wincmd P') then return end
  if opts.jump_anchor then
    set_row(vim.api.nvim_get_current_win(), range.start.line)
    pcall(vim.cmd, 'normal! zv')
  end
  vim.api.nvim_set_current_win(origin)
end

--- Open (or preview) the reference under the cursor through the server.
--- Records vim.b.spw_nav_path / spw_nav_source / spw_nav_result on the origin buffer.
---@param client table
---@param source string
---@param bufnr integer
---@param opts? { jump_anchor?: boolean, peek?: boolean }
function M.open(client, source, bufnr, opts)
  opts = opts or {}
  record(bufnr, { spw_nav_path = 'lsp', spw_nav_source = source, spw_nav_result = 'pending' })
  local origin = vim.api.nvim_get_current_win()
  M.locate(client, source, bufnr, function(location, err)
    if err then
      record(bufnr, { spw_nav_result = 'error' })
      notify('Spw ' .. source .. ' failed: ' .. tostring(err.message or err), vim.log.levels.WARN)
      return
    end
    if vim.api.nvim_win_is_valid(origin) then vim.api.nvim_set_current_win(origin) end
    if not location then
      record(bufnr, { spw_nav_result = 'empty' })
      if opts.peek then
        notify('Spw LSP resolves no reference target under the cursor.', vim.log.levels.INFO)
        return
      end
      -- Not a reference the server resolves (or its target is missing): Vim's own gf.
      local ok, e = pcall(vim.cmd, opts.jump_anchor and 'normal! gF' or 'normal! gf')
      if not ok then
        notify(tostring(e):gsub('^.-(E%d+)', '%1') .. ' — <localleader>a offers create-missing actions.',
          vim.log.levels.INFO)
      end
      return
    end
    if opts.peek then
      peek_location(location, opts)
      record(bufnr, { spw_nav_result = 'peeked' })
    else
      open_location(location, client, opts)
      record(bufnr, { spw_nav_result = 'opened' })
    end
  end)
end

return M
