-- nvim-syntax.lua — assert neovim-spw's syntax groups on the shared grammar fixture.
--
-- The same fixture.spw that check-grammar.mjs tokenizes with the TextMate
-- grammar; here each needle must sit wholly inside one Vim syntax group.
-- Run from anywhere:
--   nvim --headless -u NONE -l extensions/vscode-spw/test-fixtures/grammar/nvim-syntax.lua
-- Exit 1 on any failure.

local here = vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h')
local plugin = vim.fn.fnamemodify(here .. '/../../../neovim-spw', ':p')
local fixture = here .. '/fixture.spw'

-- Test the plugin alone: a personal after/syntax/spw.vim under the user's
-- config or data dirs would otherwise be sourced after it and replace it.
local user_dirs = { vim.fn.stdpath('config'), vim.fn.stdpath('data') }
vim.opt.rtp = vim.tbl_filter(function(dir)
  for _, user in ipairs(user_dirs) do
    if vim.startswith(dir, user) then return false end
  end
  return true
end, vim.opt.rtp:get())
vim.opt.rtp:prepend(plugin)
vim.cmd('syntax on')
vim.cmd('edit ' .. vim.fn.fnameescape(fixture))
vim.cmd('set syntax=spw')

-- { line, needle, group, nth }: every character of the nth needle in that line
-- must carry the group (the innermost syntax item at that column).
local expect = {
  -- comments: hash-space, hash alone, slash-slash; particles are not comments
  { 1, 'Grammar fixture', 'spwHashComment' },
  { 2, '#', 'spwHashComment' },
  { 3, '# 1. numbered section', 'spwHashComment' },
  { 4, '# ====', 'spwHashComment' },
  { 5, '~sigils .dots and 42', 'spwLineComment' },
  { 6, '# indented hash comment', 'spwHashComment' },
  { 7, '~"./toc.spw"', 'spwPathRef' },
  { 7, '# trailing hash comment', 'spwHashComment' },
  { 8, '#>anchor', 'spwAnnotAnchor' },
  { 8, '#:layer', 'spwAnnotLens' },
  { 8, '#!mood', 'spwAnnotIntent' },
  { 8, '#', 'spwSigSchema', 4 },
  -- plan stream entries
  { 9, '>>', 'spwStreamMark' },
  { 9, '2026-10-12 14:31', 'spwStreamDate' },
  { 9, 'decide', 'spwStreamDecide' },
  { 9, '—', 'spwStreamDash' },
  { 9, 'prose stays quiet: ~x .y #z 42 "q', 'spwStreamProse' },
  { 10, '>>', 'spwStreamMark' },
  { 10, '2026-07-27', 'spwStreamDate' },
  { 10, 'observe', 'spwStreamObserve' },
  { 10, 'date-only form', 'spwStreamProse' },
  { 11, 'commit', 'spwStreamTypeOther' },
  { 11, 'unknown type is not a keyword', 'spwStreamProse' },
  { 12, '"2026-07-27"', 'spwStreamTs' },
  { 12, '"implement: quoted legacy form"', 'spwStreamProse' },
  -- commit lines
  { 13, 'planned_name', 'spwCommitPlanned' },
  { 14, '.', 'spwGroundOp' },
  { 14, 'landed_name', 'spwCommitLanded' },
  { 14, '551bb419', 'spwCommitRef' },
  -- tight dots and the ground operator
  { 15, 'hinge.frame.key', 'spwQualifiedName' },
  { 16, '.', 'spwGroundOp' },
  { 16, '.', 'spwGroundOp', 2 },
  { 7, '..', 'spwConnector' },
  -- a quote left open does not swallow the next line
  { 20, '# still a comment', 'spwHashComment' },
  { 21, '!=', 'spwComparison' },
}

local failures = {}
for _, case in ipairs(expect) do
  local lnum, needle, group, nth = case[1], case[2], case[3], case[4] or 1
  local text = vim.fn.getline(lnum)
  local start = 0
  for _ = 1, nth do
    start = text:find(needle, start + 1, true)
    if not start then break end
  end
  if not start then
    failures[#failures + 1] = string.format('line %d %q: needle not in fixture line', lnum, needle)
  else
    for col = start, start + #needle - 1 do
      -- Skip continuation bytes of multibyte characters (the em dash).
      local byte = text:byte(col)
      if byte < 0x80 or byte >= 0xC0 then
        local got = vim.fn.synIDattr(vim.fn.synID(lnum, col, 1), 'name')
        if got ~= group then
          failures[#failures + 1] = string.format('line %d %q col %d: expected %s, got %s', lnum, needle, col, group, got == '' and '(none)' or got)
          break
        end
      end
    end
  end
end

if #failures > 0 then
  for _, message in ipairs(failures) do io.stderr:write('nvim-syntax: FAIL ' .. message .. '\n') end
  os.exit(1)
end
io.stdout:write(string.format('nvim-syntax: ok (%d expectations)\n', #expect))
os.exit(0)
