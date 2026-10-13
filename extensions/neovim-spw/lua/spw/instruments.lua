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
---@param opts? { modifiable?: boolean, name?: string }
---@return integer bufnr
function M.open_scratch(title, lines, filetype, opts)
  opts = opts or {}
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].buftype = 'nofile'
  vim.bo[buf].bufhidden = 'wipe'
  vim.bo[buf].swapfile = false
  vim.bo[buf].filetype = filetype
  vim.bo[buf].modifiable = opts.modifiable == true
  pcall(vim.api.nvim_buf_set_name, buf, opts.name or ('spw://instrument/' .. title:gsub('%s+', '-'):lower()))
  vim.cmd('botright split')
  vim.api.nvim_win_set_buf(0, buf)
  return buf
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

local NO_HOST = 'Spw instruments require an npm `spw` script in the workspace, mounted .spw/_workbench, or vim.g.spw_cli_root.'

--- Consumer root for `bufnr`: the configured root, the file's workspace, a
--- scratch buffer's recorded origin, or the working directory's workspace.
---@param bufnr integer
---@return string
function M.consumer_root(bufnr)
  if vim.g.spw_lsp_root then return vim.g.spw_lsp_root end
  local recorded = vim.b[bufnr].spw_consumer_root
  if type(recorded) == 'string' and recorded ~= '' then return recorded end
  local name = vim.api.nvim_buf_get_name(bufnr)
  if name ~= '' and vim.bo[bufnr].buftype == '' and not name:match('^%a[%w+.-]*://') then
    return lsp.find_root(name)
  end
  return lsp.find_root(vim.fn.getcwd() .. '/.')
end

--- Saved-file context for a file-backed instrument, or nil after notifying why not.
---@param label string
---@return table|nil
function M.file_context(label)
  local bufnr = vim.api.nvim_get_current_buf()
  local file = vim.api.nvim_buf_get_name(bufnr)
  if file == '' or vim.bo[bufnr].buftype ~= '' then
    notify(label .. ' reads a saved workspace file; open one first.', vim.log.levels.WARN)
    return nil
  end
  local consumer_root = M.consumer_root(bufnr)
  local host = cli.resolve_host(consumer_root)
  if not host then
    notify(NO_HOST, vim.log.levels.ERROR)
    return nil
  end
  if vim.bo[bufnr].modified then
    notify(label .. ' reads the saved file; unsaved edits are not included.', vim.log.levels.WARN)
  end
  return { bufnr = bufnr, file = file, consumer_root = consumer_root, host = host }
end

--- Text of a command range: the charwise/blockwise visual selection when the
--- range came from one, else whole lines; nil without a range.
---@param opts table|nil user-command opts
---@return string|nil
function M.range_text(opts)
  if not opts or (opts.range or 0) == 0 then return nil end
  local vs, ve = vim.fn.getpos("'<"), vim.fn.getpos("'>")
  local mode = vim.fn.visualmode()
  if vim.fn.exists('*getregion') == 1 and (mode == 'v' or mode == '\22')
    and opts.line1 == vs[2] and opts.line2 == ve[2] then
    return table.concat(vim.fn.getregion(vs, ve, { type = mode }), '\n')
  end
  return table.concat(vim.api.nvim_buf_get_lines(0, opts.line1 - 1, opts.line2, false), '\n')
end

--- The command as a reader sees it, with inline source summarized by length.
---@param invocation table
---@return string
function M.command_echo(invocation)
  local parts = { 'spw' }
  for _, arg in ipairs(invocation.args) do
    local flag, value = arg:match('^(%-%-[%w-]+)=(.*)$')
    if flag == '--text' or flag == '--expr' then
      table.insert(parts, string.format('%s=<%d chars>', flag, #value))
    else
      table.insert(parts, arg:find('[%s"\']') and vim.fn.shellescape(arg) or arg)
    end
  end
  return table.concat(parts, ' ')
end

---@param text string
---@return string[]
local function text_lines(text)
  local lines = vim.split(text or '', '\n', { plain = true })
  while #lines > 0 and lines[#lines] == '' do table.remove(lines) end
  return lines
end

--- Run one CLI invocation from the consumer root; `done` receives the run.
---@param host table
---@param invocation table
---@param done fun(run: { code: integer, ok: boolean, stdout: string, stderr: string, duration_ms: integer })
function M.exec(host, invocation, done)
  local command = cli.command(host, invocation)
  local started = (vim.uv or vim.loop).hrtime()
  local ok_codes = invocation.ok_codes or { [0] = true }
  local finish = function(code, stdout, stderr)
    vim.schedule(function()
      done({
        code = code,
        ok = ok_codes[code] == true,
        stdout = stdout or '',
        stderr = stderr or '',
        duration_ms = math.floor(((vim.uv or vim.loop).hrtime() - started) / 1000000),
      })
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

--- Run one invocation and open its stdout alone (e.g. JSON) in a scratch split;
--- a non-zero exit is a notified error. Records vim.g.spw_instrument_last.
---@param host table
---@param invocation table
function M.run_cli(host, invocation)
  M.exec(host, invocation, function(run)
    vim.g.spw_instrument_last = { title = invocation.title, code = run.code, duration_ms = run.duration_ms }
    if not run.ok then
      local detail = vim.split(vim.trim(run.stderr), '\n', { plain = true })[1] or 'no detail'
      notify(string.format('%s exited %d: %s', invocation.title, run.code, detail), vim.log.levels.ERROR)
      return
    end
    local buf = M.open_scratch(invocation.title, text_lines(run.stdout), invocation.output)
    vim.g.spw_instrument_last = vim.tbl_extend('force', vim.g.spw_instrument_last, { bufnr = buf })
    notify(string.format('%s completed in %dms · %s · source: CLI · effect: read-only',
      invocation.title, run.duration_ms, M.command_echo(invocation)), vim.log.levels.INFO)
  end)
end

--- Run invocations in order and open one receipt in a scratch split: a header
--- naming where the reading came from, then per run its command, exit and
--- time, stderr (the CLI's header card and stats), then stdout. Records
--- vim.g.spw_instrument_last = { title, code (highest exit), duration_ms, bufnr }.
---@param host table
---@param spec { title: string, reading: string, notes?: string[], invocations: table[] }
function M.report(host, spec)
  local runs = {}
  local function finish()
    local lines = {
      string.format('# %s · reading: %s · cwd: consumer root · effect: read-only', spec.title, spec.reading),
    }
    for _, note in ipairs(spec.notes or {}) do table.insert(lines, '# ' .. note) end
    local code, total, failed = 0, 0, {}
    for i, run in ipairs(runs) do
      local invocation = spec.invocations[i]
      code, total = math.max(code, run.code), total + run.duration_ms
      if not run.ok then table.insert(failed, M.command_echo(invocation)) end
      vim.list_extend(lines, {
        '',
        '# $ ' .. M.command_echo(invocation),
        string.format('# exit %d · %dms', run.code, run.duration_ms),
      })
      vim.list_extend(lines, text_lines(run.stderr))
      vim.list_extend(lines, text_lines(run.stdout))
    end
    local buf = M.open_scratch(spec.title, lines, 'text')
    vim.g.spw_instrument_last = { title = spec.title, code = code, duration_ms = total, bufnr = buf }
    if #failed > 0 then
      notify(spec.title .. ' finished with errors: ' .. table.concat(failed, '; '), vim.log.levels.WARN)
    else
      notify(string.format('%s completed in %dms · source: CLI · effect: read-only', spec.title, total),
        vim.log.levels.INFO)
    end
  end
  local function step(i)
    if i > #spec.invocations then return finish() end
    M.exec(host, spec.invocations[i], function(run)
      runs[i] = run
      step(i + 1)
    end)
  end
  step(1)
end

M.no_host_message = NO_HOST

return M
