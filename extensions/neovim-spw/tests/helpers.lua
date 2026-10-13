-- tests/helpers.lua — shared bootstrap, assertions, and an in-process fake
-- spw language server for headless neovim-spw tests (no plugin dependencies).
local H = {}

H.plugin_dir = vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h:h')
H.fixtures = H.plugin_dir .. '/tests/fixtures'
H.messages = {}

function H.bootstrap()
  vim.opt.rtp:prepend(H.plugin_dir)
  package.path = H.plugin_dir .. '/lua/?.lua;' .. H.plugin_dir .. '/lua/?/init.lua;' .. package.path
  vim.cmd('filetype plugin on')
  vim.notify = function(msg, level) table.insert(H.messages, { msg = tostring(msg), level = level }) end
  return require('spw')
end

function H.assert_true(cond, msg)
  if not cond then error('Assertion failed: ' .. (msg or 'condition was false'), 2) end
end

function H.assert_eq(actual, expected, msg)
  if actual ~= expected then
    error(string.format('Assertion failed: %s (expected %s, got %s)',
      msg or '', vim.inspect(expected), vim.inspect(actual)), 2)
  end
end

---@param cond fun(): boolean
---@param timeout_ms integer|nil
---@param msg string
function H.wait(cond, timeout_ms, msg)
  local ok = vim.wait(timeout_ms or 2000, cond, 20)
  if not ok then error('Timed out waiting for: ' .. msg, 2) end
end

---@param text string
---@return boolean
function H.saw_message(text)
  for _, entry in ipairs(H.messages) do
    if entry.msg:find(text, 1, true) then return true end
  end
  return false
end

--- Open a fixture file in the current window and return its buffer.
---@param name string
---@return integer
function H.open_fixture(name)
  vim.cmd('edit ' .. vim.fn.fnameescape(H.fixtures .. '/' .. name))
  return vim.api.nvim_get_current_buf()
end

--- Put the cursor on the first occurrence of `needle` in the current buffer.
---@param needle string
function H.cursor_on(needle)
  for row, line in ipairs(vim.api.nvim_buf_get_lines(0, 0, -1, false)) do
    local col = line:find(needle, 1, true)
    if col then
      vim.api.nvim_win_set_cursor(0, { row, col - 1 })
      return row
    end
  end
  error('needle not found: ' .. needle, 2)
end

--- An in-process server for vim.lsp.start({ cmd = fn }). `spec.capabilities`
--- are advertised; `spec.handlers[method](params)` answers requests;
--- every method received is appended to `spec.log`.
---@param spec { capabilities: table, handlers: table<string, fun(params: table): any>, log: string[] }
function H.fake_server(spec)
  return function(dispatchers)
    local closing, id = false, 0
    local function exit()
      if closing then return end
      closing = true
      vim.schedule(function() dispatchers.on_exit(0, 15) end)
    end
    return {
      request = function(method, params, callback, notify_reply_callback)
        id = id + 1
        local this = id
        table.insert(spec.log, method)
        local result
        if method == 'initialize' then
          result = { capabilities = spec.capabilities, serverInfo = { name = 'fake-spw' } }
        elseif spec.handlers[method] then
          result = spec.handlers[method](params)
        end
        vim.schedule(function()
          callback(nil, result)
          if notify_reply_callback then notify_reply_callback(this) end
        end)
        return true, this
      end,
      notify = function(method)
        table.insert(spec.log, method)
        if method == 'exit' then exit() end
        return true
      end,
      is_closing = function() return closing end,
      terminate = exit,
    }
  end
end

--- Start a fake `spw` client on `bufnr` and wait until it serves `method`.
---@return table client
function H.attach_fake(bufnr, spec, method)
  local client_id = vim.lsp.start({
    name = 'spw',
    cmd = H.fake_server(spec),
    root_dir = H.fixtures,
    on_attach = require('spw.lsp')._on_attach,
  }, { bufnr = bufnr, reuse_client = function() return false end })
  H.assert_true(client_id ~= nil, 'fake spw client started')
  local lsp = require('spw.lsp')
  H.wait(function() return lsp.attached_client(bufnr, method) ~= nil end, 3000, 'fake client serving ' .. method)
  return vim.lsp.get_client_by_id(client_id)
end

--- Stop every spw client and wait until `bufnr` has none attached.
function H.detach_all(bufnr)
  for _, client in ipairs(vim.lsp.get_clients({ name = 'spw' })) do
    require('spw.lsp').client_call(client, 'stop', true)
  end
  H.wait(function() return #vim.lsp.get_clients({ name = 'spw', bufnr = bufnr }) == 0 end, 3000, 'spw clients detached')
end

--- Run :checkhealth spw and return the report lines, then close the report.
---@return string[]
function H.checkhealth()
  local origin = vim.api.nvim_get_current_buf()
  vim.cmd('checkhealth spw')
  local lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
  local health_buf = vim.api.nvim_get_current_buf()
  if health_buf ~= origin then
    vim.cmd('silent! tabclose')
    pcall(vim.api.nvim_buf_delete, health_buf, { force = true })
  end
  if vim.api.nvim_buf_is_valid(origin) then vim.api.nvim_set_current_buf(origin) end
  return lines
end

---@param lines string[]
---@param needle string
---@return boolean
function H.has_line(lines, needle)
  for _, line in ipairs(lines) do
    if line:find(needle, 1, true) then return true end
  end
  return false
end

return H
