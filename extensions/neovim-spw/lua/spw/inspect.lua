-- lua/spw/inspect.lua — CLI-backed inspection instruments in scratch splits
--
-- :SpwInspect, :SpwFingerprint, :SpwMemory, :SpwPerf, :SpwProject. The CLI
-- owns every answer (no Lua parsing); each editor only chooses where to show
-- it. Arguments match the VS Code and IntelliJ instruments so one fixture
-- reads the same in all three (.agents/plans/editor-inspection-instruments).
local cli = require('spw.cli')
local instruments = require('spw.instruments')
local M = {}

---@param msg string
---@param level integer
local function notify(msg, level)
  if vim.notify then vim.notify(msg, level, { title = 'spw' }) end
end

---@param build fun(): any
---@return any|nil
local function built(build)
  local ok, value = pcall(build)
  if not ok then
    notify((tostring(value):gsub('^.-:%d+: ', '')), vim.log.levels.ERROR)
    return nil
  end
  return value
end

---@return table|nil
local function current_host()
  local host = cli.resolve_host(instruments.consumer_root(vim.api.nvim_get_current_buf()))
  if not host then notify(instruments.no_host_message, vim.log.levels.ERROR) end
  return host
end

---@param ctx table
---@return string
local function saved_reading(ctx)
  local name = vim.fn.fnamemodify(ctx.file, ':t')
  return vim.bo[ctx.bufnr].modified and ('saved file ' .. name .. ' (unsaved edits not included)')
    or ('saved file ' .. name)
end

---@param opts table|nil
---@return string
local function range_reading(opts)
  return opts.line1 == opts.line2 and string.format('line %d, passed inline', opts.line1)
    or string.format('lines %d-%d, passed inline', opts.line1, opts.line2)
end

--- :SpwInspect [tokens|structure|trace] — progressive source products for the
--- saved file, or for a command range passed inline through --text.
---@param stage string|nil default trace
---@param opts table|nil user-command opts
function M.inspect(stage, opts)
  local text = instruments.range_text(opts)
  if text then
    local host = current_host()
    local invocation = host and built(function() return cli.inspect_text(text, stage) end)
    if invocation then
      instruments.report(host, { title = 'Spw Inspect', reading = range_reading(opts), invocations = { invocation } })
    end
    return
  end
  local ctx = instruments.file_context('Spw inspect')
  local invocation = ctx and built(function() return cli.inspect_source(ctx.consumer_root, ctx.file, stage) end)
  if invocation then
    instruments.report(ctx.host, { title = 'Spw Inspect', reading = saved_reading(ctx), invocations = { invocation } })
  end
end

--- :SpwFingerprint — AST node counts for the selection or the current line.
---@param opts table|nil
function M.fingerprint(opts)
  local text = instruments.range_text(opts)
  local reading = text and range_reading(opts)
    or string.format('line %d', vim.api.nvim_win_get_cursor(0)[1])
  text = text or vim.api.nvim_get_current_line()
  local host = current_host()
  local invocation = host and built(function() return cli.fingerprint(text) end)
  if invocation then
    instruments.report(host, {
      title = 'Spw Fingerprint',
      reading = reading,
      notes = { 'exit 1 marks an incomplete parse or prose fallback; the counts still stand' },
      invocations = { invocation },
    })
  end
end

--- :SpwMemory — durable runtime memory and the dumps it counts.
function M.memory()
  local host = current_host()
  if not host then return end
  instruments.report(host, {
    title = 'Spw Memory',
    reading = 'runtime memory under the consumer root',
    notes = { 'spw inspect memory reads through spw mem status; spw mem list names the dumps it counts' },
    invocations = cli.memory(),
  })
end

--- :SpwPerf — pathRef count with walk/parse timing for the file's folder.
function M.perf()
  local ctx = instruments.file_context('Spw perf')
  local invocation = ctx and built(function()
    return cli.perf(ctx.consumer_root, vim.fn.fnamemodify(ctx.file, ':p:h'))
  end)
  if invocation then
    instruments.report(ctx.host, {
      title = 'Spw Perf',
      reading = 'saved .spw files in the folder of ' .. vim.fn.fnamemodify(ctx.file, ':t'),
      notes = { 'stats arrive from --stats on stderr; wall time adds npm and CLI startup' },
      invocations = { invocation },
    })
  end
end

--- :SpwProject — the saved file's spw.emit/1 intermediate form as JSON (no --out).
function M.project()
  local ctx = instruments.file_context('Spw project')
  local invocation = ctx and built(function() return cli.project(ctx.consumer_root, ctx.file) end)
  if invocation then instruments.run_cli(ctx.host, invocation) end
end

return M
