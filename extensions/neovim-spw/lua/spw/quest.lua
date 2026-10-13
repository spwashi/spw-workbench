-- lua/spw/quest.lua — :SpwQuest panels and :SpwQuest check
--
-- Panels come from `spw quest --json` in its order, with each try line
-- verbatim (docs/learn/quest.spw: hosts may show fewer fields, never reorder
-- panels or reword a try line). Checks run `spw quest --check <step> "<line>"`;
-- the real parser decides, never a Lua pattern.
local cli = require('spw.cli')
local instruments = require('spw.instruments')
local M = {}

local ns = vim.api.nvim_create_namespace('spw_quest')
local BUFFER_NAME = 'spw://quest'

---@param msg string
---@param level integer
local function notify(msg, level)
  if vim.notify then vim.notify(msg, level, { title = 'spw' }) end
end

---@param reading table|nil
---@return string
local function reading_text(reading)
  local parts = {}
  for _, group in ipairs({ 'operators', 'containers' }) do
    for _, item in ipairs((reading or {})[group] or {}) do
      table.insert(parts, string.format('%s %s', item.mark or '', item.name or ''))
    end
  end
  return #parts > 0 and table.concat(parts, ', ') or 'words only'
end

--- Render quest JSON as markdown panels; returns lines and per-line try results.
---@param quest table decoded `spw quest --json`
---@return string[] lines
---@return table<integer, table> marks 1-based line → check result
function M.render(quest)
  local steps = quest.steps or {}
  local checks = quest.checks or {}
  local results = {}
  for _, result in ipairs(quest.results or {}) do
    results[(result.step or '') .. '\0' .. (result.line or '')] = result
  end

  local lines = {
    string.format('# Spw quest · %s · %d steps', quest.quest or 'quest', #steps),
    '',
    'Write or edit a line under a panel, then run :SpwQuest check on it.',
    'Panels, their order, and each try line come from `spw quest --json` unchanged.',
  }
  local marks = {}
  local function try_line(step, text)
    table.insert(lines, text)
    -- commands_pass lines run commands only on an explicit check; --json leaves them unrun.
    marks[#lines] = step.check == 'commands_pass' and { note = 'runs lint + resolve on :SpwQuest check' }
      or results[step.id .. '\0' .. text]
  end

  for index, step in ipairs(steps) do
    local scene = vim.tbl_filter(function(part) return part ~= '' end,
      { step.scene or '', step.speaker or '', step.bubble or '' })
    vim.list_extend(lines, { '', string.format('## %d. %s', index, step.id) })
    if #scene > 0 then table.insert(lines, '_' .. table.concat(scene, ' · ') .. '_') end
    vim.list_extend(lines, { '', step.reads or '', '' })
    try_line(step, step.try or '')
    for _, line in ipairs(step['then'] or {}) do try_line(step, line) end
    table.insert(lines, '')
    if step.notice and step.notice ~= '' then table.insert(lines, '- notice: ' .. step.notice) end
    table.insert(lines, string.format('- check: %s — %s', step.check or '', checks[step.check] or ''))
    if step.grow and step.grow ~= '' then table.insert(lines, '- grow: ' .. step.grow) end
  end
  return lines, marks
end

--- The step named by the nearest panel heading at or above `row` (1-based).
---@param bufnr integer
---@param row integer
---@return string|nil
function M.step_at(bufnr, row)
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, row, false)
  for i = #lines, 1, -1 do
    local step = lines[i]:match('^##%s+%d+%.%s+([%w_%-]+)') or lines[i]:match('^%d+%.%s+([%w_%-]+)%s*$')
    if step then return step end
  end
  return nil
end

---@param bufnr integer
---@param row integer 1-based
---@param pass boolean
---@param lines string[]
local function annotate(bufnr, row, pass, lines)
  vim.api.nvim_buf_clear_namespace(bufnr, ns, row - 1, row)
  local virt = {}
  for i, line in ipairs(lines) do
    table.insert(virt, { { (i == 1 and '  ' or '    ') .. line, pass and 'DiagnosticOk' or 'DiagnosticWarn' } })
  end
  if #virt > 0 then
    vim.api.nvim_buf_set_extmark(bufnr, ns, row - 1, 0, { virt_lines = virt })
  end
end

---@param bufnr integer
---@param marks table<integer, table>
local function mark_try_lines(bufnr, marks)
  for row, result in pairs(marks) do
    local text, hl
    if result.note then
      text, hl = '  ' .. result.note, 'Comment'
    else
      text = (result.pass and '  pass  ' or '  fail  ') .. reading_text(result.reading)
      hl = result.pass and 'DiagnosticOk' or 'DiagnosticWarn'
    end
    vim.api.nvim_buf_set_extmark(bufnr, ns, row - 1, 0, { virt_text = { { text, hl } }, virt_text_pos = 'eol' })
  end
end

--- :SpwQuest — open the panels in an editable scratch buffer.
function M.open()
  local origin = vim.api.nvim_get_current_buf()
  local consumer_root = instruments.consumer_root(origin)
  local host = cli.resolve_host(consumer_root)
  if not host then return notify(instruments.no_host_message, vim.log.levels.ERROR) end

  local invocation = cli.quest_panels()
  instruments.exec(host, invocation, function(run)
    if not run.ok then
      local detail = vim.split(vim.trim(run.stderr), '\n', { plain = true })[1] or 'no detail'
      return notify(string.format('spw quest exited %d: %s', run.code, detail), vim.log.levels.ERROR)
    end
    local ok, quest = pcall(vim.json.decode, run.stdout)
    if not ok or type(quest) ~= 'table' then
      return notify('spw quest --json returned no readable panels.', vim.log.levels.ERROR)
    end
    local lines, marks = M.render(quest)
    local existing = vim.fn.bufnr(BUFFER_NAME)
    if existing > 0 then pcall(vim.api.nvim_buf_delete, existing, { force = true }) end
    local buf = instruments.open_scratch(invocation.title, lines, 'markdown',
      { modifiable = true, name = BUFFER_NAME })
    vim.bo[buf].bufhidden = 'hide'
    vim.b[buf].spw_consumer_root = consumer_root
    mark_try_lines(buf, marks)
    local first = next(marks) and math.min(unpack(vim.tbl_keys(marks))) or 1
    vim.api.nvim_win_set_cursor(0, { first, 0 })
    vim.g.spw_instrument_last = { title = invocation.title, code = run.code, duration_ms = run.duration_ms, bufnr = buf }
    notify(string.format('Spw quest: %d panels in %dms · source: CLI · effect: read-only',
      #(quest.steps or {}), run.duration_ms), vim.log.levels.INFO)
  end)
end

--- :SpwQuest check [step] — check the current line against a step's shape.
--- Records vim.b.spw_quest_last = { step, line, code, pass, output }.
---@param step string|nil
function M.check(step)
  local bufnr = vim.api.nvim_get_current_buf()
  local row = vim.api.nvim_win_get_cursor(0)[1]
  step = (step and step ~= '') and step or M.step_at(bufnr, row)
  if not step then
    return notify('No quest panel heading above the cursor; name a step: :SpwQuest check act', vim.log.levels.WARN)
  end
  local line = vim.trim(vim.api.nvim_get_current_line())
  local host = cli.resolve_host(instruments.consumer_root(bufnr))
  if not host then return notify(instruments.no_host_message, vim.log.levels.ERROR) end
  local ok, invocation = pcall(cli.quest_check, step, line)
  if not ok then return notify(tostring(invocation):gsub('^.-:%d+: ', ''), vim.log.levels.WARN) end

  instruments.exec(host, invocation, function(run)
    local output = vim.split(vim.trim(run.stdout ~= '' and run.stdout or run.stderr), '\n', { plain = true })
    if not run.ok then
      return notify(string.format('spw quest --check exited %d: %s', run.code, output[1] or ''), vim.log.levels.ERROR)
    end
    local pass = run.code == 0
    if vim.api.nvim_buf_is_valid(bufnr) then
      vim.b[bufnr].spw_quest_last = { step = step, line = line, code = run.code, pass = pass, output = output }
      if row <= vim.api.nvim_buf_line_count(bufnr) then annotate(bufnr, row, pass, output) end
    end
    notify(string.format('quest %s: %s', step, output[1] or (pass and 'pass' or 'fail')),
      pass and vim.log.levels.INFO or vim.log.levels.WARN)
  end)
end

--- :SpwQuest [check [step]]
---@param fargs string[]
function M.command(fargs)
  if fargs[1] == 'check' then return M.check(fargs[2]) end
  if fargs[1] and fargs[1] ~= '' then
    return notify('Usage: :SpwQuest  or  :SpwQuest check [step]', vim.log.levels.WARN)
  end
  M.open()
end

--- Completion for :SpwQuest arguments.
---@param _ string arglead
---@param cmdline string
---@return string[]
function M.complete(_, cmdline)
  if not cmdline:match('check%s+') then return { 'check' } end
  local steps = {}
  local buf = vim.fn.bufnr(BUFFER_NAME)
  if buf > 0 and vim.api.nvim_buf_is_loaded(buf) then
    for _, line in ipairs(vim.api.nvim_buf_get_lines(buf, 0, -1, false)) do
      local step = line:match('^##%s+%d+%.%s+([%w_%-]+)')
      if step then table.insert(steps, step) end
    end
  end
  -- Before the panels are open, the step ids `spw quest --help` lists.
  return #steps > 0 and steps or { 'write', 'act', 'hold', 'name', 'point', 'ask', 'grow' }
end

return M
