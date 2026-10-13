-- lua/spw/cli.lua — parameterized Spw CLI invocations for editor instruments
local M = {}

local rename_kinds = { mark = true, anchor = true, case = true, mood = true }

---@param root string
---@param script string
---@return boolean
function M.has_npm_script(root, script)
  if not script:match('^[%w:_-]+$') then return false end
  local package_json = root .. '/package.json'
  if vim.fn.filereadable(package_json) ~= 1 then return false end
  local ok, parsed = pcall(vim.json.decode, table.concat(vim.fn.readfile(package_json), '\n'))
  return ok
    and type(parsed) == 'table'
    and type(parsed.scripts) == 'table'
    and type(parsed.scripts[script]) == 'string'
end

---@param consumer_root string
---@return table|nil
function M.resolve_host(consumer_root)
  local root = vim.fn.fnamemodify(consumer_root, ':p'):gsub('/$', '')
  local configured = vim.trim(vim.g.spw_cli_root or '')
  if configured ~= '' then
    local tool_root = configured:sub(1, 1) == '/'
      and vim.fn.fnamemodify(configured, ':p'):gsub('/$', '')
      or vim.fn.fnamemodify(root .. '/' .. configured, ':p'):gsub('/$', '')
    if M.has_npm_script(tool_root, 'spw') then
      return { consumer_root = root, tool_root = tool_root }
    end
    return nil
  end
  if M.has_npm_script(root, 'spw') then
    return { consumer_root = root, tool_root = root }
  end
  local mounted = root .. '/.spw/_workbench'
  if M.has_npm_script(mounted, 'spw') then
    return { consumer_root = root, tool_root = mounted }
  end
  return nil
end

---@param consumer_root string
---@param file string
---@return string
function M.consumer_path(consumer_root, file)
  local root = vim.fn.fnamemodify(consumer_root, ':p'):gsub('/$', '')
  local surface = vim.fn.fnamemodify(file, ':p'):gsub('/$', '')
  local prefix = root .. '/'
  if surface:sub(1, #prefix) ~= prefix then
    error('Spw instruments require a file inside the consumer workspace.')
  end
  return surface:sub(#prefix + 1)
end

---@param consumer_root string
---@param file string
---@return table
function M.form(consumer_root, file)
  return {
    title = 'Spw Form',
    args = { 'form', M.consumer_path(consumer_root, file), '--resonance', '--spw' },
    output = 'spw',
  }
end

---@param consumer_root string
---@param file string
---@return table
function M.stack(consumer_root, file)
  return {
    title = 'Spw Surface Stack',
    args = { 'stack', M.consumer_path(consumer_root, file), '--json' },
    output = 'json',
  }
end

---@param consumer_root string
---@param file string
---@return table
function M.cache(consumer_root, file)
  return {
    title = 'Spw Cache',
    args = { 'inspect', 'cache', M.consumer_path(consumer_root, file), '--json' },
    output = 'json',
  }
end

---@param spec string
---@return table
function M.refactor_plan(spec)
  local normalized = vim.trim(spec)
  local kind, from, to = normalized:match('^(%a+):([^=\r\n]+)=([^\r\n]+)$')
  if not rename_kinds[kind] or vim.trim(from or '') == '' or vim.trim(to or '') == '' then
    error('Expected kind:from=to with kind mark, anchor, case, or mood.')
  end
  return {
    title = 'Spw Corpus Refactor Plan',
    args = { 'refactor', '.', '--rename', normalized, '--json' },
    output = 'json',
  }
end

--- Stages of the progressive source product, in order.
M.inspect_stages = { 'tokens', 'structure', 'trace' }

---@param stage string|nil
---@return string
local function source_stage(stage)
  stage = vim.trim(stage or '')
  if stage == '' then return 'trace' end
  if not vim.tbl_contains(M.inspect_stages, stage) then
    error('Expected a stage: tokens, structure, or trace.')
  end
  return stage
end

--- Inline source as one `--flag=value` word, so text starting with `--` never reads as a flag.
---@param flag string
---@param text string|nil
---@param empty string message when there is nothing to pass
---@return string
local function inline(flag, text, empty)
  if vim.trim(text or '') == '' then error(empty) end
  return flag .. '=' .. text
end

---@param consumer_root string
---@param dir string
---@return string
function M.consumer_dir(consumer_root, dir)
  local root = vim.fn.fnamemodify(consumer_root, ':p'):gsub('/$', '')
  local folder = vim.fn.fnamemodify(dir, ':p'):gsub('/$', '')
  if folder == root then return '.' end
  return M.consumer_path(root, folder)
end

--- `spw inspect source <file> --through <stage>`: the progressive source products.
---@param consumer_root string
---@param file string
---@param stage string|nil tokens|structure|trace (default trace)
---@return table
function M.inspect_source(consumer_root, file, stage)
  return {
    title = 'Spw Inspect',
    args = { 'inspect', 'source', M.consumer_path(consumer_root, file), '--through', source_stage(stage) },
    output = 'text',
  }
end

--- `spw inspect source --text=<range> --through <stage>` for a selected range.
---@param text string
---@param stage string|nil
---@return table
function M.inspect_text(text, stage)
  return {
    title = 'Spw Inspect',
    args = { 'inspect', 'source', inline('--text', text, 'Nothing to inspect: the range is empty.'),
      '--through', source_stage(stage) },
    output = 'text',
  }
end

--- `spw fingerprint --expr=<text>`; the summary header arrives on stderr.
--- Exit 1 means an incomplete parse or prose fallback: still a product, shown with its exit.
---@param expr string
---@return table
function M.fingerprint(expr)
  return {
    title = 'Spw Fingerprint',
    args = { 'fingerprint', inline('--expr', vim.trim(expr or ''), 'Nothing to fingerprint: the selection or line is empty.') },
    output = 'text',
    ok_codes = { [0] = true, [1] = true },
  }
end

--- `spw inspect memory` (the CLI reads it through `spw mem status`), then
--- `spw mem list` for the dumps that status counts.
---@return table[]
function M.memory()
  return {
    { title = 'Spw Memory', args = { 'inspect', 'memory' }, output = 'text' },
    { title = 'Spw Memory Dumps', args = { 'mem', 'list' }, output = 'text' },
  }
end

--- `spw query --from <folder> --selector pathRefs --count --stats`; stats arrive on stderr.
---@param consumer_root string
---@param folder string
---@return table
function M.perf(consumer_root, folder)
  local from = M.consumer_dir(consumer_root, folder)
  if from:find(',', 1, true) then
    error('spw query reads --from as a comma-separated list; this folder name holds a comma.')
  end
  return {
    title = 'Spw Perf',
    args = { 'query', '--from', from, '--selector', 'pathRefs', '--count', '--stats' },
    output = 'text',
  }
end

--- `spw emit ir <file>` — the EmitDocument intermediate form (spw.emit/1).
--- Read-only: never passes --out.
---@param consumer_root string
---@param file string
---@return table
function M.project(consumer_root, file)
  return {
    title = 'Spw Project IR',
    args = { 'emit', 'ir', M.consumer_path(consumer_root, file) },
    output = 'json',
  }
end

--- `spw quest --json` — the quest panels and each try line's check result.
---@return table
function M.quest_panels()
  return { title = 'Spw Quest', args = { 'quest', '--json' }, output = 'json' }
end

--- `spw quest --check <step> "<line>"`; exit 1 is a fail verdict, not an error.
---@param step string
---@param line string
---@return table
function M.quest_check(step, line)
  if not (step or ''):match('^[%w_%-]+$') then error('Expected a quest step id such as act or hold.') end
  if vim.trim(line or '') == '' then error('Write a line to check first.') end
  if line:sub(1, 2) == '--' then
    error('spw quest reads a line starting with -- as a flag; it cannot be checked as written.')
  end
  return {
    title = 'Spw Quest check',
    args = { 'quest', '--check', step, line },
    output = 'text',
    ok_codes = { [0] = true, [1] = true },
  }
end

---@param host table
---@param invocation table
---@return string[]
function M.command(host, invocation)
  local command = {
    'npm', '--prefix', host.tool_root,
    'run', '--silent', 'spw', '--',
  }
  vim.list_extend(command, invocation.args)
  return command
end

return M
