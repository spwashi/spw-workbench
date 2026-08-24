-- lua/spw/instruments.lua — live LSP probes and plan-only CLI refactoring
local cli = require('spw.cli')
local lsp = require('spw.lsp')
local M = {}

---@param message string
---@param level integer
local function notify(message, level)
  if vim.notify then vim.notify(message, level, { title = 'spw' }) end
end

---@param title string
---@param lines string[]
---@param filetype string
function M.open_scratch(title, lines, filetype)
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].buftype = 'nofile'
  vim.bo[buf].bufhidden = 'wipe'
  vim.bo[buf].swapfile = false
  vim.bo[buf].filetype = filetype
  vim.bo[buf].modifiable = false
  pcall(vim.api.nvim_buf_set_name, buf, 'spw://instrument/' .. title:gsub('%s+', '-'):lower())
  vim.cmd('botright split')
  vim.api.nvim_win_set_buf(0, buf)
end

---@param method string
---@param render fun(result: table): string[]
---@param title string
local function live_probe(method, render, title)
  local uri = vim.uri_from_bufnr(0)
  local changedtick = vim.api.nvim_buf_get_changedtick(0)
  lsp.request_custom(method, { uri = uri }, function(err, result)
    if err or not result then
      notify(title .. ' failed: ' .. tostring(err or 'empty result'), vim.log.levels.WARN)
      return
    end
    local lines = {
      '# ' .. title,
      '',
      string.format('source: LSP live document · changedtick: %d · client cache: none', changedtick),
      '',
    }
    vim.list_extend(lines, render(result))
    vim.schedule(function() M.open_scratch(title, lines, 'markdown') end)
  end)
end

function M.form()
  live_probe('spw/geometry', function(result)
    local braces = result.braces or {}
    local kinds = braces.kinds or {}
    local lines = {
      string.format('()=%d []=%d {}=%d <>=%d  couple=%d  medials=%d',
        kinds.scope or 0, kinds.frame or 0, kinds.body or 0, kinds.capsule or 0,
        braces.coupleOps or 0, braces.medials or 0),
      string.format('maxDepth=%d', (result.nesting or {}).maxDepth or 0),
      '',
      '## Operators',
    }
    for _, operator in ipairs(result.operators or {}) do
      table.insert(lines, string.format('- %s  %d  %.1f%%  %s',
        operator.sigil, operator.count, operator.percent, operator.role))
    end
    table.insert(lines, '')
    table.insert(lines, '## Lessons')
    for _, lesson in ipairs(result.lessons or {}) do table.insert(lines, '- ' .. lesson) end
    return lines
  end, 'Spw form')
end

function M.stack()
  live_probe('spw/surfaceProfile', function(result)
    local lines = { '## Stack' }
    local keys = vim.tbl_keys(result.stack or {})
    table.sort(keys)
    for _, key in ipairs(keys) do
      table.insert(lines, string.format('- **%s**: `%s`', key, tostring(result.stack[key])))
    end
    vim.list_extend(lines, {
      '', '## Flow', (result.flow or {}).summary or '(none)',
      '', '## Probes', result.probeMeasure or '(none)',
      '', '## Experimental',
      'known: ' .. table.concat((result.experimental or {}).known or {}, ', '),
      'unknown: ' .. table.concat((result.experimental or {}).unknown or {}, ', '),
    })
    return lines
  end, 'Spw surface stack')
end

local function render_cache_layers(layers)
  local lines = { 'parity: cache.layer/1', '' }
  for _, layer in ipairs(layers or {}) do
    table.insert(lines, '## ' .. (layer.plane or 'cache'))
    table.insert(lines, 'present: ' .. tostring(layer.present == true))
    table.insert(lines, 'source: ' .. (layer.source or ''))
    if layer.present ~= true and layer.omission then
      table.insert(lines, 'omission: ' .. layer.omission)
    end
    if layer.next then table.insert(lines, 'next: ' .. layer.next) end
    if type(layer.stats) == 'table' then
      local parts = {}
      for key, value in pairs(layer.stats) do
        table.insert(parts, string.format('%s=%s', key, tostring(value)))
      end
      table.sort(parts)
      if #parts > 0 then table.insert(lines, table.concat(parts, ' ')) end
    end
    table.insert(lines, '')
  end
  return lines
end

function M.cache()
  lsp.request_custom('spw/cacheReflection', {}, function(err, result)
    if err or not result then
      notify('Spw cache failed: ' .. tostring(err or 'empty result'), vim.log.levels.WARN)
      return
    end
    local lines = { '# Spw cache', '' }
    vim.list_extend(lines, render_cache_layers(result.layers))
    vim.list_extend(lines, {
      '## LSP session attention',
      'plane: lsp_session_reflection',
      string.format('tracked=%d beat=%d concentration=%.0f%%',
        result.tracked or 0, result.beat or 0, (result.concentration or 0) * 100),
      '', '## What stands out',
    })
    if #(result.notes or {}) == 0 then table.insert(lines, '- nothing to flag') end
    for _, note in ipairs(result.notes or {}) do
      table.insert(lines, string.format('- **%s** — %s: %s',
        note.kind or 'note', vim.fn.fnamemodify(note.uri or '', ':t'), note.detail or ''))
    end
    table.insert(lines, '')
    table.insert(lines, '## Surface families')
    for _, family in ipairs(result.families or {}) do
      table.insert(lines, string.format('- **%s** (%s) × %d',
        family.archetype or 'surface', family.volatility or 'unknown', #(family.uris or {})))
    end
    vim.schedule(function() M.open_scratch('Spw cache', lines, 'markdown') end)
  end)
end

---@param spec string
function M.refactor_plan(spec)
  local bufpath = vim.api.nvim_buf_get_name(0)
  if bufpath == '' then
    notify('Open a workspace file before planning a corpus refactor.', vim.log.levels.WARN)
    return
  end
  local consumer_root = vim.g.spw_lsp_root or lsp.find_root(bufpath)
  local host = cli.resolve_host(consumer_root)
  if not host then
    notify('Spw corpus planning requires an npm `spw` script in the workspace, mounted .spw/_workbench, or vim.g.spw_cli_root.', vim.log.levels.ERROR)
    return
  end
  local ok, invocation = pcall(cli.refactor_plan, spec)
  if not ok then
    notify(tostring(invocation), vim.log.levels.ERROR)
    return
  end
  M.run_cli(host, invocation)
end

---@param host table
---@param invocation table
function M.run_cli(host, invocation)
  local command = cli.command(host, invocation)
  local started = (vim.uv or vim.loop).hrtime()
  local finish = function(code, stdout, stderr)
    vim.schedule(function()
      local duration_ms = math.floor(((vim.uv or vim.loop).hrtime() - started) / 1000000)
      if code ~= 0 then
        local detail = vim.split(vim.trim(stderr or ''), '\n', { plain = true })[1] or 'no detail'
        notify(string.format('%s exited %d: %s', invocation.title, code, detail), vim.log.levels.ERROR)
        return
      end
      M.open_scratch(invocation.title, vim.split(stdout or '', '\n', { plain = true }), invocation.output)
      notify(string.format('%s completed in %dms · source: CLI · effect: read-only',
        invocation.title, duration_ms), vim.log.levels.INFO)
    end)
  end

  if vim.system then
    vim.system(command, { cwd = host.consumer_root, text = true, timeout = 120000 }, function(result)
      finish(result.code, result.stdout, result.stderr)
    end)
    return
  end

  local stdout, stderr = {}, {}
  vim.fn.jobstart(command, {
    cwd = host.consumer_root,
    stdout_buffered = true,
    stderr_buffered = true,
    on_stdout = function(_, data) vim.list_extend(stdout, data or {}) end,
    on_stderr = function(_, data) vim.list_extend(stderr, data or {}) end,
    on_exit = function(_, code) finish(code, table.concat(stdout, '\n'), table.concat(stderr, '\n')) end,
  })
end

return M
