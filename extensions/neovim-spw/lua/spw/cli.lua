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
