-- tests/instrument-smoke.lua — CLI instrument builders, plus real runs against a fixture
-- Run with: nvim --headless -u NONE -l extensions/neovim-spw/tests/instrument-smoke.lua
-- Set SPW_NVIM_SKIP_CLI=1 to run only the builder checks (no npm/node needed).

local H = dofile(vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h') .. '/helpers.lua')
vim.g.spw_lsp_disable = true
H.bootstrap()
local cli = require('spw.cli')

print('Running neovim-spw instrument tests...')

-- 1. Builders: real CLI flags, consumer-relative paths, read-only
local root = '/workspace/consumer'
local file = root .. '/docs/notes/example.spw'
local joined = function(invocation) return table.concat(invocation.args, '|') end

H.assert_eq(joined(cli.inspect_source(root, file, 'structure')),
  'inspect|source|docs/notes/example.spw|--through|structure', 'inspect source args')
H.assert_eq(cli.inspect_source(root, file).args[5], 'trace', 'inspect defaults to trace (VS Code parity)')
H.assert_true(not pcall(cli.inspect_source, root, file, 'semantic'), 'unknown stage rejected')
H.assert_eq(joined(cli.inspect_text('a[b]{c}', 'tokens')),
  'inspect|source|--text=a[b]{c}|--through|tokens', 'range inspection passes --text= inline')
H.assert_eq(cli.inspect_text('--door').args[3], '--text=--door', 'a range starting with -- stays one value')
H.assert_eq(joined(cli.fingerprint(' a[b]{c} ')), 'fingerprint|--expr=a[b]{c}', 'fingerprint --expr=')
H.assert_true(not pcall(cli.fingerprint, '   '), 'empty fingerprint rejected')
H.assert_eq(joined(cli.memory()[1]), 'inspect|memory', 'memory reads inspect memory')
H.assert_eq(joined(cli.memory()[2]), 'mem|list', 'memory lists the dumps it counts')
H.assert_eq(joined(cli.perf(root, root .. '/docs/notes')),
  'query|--from|docs/notes|--selector|pathRefs|--count|--stats', 'perf query args')
H.assert_eq(cli.perf(root, root).args[3], '.', 'perf at the consumer root uses .')
H.assert_true(not pcall(cli.perf, root, root .. '/a,b'), 'a comma in --from is rejected')
H.assert_eq(joined(cli.project(root, file)), 'emit|ir|docs/notes/example.spw', 'projection is emit ir')
H.assert_true(not joined(cli.project(root, file)):find('--out', 1, true), 'projection never writes (--out)')
H.assert_eq(joined(cli.quest_panels()), 'quest|--json', 'quest panels from --json')
H.assert_eq(joined(cli.quest_check('act', '~door')), 'quest|--check|act|~door', 'quest check args')
H.assert_true(cli.quest_check('act', '~door').ok_codes[1], 'quest check exit 1 is a verdict')
H.assert_true(not pcall(cli.quest_check, 'act', '--door'), 'flag-shaped quest line rejected')
H.assert_true(not pcall(cli.quest_check, 'a b', 'x'), 'malformed step rejected')

if vim.env.SPW_NVIM_SKIP_CLI == '1' then
  print('✓ neovim-spw instrument builder tests passed (CLI runs skipped).')
  return
end

-- 2. Real runs from the workspace that owns this plugin
local fixture = H.open_fixture('instrument.spw')
local instruments = require('spw.instruments')
local host = cli.resolve_host(instruments.consumer_root(fixture))
H.assert_true(host ~= nil, 'a CLI host resolves for the fixture (run from a workbench checkout)')
local fixture_rel = cli.consumer_path(host.consumer_root, vim.api.nvim_buf_get_name(fixture))

---@param command string
---@param code integer|nil expected exit code (default 0)
---@return string[] lines
local function run(command, code)
  vim.g.spw_instrument_last = nil
  vim.cmd(command)
  H.wait(function() return vim.g.spw_instrument_last ~= nil end, 90000, command)
  local last = vim.g.spw_instrument_last
  H.assert_eq(last.code, code or 0, command .. ' exit code')
  H.assert_true(last.bufnr ~= nil, command .. ' opened a scratch buffer')
  local lines = vim.api.nvim_buf_get_lines(last.bufnr, 0, -1, false)
  vim.api.nvim_set_current_buf(fixture)
  return lines
end

local lines = run('SpwInspect structure')
H.assert_true(lines[1]:find('# Spw Inspect · reading: saved file instrument.spw', 1, true) == 1, 'inspect receipt names its reading')
H.assert_true(H.has_line(lines, '# $ spw inspect source ' .. fixture_rel .. ' --through structure'), 'inspect receipt names the command')
H.assert_true(H.has_line(lines, '# exit 0 · '), 'inspect receipt names exit and time')
H.assert_true(H.has_line(lines, '^["inspect"]{'), 'inspect keeps the stderr header card')
H.assert_true(H.has_line(lines, 'source.structure/1'), 'inspect shows the structure product')
H.assert_true(H.has_line(lines, 'deferred'), 'inspect keeps the deferred-stage receipt')

local door_row = H.cursor_on('door[closed]')
lines = run(door_row .. 'SpwInspect tokens')
H.assert_true(H.has_line(lines, 'reading: line ' .. door_row .. ', passed inline'), 'range reading named')
H.assert_true(H.has_line(lines, '--text=<31 chars>'), 'range inspection goes through --text=')
H.assert_true(H.has_line(lines, 'source.tokens/1'), 'range inspection shows the token product')

vim.api.nvim_win_set_cursor(0, { door_row, 0 })
lines = run('SpwFingerprint')
H.assert_true(H.has_line(lines, '# spw fingerprint'), 'fingerprint keeps its stderr summary')
H.assert_true(H.has_line(lines, 'Frame=1'), 'fingerprint counts the frame')

vim.api.nvim_win_set_cursor(0, { 1, 0 })
lines = run('SpwFingerprint', 1)
H.assert_true(H.has_line(lines, 'prose=true'), 'a prose fallback is shown as a product, not an error')
H.assert_true(H.has_line(lines, '# exit 1 · '), 'the receipt names the non-zero exit')

lines = run('SpwPerf')
H.assert_true(H.has_line(lines, 'PathRef:'), 'perf counts pathRefs')
H.assert_true(H.has_line(lines, 'spw query stats'), 'perf keeps the --stats line')

lines = run('SpwProject')
local ok, emitted = pcall(vim.json.decode, table.concat(lines, '\n'))
H.assert_true(ok and emitted.version == 'spw.emit/1', 'projection is an spw.emit/1 document')
H.assert_true(vim.tbl_contains(emitted.includes or {}, './sibling.spw'), 'projection lists the fixture includes')

lines = run('SpwMemory')
H.assert_true(H.has_line(lines, '# $ spw inspect memory'), 'memory runs inspect memory')
H.assert_true(H.has_line(lines, 'spw mem status'), 'memory shows mem status')
H.assert_true(H.has_line(lines, '# $ spw mem list'), 'memory lists dumps')

-- 3. Quest panels and a check on the current line
lines = run('SpwQuest')
local quest_buf = vim.fn.bufnr('spw://quest')
H.assert_true(quest_buf > 0, 'quest panels open in spw://quest')
lines = vim.api.nvim_buf_get_lines(quest_buf, 0, -1, false)
H.assert_true(H.has_line(lines, '## 2. act'), 'quest panels keep their order and ids')
vim.api.nvim_set_current_buf(quest_buf)
H.cursor_on('~door')

local function check(args)
  vim.b[quest_buf].spw_quest_last = nil
  vim.cmd('SpwQuest check' .. (args or ''))
  H.wait(function() return vim.b[quest_buf].spw_quest_last ~= nil end, 90000, 'SpwQuest check')
  return vim.b[quest_buf].spw_quest_last
end

local verdict = check()
H.assert_eq(verdict.step, 'act', 'check reads the step from the nearest heading')
H.assert_eq(verdict.pass, true, 'the act try line passes')

local row = vim.api.nvim_win_get_cursor(0)[1]
vim.api.nvim_buf_set_lines(quest_buf, row, row, false, { 'door' })
vim.api.nvim_win_set_cursor(0, { row + 1, 0 })
verdict = check()
H.assert_eq(verdict.pass, false, 'a bare word fails the act check')
H.assert_eq(verdict.code, 1, 'fail is exit 1, shown as a verdict')

verdict = check(' write')
H.assert_eq(verdict.step, 'write', 'an argument names the step')
H.assert_eq(verdict.pass, true, 'a bare word passes the write check')

print('✓ neovim-spw instrument tests passed.')
