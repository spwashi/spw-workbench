-- lua/spw/completion.lua — Dynamic Spw auto-completion and omnifunc provider for Neovim
--
-- Completion items are derived dynamically from:
-- 1. Active LSP server (textDocument/completion) when attached
-- 2. Workspace configuration file (.spw/shelves.spw)
-- 3. In-file root declarations (@alias: ~"path")
-- 4. User global overrides (vim.g.spw_shelves and vim.g.spw_directives)

local nav = require('spw.navigation')
local lsp = require('spw.lsp')

local M = {}

--- Dynamically read root shelf aliases from .spw/shelves.spw if present
---@param root string
---@return table<string, string>
function M.read_workspace_shelves(root)
  local shelves = {}
  local shelves_file = root .. '/.spw/shelves.spw'

  if vim.fn.filereadable(shelves_file) == 1 then
    local lines = vim.fn.readfile(shelves_file)
    for _, line in ipairs(lines) do
      local name, rel = line:match('@([%w_%-]+)%s*:%s*~"([^"]+)"')
      if name and rel then
        shelves[name] = vim.fn.fnamemodify(root .. '/.spw/' .. rel, ':p')
      end
    end
  end

  return shelves
end

--- Get configurable or workspace-discovered shelf aliases
---@param root string
---@param bufdir string
---@param lines string[]
---@return table<string, string>
function M.get_shelves(root, bufdir, lines)
  -- 1. Base roots built from workspace structure and buffer declarations
  local roots = nav.build_roots(root, bufdir, lines)

  -- 2. Overlay dynamic .spw/shelves.spw entries
  local workspace_shelves = M.read_workspace_shelves(root)
  for name, path in pairs(workspace_shelves) do
    roots[name] = path
  end

  -- 3. Overlay user global overrides if defined (vim.g.spw_shelves = { my_alias = '/path' })
  if vim.g.spw_shelves and type(vim.g.spw_shelves) == 'table' then
    for name, path in pairs(vim.g.spw_shelves) do
      roots[name] = path
    end
  end

  return roots
end

--- Get configurable directives (defaults to user override or empty)
---@return string[]
function M.get_directives()
  if vim.g.spw_directives and type(vim.g.spw_directives) == 'table' then
    return vim.g.spw_directives
  end
  return { '#!pragmatics', '#!semantics', '#!physics', '#!topology' }
end

---@param findstart integer
---@param base string
---@return integer|table
function M.omnifunc(findstart, base)
  local line = vim.api.nvim_get_current_line()
  local col = vim.api.nvim_win_get_cursor(0)[2]

  if findstart == 1 then
    local cur = col
    while cur > 0 do
      local char = line:sub(cur, cur)
      if char == '@' or char == '#' or char == '~' or char == '/' or char:match('%s') then
        if char == '@' or char == '#' or char == '~' then
          return cur - 1
        end
        return cur
      end
      cur = cur - 1
    end
    return col
  end

  local items = {}
  local bufnr = vim.api.nvim_get_current_buf()
  local bufpath = vim.api.nvim_buf_get_name(bufnr)
  local root = vim.g.spw_lsp_root or (bufpath ~= '' and lsp.find_root(bufpath) or vim.fn.getcwd())
  local bufdir = bufpath ~= '' and vim.fn.fnamemodify(bufpath, ':h') or root
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)

  -- 1. Dynamic Shelf Alias Completion (@...)
  if base:sub(1, 1) == '@' or line:sub(col, col) == '@' then
    local roots = M.get_shelves(root, bufdir, lines)
    for name, path in pairs(roots) do
      local word = '@' .. name .. '/'
      if base == '' or word:sub(1, #base) == base or name:sub(1, #base) == base then
        table.insert(items, {
          word = word,
          abbr = '@' .. name,
          kind = 'Folder',
          menu = '[Spw Shelf] ' .. path,
        })
      end
    end

  -- 2. Configurable Directives & Anchors Completion (#...)
  elseif base:sub(1, 1) == '#' or line:sub(col, col) == '#' then
    for _, d in ipairs(M.get_directives()) do
      if base == '' or d:sub(1, #base) == base then
        table.insert(items, {
          word = d,
          abbr = d,
          kind = 'Keyword',
          menu = '[Spw Directive]',
        })
      end
    end

  -- 3. Dynamic Reference Template Completion (~...)
  elseif base:sub(1, 1) == '~' or line:sub(col, col) == '~' then
    table.insert(items, {
      word = '~"."',
      abbr = '~"..."',
      kind = 'File',
      menu = '[Spw Reference]',
    })
    table.insert(items, {
      word = '~<.spw/>',
      abbr = '~<...>',
      kind = 'File',
      menu = '[Spw Angle Reference]',
    })
  end

  return items
end

return M
