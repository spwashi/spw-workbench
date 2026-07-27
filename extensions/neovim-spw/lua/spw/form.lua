-- lua/spw/form.lua — Form sequence wrapping and transformation ergonomics for Spw
local M = {}

--- Form wrap templates for Spw confluence sequences
M.templates = {
  wrap = '& => {&} => {&[#label]}',
  full = '& => {&} => {&[#label]} => {&<#tag>_label}',
  container = '^["$1"]{\n  $0\n}',
  reference = '~"$1"',
  root_ref = '@$1/$2',
}

--- Insert form wrap notation sequence at current cursor position
---@param notation string|nil
function M.insert_form_wrap(notation)
  notation = notation or M.templates.wrap
  local row, col = unpack(vim.api.nvim_win_get_cursor(0))
  vim.api.nvim_buf_set_text(0, row - 1, col, row - 1, col, { notation })
end

--- Wrap current visual selection or word under cursor in an Spw container
---@param label string|nil
function M.wrap_selection_in_container(label)
  label = label or 'label'
  local mode = vim.fn.mode()
  local text = ''

  if mode == 'v' or mode == 'V' or mode == '\22' then
    -- Visual mode: get selection
    vim.cmd('normal! "sy')
    text = vim.fn.getreg('s')
  else
    -- Normal mode: get word under cursor
    text = vim.fn.expand('<cword>')
  end

  local lines = {}
  table.insert(lines, string.format('^["%s"]{', label))
  for line in text:gmatch('[^\r\n]+') do
    table.insert(lines, '  ' .. line)
  end
  table.insert(lines, '}')

  local row, col = unpack(vim.api.nvim_win_get_cursor(0))
  if mode == 'v' or mode == 'V' then
    vim.api.nvim_buf_set_text(0, row - 1, 0, row - 1, col, lines)
  else
    local start_row = math.max(0, row - 1)
    vim.api.nvim_buf_set_lines(0, start_row, start_row + 1, false, lines)
  end
end

--- Expand snippet using native vim.snippet (Neovim 0.10+) if available
---@param body string
function M.expand_snippet(body)
  if vim.snippet and vim.snippet.expand then
    vim.snippet.expand(body)
  else
    -- Fallback insertion
    local clean = body:gsub('%$%d', ''):gsub('%$%{min%}', '')
    M.insert_form_wrap(clean)
  end
end

return M
